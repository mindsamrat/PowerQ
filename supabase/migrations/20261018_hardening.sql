-- PQ Assessment — hardening migration (safe to run more than once).
--
-- How to run: Supabase dashboard → SQL Editor → paste this whole file → Run.
-- The app keeps working before this is run (it drops the new columns from its
-- writes when they are missing), but refunds, disputes, consent, attribution
-- and the daily clean-up only work fully once it has been applied.

-- 1. Columns the hardened app writes.
alter table public.responses add column if not exists payment_id text;              -- Dodo payment id (refunds/disputes are matched on it)
alter table public.responses add column if not exists marketing_consent boolean not null default false; -- the opt-in checkbox on the email step
alter table public.responses add column if not exists attribution jsonb;            -- first-touch utm_* / referrer, for tracing revenue to a post
alter table public.responses add column if not exists paid_at timestamptz;          -- already present on most installs; harmless otherwise

-- 2. Payment status values. Older installs had a CHECK allowing only
--    unpaid/paid; the webhook now also records refunded / disputed /
--    charged_back / failed / cancelled.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.responses'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.responses drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.responses
  add constraint responses_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'refunded', 'disputed', 'charged_back', 'failed', 'cancelled'));

-- 3. Indexes behind the app's look-ups.
create index if not exists responses_email_created_idx on public.responses (email, created_at desc);        -- duplicate detection + per-email daily limit
create index if not exists responses_ip_created_idx on public.responses (ip_address, created_at desc);      -- per-network daily limit
create index if not exists responses_created_idx on public.responses (created_at desc);                     -- psychometrics paging, retention clean-up
create unique index if not exists responses_payment_id_uidx on public.responses (payment_id) where payment_id is not null; -- one row per Dodo payment

-- 4. Lock the table down. The site talks to the database only with the
--    secret key (which bypasses RLS); nothing else may read or write rows.
alter table public.responses enable row level security;
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'responses' loop
    execute format('drop policy if exists %I on public.responses', p.policyname);
  end loop;
end $$;
revoke all on public.responses from anon, authenticated;

-- 5. Retention: the daily job clears network data older than 30 days. If the
--    cron is ever disabled, this does the same thing on demand:
--      update public.responses set ip_address = null, user_agent = null
--      where created_at < now() - interval '30 days'
--        and (ip_address is not null or user_agent is not null);

-- 6. Deleting someone's data on request (replace the address):
--      delete from public.responses where email = 'person@example.com';
