-- Patel Farsan — optional sample product seed
-- Run after 0001_init.sql

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
