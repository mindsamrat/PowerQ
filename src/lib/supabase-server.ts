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

/** True when the env vars needed to talk to Supabase are present. */
export function isSupabaseConfigured(): boolean {
  return !!(
    normaliseSupabaseUrl(process.env.SUPABASE_URL) &&
    (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  );
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

/**
 * Raised when Supabase could not be reached at all — a paused project, a bad
 * URL, DNS trouble, or a network blip. Distinct from a query that reached the
 * database and was rejected, because this kind is worth retrying.
 */
export class SupabaseUnavailableError extends Error {
  readonly transient = true;
  constructor(detail: string) {
    super(`Supabase unreachable (${detail})`);
    this.name = "SupabaseUnavailableError";
  }
}

const TRANSPORT_SIGNATURES = [
  "fetch failed",
  "econnrefused",
  "econnreset",
  "enotfound",
  "eai_again",
  "etimedout",
  "socket hang up",
  "network",
  "timeout",
  "aborted",
  "service unavailable",
  "502",
  "503",
  "504",
];

function looksTransient(message: string): boolean {
  const m = message.toLowerCase();
  return TRANSPORT_SIGNATURES.some((sig) => m.includes(sig));
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a Supabase call, retrying only transport-level failures. Paused projects
 * and cold connections routinely fail the first attempt and succeed on the
 * second, so a couple of quick retries turn a visible outage into a hiccup.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const transient = err instanceof SupabaseUnavailableError;
      if (!transient || attempt === attempts) break;
      console.warn(`[supabase] ${label} attempt ${attempt} failed, retrying`, describe(err));
      await sleep(200 * attempt);
    }
  }
  throw lastErr;
}

/**
 * supabase-js reports transport failures two different ways depending on the
 * call: it either throws, or returns them in `error`. Normalise both into a
 * SupabaseUnavailableError so retry logic has one thing to look for.
 */
async function run<T>(fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await fn();
  } catch (err) {
    throw new SupabaseUnavailableError(describe(err));
  }
  if (result.error) {
    const message = (result.error as { message?: string }).message ?? "query failed";
    if (looksTransient(message)) throw new SupabaseUnavailableError(message);
    throw new Error(message);
  }
  return result.data;
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

/** Insert a quiz response. Returns the new row's UUID, or null if Supabase isn't configured. Throws if configured but failing. */
export async function saveResponseToSupabase(row: ResponseRow): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null; // env not configured -> caller decides fallback

  const data = await withRetry("insert response", () =>
    run<{ id: string } | null>(() =>
      sb
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
        .single()
    )
  );

  return data?.id ?? null;
}

/**
 * Update payment status after a successful Dodo webhook. Retries transport
 * failures — a paid customer must not be left unpaid because of a blip. The
 * webhook returns 5xx on false so Dodo redelivers.
 */
export async function markResponsePaid(responseId: string, pdfUrl: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) return false;

  try {
    await withRetry("mark paid", () =>
      run(() =>
        sb
          .from("responses")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            pdf_url: pdfUrl,
          })
          .eq("id", responseId)
          .select("id")
      )
    );
    return true;
  } catch (err) {
    console.error("[supabase] mark paid failed", describe(err));
    return false;
  }
}

/** Read a response by id. Returns null when missing, unreachable, or unconfigured. */
export async function getResponseById(responseId: string) {
  const sb = getServerSupabase();
  if (!sb) return null;

  try {
    return await withRetry("read response", () =>
      run(() => sb.from("responses").select("*").eq("id", responseId).single())
    );
  } catch (err) {
    console.error("[supabase] read response failed", describe(err));
    return null;
  }
}

/**
 * Cheap reachability probe for the health endpoint. Returns true only when the
 * database answered. Never throws.
 */
export async function pingSupabase(timeoutMs = 4000): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) return false;
  try {
    const probe = run(() => sb.from("responses").select("id", { count: "exact", head: true }));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new SupabaseUnavailableError("probe timed out")), timeoutMs)
    );
    await Promise.race([probe, timeout]);
    return true;
  } catch (err) {
    console.warn("[supabase] ping failed", describe(err));
    return false;
  }
}
