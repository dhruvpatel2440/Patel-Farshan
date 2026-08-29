-- ============================================================
-- Admin activity audit log
-- ============================================================
-- Records every admin mutation: who did it, what it touched, whether it
-- succeeded, and how long the request took. Timing is stored per action so
-- slow operations can be spotted from the admin panel.

create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  -- e.g. 'product.update', 'order.cancel'
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  -- What the action operated on, when known.
  entity_type text,
  entity_id text,
  summary text,
  -- 'success' — 2xx, 'failure' — handled 4xx/5xx, 'error' — thrown exception
  status text not null check (status in ('success', 'failure', 'error')),
  status_code int,
  duration_ms int not null,
  error text,
  method text,
  path text,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_status_idx on public.audit_logs (status);

alter table public.audit_logs enable row level security;

-- Read-only for admins. Writes go through the service-role client only, so
-- the trail can't be edited or erased from the browser.
create policy "Admin can view audit logs"
  on public.audit_logs for select using (is_admin());
