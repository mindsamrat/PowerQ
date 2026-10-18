import { NextResponse } from "next/server";
import { fulfilPayment, isPaymentId } from "@/lib/fulfilment";
import { createWindowLimiter, dodoConfig, readJsonBody, rejectCrossSite } from "@/lib/http";
import { isResponseId, lookupResponse, shortId } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Fallback fulfilment when the webhook is slow, lost or misconfigured.
 *
 * Dodo appends ?payment_id=…&status=… to the return URL. /paid posts them
 * here; we ask Dodo directly (GET /payments/{id}) and fulfil only if Dodo
 * itself says the payment succeeded, for this response, for this product.
 * The browser's claim is never trusted on its own. If Dodo's answer is not
 * a clear yes, nothing changes and the webhook remains the source of truth.
 */

const limiter = createWindowLimiter(12, 60 * 1000);

export async function POST(req: Request) {
  const refused = rejectCrossSite(req);
  if (refused) return refused;

  const parsed = await readJsonBody(req, 1024);
  if ("error" in parsed) return parsed.error;
  const { responseId, paymentId } = parsed.body;
  if (!isResponseId(responseId) || !isPaymentId(paymentId)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  if (!limiter(responseId)) {
    return NextResponse.json({ paid: false, error: "slow down" }, { status: 429, headers: { "Retry-After": "30" } });
  }

  const current = await lookupResponse(responseId, "id, payment_status");
  if (current.status === "missing") return NextResponse.json({ paid: false }, { status: 404 });
  if (current.status !== "ok") return NextResponse.json({ paid: false, retry: true }, { status: 503 });
  if (current.row.payment_status === "paid") return NextResponse.json({ paid: true });

  const { apiKey, apiBase } = dodoConfig();
  if (!apiKey) return NextResponse.json({ paid: false }, { status: 503 });

  let payment: Record<string, unknown>;
  try {
    const res = await fetch(`${apiBase}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (res.status === 404) return NextResponse.json({ paid: false });
    if (!res.ok) {
      console.warn(`[verify] Dodo returned ${res.status} for ${paymentId}`);
      return NextResponse.json({ paid: false, retry: true }, { status: 502 });
    }
    payment = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn("[verify] could not reach Dodo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ paid: false, retry: true }, { status: 502 });
  }

  const metadata = (payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {}) as Record<string, unknown>;
  // Strict here: this path is triggered by the browser, so Dodo must positively
  // confirm success and that the payment carries this exact response id.
  if (payment.status !== "succeeded" || metadata.response_id !== responseId) {
    console.warn(`[verify] not confirming ${shortId(responseId)}: status=${String(payment.status)} metadataMatch=${metadata.response_id === responseId}`);
    return NextResponse.json({ paid: false, status: typeof payment.status === "string" ? payment.status : null });
  }

  const outcome = await fulfilPayment(
    { responseId, paymentId, status: payment.status, productCart: payment.product_cart, businessId: payment.business_id },
    "verify"
  );
  if (outcome === "retry") return NextResponse.json({ paid: false, retry: true }, { status: 503 });
  return NextResponse.json({ paid: outcome === "fulfilled" || outcome === "already_paid" });
}
