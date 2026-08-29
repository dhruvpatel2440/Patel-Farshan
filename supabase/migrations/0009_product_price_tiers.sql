-- ============================================================
-- Per-product weight/quantity price tiers
-- ============================================================
-- Products can now be sold in multiple sizes (e.g. 250g / 500g / 1kg),
-- each with its own price and stock. products.price/unit/stock_qty are
-- kept as derived aggregates (cheapest tier's price+unit, summed stock)
-- via trigger, so existing sort/filter/display code keeps working as-is.

create table public.product_price_tiers (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  unit_label text not null,
  price numeric(10,2) not null check (price > 0),
  stock_qty int not null default 0 check (stock_qty >= 0),
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (product_id, unit_label)
);

alter table public.product_price_tiers enable row level security;

create policy "Anyone can view tiers of visible products"
  on public.product_price_tiers for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_available = true and p.is_deleted = false
    )
  );

create policy "Admin full access price tiers"
  on public.product_price_tiers for all using (is_admin());

-- Seed one tier per existing product from its current price/unit/stock.
insert into public.product_price_tiers (product_id, unit_label, price, stock_qty, sort_order)
select id, unit, price, stock_qty, 0 from public.products;

-- Keep products.price / unit / stock_qty as derived aggregates whenever
-- tiers change, so existing sort ("price_asc"), the "in stock" filter, and
-- every display that reads product.price/unit/stock_qty keep working.
create or replace function sync_product_from_tiers()
returns trigger as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update public.products p set
    price = coalesce((
      select t.price from public.product_price_tiers t
      where t.product_id = target_product_id
      order by t.price asc limit 1
    ), p.price),
    unit = coalesce((
      select t.unit_label from public.product_price_tiers t
      where t.product_id = target_product_id
      order by t.price asc limit 1
    ), p.unit),
    stock_qty = coalesce((
      select sum(t.stock_qty) from public.product_price_tiers t
      where t.product_id = target_product_id
    ), 0)
  where p.id = target_product_id;

  return null;
end;
$$ language plpgsql security definer;

create trigger product_price_tiers_sync
  after insert or update or delete on public.product_price_tiers
  for each row execute procedure sync_product_from_tiers();

-- Cart lines and order line items now reference a specific tier.
alter table public.cart_items
  add column if not exists tier_id uuid references public.product_price_tiers(id) on delete cascade;

update public.cart_items ci
set tier_id = (
  select t.id from public.product_price_tiers t
  where t.product_id = ci.product_id
  order by t.price asc limit 1
)
where tier_id is null;

alter table public.cart_items alter column tier_id set not null;
alter table public.cart_items drop constraint if exists cart_items_user_id_product_id_key;
alter table public.cart_items add constraint cart_items_user_id_product_id_tier_id_key unique (user_id, product_id, tier_id);

alter table public.order_items
  add column if not exists tier_id uuid references public.product_price_tiers(id) on delete set null,
  add column if not exists unit_label text;
