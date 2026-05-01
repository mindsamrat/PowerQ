import { NextResponse } from "next/server";
import { getResponseById } from "@/lib/supabase-server";

export const runtime = "nodejs";

interface CheckoutRequest {
  responseId: string;
}

/**
 * Creates a Dodo Payments checkout session for the $3 PQ Full Report.
 *
 * Required env vars:
 *   DODO_API_KEY        - Bearer token from Dodo dashboard
 *   DODO_PRODUCT_ID     - the pdt_... id of the $3 product
 *   DODO_API_BASE       - https://live.dodopayments.com OR https://test.dodopayments.com
 *                         (defaults to live)
 *
 * Flow:
 *   1. Client POSTs { responseId } from /results
 *   2. We look up the response in Supabase to get the user's email
 *   3. We call Dodo to create a payment session, attaching response_id in
 *      metadata so the webhook can correlate the payment back to the row
 *   4. Return the hosted-checkout URL; client navigates the browser to it
 */
export async function POST(req: Request) {
  try {
    return await handleCheckout(req);
  } catch (err) {
    console.error("[checkout-dodo] uncaught", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

async function handleCheckout(req: Request) {
  const apiKey = process.env.DODO_API_KEY;
  const productId = process.env.DODO_PRODUCT_ID;
  const apiBase = process.env.DODO_API_BASE ?? "https://live.dodopayments.com";

  if (!apiKey || !productId) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Try again shortly." },
      { status: 503 }
    );
  }

  let body: Partial<CheckoutRequest>;
  try {
    body = (await req.json()) as Partial<CheckoutRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const responseId = body.responseId;
  if (!responseId || typeof responseId !== "string") {
    return NextResponse.json({ error: "Missing responseId." }, { status: 400 });
  }

  const response = await getResponseById(responseId);
  if (!response) {
    return NextResponse.json(
      { error: `Response ${responseId} not found in Supabase. The quiz response was not persisted.` },
      { status: 404 }
    );
  }

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/paid?response_id=${encodeURIComponent(responseId)}`;

  // Dodo's payments endpoint (one-time). Field names below match the
  // public Dodo API; if your dashboard surface uses different names,
  // these are the only places to adjust.
  const dodoPayload = {
    payment_link: true,
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: response.email,
    },
    billing: {
      country: "US",
    },
    return_url: returnUrl,
    metadata: {
      response_id: responseId,
      archetype_id: response.archetype_id,
      pq_score: String(response.pq_score),
    },
  };

  let dodoRes: Response;
  try {
    dodoRes = await fetch(`${apiBase}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(dodoPayload),
    });
  } catch (err) {
    console.error("[checkout-dodo] network error", err);
    return NextResponse.json(
      { error: "Could not reach payment processor. Try again." },
      { status: 502 }
    );
  }

  const dodoText = await dodoRes.text();
  let dodoData: { payment_link?: string; checkout_url?: string; url?: string; payment_id?: string; id?: string; message?: string } = {};
  try { dodoData = JSON.parse(dodoText); } catch { /* keep raw */ }

  if (!dodoRes.ok) {
    console.error("[checkout-dodo] Dodo error", dodoRes.status, dodoText);
    return NextResponse.json(
      { error: dodoData.message ?? "Payment session could not be created." },
      { status: 502 }
    );
  }

  // Dodo's response shape varies slightly across API versions; pick the first
  // url-shaped field we recognise.
  const checkoutUrl =
    dodoData.payment_link ?? dodoData.checkout_url ?? dodoData.url ?? null;

  if (!checkoutUrl) {
    console.error("[checkout-dodo] no checkout url in Dodo response", dodoData);
    return NextResponse.json(
      { error: "Payment session created but no redirect URL returned." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl,
    paymentId: dodoData.payment_id ?? dodoData.id ?? null,
  });
}
