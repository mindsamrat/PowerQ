import { NextResponse } from "next/server";
import { isResponseId, lookupResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Read-only status endpoint polled by /paid and the results page. Returns
 * only what those pages need — never name, email, answers, free text or IP.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResponseId(id)) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });

  const lookup = await lookupResponse(id, "id, archetype_id, pq_score, scores, payment_status, paid_at");
  if (lookup.status === "missing") return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });
  if (lookup.status !== "ok") {
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 503, headers: { ...NO_STORE, "Retry-After": "15" } });
  }

  const row = lookup.row;
  return NextResponse.json(
    {
      id: row.id,
      archetype_id: row.archetype_id,
      pq_score: row.pq_score,
      scores: row.scores,
      payment_status: row.payment_status,
      paid_at: row.paid_at,
    },
    { headers: NO_STORE }
  );
}
