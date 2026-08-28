-- Patel Farsan — category images storage bucket
-- Run after 0001_init.sql

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict do nothing;

create policy "Public can view category images"
  on storage.objects for select
  using (bucket_id = 'category-images');

create policy "Admin can upload category images"
  on storage.objects for insert
  with check (bucket_id = 'category-images' and is_admin());

create policy "Admin can delete category images"
  on storage.objects for delete
  using (bucket_id = 'category-images' and is_admin());
