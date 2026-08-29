-- ============================================================
-- Email audit log
-- ============================================================
-- Every transactional send goes through lib/email.ts, which now records the
-- attempt here. Brevo's free tier allows 300 emails/day, so the admin needs
-- to see what was sent, what failed, and how much of today's quota is left.

create table public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  context text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  -- 'sent'    — Brevo accepted it (counts against the daily quota)
  -- 'failed'  — Brevo rejected it or the request errored
  -- 'skipped' — never attempted (no API key, or no recipient address)
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz default now() not null
);

create index email_logs_created_at_idx on public.email_logs (created_at desc);
create index email_logs_status_idx on public.email_logs (status);

alter table public.email_logs enable row level security;

-- Read-only for admins. Writes happen exclusively through the service-role
-- client in lib/email.ts, which bypasses RLS.
create policy "Admin can view email logs"
  on public.email_logs for select using (is_admin());
