/**
 * Everything the browser keeps between the quiz and the results page, in one
 * place so the two pages can never disagree about keys or shapes.
 *
 * A saved session is BOUND to the exact result it belongs to (archetype +
 * four scores + PQ). The results page only uses a session whose signature
 * matches its own URL, so a stale response id, a previous attempt, or a
 * friend's shared link can never sell or show the wrong report.
 *
 * Retention: entries carry savedAt and are actually deleted (not just
 * ignored) after 48 hours by purgeExpiredStorage(), which runs on every page.
 */

export interface StoredAnswer {
  q: string;
  o: string;
  d: { control: number; visibility: number; timeHorizon: number; powerSource: number };
  pos?: number;
}

export interface SessionRecord {
  /** Supabase response id, or null when the save is still pending. */
  id: string | null;
  sig: string;
  archetypeId: string;
  answers: StoredAnswer[];
  savedAt: number;
  /** The server served the result but declined to store it (daily limit). */
  limited?: boolean;
}

export interface ResultSignatureInput {
  archetypeId: string;
  control: number;
  visibility: number;
  timeHorizon: number;
  powerSource: number;
  pq: number;
}

const SESSION_KEY = "pq_session_v2";
const PENDING_KEY = "pq_pending_submit_v2";
export const PROGRESS_KEY = "pq_progress_v3";
export const ATTRIBUTION_KEY = "pq_attribution_v1";
export const RETENTION_MS = 1000 * 60 * 60 * 48;

/** Keys written by earlier versions of the site. Removed on sight. */
const LEGACY_KEYS = ["pq_progress_v2", "pq_last_response_v1", "pq_pending_submit_v1", "pq_response_id", "pq_answers_v1", "pq_freetext_v1"];

export function resultSignature(r: ResultSignatureInput): string {
  return [r.archetypeId, r.control, r.visibility, r.timeHorizon, r.powerSource, r.pq].join(":");
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function readJson<T>(storage: Storage, key: string): T | null {
  return safe(() => {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);
}

function fresh(savedAt: unknown): boolean {
  return typeof savedAt === "number" && Date.now() - savedAt <= RETENTION_MS;
}

/** Replace any previous session. Always called at quiz completion, saved or not. */
export function writeSession(record: SessionRecord): void {
  const value = JSON.stringify(record);
  safe(() => sessionStorage.setItem(SESSION_KEY, value), undefined);
  safe(() => localStorage.setItem(SESSION_KEY, value), undefined);
  for (const k of LEGACY_KEYS) {
    safe(() => sessionStorage.removeItem(k), undefined);
    safe(() => localStorage.removeItem(k), undefined);
  }
}

/** The session for this exact result, or null (shared link, other attempt, expired). */
export function readBoundSession(sig: string): SessionRecord | null {
  for (const storage of [safe(() => sessionStorage, null), safe(() => localStorage, null)]) {
    if (!storage) continue;
    const rec = readJson<SessionRecord>(storage, SESSION_KEY);
    if (rec && rec.sig === sig && fresh(rec.savedAt) && Array.isArray(rec.answers)) return rec;
  }
  return null;
}

/** Record the response id once a pending save succeeds — only for the matching result. */
export function setSessionId(sig: string, id: string): void {
  for (const storage of [safe(() => sessionStorage, null), safe(() => localStorage, null)]) {
    if (!storage) continue;
    const rec = readJson<SessionRecord>(storage, SESSION_KEY);
    if (rec && rec.sig === sig) safe(() => storage.setItem(SESSION_KEY, JSON.stringify({ ...rec, id })), undefined);
  }
}

export interface PendingSubmit {
  sig: string;
  payload: unknown;
  savedAt: number;
}

export function writePending(sig: string, payload: unknown): void {
  safe(() => localStorage.setItem(PENDING_KEY, JSON.stringify({ sig, payload, savedAt: Date.now() })), undefined);
}

export function readPending(sig: string): PendingSubmit | null {
  const rec = safe(() => readJson<PendingSubmit>(localStorage, PENDING_KEY), null);
  if (!rec || !fresh(rec.savedAt) || !rec.payload) return null;
  return rec.sig === sig ? rec : null;
}

export function clearPending(): void {
  safe(() => localStorage.removeItem(PENDING_KEY), undefined);
}

/** Delete expired or legacy entries. Runs once per page load. */
export function purgeExpiredStorage(): void {
  const local = safe(() => localStorage, null);
  if (!local) return;
  for (const k of LEGACY_KEYS) safe(() => local.removeItem(k), undefined);
  safe(() => sessionStorage, null) && LEGACY_KEYS.forEach((k) => safe(() => sessionStorage.removeItem(k), undefined));
  for (const key of [SESSION_KEY, PENDING_KEY, PROGRESS_KEY, ATTRIBUTION_KEY]) {
    const rec = readJson<{ savedAt?: unknown }>(local, key);
    if (rec && !fresh(rec.savedAt)) safe(() => local.removeItem(key), undefined);
  }
}

// ---------- Attribution (first touch) ----------

const ATTR_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Remember where this visitor first came from (Instagram post, story, bio link). */
export function captureAttribution(search: string, path: string): void {
  const local = safe(() => localStorage, null);
  if (!local) return;
  const existing = readJson<{ savedAt?: unknown }>(local, ATTRIBUTION_KEY);
  if (existing && fresh(existing.savedAt)) return;
  const params = new URLSearchParams(search);
  const data: Record<string, string> = {};
  for (const k of ATTR_PARAMS) {
    const v = params.get(k);
    if (v) data[k] = v.slice(0, 100);
  }
  if (params.get("fbclid")) data.ref = "facebook";
  if (params.get("igshid") || params.get("igsh")) data.ref = "instagram";
  const ref = safe(() => document.referrer, "");
  if (!data.ref && ref) {
    try {
      const host = new URL(ref).hostname;
      if (host && !host.endsWith(location.hostname)) data.ref = host.slice(0, 100);
    } catch { /* ignore */ }
  }
  data.landing = path.slice(0, 100);
  safe(() => local.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...data, savedAt: Date.now() })), undefined);
}

export function readAttribution(): Record<string, string> | null {
  const rec = safe(() => readJson<Record<string, unknown>>(localStorage, ATTRIBUTION_KEY), null);
  if (!rec || !fresh(rec.savedAt)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) if (k !== "savedAt" && typeof v === "string") out[k] = v;
  return Object.keys(out).length ? out : null;
}
