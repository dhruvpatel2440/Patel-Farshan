-- ============================================================
-- Support backfilling audit_logs from existing records
-- ============================================================
-- audit_logs only captures actions taken after it existed. Real history is
-- still recoverable from records the app already kept — order_status_history
-- (who moved an order, when, with what note) and the created_at columns on
-- orders, profiles, products, categories, cities and feedback.
--
-- Those rows carry no timing: nothing measured how long the original request
-- took. They are flagged so the UI can show "—" instead of a misleading 0 ms,
-- and so they can be excluded from the performance stats.

alter table public.audit_logs
  add column if not exists source_ref text,
  add column if not exists is_reconstructed boolean not null default false;

-- Keyed on the originating row, so re-running the backfill can't duplicate.
create unique index if not exists audit_logs_source_ref_key
  on public.audit_logs (source_ref);
