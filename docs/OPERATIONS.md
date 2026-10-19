# PQ — operations notes

Short and practical. Everything here can be done from a phone. No code needed.

## 1. Is the site healthy?

Open **https://quiz.wayofgods.com/api/health**.

| What you see | What it means | What to do |
|---|---|---|
| `"ok": true` | Database awake, payments wired up. | Nothing. |
| `database.state: "unreachable"` | Supabase did not answer — almost always a **paused** project. | supabase.com → your project → **Restore**. Wait a minute, reload. |
| `database.state: "rejected"` | Supabase answered but refused the query. | Check `SUPABASE_SECRET_KEY` is the project's *secret* (service-role) key and that the `responses` table exists. |
| `database.state: "unconfigured"` | Env vars missing in this environment. | Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Vercel. |
| `payments.mode: "test"` on the live site | Anyone can "buy" with a test card. | Remove `DODO_API_BASE` from Production and use live keys. |
| a `warnings` entry | Something is misconfigured. | The text says exactly what. |

While the database is down the quiz still works: people see their result, and their submission is kept on their phone and re-sent automatically when the site is back. They cannot buy the report until then (the button says so).

## 2. Environment variables

All live in **Vercel → Project → Settings → Environment Variables**. Never in the repo, never pasted in chat. `.env.example` lists them with comments. Summary:

| Variable | Required | What it is |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL. |
| `SUPABASE_SECRET_KEY` | yes | Secret / service-role key (server only). |
| `DODO_API_KEY` | yes | Dodo Payments API key. Live key in Production. |
| `DODO_PRODUCT_ID` | yes | The `pdt_…` id of the $3 report product, same mode as the key. |
| `DODO_WEBHOOK_SECRET` | yes | `whsec_…` from the webhook you created (section 3). Without it, reports never unlock automatically. |
| `DODO_API_BASE` | Preview only | `https://test.dodopayments.com`. **Never set in Production.** |
| `DODO_BUSINESS_ID` | optional | Your Dodo business id; payments from any other business are ignored. |
| `CRON_SECRET` | recommended | Random string; stops strangers triggering the daily job. |
| `ADMIN_TOKEN` | optional | 16+ random characters; unlocks `/admin/psychometrics?token=…`. |
| `SOVEREIGN_DOCTRINE_URL` | optional | Where every "Get Sovereign Doctrine" button goes. |

Test mode: make a **Preview** deployment (any branch other than `main`) and set the test key, test product and `DODO_API_BASE` there. Keep Production on live keys only.

## 3. One-time setup checklist

1. **Database migration.** Supabase → SQL Editor → paste `supabase/migrations/20261018_hardening.sql` → Run. Safe to run again. It adds the columns for refunds, consent and attribution, speeds up look-ups, and locks the table so only the site can read it.
2. **Dodo webhook.** Dodo dashboard → Developer → Webhooks → Add endpoint `https://quiz.wayofgods.com/api/webhooks/dodo`. Subscribe to **`payment.succeeded`, `refund.succeeded` and every `dispute.*` event**. Copy the signing secret into `DODO_WEBHOOK_SECRET`.
3. **Secrets.** Set `CRON_SECRET` and (if you want the dashboard) `ADMIN_TOKEN`. Generate values with `openssl rand -hex 32` or any password generator.
4. **Redeploy** after changing env vars (Vercel → Deployments → ⋯ → Redeploy).
5. Check `/api/health` shows `"ok": true` with no warnings.

## 4. The daily job

Vercel runs `/api/cron/daily` every day (see `vercel.json`). It:

- runs one real query so the free-tier Supabase project is never paused for inactivity;
- clears IP addresses and browser strings older than 30 days (they are only needed for the daily abuse limits, and the privacy policy promises this).

If Supabase still pauses, the cron is not running: Vercel → Project → Settings → Cron Jobs.

## 5. Payments: how a purchase works

1. Results page → **Unlock** → the site creates a Dodo checkout for that saved result and sends the buyer there.
2. The buyer pays. Dodo sends them back to `/paid?response_id=…&payment_id=…&status=…`.
3. Dodo calls the webhook; the site checks the signature, the product and the business, marks the row paid and stores the payment id.
4. The `/paid` page notices and shows the download button. If the webhook is late or lost, the page asks the site to confirm the payment directly with Dodo (`/api/payments/verify`) — nobody is left waiting on a lost webhook.
5. The PDF is generated on demand from the stored answers. The `/paid` link keeps working, so a buyer can come back and download again.

A refund or a lost dispute **revokes** access (the download then says the report is no longer available); a won dispute restores it.

## 6. "I paid but I have no report"

1. Ask for the email they used. In Supabase → Table editor → `responses`, find the row (`email`), check `payment_status`.
2. If it says `paid`: send them `https://quiz.wayofgods.com/paid?response_id=<the row's id>`.
3. If it says `unpaid` but Dodo shows a successful payment: open the same link — the page will verify with Dodo and unlock it. If it still does not, set `payment_status` to `paid` and `paid_at` to now in the table editor, then send the link.
4. If Dodo shows no payment, they were not charged; the link above lets them try again.

## 7. Deleting or showing someone's data

They must email from the address they used on the quiz (that is the identity check — do not act on Instagram DMs or on details anyone could look up).

- Show: Supabase → `responses` → filter `email` → send them the row (name, email, answers, free text, scores, payment status).
- Delete: SQL Editor → `delete from public.responses where email = 'person@example.com';` → tell them it is done. A paid report is deleted with it, so confirm first.

Answer within 30 days (the policy promises this).

## 8. Question quality (needs real respondents)

With `ADMIN_TOKEN` set, open **https://quiz.wayofgods.com/admin/psychometrics?token=YOUR_TOKEN**. It uses answers only (no names or emails) and shows archetype distribution vs the estimates, axis distributions, reliability per axis, per-question discrimination, paired-question agreement and a plain-language list of what to fix. Numbers mean little under 100 responses; recompute rarity and norms at 300+.

## 9. Things that are normal

- **Vercel toolbar missing in previews.** The site sends a strict Content-Security-Policy; the preview toolbar is blocked by it. Expected.
- **`/results` and `/paid` are not in Google.** They send `noindex`. Expected.
- **Health shows `payments.webhookConfigured: false`** right after setup — add `DODO_WEBHOOK_SECRET` and redeploy.

## 10. Tests (run locally, before deploying big changes)

```
npm run audit:scoring   # scoring simulator: reachability, recovery, confidence calibration
npm run smoke:pdf       # renders 4 paid reports, fails if page count drifts from report-meta.ts
npm run e2e             # headless browser through the whole quiz + every API (server on :3100)
E2E_EXPECT_DEGRADED=1 npm run e2e   # same, against an unreachable database
```
