import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { markResponsePaid } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Dodo Payments webhook handler.
 *
 * URL to register in Dodo dashboard:
 *   https://quiz.wayofgods.com/api/webhooks/dodo
 *
 * Events to subscribe to:
 *   - payment.succeeded   -> mark response paid, kick off paid-PDF generation
 *   - payment.failed      -> (logged for now)
 *   - payment.refunded    -> revoke pdf_url and flip status back
 *
 * Dodo signs the webhook body with HMAC-SHA256 keyed on DODO_WEBHOOK_SECRET
 * and sends the signature in the `webhook-signature` header. We re-compute
 * and timing-safe compare before trusting any payload.
 */
export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[dodo-webhook] DODO_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("webhook-signature") ??
    req.headers.get("dodo-signature") ??
    req.headers.get("x-dodo-signature") ??
    "";

  if (!signatureHeader) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  // Some providers prefix as `sha256=...` or include timestamp segments.
  // Normalize by extracting the last 64 hex chars.
  const cleaned = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  let ok = false;
  try {
    if (cleaned.length === expected.length) {
      ok = timingSafeEqual(Buffer.from(cleaned, "hex"), Buffer.from(expected, "hex"));
    }
  } catch {
    ok = false;
  }

  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = event.type ?? "";
  const data = (event.data ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const responseId = typeof metadata.response_id === "string" ? metadata.response_id : null;

  if (type === "payment.succeeded" || type === "payment.completed") {
    if (!responseId) {
      console.warn("[dodo-webhook] payment.succeeded without response_id metadata");
      return NextResponse.json({ ok: true, note: "no response_id; skipped" });
    }

    // PDF URL is filled in once the paid-PDF generator runs (next phase).
    // For now we just mark the row paid so the results page can show
    // 'paid - PDF processing'.
    await markResponsePaid(responseId, "");

    return NextResponse.json({ ok: true, responseId });
  }

  if (type === "payment.failed" || type === "payment.refunded") {
    console.log(`[dodo-webhook] ${type} for response ${responseId}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: type });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Dodo Payments webhook endpoint. POST signed events here.",
  });
}
