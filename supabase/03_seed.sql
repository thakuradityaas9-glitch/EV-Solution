-- ============================================================
-- Seed data — run after 02_platform_schema.sql
--
-- Centered on Chandigarh/Mohali (30.33, 76.38) to match the
-- frontend's existing DEFAULT_CENTER / CURRENT_LOCATION constants
-- in DriverMap.jsx, so seeded stations actually show up near where
-- the app already centers the map.
--
-- Same deliberate edge cases as the rest of the project's seed data:
--   - stations at varying distance from a typical route (tests the
--     corridor filter)
--   - one station outside a 20km radius (tests it gets excluded)
--   - one 'pending' and one 'rejected' station (tests the
--     verification filter — rejected should never appear)
--   - total_chargers ranging from 1 to 12 (tests wait-time variance)
--   - a mix of commercial + community stations
-- ============================================================

insert into public.stations
  (name, type, verification, latitude, longitude, address, total_chargers, charging_speed_kw, connector_type, price_per_kwh, operating_hours, amenities, rating, cctv_enabled)
values
  ('GreenCharge Hub', 'commercial', 'verified', 30.3398, 76.3869, 'Sector 17, Chandigarh', 8, 120, 'CCS2', 18.5, '24/7', '["cafe","restroom","parking"]', 4.7, true),
  ('Polar Park Station', 'commercial', 'verified', 30.3445, 76.4012, 'Sector 22, Chandigarh', 6, 180, 'CCS2', 20.0, '24/7', '["restroom","24/7 support"]', 4.8, true),
  ('BlueWay Central', 'commercial', 'verified', 30.3275, 76.3948, 'Sector 34, Chandigarh', 12, 90, 'CCS2', 16.0, '10:00 PM close', '["cafe","ev shop","restroom"]', 4.3, true),
  ('Mohali Community Point', 'community', 'verified', 30.3050, 76.3700, 'Phase 5, Mohali', 1, 22, 'Type 2', 12.0, '6am-10pm', '["wifi"]', 4.9, false),
  ('Panchkula SuperCharge', 'commercial', 'verified', 30.3650, 76.4200, 'Sector 8, Panchkula', 4, 90, 'CCS2', 19.0, '24/7', '["restroom"]', 4.0, true),
  ('Zirakpur Highway Plaza', 'commercial', 'verified', 30.3900, 76.4550, 'NH-7, Zirakpur', 10, 150, 'CCS2', 21.0, '24/7', '["cafe","restroom","parking","wifi"]', 4.5, true),
  ('Kansal Community Charger', 'community', 'verified', 30.3200, 76.4300, 'Kansal, near Sukhna Lake', 2, 22, 'Type 2', 11.5, '7am-11pm', '["parking"]', 4.6, false),
  ('IT Park Cyber Hub', 'commercial', 'verified', 30.3520, 76.4680, 'IT Park, Chandigarh', 14, 180, 'CCS2', 21.5, '24/7', '["cafe","restroom","parking","wifi","security"]', 4.8, true),
  -- Deliberately outside a ~20km corridor from central Chandigarh — should be excluded by any corridor filter
  ('Ropar Highway Charger', 'commercial', 'verified', 30.9680, 76.5270, 'NH-7, Ropar', 6, 100, 'CCS2', 17.0, '24/7', '["restroom","parking"]', 4.1, true),
  -- Rejected verification — should NEVER appear regardless of distance
  ('Unverified Roadside Charger', 'commercial', 'rejected', 30.3400, 76.3800, 'Old Road, Chandigarh', 3, 50, 'CCS2', 15.0, '24/7', '[]', 2.1, false),
  -- Pending verification — should still appear (only 'rejected' is excluded)
  ('Sector 43 Transit Hub', 'commercial', 'pending', 30.3150, 76.3550, 'Sector 43, Chandigarh', 10, 60, 'CCS2', 16.5, '24/7', '["cafe","restroom","parking","wifi"]', 4.2, true);

-- Charger slots for the two CCTV-enabled stations most likely to be
-- used in a demo — mixed occupied/available so cv-service has
-- something to detect.
insert into public.charger_slots (station_id, slot_label, status)
select id, 'Charger 0' || gs, (case when gs <= 6 then 'occupied' else 'available' end)
from public.stations, generate_series(1, 8) gs
where name = 'GreenCharge Hub';

insert into public.charger_slots (station_id, slot_label, status)
select id,
  case when gs < 10 then 'Charger 0' || gs else 'Charger ' || gs end,
  (case when gs <= 10 then 'occupied' when gs = 11 then 'maintenance' else 'available' end)
from public.stations, generate_series(1, 14) gs
where name = 'IT Park Cyber Hub';
