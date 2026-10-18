import { NextResponse } from "next/server";
import { isResponseId, lookupResponse, shortId } from "@/lib/supabase-server";
import { createWindowLimiter, dodoConfig, readJsonBody, rejectCrossSite } from "@/lib/http";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Creates a Dodo Payments hosted checkout for the paid PQ report.
 *
 * Env: DODO_API_KEY, DODO_PRODUCT_ID, optional DODO_API_BASE
 * (https://test.dodopayments.com for test mode; defaults to live).
 *
 * Flow: client POSTs { responseId } -> we confirm the row exists and is unpaid
 * -> create a Dodo payment link with metadata.response_id -> client navigates
 * to it. Fulfilment happens in the webhook (and /api/payments/verify).
 */

// Per-instance throttles. Per response stops one leaked id from minting
// unlimited sessions; per network is generous because of carrier NAT.
const perResponse = createWindowLimiter(10, 60 * 60 * 1000);
const perNetwork = createWindowLimiter(60, 60 * 60 * 1000);

const DODO_TIMEOUT_MS = 15000;

export async function POST(req: Request) {
  try {
    return await handleCheckout(req);
  } catch (err) {
    console.error("[checkout] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Checkout is unavailable right now. Please try again in a moment." }, { status: 500 });
  }
}

function customerName(stored: unknown, email: string): string {
  const name = typeof stored === "string" ? stored.trim().slice(0, 60) : "";
  if (name.length >= 2) return name;
  const derived = (email.split("@")[0] ?? "")
    .replace(/[._\-+]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return derived || "Customer";
}

/** Two-letter country from Vercel's geo header, used so Dodo can offer local tax/currency/methods. */
function buyerCountry(req: Request): string | null {
  const c = (req.headers.get("x-vercel-ip-country") ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

async function createDodoPayment(apiBase: string, apiKey: string, payload: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${apiBase}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(DODO_TIMEOUT_MS),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON error page */ }
  return { status: res.status, data };
}

async function handleCheckout(req: Request) {
  const refused = rejectCrossSite(req);
  if (refused) return refused;

  const { apiKey, productId, apiBase } = dodoConfig();
  if (!apiKey || !productId) {
    console.error("[checkout] DODO_API_KEY or DODO_PRODUCT_ID is not set");
    return NextResponse.json({ error: "Payments aren't configured yet. Try again shortly." }, { status: 503 });
  }

  const parsed = await readJsonBody(req, 2048);
  if ("error" in parsed) return parsed.error;
  const responseId = parsed.body.responseId;
  if (!isResponseId(responseId)) {
    return NextResponse.json({ error: "We couldn't find your saved result. Retake the assessment to unlock the report." }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (!perResponse(responseId) || (ip && !perNetwork(ip))) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const lookup = await lookupResponse(responseId, "id, name, email, payment_status");
  if (lookup.status === "missing") {
    return NextResponse.json({ error: "We couldn't find your saved result. Retake the assessment to unlock the report." }, { status: 404 });
  }
  if (lookup.status !== "ok") {
    return NextResponse.json(
      { error: "Our database is waking up. Try again in a minute — nothing has been charged." },
      { status: 503, headers: { "Retry-After": "30" } }
    );
  }
  const row = lookup.row;

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/paid?response_id=${encodeURIComponent(responseId)}`;

  // Idempotency: never sell the same report twice.
  if (row.payment_status === "paid") {
    return NextResponse.json({ ok: true, checkoutUrl: returnUrl, alreadyPaid: true });
  }

  // Dodo's CustomerRequest needs { email, name } for a new customer. Billing
  // fields are required by this endpoint; the country drives tax, currency and
  // local payment methods (UPI for India), so it comes from the buyer's
  // location, not a placeholder.
  const basePayload = {
    payment_link: true,
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: row.email, name: customerName(row.name, row.email) },
    return_url: returnUrl,
    // Only the reference needed to fulfil. No scores or profile data leave us.
    metadata: { response_id: responseId },
  };
  const billingFor = (country: string) => ({ country, city: "N/A", state: "N/A", street: "N/A", zipcode: "00000" });

  const country = buyerCountry(req);
  let result: { status: number; data: Record<string, unknown> };
  try {
    result = await createDodoPayment(apiBase, apiKey, { ...basePayload, billing: billingFor(country ?? "US") });
    // If Dodo rejects the local country with placeholder address fields, fall
    // back to the configuration that is known to work rather than losing the sale.
    if (result.status === 422 && country && country !== "US") {
      console.warn(`[checkout] Dodo rejected billing country ${country}; retrying with US`);
      result = await createDodoPayment(apiBase, apiKey, { ...basePayload, billing: billingFor("US") });
    }
  } catch (err) {
    console.error("[checkout] could not reach Dodo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not reach the payment processor. Try again in a moment." }, { status: 502 });
  }

  if (result.status < 200 || result.status >= 300) {
    // Log the status and Dodo's short message only (the body can echo customer details).
    const message = typeof result.data.message === "string" ? result.data.message.slice(0, 200) : "";
    console.error(`[checkout] Dodo error ${result.status} for ${shortId(responseId)}: ${message}`);
    return NextResponse.json({ error: "The payment page could not be opened. Please try again in a moment." }, { status: 502 });
  }

  const pick = (k: string) => (typeof result.data[k] === "string" ? (result.data[k] as string) : null);
  const checkoutUrl = pick("payment_link") ?? pick("checkout_url") ?? pick("url");
  if (!checkoutUrl || !/^https:\/\//.test(checkoutUrl)) {
    console.error(`[checkout] Dodo returned no usable checkout URL for ${shortId(responseId)}`);
    return NextResponse.json({ error: "The payment page could not be opened. Please try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, checkoutUrl, paymentId: pick("payment_id") ?? pick("id") });
}
