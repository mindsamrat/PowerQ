import { NextResponse } from "next/server";
import { pingSupabaseDetail, supabaseKeyKind } from "@/lib/supabase-server";
import { dodoConfig } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational status. Booleans and plain-language notes only — no URLs, keys,
 * counts or user data — so it is safe to leave public. Open
 * https://quiz.wayofgods.com/api/health to see whether the database is awake
 * and payments are wired up.
 */
const DB_NOTES: Record<string, string> = {
  ok: "Database answered normally.",
  unreachable: "Database did not answer. Most often the Supabase project is paused — open the Supabase dashboard and restore it.",
  rejected: "Database answered but refused the query. Check that SUPABASE_SECRET_KEY is the project's secret (service-role) key and that the 'responses' table exists.",
  unconfigured: "SUPABASE_URL / SUPABASE_SECRET_KEY are missing in this environment.",
};

/** The answer is reused for 10 s per instance: refreshing is fine, spamming can't reach the database. */
let recent: { at: number; result: Awaited<ReturnType<typeof pingSupabaseDetail>> } | null = null;

export async function GET() {
  if (!recent || Date.now() - recent.at > 10_000) recent = { at: Date.now(), result: await pingSupabaseDetail() };
  const { state: db, code: dbCode } = recent.result;
  const keyKind = supabaseKeyKind();
  const { apiKey, productId, mode } = dodoConfig();
  const isProduction = process.env.VERCEL_ENV === "production";

  const warnings: string[] = [];
  if (keyKind === "public") {
    warnings.push("SUPABASE_SECRET_KEY holds the PUBLIC (anon / publishable) key. Nothing can be saved with it. In Supabase → Project Settings → API Keys, copy the key labelled “secret” (or “service_role”) into SUPABASE_SECRET_KEY in Vercel and redeploy.");
  }
  if (db === "rejected" && dbCode === "42P01") warnings.push("The 'responses' table does not exist in this Supabase project.");
  if (db === "rejected" && (dbCode === "42501" || dbCode === "PGRST301")) warnings.push("Supabase refused permission. Use the SECRET (service-role) key in SUPABASE_SECRET_KEY.");
  if (isProduction && mode === "test") {
    warnings.push("Payments are in TEST mode on the live site: anyone can 'buy' with a test card. Remove DODO_API_BASE and use live keys.");
  }
  if (!process.env.DODO_WEBHOOK_SECRET?.trim()) warnings.push("DODO_WEBHOOK_SECRET is not set; paid reports will not unlock automatically.");

  const body = {
    ok: db === "ok",
    database: { configured: db !== "unconfigured", reachable: db === "ok", state: db, errorCode: dbCode, keyType: keyKind, note: DB_NOTES[db] },
    payments: {
      configured: !!(apiKey && productId),
      webhookConfigured: !!process.env.DODO_WEBHOOK_SECRET?.trim(),
      mode,
    },
    book: { linkConfigured: !!process.env.SOVEREIGN_DOCTRINE_URL?.trim() },
    warnings,
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
