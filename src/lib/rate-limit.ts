import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Per-IP rate limit backed by the `responses` table. Counts how many rows
 * have been created from this IP in the given window. Soft-fails (allows
 * the request) when Supabase is unreachable so a transient DB blip doesn't
 * lock real users out.
 */
export async function checkResponsesPerIp(
  ip: string | null,
  max: number,
  windowHours: number
): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
  if (!ip) return { allowed: true, count: 0, retryAfterSeconds: 0 };

  const sb = getServerSupabase();
  if (!sb) return { allowed: true, count: 0, retryAfterSeconds: 0 };

  const sinceMs = Date.now() - windowHours * 3_600_000;
  const since = new Date(sinceMs).toISOString();

  const { count, error } = await sb
    .from("responses")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", since);

  if (error) {
    console.warn("[rate-limit] check failed; allowing", error.message);
    return { allowed: true, count: 0, retryAfterSeconds: 0 };
  }

  const seen = count ?? 0;
  if (seen >= max) {
    return {
      allowed: false,
      count: seen,
      retryAfterSeconds: windowHours * 3600,
    };
  }
  return { allowed: true, count: seen, retryAfterSeconds: 0 };
}

/**
 * Pulls the client IP out of the request. Prefer x-forwarded-for (the first
 * entry is the real client; later ones are proxies) and fall back to other
 * common header names. Returns null when we genuinely can't tell.
 *
 * Always passes the result through sanitizeIp() so the value is acceptable
 * to Postgres `inet` columns (strips port suffixes, IPv6 brackets, rejects
 * malformed strings).
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  let raw: string | null = null;
  if (xff) {
    raw = xff.split(",")[0]?.trim() ?? null;
  }
  if (!raw) {
    raw =
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      null;
  }
  return sanitizeIp(raw);
}

/**
 * Make a header-supplied IP safe to write into a Postgres `inet` column.
 * Returns null instead of throwing so a malformed header never blocks a real
 * quiz completion.
 */
export function sanitizeIp(raw: string | null): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v) return null;

  // IPv6 in brackets — strip them. `[::1]:8080` -> `::1`.
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end > 0) v = v.slice(1, end);
  }

  // IPv4 with a port. `1.2.3.4:5678` -> `1.2.3.4`.
  // IPv6 also uses colons so don't strip those.
  if (v.split(".").length === 4 && v.includes(":")) {
    v = v.split(":")[0];
  }

  const isV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
  const isV6 = /^[0-9a-f:]+$/i.test(v) && v.includes(":");

  if (!isV4 && !isV6) return null;

  // Final bound check on IPv4 octets.
  if (isV4) {
    const octets = v.split(".").map((n) => Number(n));
    if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  }

  return v;
}
