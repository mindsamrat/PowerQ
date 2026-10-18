import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { pingSupabase, scrubOldNetworkData } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Daily maintenance, scheduled in vercel.json.
 *  1. A real query keeps the Supabase free-tier project from pausing.
 *  2. IP addresses and user agents older than 30 days are cleared: they are
 *     only needed for the 24-hour abuse window (see the privacy policy).
 *
 * When CRON_SECRET is set in Vercel, Vercel sends it as a Bearer token and
 * other callers are refused. Both tasks are idempotent and harmless, so the
 * route still works (and keeps the project awake) if CRON_SECRET is unset.
 */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const header = req.headers.get("authorization") ?? "";
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const db = await pingSupabase();
  let scrubbed: number | null = null;
  if (db === "ok") {
    try {
      scrubbed = await scrubOldNetworkData(30);
    } catch (err) {
      console.error("[cron] retention cleanup failed:", err instanceof Error ? err.message : err);
    }
  }
  console.log(`[cron] database=${db} scrubbed=${scrubbed ?? "skipped"}`);
  return NextResponse.json({ ok: db === "ok", database: db, scrubbed }, { status: db === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
