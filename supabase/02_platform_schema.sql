-- ============================================================
-- EV Charging Intelligence Platform — core schema
-- Run after schema.sql (which only has `profiles`).
--
-- Matches schema.sql's own conventions: plain `text` + `check`
-- constraints instead of custom enum types, `gen_random_uuid()`
-- (built into every Supabase project via pgcrypto, no extra
-- extension to enable) instead of uuid-ossp.
-- ============================================================

-- ------------------------------------------------------------
-- VEHICLES — one profile per driver (simulated battery for the
-- hackathon, no real telemetry)
-- ------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  model text not null,
  battery_percent int not null default 80 check (battery_percent between 0 and 100),
  estimated_range_km int not null default 250,
  max_charging_kw int,
  connector_type text,
  created_at timestamptz not null default now(),
  unique (owner_id)
);

alter table public.vehicles enable row level security;

drop policy if exists vehicles_owner_all on public.vehicles;
create policy vehicles_owner_all
on public.vehicles
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- STATIONS — commercial + community, same table, differentiated
-- by `type`. live_* columns are written by cv-service (service_role
-- key, bypasses RLS) and read by the recommendation engine.
-- ------------------------------------------------------------
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  type text not null default 'commercial' check (type in ('commercial', 'community')),
  verification text not null default 'pending' check (verification in ('pending', 'verified', 'rejected')),
  latitude double precision not null,
  longitude double precision not null,
  address text,
  contact text,
  total_chargers int not null default 1,
  charging_speed_kw int,
  connector_type text,
  price_per_kwh numeric,
  operating_hours text,
  amenities jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  verification_documents jsonb not null default '[]'::jsonb,
  rating numeric not null default 0,
  cctv_enabled boolean not null default false,
  -- Live occupancy, written by the CV service:
  live_available_chargers int,
  live_predicted_wait_min int,
  live_queue_length int,
  live_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.stations enable row level security;

drop policy if exists stations_select_public on public.stations;
create policy stations_select_public
on public.stations
for select
using (true);

drop policy if exists stations_insert_owner on public.stations;
create policy stations_insert_owner
on public.stations
for insert
with check (auth.uid() = owner_id);

drop policy if exists stations_update_owner on public.stations;
create policy stations_update_owner
on public.stations
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- CHARGER SLOTS
-- ------------------------------------------------------------
create table if not exists public.charger_slots (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  slot_label text not null,
  status text not null default 'available' check (status in ('available', 'occupied', 'maintenance')),
  updated_at timestamptz not null default now()
);

alter table public.charger_slots enable row level security;

drop policy if exists slots_select_public on public.charger_slots;
create policy slots_select_public
on public.charger_slots
for select
using (true);

drop policy if exists slots_write_owner on public.charger_slots;
create policy slots_write_owner
on public.charger_slots
for all
using (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()))
with check (exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid()));

-- ------------------------------------------------------------
-- SAVED PLACES — home/work/frequent destinations for the trip planner
-- ------------------------------------------------------------
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address text not null,
  created_at timestamptz not null default now()
);

alter table public.saved_places enable row level security;

drop policy if exists saved_places_owner_all on public.saved_places;
create policy saved_places_owner_all
on public.saved_places
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- CHARGING SESSIONS — for operator analytics later
-- ------------------------------------------------------------
create table if not exists public.charging_sessions (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  slot_id uuid references public.charger_slots(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  energy_kwh numeric,
  revenue numeric
);

alter table public.charging_sessions enable row level security;

drop policy if exists sessions_select_related on public.charging_sessions;
create policy sessions_select_related
on public.charging_sessions
for select
using (
  auth.uid() = driver_id
  or exists (select 1 from public.stations s where s.id = station_id and s.owner_id = auth.uid())
);

drop policy if exists sessions_insert_driver on public.charging_sessions;
create policy sessions_insert_driver
on public.charging_sessions
for insert
with check (auth.uid() = driver_id);

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  overall_rating numeric not null check (overall_rating between 1 and 5),
  charging_experience numeric,
  cleanliness numeric,
  staff numeric,
  facilities numeric,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public
on public.reviews
for select
using (true);

drop policy if exists reviews_insert_driver on public.reviews;
create policy reviews_insert_driver
on public.reviews
for insert
with check (auth.uid() = driver_id);

-- ------------------------------------------------------------
-- OCCUPANCY READINGS — append-only log written by cv-service
-- ------------------------------------------------------------
create table if not exists public.occupancy_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  occupied_count int not null,
  total_chargers int not null,
  predicted_wait_min int not null,
  queue_length int not null default 0,
  source text not null default 'cctv',
  created_at timestamptz not null default now()
);

alter table public.occupancy_readings enable row level security;

drop policy if exists occupancy_readings_select_public on public.occupancy_readings;
create policy occupancy_readings_select_public
on public.occupancy_readings
for select
using (true);
