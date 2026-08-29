-- ============================================================
-- Scope verification codes to a purpose
-- ============================================================
-- Password reset reuses the same code table as signup verification. Without a
-- purpose column, a code emailed to confirm a signup could be replayed against
-- the reset endpoint (and vice versa) — a cross-purpose token reuse hole.
-- Keying on (user_id, purpose) also lets both flows hold a live code at once.

alter table public.email_verification_codes
  add column if not exists purpose text not null default 'signup';

alter table public.email_verification_codes
  drop constraint if exists email_verification_codes_pkey;

alter table public.email_verification_codes
  add primary key (user_id, purpose);

alter table public.email_verification_codes
  drop constraint if exists email_verification_codes_purpose_check;

alter table public.email_verification_codes
  add constraint email_verification_codes_purpose_check
  check (purpose in ('signup', 'password_reset', 'admin_login'));
