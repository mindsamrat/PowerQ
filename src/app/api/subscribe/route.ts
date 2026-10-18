import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validation";
import { isProductionRuntime, recordDevSubscriber } from "@/lib/subscriber-store";
import { findRecentDuplicate, isSupabaseConfigured, saveResponseToSupabase } from "@/lib/supabase-server";
import { calculateAxisScores, matchArchetype, computePQ, type ScoredAnswer } from "@/lib/scoring";
import { questions } from "@/data/questions";
import { checkSubmissionLimits, getClientIp } from "@/lib/rate-limit";
import { readJsonBody, rejectCrossSite } from "@/lib/http";
import { sanitizeFreeText, sanitizeName } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 30;

/** A full submission is ~4 KB. 32 KB leaves room for long free text and nothing more. */
const MAX_BODY_BYTES = 32 * 1024;
const MAX_ANSWERS = 60;
const FREE_TEXT_IDS = new Set(questions.filter((q) => q.kind === "free-text").map((q) => q.id));

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "landing"] as const;

function sanitizeAttribution(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const clean = value.slice(0, 100).replace(/[^\w.\-~+%/: ]/g, "").trim();
    if (clean) out[key] = clean;
  }
  return Object.keys(out).length ? out : null;
}

interface ValidAnswer {
  q: string;
  o: string;
  pos?: number;
  d: { control: number; visibility: number; timeHorizon: number; powerSource: number };
}

/**
 * Recompute everything from the answers. Client-claimed scores and archetype
 * are ignored: this is the trust boundary. One answer per question; deltas
 * come from the question bank, never the request.
 */
function validateAnswers(raw: unknown): ValidAnswer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ValidAnswer[] = [];
  for (const entry of raw.slice(0, MAX_ANSWERS)) {
    if (!entry || typeof entry !== "object") continue;
    const { q: qid, o: oid, pos } = entry as { q?: unknown; o?: unknown; pos?: unknown };
    if (typeof qid !== "string" || typeof oid !== "string" || seen.has(qid)) continue;
    const q = questions.find((qq) => qq.id === qid);
    if (!q || q.kind === "free-text" || q.kind === "email") continue;
    const option = q.options.find((o) => o.id === oid);
    if (!option) continue;
    seen.add(qid);
    out.push({
      q: q.id,
      o: option.id,
      ...(Number.isInteger(pos) && (pos as number) >= 0 && (pos as number) <= 3 ? { pos: pos as number } : {}),
      d: {
        control: option.scores.control ?? 0,
        visibility: option.scores.visibility ?? 0,
        timeHorizon: option.scores.timeHorizon ?? 0,
        powerSource: option.scores.powerSource ?? 0,
      },
    });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[subscribe] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong on our side. Your answers are safe on this device." }, { status: 500 });
  }
}

async function handle(req: Request) {
  const refused = rejectCrossSite(req);
  if (refused) return refused;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;
  const body = parsed.body;

  // Honeypot: a hidden field real users never see. Silent success for bots.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = sanitizeName(body.name);
  if (name.length === 0) {
    return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  }

  const emailCheck = await validateEmail(typeof body.email === "string" ? body.email : "");
  if (!emailCheck.valid || !emailCheck.normalized) {
    return NextResponse.json({ error: emailCheck.error ?? "Invalid email." }, { status: 400 });
  }
  const email = emailCheck.normalized;

  const answers = validateAnswers(body.answers);
  if (answers.length < 15) {
    return NextResponse.json({ error: "Your answers didn't come through. Please go back and finish the assessment." }, { status: 400 });
  }

  const scored: ScoredAnswer[] = answers.map((a) => ({ questionId: a.q, delta: a.d }));
  const scores = calculateAxisScores(scored);
  const match = matchArchetype(scores);
  const pq = computePQ(scores, scored);

  const seenFreeText = new Set<string>();
  const freeText = (Array.isArray(body.freeText) ? body.freeText.slice(0, 4) : [])
    .map((f) => (f && typeof f === "object" ? (f as { questionId?: unknown; text?: unknown }) : null))
    .filter((f): f is { questionId: string; text?: unknown } => !!f && typeof f.questionId === "string" && FREE_TEXT_IDS.has(f.questionId))
    .filter((f) => (seenFreeText.has(f.questionId) ? false : (seenFreeText.add(f.questionId), true)))
    .map((f) => ({ questionId: f.questionId, text: sanitizeFreeText(f.text) }))
    .filter((f) => f.text.length > 0);

  const marketingConsent = body.marketingConsent === true;
  const attribution = sanitizeAttribution(body.attribution);
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  let responseId: string | null = null;
  let limited = false;

  if (isSupabaseConfigured()) {
    try {
      // Same email + same answers moments ago (double tap, client retry,
      // background re-submit): reuse that row instead of inserting again.
      responseId = await findRecentDuplicate(email, answers);
      if (!responseId) {
        const limit = await checkSubmissionLimits(email, ip);
        if (!limit.allowed) {
          // Never withhold a computed result. Show it; just don't store more.
          limited = true;
          console.warn(`[subscribe] limit reached (${limit.reason}); serving result without saving`);
        } else {
          responseId = await saveResponseToSupabase({
            name, email, archetypeId: match.archetype.id, pq, scores, answers, freeText,
            userAgent, ipAddress: ip, marketingConsent, attribution,
          });
        }
      }
    } catch (err) {
      // Database down or paused: serve the result in degraded mode. The client
      // queues the submission and retries in the background.
      console.error("[subscribe] supabase write failed; serving degraded result:", err instanceof Error ? err.message : err);
    }
  } else if (isProductionRuntime()) {
    console.error("[subscribe] SUPABASE_URL / SUPABASE_SECRET_KEY are not set in production. Responses are NOT being saved.");
  } else {
    responseId = await recordDevSubscriber({ email, archetypeId: match.archetype.id, pq });
  }

  const qs = new URLSearchParams({
    id: match.archetype.id,
    c: String(scores.control),
    v: String(scores.visibility),
    t: String(scores.timeHorizon),
    p: String(scores.powerSource),
    pq: String(pq),
  });
  if (responseId) qs.set("token", responseId.slice(0, 8));

  return NextResponse.json({
    ok: true,
    // true when the result is valid but was not stored (database down or daily limit).
    degraded: !responseId,
    limited,
    responseId,
    result: { archetypeId: match.archetype.id, scores, pq, answered: answers.length },
    downloadUrl: `/api/pdf/free?${qs.toString()}`,
  });
}
