-- ============================================================
-- Allow multiple feedback submissions per customer
-- ============================================================
-- Previously one review per user_id (upserted on resubmit). Customers now
-- want to leave a new review whenever they like — e.g. once per order —
-- rather than overwriting their one existing entry.

alter table public.feedback
  drop constraint if exists feedback_user_id_key;

-- The unique constraint's implicit index is gone with it; add an explicit
-- one back since the API still filters "my feedback" by user_id.
create index if not exists feedback_user_id_idx on public.feedback (user_id);
