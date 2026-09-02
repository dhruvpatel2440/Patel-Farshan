-- ============================================================
-- Shop open/closed status
-- ============================================================
-- Singleton settings row the admin panel toggles. The landing page reads it
-- to show a "Shop Closed" banner. A fixed id keeps it a true singleton —
-- there is only ever one row, so no separate "which row is active" lookup.

create table public.shop_settings (
  id boolean primary key default true,
  is_open boolean not null default true,
  closed_message text,
  updated_at timestamptz default now() not null,
  constraint shop_settings_singleton check (id)
);

insert into public.shop_settings (id, is_open) values (true, true);

alter table public.shop_settings enable row level security;

-- Everyone (including guests) needs to see whether the shop is open.
create policy "Public can view shop status"
  on public.shop_settings for select using (true);

create policy "Admin can update shop status"
  on public.shop_settings for update using (is_admin());
