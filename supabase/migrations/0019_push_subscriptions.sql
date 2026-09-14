-- ============================================================
-- Web Push subscriptions
-- ============================================================
-- One row per browser/device that has allowed notifications. A customer with
-- the app on two phones has two rows. The endpoint is the push service's URL
-- for that device, so it is unique: when a different account signs in on the
-- same phone and turns notifications on, the row is handed over rather than
-- duplicated — otherwise the previous account's order updates would keep
-- landing on a phone that is no longer theirs.

create table public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  last_used_at timestamptz default now() not null
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- No policies: only the server (service role) reads or writes this table,
-- through /api/push/subscribe. The keys in it are enough to send a
-- notification to someone's phone, so no browser should ever select them.
alter table public.push_subscriptions enable row level security;
