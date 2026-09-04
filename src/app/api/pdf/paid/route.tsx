import { getResponseById } from "@/lib/supabase-server";
import { renderPaidReport, type DbResponse } from "@/lib/paid-report";

export const runtime = "nodejs";

/**
 * Paid report endpoint. Gated on payment_status === "paid" (set by the Dodo
 * webhook). The renderer itself lives in lib/paid-report.tsx so it can be
 * exercised without Supabase (see scripts/pdf-smoke.ts).
 */
export async function GET(req: Request) {
  try {
    return await renderPaidPdf(req);
  } catch (err) {
    console.error("[pdf-paid] uncaught error", err);
    const message = err instanceof Error ? err.message : "unknown";
    const stack = err instanceof Error ? err.stack : undefined;
    const debug = new URL(req.url).searchParams.get("debug") === "1";
    return new Response(
      JSON.stringify({ error: "PDF generation failed", message, stack: debug ? stack : undefined }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function renderPaidPdf(req: Request) {
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get("id");
  if (!responseId) return new Response("Missing id", { status: 400 });

  const row = (await getResponseById(responseId)) as DbResponse | null;
  if (!row) return new Response("Response not found", { status: 404 });
  if (row.payment_status !== "paid") return new Response("Payment required", { status: 402 });

  const { pdf, filename } = await renderPaidReport(row);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
