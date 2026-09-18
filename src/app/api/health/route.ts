import { NextResponse } from "next/server";
import { isSupabaseConfigured, pingSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational status. Booleans only — no URLs, keys, counts, or user data —
 * so it is safe to leave public. Open https://quiz.wayofgods.com/api/health
 * to see at a glance whether the database is awake and payments are wired up.
 */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseReachable = supabaseConfigured ? await pingSupabase() : false;

  const apiBase = process.env.DODO_API_BASE ?? "https://live.dodopayments.com";

  const body = {
    ok: supabaseConfigured && supabaseReachable,
    database: {
      configured: supabaseConfigured,
      reachable: supabaseReachable,
      note: !supabaseConfigured
        ? "SUPABASE_URL / SUPABASE_SECRET_KEY are missing in this environment."
        : supabaseReachable
          ? "Database answered normally."
          : "Database did not answer. Most often the Supabase project is paused — open the Supabase dashboard and restore it.",
    },
    payments: {
      configured: !!(process.env.DODO_API_KEY && process.env.DODO_PRODUCT_ID),
      webhookConfigured: !!process.env.DODO_WEBHOOK_SECRET,
      mode: apiBase.includes("test") ? "test" : "live",
    },
    book: { linkConfigured: !!process.env.SOVEREIGN_DOCTRINE_URL?.trim() },
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
