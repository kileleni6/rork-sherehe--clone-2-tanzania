-- SHEREHE: core relational tables — events, RSVPs, guest passes, check-ins, photos.
--
-- Run once against your Supabase project (SQL editor or `supabase db push`).
-- Idempotent — safe to re-run. Requires the pgcrypto extension (for gen_random_uuid()).
--
-- Tables:
--   1. events       — one row per hosted event, owned by an authenticated user.
--   2. rsvps        — one row per guest response; doubles as the guest pass + check-in
--                      record + shot tracker (replaces the old in-object rsvps[] array).
--   3. photos       — one row per guest photo; previously stored only in AsyncStorage.
--
-- RLS philosophy:
--   - events  : public SELECT (invite links must work without auth),
--               INSERT / UPDATE / DELETE only by the authenticated owner.
--   - rsvps   : public SELECT & INSERT (guests RSVP without signing in),
--               UPDATE / DELETE only by the authenticated event owner.
--   - photos  : public SELECT (gallery renders without auth),
--               INSERT by authenticated users only,
--               DELETE by the event owner only.
--
-- After running, seed a demo event + sample RSVPs into your new tables by
-- calling the `sherehe_seed_demo` function (included below) — or skip it
-- and let the app seed from its built-in AsyncStorage fallback.

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. EVENTS
-- ============================================================================

create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  type              text not null default 'custom',
  custom_label      text,
  time_of_day       text,
  cover             text not null default '',
  date              timestamptz not null,
  venue             text not null default 'TBD',
  message           text not null default '',
  dress_code        text,
  schedule          jsonb not null default '[]'::jsonb,
  template          text not null default 'noir',
  host_name         text not null default 'Host',
  shots_per_guest   int not null default 10,
  reveal_at         timestamptz not null default now(),
  reveal_mode       text not null default 'plus24h',
  upload_permission text not null default 'all',
  privacy           text not null default 'private',
  passcode          text,
  visibility        text not null default 'all_after_reveal',
  check_in_enabled  boolean not null default false,
  is_private        boolean not null default true,
  invited           int not null default 0,
  views             int not null default 0,
  premium           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for "my events" dashboard query.
create index if not exists idx_events_user_id on public.events(user_id);
create index if not exists idx_events_date on public.events(date);

-- Auto-update updated_at.
create or replace function public.sherehe_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.sherehe_touch_updated_at();

-- RLS: enable
alter table public.events enable row level security;

-- Anyone can read an event (invite links are public).
drop policy if exists "events public select" on public.events;
create policy "events public select"
  on public.events for select
  using (true);

-- Only authenticated users can insert (they become the owner).
drop policy if exists "events auth insert" on public.events;
create policy "events auth insert"
  on public.events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only the owner can update.
drop policy if exists "events owner update" on public.events;
create policy "events owner update"
  on public.events for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the owner can delete.
drop policy if exists "events owner delete" on public.events;
create policy "events owner delete"
  on public.events for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- 2. RSVPs
-- ============================================================================

create table if not exists public.rsvps (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  name             text not null default 'Guest',
  status           text not null default 'yes',  -- yes | no | maybe
  guests           int not null default 0,
  note             text,
  pass_code        text not null,
  checked_in_at    timestamptz,
  shots_used       int not null default 0,
  rejection_reason text,
  created_at       timestamptz not null default now()
);

-- Lookups by event (host dashboard, check-in scanner) and by pass_code.
create index if not exists idx_rsvps_event_id on public.rsvps(event_id);
create index if not exists idx_rsvps_pass_code on public.rsvps(pass_code);

-- RLS: enable
alter table public.rsvps enable row level security;

-- Public read — host dashboard + guest pass + scanner all need this.
drop policy if exists "rsvps public select" on public.rsvps;
create policy "rsvps public select"
  on public.rsvps for select
  using (true);

-- Anyone can RSVP (no auth required — guests don't sign in to RSVP).
drop policy if exists "rsvps public insert" on public.rsvps;
create policy "rsvps public insert"
  on public.rsvps for insert
  with check (true);

-- Only the event owner can update a guest (check-in, reject, increment shots).
drop policy if exists "rsvps owner update" on public.rsvps;
create policy "rsvps owner update"
  on public.rsvps for update
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.user_id = auth.uid()
    )
  );

-- Only the event owner can delete an RSVP.
drop policy if exists "rsvps owner delete" on public.rsvps;
create policy "rsvps owner delete"
  on public.rsvps for delete
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = rsvps.event_id
        and events.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 3. PHOTOS
-- ============================================================================

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  uri          text not null,
  guest_name   text not null default 'Guest',
  taken_at     timestamptz not null default now(),
  filter       text,
  style        text,
  flagged      boolean not null default false,
  storage_path text,
  uploaded_at  timestamptz,
  expires_at   timestamptz,
  expired      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_photos_event_id on public.photos(event_id);

alter table public.photos enable row level security;

-- Public read — gallery renders without auth.
drop policy if exists "photos public select" on public.photos;
create policy "photos public select"
  on public.photos for select
  using (true);

-- Authenticated users can upload photos.
drop policy if exists "photos auth insert" on public.photos;
create policy "photos auth insert"
  on public.photos for insert
  to authenticated
  with check (true);

-- Only the event owner can delete photos.
drop policy if exists "photos owner delete" on public.photos;
create policy "photos owner delete"
  on public.photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.events
      where events.id = photos.event_id
        and events.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 4. SEED HELPER — optional, call manually if you want demo data in the DB.
-- ============================================================================

create or replace function public.sherehe_seed_demo(owner_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_id uuid;
begin
  insert into public.events (
    user_id, name, type, cover, date, venue, message, dress_code,
    schedule, template, host_name, shots_per_guest, reveal_at,
    reveal_mode, upload_permission, privacy, visibility, check_in_enabled,
    is_private, invited, views
  ) values (
    owner_id,
    'Demo Wedding',
    'wedding',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80',
    now() + interval '12 days',
    'The Norfolk Gardens · Nairobi',
    'Together with our families, we invite you to celebrate our union.',
    'Black tie · Rose accents',
    '[
      {"id":"s1","time":"4:00 PM","title":"Ceremony"},
      {"id":"s2","time":"5:30 PM","title":"Cocktail Hour"},
      {"id":"s3","time":"7:00 PM","title":"Reception & Dinner"},
      {"id":"s4","time":"10:00 PM","title":"Dancing"}
    ]'::jsonb,
    'noir', 'Amara K.',
    24,
    now() + interval '13 days',
    'plus24h', 'all', 'private', 'all_after_reveal', true,
    true, 84, 142
  )
  returning id into ev_id;

  insert into public.rsvps (event_id, name, status, guests, pass_code) values
    (ev_id, 'Zuri Mensah',  'yes',   2, 'ZURI24'),
    (ev_id, 'Tariq Bello',  'yes',   1, 'TARI18'),
    (ev_id, 'Naledi Okafor','maybe', 1, 'NALE02'),
    (ev_id, 'Imani Diallo', 'yes',   2, 'IMAN77'),
    (ev_id, 'Kwame Asante', 'no',    0, 'KWAM31');

  return next ev_id;
end;
$$;
