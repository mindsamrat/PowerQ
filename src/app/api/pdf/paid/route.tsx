import { isResponseId, lookupResponse, shortId } from "@/lib/supabase-server";
import { renderPaidReport, type DbResponse } from "@/lib/paid-report";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Paid report. Served only for rows marked "paid" (set by the Dodo webhook or
 * /api/payments/verify). The renderer lives in lib/paid-report.tsx so it can be
 * exercised without Supabase (scripts/pdf-smoke.ts).
 *
 * Browser-facing errors are small HTML pages with a next step, because this
 * URL is opened directly in a tab by paying customers.
 */

// Rendering takes ~2 s of CPU. Re-opens of the same report on a warm instance
// are served from memory. Keyed on id + paid_at so a status change re-renders.
const CACHE_MAX_ENTRIES = 24;
const cache = new Map<string, { pdf: Buffer; filename: string }>();

function remember(key: string, value: { pdf: Buffer; filename: string }) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function page(status: number, title: string, body: string, retryAfter?: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — PQ Report</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0A0A;color:#EDE7DA;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}main{max-width:460px;text-align:center}h1{font-size:26px;margin:0 0 12px}p{color:rgba(237,231,218,.75);margin:0 0 18px}a{color:#C9A84C}.btn{display:inline-block;background:#C41E3A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;margin:6px}</style></head>
<body><main><h1>${title}</h1>${body}</main></body></html>`;
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return new Response(html, { status, headers });
}

const SUPPORT = `<p>Still stuck? Email <a href="mailto:hello@wayofgods.com">hello@wayofgods.com</a> with the time you paid. Your purchase is safe.</p>`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get("id");
  const download = searchParams.get("download") === "1";

  if (!isResponseId(responseId)) {
    return page(404, "Report not found", `<p>This link is incomplete. Open the link from your payment confirmation page.</p><a class="btn" href="/">Back to the assessment</a>`);
  }

  // Built only from the validated UUID, never from the raw request URL.
  const retryHref = `/api/pdf/paid?id=${encodeURIComponent(responseId)}`;

  try {
    const lookup = await lookupResponse(responseId);
    if (lookup.status === "missing") {
      return page(404, "Report not found", `<p>We couldn't find a report for this link.</p>${SUPPORT}`);
    }
    if (lookup.status !== "ok") {
      return page(503, "One moment", `<p>Our database is waking up. Your purchase is safe — try again in a minute.</p><a class="btn" href="${retryHref}">Try again</a>${SUPPORT}`, 30);
    }
    const row = lookup.row as unknown as DbResponse;
    if (row.payment_status === "refunded" || row.payment_status === "charged_back" || row.payment_status === "disputed") {
      return page(403, "Report no longer available", `<p>This purchase was refunded or is under dispute, so the report can no longer be downloaded. If that is a mistake, we can put it right.</p>${SUPPORT}`);
    }
    if (row.payment_status !== "paid") {
      return page(402, "Payment not confirmed yet", `<p>We haven't received confirmation of payment for this report. If you just paid, this usually takes a few seconds.</p><a class="btn" href="/paid?response_id=${encodeURIComponent(responseId)}">Check payment status</a>${SUPPORT}`);
    }

    const key = `${row.id}:${row.paid_at ?? ""}`;
    let entry = cache.get(key);
    if (!entry) {
      entry = await renderPaidReport(row);
      remember(key, entry);
    }

    return new Response(new Uint8Array(entry.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${entry.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    // Full detail to the server log only; never echo internals to the browser.
    console.error(`[pdf-paid] render failed for ${shortId(responseId)}:`, err instanceof Error ? err.stack ?? err.message : err);
    return page(500, "We couldn't build your report", `<p>Something went wrong generating your PDF. Please try again in a minute.</p><a class="btn" href="${retryHref}">Try again</a>${SUPPORT}`);
  }
}
