import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getResponseById, markResponsePaid } from "@/lib/supabase-server";

export const runtime = "nodejs";

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Dodo Payments webhook handler.
 *
 * URL to register in Dodo dashboard:
 *   https://quiz.wayofgods.com/api/webhooks/dodo
 *
 * Subscribe to these events:
 *   - payment.succeeded   -> mark response paid
 *   - payment.failed      -> log only
 *   - payment.cancelled   -> log only
 *
 * Dodo uses the Standard Webhooks signing spec:
 *   https://github.com/standard-webhooks/standard-webhooks
 *   - Headers:  webhook-id, webhook-timestamp, webhook-signature
 *   - Body:     `${id}.${timestamp}.${rawBody}`
 *   - Algorithm: HMAC-SHA256, base64-encoded
 *   - Secret format: `whsec_<base64-encoded-key>` -> decode before signing
 *   - Signature header: "v1,<base64sig>" (or "v1,<sig> v2,<sig>" for multi)
 */
export async function POST(req: Request) {
  const secretRaw = process.env.DODO_WEBHOOK_SECRET;
  if (!secretRaw) {
    console.error("[dodo-webhook] DODO_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  const id = req.headers.get("webhook-id");
  const ts = req.headers.get("webhook-timestamp");
  const sigHeader = req.headers.get("webhook-signature");

  if (!id || !ts || !sigHeader) {
    console.warn("[dodo-webhook] missing standard webhook headers", {
      hasId: !!id, hasTs: !!ts, hasSig: !!sigHeader,
    });
    return NextResponse.json({ error: "missing standard webhook headers" }, { status: 401 });
  }

  // Replay protection: timestamp must be within +/- 5 minutes.
  const tsNumber = Number.parseInt(ts, 10);
  if (Number.isNaN(tsNumber)) {
    return NextResponse.json({ error: "bad timestamp" }, { status: 401 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNumber) > TOLERANCE_SECONDS) {
    console.warn("[dodo-webhook] stale event", { drift: now - tsNumber });
    return NextResponse.json({ error: "stale event" }, { status: 401 });
  }

  // Decode the signing key. Dodo gives the secret as `whsec_<base64-key>`.
  // The bytes used for HMAC are the base64-decoded part after that prefix.
  let signingKey: Buffer;
  if (secretRaw.startsWith("whsec_")) {
    signingKey = Buffer.from(secretRaw.slice(6), "base64");
  } else {
    // Fall back to using the secret as raw UTF-8 bytes if the prefix is absent.
    signingKey = Buffer.from(secretRaw, "utf8");
  }

  const signedContent = `${id}.${ts}.${rawBody}`;
  const expected = createHmac("sha256", signingKey).update(signedContent).digest("base64");

  // Header value can carry multiple versioned signatures: "v1,sig v2,sig".
  // Split on whitespace, strip each version prefix, compare to our v1 sig.
  const candidates = sigHeader.split(/\s+/).map((tok) => {
    const idx = tok.indexOf(",");
    return idx === -1 ? tok : tok.slice(idx + 1);
  });

  let ok = false;
  const expectedBuf = Buffer.from(expected);
  for (const cand of candidates) {
    const candBuf = Buffer.from(cand);
    if (candBuf.length === expectedBuf.length) {
      try {
        if (timingSafeEqual(candBuf, expectedBuf)) {
          ok = true;
          break;
        }
      } catch { /* ignore */ }
    }
  }

  if (!ok) {
    console.warn("[dodo-webhook] invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // ---- Parse + dispatch ----
  let event: { type?: string; event_type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = event.type ?? event.event_type ?? "";
  const data = (event.data ?? {}) as Record<string, unknown>;

  // Dodo nests `metadata` under different keys depending on the event shape:
  //   - data.metadata
  //   - data.object.metadata
  //   - data.payment.metadata
  //   - data (top-level on some versions)
  // Also try the top-level event object as a last resort.
  const metadataPaths: Record<string, unknown>[] = [];
  if (data.metadata && typeof data.metadata === "object") metadataPaths.push(data.metadata as Record<string, unknown>);
  if (data.object && typeof data.object === "object") {
    const obj = data.object as Record<string, unknown>;
    if (obj.metadata && typeof obj.metadata === "object") metadataPaths.push(obj.metadata as Record<string, unknown>);
  }
  if (data.payment && typeof data.payment === "object") {
    const pay = data.payment as Record<string, unknown>;
    if (pay.metadata && typeof pay.metadata === "object") metadataPaths.push(pay.metadata as Record<string, unknown>);
  }
  const eventTop = event as unknown as Record<string, unknown>;
  if (eventTop.metadata && typeof eventTop.metadata === "object") metadataPaths.push(eventTop.metadata as Record<string, unknown>);

  let responseId: string | null = null;
  for (const md of metadataPaths) {
    if (typeof md.response_id === "string") {
      responseId = md.response_id;
      break;
    }
  }

  console.log("[dodo-webhook] received", { type, responseId, metadataPaths: metadataPaths.length });

  if (type === "payment.succeeded" || type === "payment.completed") {
    if (!responseId) {
      console.warn("[dodo-webhook] succeeded event missing response_id metadata");
      return NextResponse.json({ ok: true, note: "no response_id" });
    }
    const existing = await getResponseById(responseId);
    if (existing?.payment_status === "paid") {
      return NextResponse.json({ ok: true, idempotent: true, responseId });
    }
    const updated = await markResponsePaid(responseId, "");
    return NextResponse.json({ ok: true, updated, responseId });
  }

  if (type === "payment.failed") {
    console.log("[dodo-webhook] payment.failed", { responseId });
    return NextResponse.json({ ok: true });
  }

  if (type === "payment.cancelled" || type === "payment.canceled") {
    console.log("[dodo-webhook] payment.cancelled", { responseId });
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
