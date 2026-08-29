-- ============================================================
-- Email verification via 6-digit OTP at signup
-- ============================================================

-- Marks whether the account's email address has been proven.
alter table public.profiles
  add column if not exists email_verified boolean not null default false;

-- Everyone who registered before this feature existed is grandfathered in,
-- otherwise they'd be locked out of their own accounts.
update public.profiles set email_verified = true where email_verified = false;

-- Codes live in their own table rather than on `profiles` so they can never
-- be read by the client: `profiles` has a "users can view own profile"
-- policy, which would have exposed the hash to the very person guessing it.
create table if not exists public.email_verification_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.email_verification_codes enable row level security;

-- Deliberately NO policies. With RLS on and no policy, every client role is
-- denied; only the service role (which bypasses RLS) can read or write here.
-- All access goes through the /api/auth/* routes.

create index if not exists email_verification_codes_expires_at_idx
  on public.email_verification_codes (expires_at);
