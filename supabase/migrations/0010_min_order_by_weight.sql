-- ============================================================
-- Minimum order by weight instead of rupee value
-- ============================================================
-- Cities now gate delivery on total order weight (kg) rather than cart
-- value, so every price tier needs a real weight in grams to sum against.

alter table public.product_price_tiers
  add column if not exists weight_grams integer not null default 0 check (weight_grams >= 0);

-- Best-effort parse of existing "250g" / "1kg" style labels into grams.
-- The app sets weight_grams explicitly on every future tier write; this is
-- a one-time backfill for tiers that already existed before this column did.
create or replace function parse_weight_grams(label text)
returns integer as $$
declare
  digits text;
  num numeric;
begin
  digits := (regexp_match(label, '([0-9]+(\.[0-9]+)?)'))[1];
  if digits is null then
    return 0;
  end if;
  num := digits::numeric;
  if label ~* 'kg' then
    return round(num * 1000);
  else
    return round(num);
  end if;
exception when others then
  return 0;
end;
$$ language plpgsql immutable;

update public.product_price_tiers set weight_grams = parse_weight_grams(unit_label);

drop function parse_weight_grams(text);

-- Old values were rupee minimums; they don't translate to a kg minimum, so
-- reset to "no minimum" and let the admin set a real per-city kg minimum.
alter table public.cities rename column min_order_value to min_order_kg;
update public.cities set min_order_kg = 0;
