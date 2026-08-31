-- ============================================================
-- Unguessable order numbers
-- ============================================================
-- order_number was sequential: 'ORD' || YYMM || a shared 4-digit sequence,
-- e.g. ORD26080001, ORD26080002. One order number therefore revealed every
-- neighbouring one, and the padded counter leaked the shop's running order
-- total. That matters because order_number is half of the credential pair on
-- the public /api/orders/track endpoint (the other half being the phone
-- number on the address snapshot), so it must not be enumerable.
--
-- IMPORTANT: `alter column order_number set default ...` does NOT work here.
-- The set_order_number BEFORE INSERT trigger assigns new.order_number on
-- every insert, so a column default would be computed and then immediately
-- overwritten by the trigger. The generator function itself is what has to
-- change — which is what this migration does. The trigger and the column are
-- otherwise left exactly as they are.
--
-- Existing orders keep their ORD… numbers. Only new inserts are affected,
-- and nothing in the app parses the format (it is displayed, copied and
-- searched as an opaque string), so old and new coexist safely.
--
-- order_number_seq is deliberately left in place: it is no longer read, but
-- keeping it makes this migration trivial to roll back.

create or replace function generate_order_number()
returns trigger as $$
declare
  candidate text;
begin
  -- 8 uppercase hex characters = ~4.3 billion values. Hex contains no O, I
  -- or L, so the number stays unambiguous read off a screen or over the
  -- phone. gen_random_uuid() is a CSPRNG (PG13+), unlike random().
  for i in 1..10 loop
    candidate := 'PF' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1 from public.orders where order_number = candidate
    );
    candidate := null;
  end loop;

  -- Belt and braces: re-rolling on collision means a duplicate can never
  -- surface to a customer as a failed checkout. Ten misses is not a thing
  -- that happens; if it ever did, failing loudly beats a unique-violation.
  if candidate is null then
    raise exception 'could not generate a unique order_number after 10 attempts';
  end if;

  new.order_number := candidate;
  return new;
end;
$$ language plpgsql;
