-- ============================================================
-- Estimated delivery time per city
-- ============================================================
-- Delivery is now bus-based and city-only, so customers need to know
-- roughly how long a parcel takes to reach their pickup city (e.g. "1-2 days").

alter table public.cities
  add column if not exists estimated_delivery_time text;
