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
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    null
  );
}
