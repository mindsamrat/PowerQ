import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Hit /api/debug/dodo to see EXACTLY what Dodo Payments returns when we
 * try to create a checkout session for the configured product. No Supabase
 * involvement; just a raw round-trip with a fake email so we can isolate
 * whether the failure is on the Dodo side (wrong API base, wrong endpoint,
 * wrong payload shape, wrong key) vs ours.
 */
export async function GET() {
  const apiKey = process.env.DODO_API_KEY;
  const productId = process.env.DODO_PRODUCT_ID;
  const apiBase = process.env.DODO_API_BASE ?? "https://live.dodopayments.com";

  if (!apiKey || !productId) {
    return NextResponse.json(
      { ok: false, missing: !apiKey ? "DODO_API_KEY" : "DODO_PRODUCT_ID" },
      { status: 503 }
    );
  }

  const payload = {
    payment_link: true,
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: "ping@example.com", name: "Ping Diagnostic" },
    billing: { country: "US", city: "N/A", state: "N/A", street: "N/A", zipcode: "00000" },
    return_url: "https://quiz.wayofgods.com/paid?ping=1",
    metadata: { response_id: "debug-ping" },
  };

  let res: Response;
  try {
    res = await fetch(`${apiBase}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "fetch",
      apiBase,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { /* leave raw */ }

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    apiBase,
    endpoint: `${apiBase}/payments`,
    response: parsed ?? text,
  });
}
