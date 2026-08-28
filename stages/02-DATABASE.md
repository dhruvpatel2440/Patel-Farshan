# 02 — Database Setup
# Paste this entire file into Claude Code

---

## CONTEXT

Project: Patel Farsan online ordering website
Task: Create the complete Supabase database schema with RLS policies

---

## YOUR TASK — Stage 2: Complete Database Schema

Go to your Supabase project → **SQL Editor** → New Query.
Run the SQL blocks below IN ORDER.

### BLOCK 1 — Enable UUID extension

```sql
create extension if not exists "uuid-ossp";
```

---

### BLOCK 2 — Profiles table

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text unique not null,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
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
```

---

### BLOCK 3 — Categories table

```sql
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_gujarati text not null,
  display_order int default 0,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed categories
insert into public.categories (name, name_gujarati, display_order) values
  ('Farsan', 'ફરસાણ', 1),
  ('Namkeen', 'નામકીન', 2),
  ('Sweets', 'મિઠાઈ', 3),
  ('Fried Snacks', 'તળેલું', 4),
  ('Combo Packs', 'કોમ્બો', 5),
  ('Seasonal', 'સીઝનલ', 6);
```

---

### BLOCK 4 — Products table

```sql
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

-- Auto-update updated_at
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
```

---

### BLOCK 5 — Cities table

```sql
create table public.cities (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  delivery_charge numeric(10,2) not null default 0,
  min_order_value numeric(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed sample cities (admin can add more)
insert into public.cities (name, delivery_charge, min_order_value) values
  ('Anand', 40, 200),
  ('Vadodara', 50, 300),
  ('Surat', 60, 300),
  ('Ahmedabad', 60, 400);
```

---

### BLOCK 6 — Addresses table

```sql
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

-- Ensure only one default address per user
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
```

---

### BLOCK 7 — Cart items table

```sql
create table public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  unique(user_id, product_id)
);
```

---

### BLOCK 8 — Orders table

```sql
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

-- Auto-generate order number
create or replace function generate_order_number()
returns trigger as $$
begin
  new.order_number = 'ORD' || to_char(now(), 'YYMM') || 
    lpad(nextval('order_number_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create sequence order_number_seq start 1000;

create trigger set_order_number
  before insert on public.orders
  for each row execute procedure generate_order_number();
```

---

### BLOCK 9 — Order items table

```sql
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
```

---

### BLOCK 10 — Order status history table

```sql
create table public.order_status_history (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now(),
  note text
);
```

---

### BLOCK 11 — RLS (Row Level Security) Policies

```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cities enable row level security;
alter table public.addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- Helper function: check if current user is admin
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

-- CATEGORIES (public read, admin write)
create policy "Anyone can view active categories"
  on public.categories for select using (is_active = true);
create policy "Admin full access categories"
  on public.categories for all using (is_admin());

-- PRODUCTS (public read, admin write)
create policy "Anyone can view available products"
  on public.products for select using (is_available = true and is_deleted = false);
create policy "Admin full access products"
  on public.products for all using (is_admin());

-- CITIES (public read active, admin write)
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
```

---

### BLOCK 12 — Supabase Storage RLS

```sql
-- Product images bucket policy (run in SQL editor)
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
```

---

### BLOCK 13 — Enable Realtime

Run this in SQL editor to enable realtime on the orders table:

```sql
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
```

Also go to **Supabase Dashboard → Database → Replication**
and toggle ON for `orders` and `order_status_history` tables.

---

### BLOCK 14 — Create your admin account

After running all SQL above:

1. Go to your app at http://localhost:3000/register
2. Register with YOUR phone number and password
3. Go to Supabase → **Table Editor → profiles**
4. Find your row, click Edit
5. Change `role` from `user` to `admin`
6. Save

That's it — you are now admin.

---

### BLOCK 15 — Seed sample products (optional but recommended for testing)

```sql
-- Get a category id first
do $$
declare
  farsan_id uuid;
  namkeen_id uuid;
begin
  select id into farsan_id from public.categories where name = 'Farsan';
  select id into namkeen_id from public.categories where name = 'Namkeen';

  insert into public.products 
    (category_id, name, name_gujarati, description, price, unit, stock_qty, is_featured)
  values
    (farsan_id, 'Ganthiya', 'ગાંઠિયા', 
     'Crispy golden ganthiya made fresh every morning with pure besan.',
     120, '250g', 50, true),
    (farsan_id, 'Jalebi', 'જલેબી',
     'Crispy, syrupy jalebis made from fermented batter. Best with fafda.',
     80, '250g', 30, true),
    (farsan_id, 'Khakhra', 'ખાખરા',
     'Thin crispy khakhra made on tawa from whole wheat and spices.',
     150, '200g', 20, false),
    (namkeen_id, 'Chakli', 'ચકલી',
     'Crunchy spiral chakli made with rice flour and sesame seeds.',
     100, '250g', 40, true),
    (namkeen_id, 'Sev', 'સેવ',
     'Fine thin sev made fresh. Perfect tea-time snack.',
     60, '250g', 60, false),
    (namkeen_id, 'Chana Dal', 'ચણા દાળ',
     'Crispy roasted chana dal, lightly spiced.',
     90, '250g', 35, false);
end $$;
```

---

## VERIFY

After running all blocks, go to Supabase → **Table Editor** and confirm:
- `profiles` table exists
- `categories` has 6 rows
- `products` has 6 rows (if you ran the seed)
- `cities` has 4 rows
- All other tables exist (empty is fine)

**Next: Open `03-AUTH.md`**
