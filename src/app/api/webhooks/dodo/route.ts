import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fulfilPayment, isPaymentId } from "@/lib/fulfilment";
import { setPaymentStatus, SupabaseUnavailableError, shortId, type RevokedStatus } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const TOLERANCE_SECONDS = 5 * 60;
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Dodo Payments webhook.
 *
 * Register in the Dodo dashboard (same mode as DODO_API_KEY):
 *   https://quiz.wayofgods.com/api/webhooks/dodo
 * Subscribe to: payment.succeeded, refund.succeeded, dispute.opened,
 *   dispute.won, dispute.lost, dispute.accepted, dispute.cancelled, dispute.expired
 *
 * Signing follows Standard Webhooks (https://www.standardwebhooks.com):
 * headers webhook-id / webhook-timestamp / webhook-signature, HMAC-SHA256 over
 * `${id}.${timestamp}.${rawBody}` with the base64 key after "whsec_".
 *
 * Status codes: 2xx = handled (Dodo stops), 401 = bad signature,
 * 503 = temporary problem on our side (Dodo retries with backoff).
 */

function signingKey(): Buffer | null {
  const raw = process.env.DODO_WEBHOOK_SECRET?.trim();
  if (!raw) return null;
  if (raw.startsWith("whsec_")) {
    const key = Buffer.from(raw.slice(6), "base64");
    return key.length ? key : null;
  }
  return Buffer.from(raw, "utf8");
}

function verifySignature(key: Buffer, id: string, ts: string, body: string, header: string): boolean {
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64"));
  for (const token of header.split(/\s+/)) {
    const comma = token.indexOf(",");
    const version = comma === -1 ? "" : token.slice(0, comma);
    const sig = comma === -1 ? token : token.slice(comma + 1);
    if (version && version !== "v1") continue;
    const candidate = Buffer.from(sig);
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

/** Look for metadata in the places Dodo has used across API versions. */
function findMetadata(data: Record<string, unknown>, event: Record<string, unknown>): Record<string, unknown> {
  const candidates = [data.metadata, (data.object as Record<string, unknown> | undefined)?.metadata, (data.payment as Record<string, unknown> | undefined)?.metadata, event.metadata];
  for (const c of candidates) if (c && typeof c === "object" && !Array.isArray(c)) return c as Record<string, unknown>;
  return {};
}

const REVOKE: Record<string, RevokedStatus> = {
  "refund.succeeded": "refunded",
  "dispute.opened": "disputed",
  "dispute.challenged": "disputed",
  "dispute.lost": "charged_back",
  "dispute.accepted": "charged_back",
  "dispute.won": "paid",
  "dispute.cancelled": "paid",
  "dispute.expired": "paid",
};

export async function POST(req: Request) {
  const key = signingKey();
  if (!key) {
    console.error("[dodo-webhook] DODO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "payload too large" }, { status: 413 });

  const id = req.headers.get("webhook-id");
  const ts = req.headers.get("webhook-timestamp");
  const sigHeader = req.headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) {
    return NextResponse.json({ error: "missing standard webhook headers" }, { status: 401 });
  }

  const tsNumber = Number.parseInt(ts, 10);
  if (!/^\d+$/.test(ts) || Math.abs(Math.floor(Date.now() / 1000) - tsNumber) > TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "stale or invalid timestamp" }, { status: 401 });
  }

  if (!verifySignature(key, id, ts, rawBody, sigHeader)) {
    console.warn("[dodo-webhook] invalid signature (check DODO_WEBHOOK_SECRET matches this endpoint and mode)");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    event = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = typeof event.type === "string" ? event.type : typeof event.event_type === "string" ? event.event_type : "";
  const data = (event.data && typeof event.data === "object" ? event.data : {}) as Record<string, unknown>;
  const metadata = findMetadata(data, event);
  const responseId = typeof metadata.response_id === "string" ? metadata.response_id : null;
  const paymentId = isPaymentId(data.payment_id) ? data.payment_id : null;

  console.log(`[dodo-webhook] ${type} response=${shortId(responseId)} payment=${paymentId ?? "none"}`);

  if (type === "payment.succeeded" || type === "payment.completed") {
    const outcome = await fulfilPayment(
      { responseId, paymentId, status: data.status, productCart: data.product_cart, businessId: event.business_id ?? data.business_id },
      "webhook"
    );
    if (outcome === "retry") {
      return NextResponse.json({ ok: false, error: "temporarily unavailable; retry" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, outcome });
  }

  if (type in REVOKE) {
    try {
      const target = REVOKE[type];
      // A won/cancelled/expired dispute restores access only to rows still marked disputed.
      const changed = await setPaymentStatus({ paymentId, responseId }, target, target === "paid" ? "disputed" : undefined);
      if (changed === 0) console.warn(`[dodo-webhook] ${type}: no matching response for payment ${paymentId ?? "none"}`);
      return NextResponse.json({ ok: true, changed });
    } catch (err) {
      if (err instanceof SupabaseUnavailableError) {
        return NextResponse.json({ ok: false, error: "temporarily unavailable; retry" }, { status: 503 });
      }
      console.error(`[dodo-webhook] ${type} update failed:`, err instanceof Error ? err.message : err);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  }

  // payment.failed, payment.cancelled, payment.processing and anything else: nothing to do.
  return NextResponse.json({ ok: true, ignored: type });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Dodo Payments webhook endpoint. POST signed events here." });
}
