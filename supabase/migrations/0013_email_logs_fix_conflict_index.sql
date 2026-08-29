-- ============================================================
-- Fix the provider_message_id unique index for upsert conflict targets
-- ============================================================
-- Postgres only matches a plain "ON CONFLICT (col)" clause against a plain
-- unique index — not a partial one, even though the row would satisfy the
-- predicate. The import upsert uses the plain form, so the partial index
-- from 0012 was silently unusable as a conflict target. A regular unique
-- index still allows multiple NULLs (rows with no provider_message_id), so
-- nothing else changes.

drop index if exists public.email_logs_provider_message_id_key;
create unique index email_logs_provider_message_id_key on public.email_logs (provider_message_id);
