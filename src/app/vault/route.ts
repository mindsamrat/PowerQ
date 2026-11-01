import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * /vault — every "See the Vault" button points here. Redirects to VAULT_URL
 * (set in Vercel) with UTM tags, like /book. Unset: back to the homepage,
 * so an old link never breaks.
 */
export function GET(req: Request) {
  const configured = process.env.VAULT_URL?.trim();
  let target: URL;
  try {
    target = new URL(configured && /^https?:\/\//i.test(configured) ? configured : new URL("/", req.url).toString());
  } catch {
    target = new URL("/", req.url);
  }

  const incoming = new URL(req.url).searchParams;
  const from = (incoming.get("from") ?? "paid").replace(/[^a-z]/gi, "").slice(0, 16) || "paid";
  const archetype = (incoming.get("archetype") ?? "").replace(/[^a-z]/gi, "").slice(0, 16);

  if (configured) {
    target.searchParams.set("utm_source", "pq");
    target.searchParams.set("utm_medium", from);
    target.searchParams.set("utm_campaign", "vault");
    if (archetype) target.searchParams.set("utm_content", archetype);
  }

  return NextResponse.redirect(target.toString(), { status: 302, headers: { "Cache-Control": "no-store" } });
}
