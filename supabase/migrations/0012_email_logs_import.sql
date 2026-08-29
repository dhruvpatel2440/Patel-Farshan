-- ============================================================
-- Import historical emails from Brevo
-- ============================================================
-- email_logs only started recording once it existed, so everything sent
-- before that is missing. Brevo still holds that history, and /admin/emails
-- can now pull it in. Store the provider's message id so re-running the
-- import (or importing an email we already logged ourselves) can't duplicate
-- rows.

alter table public.email_logs
  add column if not exists provider_message_id text;

create unique index if not exists email_logs_provider_message_id_key
  on public.email_logs (provider_message_id)
  where provider_message_id is not null;
