import { isIP } from "node:net";
import { countRecent } from "@/lib/supabase-server";

/**
 * Submission limits. The point is to stop scripted abuse (thousands of fake
 * leads), never to stop a person: mobile carriers in India and the US put
 * many strangers behind one IPv4 address (CGNAT), so the per-network ceiling
 * is deliberately high and the tight limit is per email.
 */
export const LIMITS = {
  perEmailPerDay: 6,
  perNetworkPerDay: 60,
} as const;

export interface LimitCheck {
  allowed: boolean;
  reason?: "email" | "network";
}

/** Soft-fails open: a database problem must never block a genuine completion. */
export async function checkSubmissionLimits(email: string, ip: string | null): Promise<LimitCheck> {
  try {
    const [byEmail, byNetwork] = await Promise.all([
      countRecent("email", email, 24),
      ip ? countRecent("ip_address", ip, 24) : Promise.resolve(0),
    ]);
    if (byEmail >= LIMITS.perEmailPerDay) return { allowed: false, reason: "email" };
    if (byNetwork >= LIMITS.perNetworkPerDay) return { allowed: false, reason: "network" };
    return { allowed: true };
  } catch (err) {
    console.warn("[rate-limit] check failed; allowing:", err instanceof Error ? err.message : err);
    return { allowed: true };
  }
}

/**
 * The client's address as seen by Vercel's edge. Vercel sets
 * x-vercel-forwarded-for and x-real-ip itself (clients cannot spoof them), so
 * they are preferred over the first x-forwarded-for entry.
 *
 * The result is normalised for storage and rate limiting: IPv4 as-is, IPv6
 * reduced to its /64 network, since one subscriber controls a whole /64 and
 * rotates the rest for privacy.
 */
export function getClientIp(req: Request): string | null {
  const headers = ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for", "cf-connecting-ip"];
  for (const name of headers) {
    const value = req.headers.get(name);
    if (!value) continue;
    const ip = sanitizeIp(value.split(",")[0]?.trim() ?? null);
    if (ip) return ip;
  }
  return null;
}

/**
 * Make a header-supplied IP safe for a Postgres `inet` column and useful as a
 * rate-limit key. Returns null for anything that is not an IP.
 */
export function sanitizeIp(raw: string | null): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v || v.length > 64) return null;

  // "[::1]:8080" -> "::1"
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end <= 0) return null;
    v = v.slice(1, end);
  }
  // "1.2.3.4:5678" -> "1.2.3.4" (IPv6 also contains colons, so only for dotted quads)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) v = v.split(":")[0];
  // Zone index ("fe80::1%eth0") is not valid in inet.
  v = v.replace(/%.*$/, "");

  const family = isIP(v);
  if (family === 4) return v;
  if (family !== 6) return null;

  // IPv4-mapped IPv6 ("::ffff:1.2.3.4") is really IPv4.
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped && isIP(mapped[1]) === 4) return mapped[1];

  return ipv6Network64(v);
}

/** "2001:db8:1:2:aaaa:bbbb:cccc:dddd" -> "2001:db8:1:2::" */
function ipv6Network64(v: string): string | null {
  const [head, tail = ""] = v.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = v.includes("::") ? (tail ? tail.split(":") : []) : [];
  // An embedded dotted quad occupies two hextets; it only ever appears at the end, so the /64 prefix is unaffected.
  const tailCount = tailParts.reduce((n, p) => n + (p.includes(".") ? 2 : 1), 0);
  const missing = 8 - headParts.length - tailCount;
  if (!v.includes("::") && headParts.length !== 8 && !headParts.some((p) => p.includes("."))) return null;
  const full = [...headParts, ...Array(Math.max(0, missing)).fill("0"), ...tailParts];
  const prefix = full.slice(0, 4).map((h) => (h.includes(".") ? "0" : h || "0"));
  if (prefix.length < 4 || prefix.some((h) => !/^[0-9a-f]{1,4}$/i.test(h))) return null;
  return `${prefix.map((h) => h.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::`;
}
