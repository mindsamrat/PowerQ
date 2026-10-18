import { NextResponse } from "next/server";

/**
 * Shared guards for state-changing JSON endpoints.
 *
 * Cross-site CSRF: a page on another site can send a "simple" POST (form or
 * fetch with text/plain) without a CORS preflight. Requiring
 * Content-Type: application/json forces a preflight, which we never grant,
 * and a mismatched Origin header is rejected outright.
 *
 * Body size: route handlers have no body limit of their own, so every JSON
 * endpoint caps the raw body before parsing.
 */

export type JsonBody = Record<string, unknown>;

function expectedHost(req: Request): string | null {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host");
}

export function rejectCrossSite(req: Request): NextResponse | null {
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try { originHost = new URL(origin).host; } catch { originHost = null; }
    const host = expectedHost(req);
    if (!originHost || !host || originHost !== host) {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }
  return null;
}

/**
 * Read and parse a JSON object body with a hard size cap. Returns either the
 * object or a ready-to-send error response.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<{ body: JsonBody } | { error: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { error: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: NextResponse.json({ error: "Could not read the request." }, { status: 400 }) };
  }
  if (text.length > maxBytes) {
    return { error: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
  }
  return { body: parsed as JsonBody };
}

/** Fixed-window in-memory limiter for cheap per-instance throttling. Bounded and self-pruning. */
export function createWindowLimiter(max: number, windowMs: number, capacity = 5000) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    if (buckets.size > capacity) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
      if (buckets.size > capacity) buckets.clear();
    }
    const b = buckets.get(key);
    if (!b || b.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    b.count += 1;
    return b.count <= max;
  };
}

/** Normalise Dodo env values: trim, strip trailing slashes, default to live. */
export function dodoConfig() {
  const apiKey = process.env.DODO_API_KEY?.trim() || "";
  const productId = process.env.DODO_PRODUCT_ID?.trim() || "";
  const apiBase = (process.env.DODO_API_BASE?.trim() || "https://live.dodopayments.com").replace(/\/+$/, "");
  return { apiKey, productId, apiBase, mode: apiBase.includes("test") ? ("test" as const) : ("live" as const) };
}

export { stripLoneSurrogates, truncateCodePoints } from "@/lib/sanitize";
