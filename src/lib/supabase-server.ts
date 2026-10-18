import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only data access for the `responses` table.
 *
 * Every function here distinguishes three outcomes callers must handle
 * differently: the row exists, the row does not exist, or the database could
 * not be reached (paused free-tier project, network blip, bad URL). Treating
 * "unreachable" as "not found" told paying customers to retake the quiz.
 */

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
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/** One place that decides which key is used, so "configured" and "client" can never disagree. */
function supabaseKey(): string | null {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || null;
}

/** True when the env vars needed to talk to Supabase are present. */
export function isSupabaseConfigured(): boolean {
  return !!(normaliseSupabaseUrl(process.env.SUPABASE_URL) && supabaseKey());
}

/** Per-request network timeout. Keeps a paused project from hanging a request for minutes. */
const REQUEST_TIMEOUT_MS = 5000;

const timeoutFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * Server-only Supabase client backed by the SECRET / service-role key.
 * Returns null if env vars aren't configured so callers can fall back gracefully.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = normaliseSupabaseUrl(process.env.SUPABASE_URL);
  const key = supabaseKey();
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });
  return cached;
}

/**
 * Raised when Supabase could not be reached at all — a paused project, a bad
 * URL, DNS trouble, a timeout. Distinct from a query that reached the database
 * and was rejected, because this kind is worth retrying.
 */
export class SupabaseUnavailableError extends Error {
  readonly transient = true;
  constructor(detail: string) {
    super(`Supabase unreachable (${detail})`);
    this.name = "SupabaseUnavailableError";
  }
}

/** A query that reached Postgres/PostgREST and was refused. Never retried. */
export class SupabaseQueryError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "SupabaseQueryError";
    this.code = code;
  }
}

const TRANSPORT_SIGNATURES = [
  "fetch failed", "econnrefused", "econnreset", "enotfound", "eai_again", "etimedout",
  "socket hang up", "network", "timeout", "timed out", "aborted", "service unavailable",
  "bad gateway", "gateway timeout",
];

/**
 * Classify a supabase-js error. Errors carrying a Postgres SQLSTATE or a
 * PostgREST code reached the database and are final. Only code-less errors
 * whose message looks like a transport failure are retried — so text that an
 * attacker puts into a query value can never trigger retries.
 */
function isTransportError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = typeof err.code === "string" ? err.code : "";
  if (/^[0-9A-Z]{5}$/.test(code) || code.startsWith("PGRST")) return false;
  const m = (err.message ?? "").toLowerCase();
  return TRANSPORT_SIGNATURES.some((sig) => m.includes(sig));
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run a call, retrying only transport-level failures (one retry, short pause). */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof SupabaseUnavailableError) || attempt === attempts) break;
      console.warn(`[supabase] ${label} attempt ${attempt} failed, retrying:`, describe(err));
      await sleep(250);
    }
  }
  throw lastErr;
}

/**
 * supabase-js reports transport failures two ways depending on the call: it
 * either throws, or returns them in `error`. Normalise both.
 */
async function run<T>(fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await fn();
  } catch (err) {
    throw new SupabaseUnavailableError(describe(err));
  }
  if (result.error) {
    const e = result.error as { message?: string; code?: string };
    if (isTransportError(e)) throw new SupabaseUnavailableError(e.message ?? "transport error");
    throw new SupabaseQueryError(e.message ?? "query failed", typeof e.code === "string" ? e.code : "");
  }
  return result.data;
}

/** True when an error means "that column does not exist yet" (migration not run). */
function isMissingColumn(err: unknown): boolean {
  if (!(err instanceof SupabaseQueryError)) return false;
  return err.code === "PGRST204" || err.code === "42703" || /column .* does not exist|could not find the '.*' column/i.test(err.message);
}

/** True when a value violates a CHECK constraint (e.g. old payment_status check). */
function isCheckViolation(err: unknown): boolean {
  return err instanceof SupabaseQueryError && err.code === "23514";
}

// ---------- Validation ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Response ids are UUIDs. Anything else is rejected before it reaches the database. */
export function isResponseId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Short, non-reversible id prefix for logs. Full ids are bearer credentials for the paid PDF. */
export function shortId(id: string | null | undefined): string {
  return id ? `${id.slice(0, 8)}…` : "none";
}

// ---------- Types ----------

export interface ResponseRecord {
  id: string;
  name: string | null;
  email: string;
  archetype_id: string;
  pq_score: number | null;
  scores: unknown;
  answers: unknown;
  free_text: unknown;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string;
  payment_id?: string | null;
}

export type Lookup<T> =
  | { status: "ok"; row: T }
  | { status: "missing" }
  | { status: "unavailable" }
  | { status: "unconfigured" };

export interface ResponseRow {
  name: string;
  email: string;
  archetypeId: string;
  pq: number;
  scores: { control: number; visibility: number; timeHorizon: number; powerSource: number };
  answers: { q: string; o: string; pos?: number; d: { control: number; visibility: number; timeHorizon: number; powerSource: number } }[];
  freeText: { questionId: string; text: string }[];
  userAgent?: string | null;
  ipAddress?: string | null;
  /** Optional columns added by supabase/migrations/20261018_hardening.sql. Dropped automatically if the migration has not been run. */
  marketingConsent?: boolean;
  attribution?: Record<string, string> | null;
}

// ---------- Writes ----------

/** Insert a quiz response. Returns the new row's UUID, or null if Supabase isn't configured. Throws if configured but failing. */
export async function saveResponseToSupabase(row: ResponseRow): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const core = {
    name: row.name,
    email: row.email,
    archetype_id: row.archetypeId,
    pq_score: row.pq,
    scores: row.scores,
    answers: row.answers,
    free_text: row.freeText,
    user_agent: row.userAgent ? row.userAgent.slice(0, 300) : null,
    ip_address: row.ipAddress ?? null,
    payment_status: "unpaid",
  };
  const optional = {
    marketing_consent: row.marketingConsent === true,
    consent_at: row.marketingConsent === true ? new Date().toISOString() : null,
    utm: row.attribution && Object.keys(row.attribution).length ? row.attribution : null,
  };

  const insert = (values: Record<string, unknown>) =>
    withRetry("insert response", () =>
      run<{ id: string } | null>(() => sb.from("responses").insert(values).select("id").single())
    );

  try {
    const data = await insert({ ...core, ...optional });
    return data?.id ?? null;
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    console.warn("[supabase] optional columns missing; run supabase/migrations/20261018_hardening.sql. Saving core fields only.");
    const data = await insert(core);
    return data?.id ?? null;
  }
}

/**
 * Mark a response paid. Records Dodo's payment_id when the column exists.
 * Returns how many rows changed; 0 means the response id does not exist.
 * Throws SupabaseUnavailableError when the database cannot be reached, so the
 * webhook can ask Dodo to retry.
 */
export async function markResponsePaid(responseId: string, paymentId: string | null): Promise<number> {
  const sb = getServerSupabase();
  if (!sb) throw new SupabaseUnavailableError("not configured");

  const base = { payment_status: "paid", paid_at: new Date().toISOString() };
  const update = (values: Record<string, unknown>) =>
    withRetry("mark paid", () =>
      run<{ id: string }[] | null>(() => sb.from("responses").update(values).eq("id", responseId).select("id"))
    );

  try {
    const rows = await update(paymentId ? { ...base, payment_id: paymentId } : base);
    return rows?.length ?? 0;
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    const rows = await update(base);
    return rows?.length ?? 0;
  }
}

export type RevokedStatus = "refunded" | "disputed" | "charged_back" | "paid";

/**
 * Change the payment status after a refund or dispute event. Finds the row by
 * Dodo payment_id (needs the migration) or, failing that, by response id.
 * Returns rows changed. Throws SupabaseUnavailableError on transport failure.
 */
export async function setPaymentStatus(
  match: { paymentId?: string | null; responseId?: string | null },
  status: RevokedStatus,
  /** Only change rows currently in this status (e.g. restore "paid" only from "disputed"). */
  onlyFrom?: string
): Promise<number> {
  const sb = getServerSupabase();
  if (!sb) throw new SupabaseUnavailableError("not configured");

  const apply = async (column: "payment_id" | "id", value: string) =>
    withRetry("set payment status", () =>
      run<{ id: string }[] | null>(() => {
        let q = sb.from("responses").update({ payment_status: status }).eq(column, value);
        if (onlyFrom) q = q.eq("payment_status", onlyFrom);
        return q.select("id");
      })
    );

  try {
    if (match.paymentId) {
      try {
        const rows = await apply("payment_id", match.paymentId);
        if (rows && rows.length) return rows.length;
      } catch (err) {
        if (!isMissingColumn(err)) throw err;
      }
    }
    if (match.responseId && isResponseId(match.responseId)) {
      const rows = await apply("id", match.responseId);
      return rows?.length ?? 0;
    }
    return 0;
  } catch (err) {
    if (isCheckViolation(err)) {
      console.error(`[supabase] payment_status '${status}' rejected by a CHECK constraint; run supabase/migrations/20261018_hardening.sql`);
      return 0;
    }
    throw err;
  }
}

// ---------- Reads ----------

/**
 * Read a response by id. Distinguishes missing from unreachable so callers can
 * answer 404 vs 503. Invalid ids short-circuit to "missing" without a query.
 */
export async function lookupResponse(responseId: string, columns = "*"): Promise<Lookup<ResponseRecord>> {
  if (!isResponseId(responseId)) return { status: "missing" };
  const sb = getServerSupabase();
  if (!sb) return { status: "unconfigured" };
  const read = (cols: string) =>
    withRetry("read response", () =>
      run<ResponseRecord | null>(() => sb.from("responses").select(cols).eq("id", responseId).maybeSingle() as unknown as PromiseLike<{ data: ResponseRecord | null; error: unknown }>)
    );
  try {
    let row: ResponseRecord | null;
    try {
      row = await read(columns);
    } catch (err) {
      // A column added by the migration may not exist yet; "*" always works.
      if (columns === "*" || !isMissingColumn(err)) throw err;
      row = await read("*");
    }
    return row ? { status: "ok", row } : { status: "missing" };
  } catch (err) {
    console.error(`[supabase] read response ${shortId(responseId)} failed:`, describe(err));
    return { status: "unavailable" };
  }
}

/**
 * Idempotency: if the same email submitted the same answers within the last
 * `minutes`, return that row's id instead of inserting a duplicate. Covers
 * double-taps, client retries after a timeout, and the background re-submit.
 */
export async function findRecentDuplicate(
  email: string,
  answers: { q: string; o: string }[],
  minutes = 30
): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const fingerprint = (list: { q: string; o: string }[]) =>
    list.map((a) => `${a.q}:${a.o}`).sort().join("|");
  const target = fingerprint(answers);
  try {
    const rows = await run<{ id: string; answers: unknown }[] | null>(() =>
      sb.from("responses").select("id, answers").eq("email", email).gte("created_at", since).order("created_at", { ascending: false }).limit(5)
    );
    for (const r of rows ?? []) {
      if (Array.isArray(r.answers) && fingerprint(r.answers as { q: string; o: string }[]) === target) return r.id;
    }
  } catch (err) {
    console.warn("[supabase] duplicate check failed; continuing:", describe(err));
  }
  return null;
}

/** Count rows matching column=value created in the last `hours`. Throws on failure. */
export async function countRecent(column: "email" | "ip_address", value: string, hours: number): Promise<number> {
  const sb = getServerSupabase();
  if (!sb) return 0;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const result = await sb
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", since);
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

// ---------- Maintenance ----------

/**
 * Privacy retention: IP address and user-agent are only needed for the
 * 24-hour abuse window. Clear them on rows older than `days`.
 */
export async function scrubOldNetworkData(days = 30): Promise<number> {
  const sb = getServerSupabase();
  if (!sb) return 0;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await run<{ id: string }[] | null>(() =>
    sb
      .from("responses")
      .update({ ip_address: null, user_agent: null })
      .lt("created_at", cutoff)
      .or("ip_address.not.is.null,user_agent.not.is.null")
      .select("id")
  );
  return rows?.length ?? 0;
}

export type PingResult = "ok" | "unreachable" | "rejected" | "unconfigured";

/**
 * Cheap reachability probe (reads one id). "rejected" means the database
 * answered but refused the query — a wrong key or a missing table — which is
 * a configuration problem, not a paused project.
 */
export async function pingSupabase(): Promise<PingResult> {
  const sb = getServerSupabase();
  if (!sb) return "unconfigured";
  try {
    await run(() => sb.from("responses").select("id").limit(1));
    return "ok";
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) return "unreachable";
    console.warn("[supabase] ping rejected:", describe(err));
    return "rejected";
  }
}
