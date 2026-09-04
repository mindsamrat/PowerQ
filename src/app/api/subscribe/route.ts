import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validation";
import { recordSubscriber } from "@/lib/subscriber-store";
import { saveResponseToSupabase } from "@/lib/supabase-server";
import { calculateAxisScores, matchArchetype, computePQ, type AnswerDelta } from "@/lib/scoring";
import { questions } from "@/data/questions";
import { checkResponsesPerIp, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface AnswerEntry {
  q: string;
  o: string;
  // d is accepted in the payload for backward compat but IGNORED server-side —
  // we look up the actual delta from the question bank to prevent score forgery.
  d?: { control: number; visibility: number; timeHorizon: number; powerSource: number };
}

interface FreeTextEntry {
  questionId: string;
  text: string;
}

interface SubscribePayload {
  name: string;
  email: string;
  // Client may send these but they're ignored — we recompute server-side.
  archetypeId?: string;
  scores?: { control: number; visibility: number; timeHorizon: number; powerSource: number };
  pq?: number;
  answers?: AnswerEntry[];
  freeText?: FreeTextEntry[];
  source?: "free-pdf" | "paid-pdf";
  honeypot?: string;
}

function sanitizeName(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@\S+/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function sanitizeFreeText(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@\S+/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 280);
}

/**
 * Recompute axis scores, archetype, and PQ from the answers array.
 * The client's claimed scores/archetypeId are IGNORED. This is the trust
 * boundary — a forged POST cannot grant a Shadow archetype or any other
 * outcome.
 */
function recomputeFromAnswers(answers: AnswerEntry[]) {
  const deltas: AnswerDelta[] = [];
  let validCount = 0;

  for (const a of answers) {
    if (!a?.q || !a?.o) continue;
    const q = questions.find((qq) => qq.id === a.q);
    if (!q || q.kind === "free-text" || q.kind === "email") continue;
    const option = q.options.find((o) => o.id === a.o);
    if (!option) continue;
    deltas.push({
      control: option.scores.control ?? 0,
      visibility: option.scores.visibility ?? 0,
      timeHorizon: option.scores.timeHorizon ?? 0,
      powerSource: option.scores.powerSource ?? 0,
    });
    validCount += 1;
  }

  const scores = calculateAxisScores(deltas);
  const match = matchArchetype(scores);
  const pq = computePQ(scores);
  return { scores, match, pq, validCount };
}

export async function POST(req: Request) {
  let body: Partial<SubscribePayload>;
  try {
    body = (await req.json()) as Partial<SubscribePayload>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Silent success on honeypot — never reveal the trap.
  if (body.honeypot) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = sanitizeName(body.name);
  if (name.length === 0) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const emailCheck = await validateEmail(body.email ?? "");
  if (!emailCheck.valid || !emailCheck.normalized) {
    return NextResponse.json({ error: emailCheck.error ?? "Invalid email." }, { status: 400 });
  }

  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  if (rawAnswers.length < 15) {
    // Fewer than 15 valid choice answers means someone is trying to skip the quiz.
    return NextResponse.json({ error: "Quiz appears incomplete." }, { status: 400 });
  }

  const { scores, match, pq, validCount } = recomputeFromAnswers(rawAnswers);
  if (validCount < 15) {
    return NextResponse.json({ error: "Quiz answers could not be verified." }, { status: 400 });
  }

  // Sanitised free-text — also length-capped and HTML-stripped.
  const freeTextRaw = Array.isArray(body.freeText) ? body.freeText : [];
  const freeText = freeTextRaw
    .filter((f) => f && typeof f.questionId === "string")
    .map((f) => ({
      questionId: String(f.questionId).slice(0, 16),
      text: sanitizeFreeText(typeof f.text === "string" ? f.text : ""),
    }))
    .filter((f) => f.text.length > 0)
    .slice(0, 4);

  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");
  const ip = getClientIp(req);

  // Rate limit: at most 3 completed quizzes per IP per 24 hours.
  const supabaseConfigured = !!(process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  if (supabaseConfigured) {
    const limit = await checkResponsesPerIp(ip, 3, 24);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You've already completed this assessment a few times today. Try again tomorrow." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }
  }

  // Trim answer history to exactly the validated, server-side delta values
  // before persisting — so the Supabase row never holds attacker-supplied
  // delta numbers either.
  const sanitizedAnswers = rawAnswers
    .map((a) => {
      const q = questions.find((qq) => qq.id === a.q);
      if (!q || q.kind === "free-text" || q.kind === "email") return null;
      const option = q.options.find((o) => o.id === a.o);
      if (!option) return null;
      return {
        q: q.id,
        o: option.id,
        d: {
          control: option.scores.control ?? 0,
          visibility: option.scores.visibility ?? 0,
          timeHorizon: option.scores.timeHorizon ?? 0,
          powerSource: option.scores.powerSource ?? 0,
        },
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  let responseId: string | null = null;
  if (supabaseConfigured) {
    try {
      responseId = await saveResponseToSupabase({
        name,
        email: emailCheck.normalized,
        archetypeId: match.archetype.id,
        pq,
        scores,
        answers: sanitizedAnswers,
        freeText,
        userAgent,
        ipAddress: ip,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown";
      console.error("[subscribe] supabase write failed", err);
      return NextResponse.json(
        { error: `Could not save your response: ${detail}` },
        { status: 500 }
      );
    }
  }

  if (!responseId) {
    // Dev fallback when Supabase env is missing locally.
    const record = await recordSubscriber({
      email: emailCheck.normalized,
      archetypeId: match.archetype.id,
      scores,
      pq,
      source: body.source === "paid-pdf" ? "paid-pdf" : "free-pdf",
      userAgent,
      referrer,
    });
    responseId = record.id;
  }

  const qs = new URLSearchParams({
    id: match.archetype.id,
    c: String(scores.control),
    v: String(scores.visibility),
    t: String(scores.timeHorizon),
    p: String(scores.powerSource),
    pq: String(pq),
    token: responseId.slice(0, 8),
  });

  return NextResponse.json({
    ok: true,
    responseId,
    // Tell the client the server-computed result so the URL it builds for
    // /results matches what's actually in the database.
    result: {
      archetypeId: match.archetype.id,
      scores,
      pq,
    },
    downloadUrl: `/api/pdf/free?${qs.toString()}`,
  });
}
