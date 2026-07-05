-- SHEREHE: consolidated photo storage + purge (works on ALL Supabase plans).
--
-- Run this AFTER 0003_core_tables.sql. It does everything 0001 and 0002 did,
-- but with a plan-agnostic approach:
--
--   1. Creates the event-photos bucket (public-read, 20 MB limit).
--   2. Adds Storage RLS policies for authenticated upload.
--   3. Creates the in-DB purge function (works regardless of pg_cron availability).
--   4. If pg_cron is available → schedules it hourly (Pro/Team/Enterprise).
--   5. If pg_cron is NOT available → prints a notice; you'll use the edge
--      function triggered from a free external cron service or manually.
--
-- Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  20 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. RLS policies on storage.objects
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
-- 3. In-DB purge function (works on all plans)
-- ---------------------------------------------------------------------------
create or replace function public.sherehe_purge_expired_event_photos()
returns table(name text, purged_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '30 days';
begin
  return query
  with expired as (
    select o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'event-photos'
      and o.created_at < cutoff
  ),
  removed as (
    delete from storage.objects o
    using expired e
    where o.bucket_id = 'event-photos'
      and o.name = e.name
    returning o.name, now() as purged_at
  )
  select r.name, r.purged_at from removed r;
end;
$$;

-- Also mark DB photo records as expired so the gallery hides them.
create or replace function public.sherehe_mark_photos_expired()
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '30 days';
begin
  return query
  update public.photos
  set expired = true
  where created_at < cutoff
    and expired = false
  returning id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Try pg_cron (works on Pro+; fails gracefully on Free)
-- ---------------------------------------------------------------------------
do $$
begin
  -- Try to enable pg_cron
  create extension if not exists pg_cron;

  -- If we got here, pg_cron is available → schedule the purge
  perform cron.unschedule('sherehe-purge-event-photos')
  where exists (select 1 from cron.job where jobname = 'sherehe-purge-event-photos');

  perform cron.schedule(
    'sherehe-purge-event-photos',
    '0 * * * *',
    $$select public.sherehe_purge_expired_event_photos(); select public.sherehe_mark_photos_expired();$$
  );

  raise notice '✅ pg_cron is available — photos will be auto-purged hourly.';
exception when others then
  raise notice '⚠️ pg_cron is NOT available (likely Free plan).';
  raise notice '   Use the edge function or external cron instead (see instructions).';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Also purge on the photos table (mark DB records as expired)
--    This is handled above if pg_cron works, but you can also run it manually:
--      select public.sherehe_mark_photos_expired();
-- ---------------------------------------------------------------------------
