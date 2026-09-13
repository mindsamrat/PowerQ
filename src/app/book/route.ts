import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FALLBACK_URL = "https://wayofgods.com";

/**
 * /book — the single link every "Buy Sovereign Doctrine" button points to.
 *
 * Redirects to SOVEREIGN_DOCTRINE_URL (set in Vercel) so the destination can
 * be changed without a deploy. Adds UTM tags so the shop's analytics can see
 * which archetype and which surface (results page, paid page, PDF) sent the
 * click. Query params accepted: ?from=results|paid|pdf  ?archetype=<id>
 */
export function GET(req: Request) {
  const configured = process.env.SOVEREIGN_DOCTRINE_URL?.trim();
  let target: URL;
  try {
    target = new URL(configured && /^https?:\/\//i.test(configured) ? configured : FALLBACK_URL);
  } catch {
    target = new URL(FALLBACK_URL);
  }

  const incoming = new URL(req.url).searchParams;
  const from = (incoming.get("from") ?? "results").replace(/[^a-z]/gi, "").slice(0, 16) || "results";
  const archetype = (incoming.get("archetype") ?? "").replace(/[^a-z]/gi, "").slice(0, 16);

  target.searchParams.set("utm_source", "pq");
  target.searchParams.set("utm_medium", from);
  target.searchParams.set("utm_campaign", "sovereign-doctrine");
  if (archetype) target.searchParams.set("utm_content", archetype);

  return NextResponse.redirect(target.toString(), { status: 302, headers: { "Cache-Control": "no-store" } });
}
