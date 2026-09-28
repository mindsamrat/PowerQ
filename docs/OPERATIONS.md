# PQ — operations notes

Short, practical. Everything here is safe to do from a phone.

## Is the site healthy?

Open **https://quiz.wayofgods.com/api/health**.

- `"reachable": true` — database awake, everything works.
- `"reachable": false` — the Supabase project is almost certainly **paused**. Open supabase.com → your project → **Restore**. Wait a minute, reload.
- `payments.mode` tells you whether Dodo is in `test` or `live`.

A Vercel cron job (see `vercel.json`) calls this URL once a day. That single database query counts as activity and stops Supabase's free tier from pausing the project for inactivity. If the project still pauses, the cron is not running: check Vercel → Project → Settings → Cron Jobs.

## How good are the questions? (needs real respondents)

Set `ADMIN_TOKEN` in Vercel to a long random string, then open
**https://quiz.wayofgods.com/admin/psychometrics?token=YOUR_TOKEN**.

It shows, from real answers only (no names or emails):

- archetype distribution vs the seeded rarity figures
- axis score distributions and proposed percentile norms
- Cronbach's alpha per axis (do the questions on an axis agree with each other?)
- per-question discrimination (does each question measure what it claims?), option and position shares
- how often the eight paired questions agree or contradict
- a plain-language list of what to fix

Rough thresholds: numbers mean little under 100 responses; norms and rarity should be recomputed at 300+. The page has a "Raw JSON" fold at the bottom you can paste to have it interpreted.

## Environment variables

See `.env.example`. All live in Vercel → Settings → Environment Variables. Never in the repo.

## Tests (run locally)

```
npm run audit:scoring   # scoring simulator: reachability, recovery, confidence calibration
npm run smoke:pdf       # renders 4 paid reports, fails if page count drifts from report-meta.ts
npm run e2e             # headless browser through the whole quiz + every API (server on :3100)
E2E_EXPECT_DEGRADED=1 npm run e2e   # same, against an unreachable database
```
