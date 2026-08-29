-- ============================================================
-- Customer feedback shown as testimonials on the landing page
-- ============================================================

create table if not exists public.feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  -- Denormalized at submission time rather than joined from `profiles`. Two
  -- reasons: (1) the public marquee is read by an anonymous client with no
  -- session, and `profiles` has no policy letting anon read other users'
  -- rows — only a service-role write can see it; (2) it freezes the name
  -- the customer had *when they gave feedback*, which is the honest
  -- attribution, rather than silently relabeling it if they rename later.
  user_name text not null,
  rating smallint not null check (rating between 1 and 5),
  message text,
  -- Off by default: unmoderated user text does not go on the public site
  -- unreviewed. An admin must approve it first.
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feedback_updated_at
  before update on public.feedback
  for each row execute procedure update_updated_at();

alter table public.feedback enable row level security;

-- A customer can see their own feedback (to show its status on their
-- dashboard) regardless of approval, and everyone can see approved rows (for
-- the public marquee). There is deliberately NO insert/update/delete policy
-- for the 'authenticated' role: all writes go through /api/feedback and
-- /api/admin/feedback using the service-role client, which is what forces
-- `is_approved` back to false on every edit — a customer cannot self-approve
-- by including that field in their own request.
create policy "Users can view own feedback"
  on public.feedback for select using (auth.uid() = user_id);

create policy "Anyone can view approved feedback"
  on public.feedback for select using (is_approved = true);

create policy "Admin full access feedback"
  on public.feedback for all using (is_admin());
