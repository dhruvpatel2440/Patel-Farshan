-- ============================================================
-- Shop reels — short vertical videos shown on the landing page
-- ============================================================
-- Admin-curated only: unlike feedback there is no customer write path at all,
-- so there is no "pending" state to moderate. The admin uploads a clip and it
-- is live; `is_active` is the off switch.

create table public.shop_reels (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  caption text,
  video_url text not null,
  -- Optional still frame. Without one the player falls back to the video's
  -- own first frame, which costs a metadata fetch per card — fine for a
  -- handful of reels, worth a poster once there are many.
  poster_url text,
  -- Storage object paths kept alongside the public URLs: deleting a reel has
  -- to remove the files too, and parsing a path back out of a public URL is
  -- guesswork the moment Supabase changes its URL shape.
  video_path text not null,
  poster_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_reels_active_order_idx
  on public.shop_reels (display_order)
  where is_active;

create trigger shop_reels_updated_at
  before update on public.shop_reels
  for each row execute procedure update_updated_at();

alter table public.shop_reels enable row level security;

-- Guests included — the landing page reads this with the anon key.
create policy "Anyone can view active reels"
  on public.shop_reels for select using (is_active = true);

create policy "Admin full access reels"
  on public.shop_reels for all using (is_admin());

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------
-- NOTE: hosted Supabase can reject the statements below when the SQL editor
-- isn't the owner of the storage tables — and it fails quietly enough that
-- the table above still commits, leaving uploads to die with "The related
-- resource does not exist" (which means: no such bucket). If that happens,
-- create it in Dashboard -> Storage instead, named `shop-reels`, public, with
-- the same 50MB limit and MIME list spelled out here.
-- Videos are too large to pass through a serverless route body, so the
-- browser uploads them straight to storage with a short-lived signed URL
-- minted by /api/admin/reels/upload-url. That means the client, not our
-- server, states the content type — so the limits are pinned to the bucket
-- itself, where storage enforces them no matter who is uploading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-reels',
  'shop-reels',
  true,
  52428800, -- 50MB
  array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view reels"
  on storage.objects for select
  using (bucket_id = 'shop-reels');

create policy "Admin can upload reels"
  on storage.objects for insert
  with check (bucket_id = 'shop-reels' and is_admin());

create policy "Admin can update reels"
  on storage.objects for update
  using (bucket_id = 'shop-reels' and is_admin());

create policy "Admin can delete reels"
  on storage.objects for delete
  using (bucket_id = 'shop-reels' and is_admin());
