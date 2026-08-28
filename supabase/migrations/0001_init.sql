-- Patel Farsan — full database schema
-- Run this once in Supabase → SQL Editor → New Query.

-- ============================================================
-- BLOCK 1 — Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- BLOCK 2 — Profiles
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text unique not null,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'phone', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- BLOCK 3 — Categories
-- ============================================================
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_gujarati text not null,
  display_order int default 0,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.categories (name, name_gujarati, display_order) values
  ('Farsan', 'ફરસાણ', 1),
  ('Namkeen', 'નામકીન', 2),
  ('Sweets', 'મિઠાઈ', 3),
  ('Fried Snacks', 'તળેલું', 4),
  ('Combo Packs', 'કોમ્બો', 5),
  ('Seasonal', 'સીઝનલ', 6);

-- ============================================================
-- BLOCK 4 — Products
-- ============================================================
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  name_gujarati text not null,
  description text,
  image_url text,
  price numeric(10,2) not null check (price > 0),
  unit text not null default '250g',
  stock_qty int not null default 0 check (stock_qty >= 0),
  is_available boolean default true,
  is_featured boolean default false,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute procedure update_updated_at();

-- ============================================================
-- BLOCK 5 — Cities
-- ============================================================
create table public.cities (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  delivery_charge numeric(10,2) not null default 0,
  min_order_value numeric(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.cities (name, delivery_charge, min_order_value) values
  ('Anand', 40, 200),
  ('Vadodara', 50, 300),
  ('Surat', 60, 300),
  ('Ahmedabad', 60, 400);

-- ============================================================
-- BLOCK 6 — Addresses
-- ============================================================
create table public.addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text not null,
  phone text not null,
  address_line text not null,
  area text not null,
  city_id uuid references public.cities(id) not null,
  pincode text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

create or replace function enforce_single_default_address()
returns trigger as $$
begin
  if new.is_default = true then
    update public.addresses
    set is_default = false
    where user_id = new.user_id and id != new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger single_default_address
  after insert or update on public.addresses
  for each row execute procedure enforce_single_default_address();

-- ============================================================
-- BLOCK 7 — Cart items
-- ============================================================
create table public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- ============================================================
-- BLOCK 8 — Orders
-- ============================================================
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null,
  user_id uuid references auth.users(id) not null,
  address_snapshot jsonb not null,
  subtotal numeric(10,2) not null,
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_mode text not null check (payment_mode in ('upi', 'cod')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','awaiting_verification','paid','failed')),
  order_status text not null default 'placed'
    check (order_status in (
      'awaiting_payment','placed','confirmed',
      'packed','out_for_delivery','delivered','cancelled'
    )),
  utr_number text,
  delivery_instructions text,
  cancellation_reason text,
  placed_at timestamptz default now(),
  delivered_at timestamptz,
  updated_at timestamptz default now()
);

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure update_updated_at();

create sequence order_number_seq start 1000;

create or replace function generate_order_number()
returns trigger as $$
begin
  new.order_number = 'ORD' || to_char(now(), 'YYMM') ||
    lpad(nextval('order_number_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_order_number
  before insert on public.orders
  for each row execute procedure generate_order_number();

-- ============================================================
-- BLOCK 9 — Order items
-- ============================================================
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) not null,
  product_name text not null,
  product_name_gujarati text not null,
  product_image_url text,
  price_at_purchase numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null
);

-- ============================================================
-- BLOCK 10 — Order status history
-- ============================================================
create table public.order_status_history (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now(),
  note text
);

-- ============================================================
-- BLOCK 11 — Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cities enable row level security;
alter table public.addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admin can view all profiles"
  on public.profiles for select using (is_admin());

-- CATEGORIES
create policy "Anyone can view active categories"
  on public.categories for select using (is_active = true);
create policy "Admin full access categories"
  on public.categories for all using (is_admin());

-- PRODUCTS
create policy "Anyone can view available products"
  on public.products for select using (is_available = true and is_deleted = false);
create policy "Admin full access products"
  on public.products for all using (is_admin());

-- CITIES
create policy "Anyone can view active cities"
  on public.cities for select using (is_active = true);
create policy "Admin full access cities"
  on public.cities for all using (is_admin());

-- ADDRESSES
create policy "Users can manage own addresses"
  on public.addresses for all using (auth.uid() = user_id);
create policy "Admin can view all addresses"
  on public.addresses for select using (is_admin());

-- CART ITEMS
create policy "Users can manage own cart"
  on public.cart_items for all using (auth.uid() = user_id);

-- ORDERS
create policy "Users can view own orders"
  on public.orders for select using (auth.uid() = user_id);
create policy "Users can create orders"
  on public.orders for insert with check (auth.uid() = user_id);
create policy "Users can update own orders (UTR submission)"
  on public.orders for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admin full access orders"
  on public.orders for all using (is_admin());

-- ORDER ITEMS
create policy "Users can view own order items"
  on public.order_items for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  ));
create policy "Users can insert own order items"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  ));
create policy "Admin full access order items"
  on public.order_items for all using (is_admin());

-- ORDER STATUS HISTORY
create policy "Users can view own order history"
  on public.order_status_history for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_status_history.order_id and orders.user_id = auth.uid()
  ));
create policy "Admin full access history"
  on public.order_status_history for all using (is_admin());

-- ============================================================
-- BLOCK 12 — Storage bucket + RLS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admin can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());

create policy "Admin can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

-- ============================================================
-- BLOCK 13 — Realtime
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;

-- After running this file:
-- 1. Register an account at /register
-- 2. In Table Editor → profiles, set your row's role to 'admin'
-- 3. Optionally run supabase/migrations/0002_seed.sql for sample products
