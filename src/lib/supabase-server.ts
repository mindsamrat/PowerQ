import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Normalise the Supabase URL pulled from env. Strips whitespace (including
 * stray newlines from copy-paste), trims trailing slashes, and forces https
 * if someone pasted the bare hostname. Returns null if the result can't
 * plausibly be a Supabase project URL.
 */
function normaliseSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  v = v.replace(/\/+$/, "");
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Server-only Supabase client backed by the SECRET / service-role key.
 * Returns null if env vars aren't configured so callers can fall back gracefully.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = normaliseSupabaseUrl(process.env.SUPABASE_URL);
  const rawKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = rawKey?.trim();
  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export interface ResponseRow {
  name: string;
  email: string;
  archetypeId: string;
  pq: number;
  scores: { control: number; visibility: number; timeHorizon: number; powerSource: number };
  answers: { q: string; o: string; d: { control: number; visibility: number; timeHorizon: number; powerSource: number } }[];
  freeText: { questionId: string; text: string }[];
  userAgent?: string | null;
  ipAddress?: string | null;
}

/** Insert a quiz response into Supabase. Returns the new row's UUID. Throws on configured-but-failing writes. */
export async function saveResponseToSupabase(row: ResponseRow): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null; // env not configured -> caller decides fallback

  // Wrap the actual call in try/catch so a transport failure (TypeError:
  // fetch failed — usually a paused project, bad URL, or DNS) surfaces with
  // a recognisable message instead of bubbling up as a generic TypeError.
  let result: { data: { id: string } | null; error: unknown };
  try {
    result = await sb
      .from("responses")
      .insert({
        name: row.name,
        email: row.email,
        archetype_id: row.archetypeId,
        pq_score: row.pq,
        scores: row.scores,
        answers: row.answers,
        free_text: row.freeText,
        user_agent: row.userAgent ?? null,
        ip_address: row.ipAddress ?? null,
        payment_status: "unpaid",
      })
      .select("id")
      .single();
  } catch (transportErr) {
    const detail = transportErr instanceof Error ? transportErr.message : "unknown transport error";
    throw new Error(
      `Supabase unreachable from this deployment (${detail}). Check that SUPABASE_URL is correct in Vercel and that the Supabase project is not paused.`
    );
  }

  const { data, error } = result;

  if (error) {
    const message = (error as { message?: string }).message ?? "supabase insert failed";
    throw new Error(message);
  }
  return data?.id ?? null;
}

/** Update payment status and stored PDF URL after a successful Dodo webhook. */
export async function markResponsePaid(
  responseId: string,
  pdfUrl: string
): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("responses")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      pdf_url: pdfUrl,
    })
    .eq("id", responseId);

  if (error) {
    console.error("[supabase] mark paid failed", error);
    return false;
  }
  return true;
}

/** Read a response by id (for the paid PDF generator). */
export async function getResponseById(responseId: string) {
  const sb = getServerSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("responses")
    .select("*")
    .eq("id", responseId)
    .single();

  if (error) {
    console.error("[supabase] read response failed", error);
    return null;
  }
  return data;
}
