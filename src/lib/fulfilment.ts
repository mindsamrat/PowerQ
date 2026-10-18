import { isResponseId, lookupResponse, markResponsePaid, shortId, SupabaseUnavailableError } from "@/lib/supabase-server";
import { dodoConfig } from "@/lib/http";

/**
 * One fulfilment path for the paid report, shared by the Dodo webhook and the
 * client-triggered verification endpoint, so the two can never disagree about
 * what counts as a valid purchase.
 */

export interface PaymentFacts {
  responseId: unknown;
  paymentId: unknown;
  /** Dodo payment status, when the source provides it. */
  status?: unknown;
  /** Dodo product_cart, when the source provides it. */
  productCart?: unknown;
  /** Dodo business id, when the source provides it. */
  businessId?: unknown;
}

export type FulfilOutcome =
  | "fulfilled"        // row marked paid just now
  | "already_paid"     // idempotent repeat
  | "not_ours"         // wrong product / business / not succeeded: ignore
  | "missing"          // no such response row: cannot fulfil
  | "retry";           // database unreachable: caller should ask for a retry

/** Payment ids from Dodo look like "pay_XXXXXXXX". */
export function isPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^pay_[A-Za-z0-9]{6,64}$/.test(value);
}

/** Checks we can make from the payment object itself. Lenient only where Dodo omits a field. */
export function paymentMatchesProduct(facts: PaymentFacts): { ok: boolean; reason?: string } {
  const { productId } = dodoConfig();
  if (typeof facts.status === "string" && facts.status !== "succeeded") {
    return { ok: false, reason: `status ${facts.status}` };
  }
  const expectedBusiness = process.env.DODO_BUSINESS_ID?.trim();
  if (expectedBusiness && typeof facts.businessId === "string" && facts.businessId !== expectedBusiness) {
    return { ok: false, reason: "different business" };
  }
  if (productId && Array.isArray(facts.productCart) && facts.productCart.length > 0) {
    const hasProduct = facts.productCart.some(
      (item) => item && typeof item === "object" && (item as { product_id?: unknown }).product_id === productId
    );
    if (!hasProduct) return { ok: false, reason: "different product" };
  }
  return { ok: true };
}

export async function fulfilPayment(facts: PaymentFacts, source: "webhook" | "verify"): Promise<FulfilOutcome> {
  if (!isResponseId(facts.responseId)) {
    console.warn(`[fulfil:${source}] payment without a valid response_id; ignoring`);
    return "not_ours";
  }
  const responseId = facts.responseId;
  const paymentId = isPaymentId(facts.paymentId) ? facts.paymentId : null;

  const check = paymentMatchesProduct(facts);
  if (!check.ok) {
    console.warn(`[fulfil:${source}] ignoring payment for ${shortId(responseId)}: ${check.reason}`);
    return "not_ours";
  }

  const resolved = await lookupResponse(responseId, "id, payment_status, payment_id");
  if (resolved.status === "missing") {
    console.error(`[fulfil:${source}] PAID FOR A MISSING RESPONSE ${shortId(responseId)} (payment ${paymentId ?? "unknown"}). Refund manually.`);
    return "missing";
  }
  if (resolved.status !== "ok") return "retry";

  if (resolved.row.payment_status === "paid") {
    const stored = resolved.row.payment_id ?? null;
    if (paymentId && stored && stored !== paymentId) {
      console.error(`[fulfil:${source}] DOUBLE PAYMENT for ${shortId(responseId)}: already paid by ${stored}, new ${paymentId}. Refund the second one.`);
    }
    return "already_paid";
  }

  try {
    const changed = await markResponsePaid(responseId, paymentId);
    if (changed === 0) {
      console.error(`[fulfil:${source}] mark paid matched no row for ${shortId(responseId)}`);
      return "missing";
    }
    console.log(`[fulfil:${source}] ${shortId(responseId)} marked paid`);
    return "fulfilled";
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) return "retry";
    console.error(`[fulfil:${source}] mark paid failed for ${shortId(responseId)}:`, err instanceof Error ? err.message : err);
    return "retry";
  }
}
