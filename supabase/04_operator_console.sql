-- ============================================================
-- Operator console additions — run after 02_platform_schema.sql
-- (03_seed.sql is optional demo data, order vs. this file doesn't matter).
--
-- Adds what the operator dashboard needs to let an operator add their
-- own stations, upload a CCTV clip per station, calibrate charger/queue
-- ROIs once, and track a simple "cars today" counter — without any of
-- that going through a separate backend (cv-service still writes
-- live_available_chargers etc. via its service_role key, unchanged).
-- ============================================================

-- ------------------------------------------------------------
-- STATIONS — camera + calibration columns.
--
-- charger_rois / queue_rois are stored as FRACTIONS of the frame
-- (0..1), not pixels — that way calibration survives the video being
-- displayed at any CSS size; the frontend converts fraction -> pixel
-- using the actual captured frame's width/height right before calling
-- cv-service, using roi_frame_width/height as the resolution the
-- fractions were calibrated against (sanity-check, not strictly
-- required for the math to work).
-- ------------------------------------------------------------
alter table public.stations
  add column if not exists cctv_video_url text,
  add column if not exists charger_rois jsonb not null default '[]'::jsonb,
  add column if not exists queue_rois jsonb not null default '[]'::jsonb,
  add column if not exists roi_frame_width int,
  add column if not exists roi_frame_height int,
  add column if not exists calibrated_at timestamptz;

-- ------------------------------------------------------------
-- STORAGE — one bucket for operator-uploaded CCTV clips.
-- Public read (so the <video> element can just play the public URL
-- without signing requests); write restricted to authenticated users.
-- Uploads are namespaced by the app as `{station_id}/{filename}`, and
-- the operator dashboard only ever lets an operator upload under a
-- station_id they own — enforced in the UI. A follow-up hardening
-- step would check ownership in the policy itself (via a path-parsing
-- predicate against `stations.owner_id`), left out here to match the
-- rest of this schema's hackathon-appropriate scope.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('station-footage', 'station-footage', true)
on conflict (id) do nothing;

drop policy if exists station_footage_read on storage.objects;
create policy station_footage_read
on storage.objects for select
using (bucket_id = 'station-footage');

drop policy if exists station_footage_write on storage.objects;
create policy station_footage_write
on storage.objects for insert
with check (bucket_id = 'station-footage' and auth.role() = 'authenticated');

drop policy if exists station_footage_update on storage.objects;
create policy station_footage_update
on storage.objects for update
using (bucket_id = 'station-footage' and auth.role() = 'authenticated')
with check (bucket_id = 'station-footage' and auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- DAILY TRAFFIC — a simple per-station, per-day "cars seen" counter.
-- Bumped from the browser (see bump_station_daily_traffic below) each
-- time a poll of cv-service shows a charger slot flipping from empty
-- to occupied. Deliberately coarse (a slot re-occupied twice in one
-- day counts as 2) — good enough for an operator's "how busy were we
-- today" glance, not a billing-grade session log (that's
-- charging_sessions, for later).
-- ------------------------------------------------------------
create table if not exists public.station_daily_traffic (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  traffic_date date not null default current_date,
  car_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (station_id, traffic_date)
);

alter table public.station_daily_traffic enable row level security;

drop policy if exists station_daily_traffic_select_owner on public.station_daily_traffic;
create policy station_daily_traffic_select_owner
on public.station_daily_traffic
for select
using (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()));

drop policy if exists station_daily_traffic_write_owner on public.station_daily_traffic;
create policy station_daily_traffic_write_owner
on public.station_daily_traffic
for all
using (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()))
with check (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()));

-- Atomic upsert-increment, callable from the browser via
-- `supabase.rpc('bump_station_daily_traffic', { p_station_id, p_amount })`.
-- security invoker (the default) — relies on the RLS policy above, so
-- an operator can only ever bump a counter for a station they own.
create or replace function public.bump_station_daily_traffic(
  p_station_id uuid,
  p_amount int default 1
)
returns int
language plpgsql
as $$
declare
  new_count int;
begin
  insert into public.station_daily_traffic (station_id, traffic_date, car_count)
  values (p_station_id, current_date, p_amount)
  on conflict (station_id, traffic_date)
  do update set car_count = public.station_daily_traffic.car_count + excluded.car_count,
                updated_at = now()
  returning car_count into new_count;

  return new_count;
end;
$$;
