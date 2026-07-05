-- SHEREHE: event photo storage + 30-day server-side retention
--
-- Run this once against your Supabase project (SQL editor or `supabase db push`).
-- It is idempotent — safe to re-run.
--
-- What it does:
--   1. Creates the `event-photos` Storage bucket (public-read so the client can
--      render directly via getPublicUrl; uploads are still gated by RLS).
--   2. Adds Storage RLS policies so any authenticated user can upload, and the
--      owner of an object can delete or replace it.
--   3. Installs a pg_cron job that runs hourly and deletes every object in the
--      bucket older than 30 days. Matches `STORAGE_RETENTION_DAYS` in the app.
--
-- After running, in the Supabase dashboard:
--   Database → Extensions → enable `pg_cron` and `pg_net` if not already on.

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  20 * 1024 * 1024, -- 20 MB per object
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. RLS policies on storage.objects scoped to the event-photos bucket
-- ---------------------------------------------------------------------------
drop policy if exists "event-photos read" on storage.objects;
create policy "event-photos read"
on storage.objects for select
using (bucket_id = 'event-photos');

drop policy if exists "event-photos insert" on storage.objects;
create policy "event-photos insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'event-photos');

drop policy if exists "event-photos update own" on storage.objects;
create policy "event-photos update own"
on storage.objects for update
to authenticated
using (bucket_id = 'event-photos' and owner = auth.uid())
with check (bucket_id = 'event-photos' and owner = auth.uid());

drop policy if exists "event-photos delete own" on storage.objects;
create policy "event-photos delete own"
on storage.objects for delete
to authenticated
using (bucket_id = 'event-photos' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. 30-day retention via pg_cron
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

create or replace function public.sherehe_purge_expired_event_photos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  purged int := 0;
begin
  with expired as (
    select name
    from storage.objects
    where bucket_id = 'event-photos'
      and created_at < now() - interval '30 days'
  ),
  removed as (
    delete from storage.objects o
    using expired e
    where o.bucket_id = 'event-photos'
      and o.name = e.name
    returning 1
  )
  select count(*) into purged from removed;

  raise notice 'sherehe_purge_expired_event_photos: removed % objects', purged;
end;
$$;

-- Unschedule the previous job if re-running, then schedule hourly.
do $$
begin
  perform cron.unschedule('sherehe-purge-event-photos')
  where exists (select 1 from cron.job where jobname = 'sherehe-purge-event-photos');
exception when others then
  null;
end $$;

select cron.schedule(
  'sherehe-purge-event-photos',
  '0 * * * *',
  $$select public.sherehe_purge_expired_event_photos();$$
);
