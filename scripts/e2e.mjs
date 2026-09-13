// End-to-end functional check against a running server (default http://localhost:3100).
// Run:  node scripts/e2e.mjs            (server started separately with `next start -p 3100`)
// Uses playwright-core + the locally installed Chromium. Exits non-zero on the first failure.
import { chromium } from "playwright-core";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const OUT = process.env.E2E_OUT ?? "/tmp/pq-e2e";
const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET ?? "";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, label, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
  if (!cond) failures += 1;
};

const exe = process.env.CHROMIUM_PATH;
const browser = await chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  // Deliberately-provoked 503 (checkout without env) and 404 (unknown response id) fetches are expected.
  if (m.type() === "error" && !/Failed to load resource: .* (503|404)/.test(m.text())) consoleErrors.push(m.text());
});

// ---------- Landing ----------
let res = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
ok(res?.status() === 200, "landing 200");
ok((await page.textContent("body"))?.includes("27 questions"), "landing shows 27 questions");
await page.screenshot({ path: `${OUT}/01-landing.png` });
await page.click("text=Begin The Assessment");
await page.waitForURL(/\/quiz/);

// ---------- Quiz: answer everything ----------
let steps = 0;
let sawFreeText = 0;
const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  if (page.url().includes("/results")) break;
  const nameInput = page.locator('input[type="text"][autocomplete="given-name"]');
  if (await nameInput.count()) {
    await nameInput.fill("Test Person");
    await page.fill('input[type="email"]', "pq-e2e@gmail.com");
    await page.screenshot({ path: `${OUT}/03-email-step.png` });
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/results/, { timeout: 30_000 }).catch(() => {});
    if (!page.url().includes("/results")) {
      const err = await page.locator("form p").allTextContents().catch(() => []);
      ok(false, "email submit navigated to results", err.join(" | "));
      break;
    }
    continue;
  }
  const textarea = page.locator("textarea");
  if (await textarea.count()) {
    sawFreeText += 1;
    if (sawFreeText === 1) { await textarea.fill("I said nothing and let the room come to me."); await page.click('button:has-text("Continue")'); }
    else await page.click('button:has-text("Skip")');
    if (sawFreeText > 4) { ok(false, "free-text step did not advance"); break; }
    await page.waitForTimeout(450);
    continue;
  }
  const options = page.locator("button.option-card");
  const n = await options.count();
  if (n === 0) { await page.waitForTimeout(200); continue; }
  if (steps === 0) await page.screenshot({ path: `${OUT}/02-quiz-q1.png` });
  // Alternate through options so we get a mixed but non-random profile.
  await options.nth(steps % 4 === 3 ? 0 : steps % 4).click();
  steps += 1;
  await page.waitForTimeout(420);
}
ok(page.url().includes("/results"), "reached results page", `choice steps=${steps}, free-text steps=${sawFreeText}`);
ok(steps >= 24 && steps <= 27, "served 24–27 choice questions", String(steps));

// ---------- Results ----------
await page.waitForTimeout(1800);
const resultsText = (await page.textContent("body")) ?? "";
const url = new URL(page.url());
ok(!!url.searchParams.get("id") && !!url.searchParams.get("pq"), "results URL carries id + pq", url.search);
ok(/Fit \d+% · runner-up/.test(resultsText), "fit / runner-up / gap line rendered");
ok(resultsText.includes("Sovereign Doctrine"), "Sovereign Doctrine CTA present");
ok(resultsText.includes("How Each Axis Was Built"), "per-axis attribution rendered from sessionStorage answers");
ok(resultsText.includes("Why You Got"), "signature answers rendered");
ok(!resultsText.includes("ConvertKit"), "no stale ConvertKit copy");
await page.screenshot({ path: `${OUT}/04-results-top.png` });
await page.screenshot({ path: `${OUT}/05-results-full.png`, fullPage: true });

const doctrineHref = await page.getAttribute('a:has-text("Get Sovereign Doctrine")', "href");
ok(!!doctrineHref && doctrineHref.startsWith("/book?from=results&archetype="), "doctrine link -> /book", doctrineHref ?? "");
const bookRes = await ctx.request.get(`${BASE}${doctrineHref}`, { maxRedirects: 0 });
ok(bookRes.status() === 302, "/book responds 302", String(bookRes.status()));
const loc = bookRes.headers()["location"] ?? "";
ok(loc.includes("utm_source=pq") && loc.includes("utm_content="), "/book redirect carries utm tags", loc);

const freeHref = await page.getAttribute('a:has-text("Open the free PDF")', "href");
ok(!!freeHref, "free PDF link present", freeHref ?? "");
const freeRes = await ctx.request.get(`${BASE}${freeHref}`);
ok(freeRes.status() === 200 && (freeRes.headers()["content-type"] ?? "").includes("pdf"), "free PDF 200 application/pdf");

const cardSrc = await page.getAttribute("img[alt$='shareable card']", "src");
const cardRes = await ctx.request.get(`${BASE}${cardSrc}`);
ok(cardRes.status() === 200 && (cardRes.headers()["content-type"] ?? "").includes("image/png"), "share card 200 image/png");

await page.click('button:has-text("Unlock Full Report")');
await page.waitForTimeout(1500);
const afterCheckout = (await page.textContent("body")) ?? "";
ok(/Checkout error \(503\)|Payments aren.t configured|session has expired/.test(afterCheckout), "checkout without env shows graceful error", afterCheckout.match(/Checkout error[^.]*\./)?.[0] ?? "");

// ---------- API edge cases ----------
const post = (path, body, headers = {}) => ctx.request.post(`${BASE}${path}`, { data: body, headers: { "content-type": "application/json", ...headers } });
let r = await post("/api/subscribe", { honeypot: "x", name: "a", email: "a@b.co" });
ok(r.status() === 200, "subscribe honeypot returns 200 silently");
r = await post("/api/subscribe", { name: "Test", email: "not-an-email", answers: [] });
ok(r.status() === 400, "subscribe rejects bad email 400");
r = await post("/api/subscribe", { name: "Test", email: "x@gmail.com", answers: [{ q: "q01", o: "a" }] });
ok(r.status() === 400, "subscribe rejects incomplete quiz 400");
r = await post("/api/subscribe", { name: "Test", email: "x@mailinator.com", answers: [] });
ok(r.status() === 400, "subscribe rejects disposable email 400");
r = await ctx.request.get(`${BASE}/api/response/00000000-0000-0000-0000-000000000000`);
ok(r.status() === 404, "response lookup unknown id 404");
r = await ctx.request.get(`${BASE}/api/pdf/paid?id=00000000-0000-0000-0000-000000000000`);
ok(r.status() === 404, "paid PDF unknown id 404 (no leak)");
r = await ctx.request.get(`${BASE}/api/pdf/paid`);
ok(r.status() === 400, "paid PDF missing id 400");

// webhook: missing headers, bad signature, good signature
r = await post("/api/webhooks/dodo", { type: "payment.succeeded" });
ok(r.status() === 401 || r.status() === 500, "webhook without headers rejected", String(r.status()));
if (WEBHOOK_SECRET) {
  const body = JSON.stringify({ type: "payment.succeeded", data: { metadata: { response_id: "00000000-0000-0000-0000-000000000000" } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const key = WEBHOOK_SECRET.startsWith("whsec_") ? Buffer.from(WEBHOOK_SECRET.slice(6), "base64") : Buffer.from(WEBHOOK_SECRET);
  const sig = createHmac("sha256", key).update(`msg_1.${ts}.${body}`).digest("base64");
  r = await ctx.request.post(`${BASE}/api/webhooks/dodo`, { data: body, headers: { "content-type": "application/json", "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": "v1,AAAA" } });
  ok(r.status() === 401, "webhook bad signature 401");
  r = await ctx.request.post(`${BASE}/api/webhooks/dodo`, { data: body, headers: { "content-type": "application/json", "webhook-id": "msg_1", "webhook-timestamp": String(Number(ts) - 3600), "webhook-signature": `v1,${sig}` } });
  ok(r.status() === 401, "webhook stale timestamp 401");
  r = await ctx.request.post(`${BASE}/api/webhooks/dodo`, { data: body, headers: { "content-type": "application/json", "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` } });
  ok(r.status() === 503, "webhook valid signature but DB unavailable -> 503 (Dodo retries)", String(r.status()));
}

// ---------- Static / misc ----------
r = await ctx.request.get(`${BASE}/robots.txt`);
ok(r.status() === 200 && (await r.text()).includes("Disallow: /api/"), "robots.txt blocks /api");
r = await ctx.request.get(`${BASE}/sitemap.xml`);
ok(r.status() === 200, "sitemap.xml 200");
r = await ctx.request.get(`${BASE}/this-does-not-exist`);
ok(r.status() === 404 && (await r.text()).includes("This room does not exist"), "custom 404 page");
r = await ctx.request.get(`${BASE}/`);
const h = r.headers();
ok(h["x-content-type-options"] === "nosniff" && !!h["x-frame-options"], "security headers present");
ok(!h["x-powered-by"], "x-powered-by removed");
await page.goto(`${BASE}/paid?response_id=00000000-0000-0000-0000-000000000000`);
await page.waitForTimeout(1200);
ok(((await page.textContent("body")) ?? "").includes("Hold a moment"), "paid page shows verifying state");
await page.goto(`${BASE}/privacy`); ok(((await page.textContent("body")) ?? "").includes("Supabase"), "privacy page mentions real storage");
await page.goto(`${BASE}/terms`); ok(((await page.textContent("body")) ?? "").includes("Dodo Payments"), "terms page mentions Dodo");

ok(consoleErrors.length === 0, "no browser console errors", consoleErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(failures === 0 ? "\nALL E2E CHECKS PASSED" : `\n${failures} E2E CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
