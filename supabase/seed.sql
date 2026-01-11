-- Seed data for RentQuad Supabase project
-- Run after the schema is created. Safe to rerun thanks to upserts.

-- 1. Pricing rule -----------------------------------------------------------
insert into public.pricing_rules (name, base_fee, unlock_fee, per_minute_fee, per_km_fee, currency, is_active)
values ('standard_v1', 9.90, 4.50, 3.20, 2.00, 'TRY', true)
on conflict (name) do update
    set is_active = excluded.is_active,
        base_fee = excluded.base_fee,
        unlock_fee = excluded.unlock_fee,
        per_minute_fee = excluded.per_minute_fee,
        per_km_fee = excluded.per_km_fee,
        effective_from = now();

-- 2. Vehicles (single type RentQuad One) -----------------------------------
with source(code, display_name, license_plate, vin, battery_percent, mileage_km, lon, lat, heading) as (
    values
        ('RQ-001', 'RentQuad One 001', '34 RQ 001', 'RNTQD001000000001', 82.0, 1240.5, 29.432118, 40.803214, 12.0),
        ('RQ-002', 'RentQuad One 002', '34 RQ 002', 'RNTQD001000000002', 76.5, 980.2, 29.440987, 40.807861, 45.0),
        ('RQ-003', 'RentQuad One 003', '34 RQ 003', 'RNTQD001000000003', 64.3, 1504.8, 29.421456, 40.797402, 300.0),
        ('RQ-004', 'RentQuad One 004', '34 RQ 004', 'RNTQD001000000004', 58.9, 1123.4, 29.449872, 40.792688, 180.0),
        ('RQ-005', 'RentQuad One 005', '34 RQ 005', 'RNTQD001000000005', 91.2, 875.0, 29.436503, 40.810945, 270.0)
),
upserted as (
    insert into public.vehicles (
        code,
        display_name,
        model,
        license_plate,
        vin,
        status,
        battery_percent,
        mileage_km,
        current_location,
        heading,
        last_seen_at
    )
    select
        code,
        'RentQuad One',
        'RentQuad One',
        license_plate,
        vin,
        'available',
        battery_percent,
        mileage_km,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326),
        heading,
        now()
    from source
    on conflict (code) do update set
        status = excluded.status,
        battery_percent = excluded.battery_percent,
        mileage_km = excluded.mileage_km,
        current_location = excluded.current_location,
        heading = excluded.heading,
        updated_at = now(),
        last_seen_at = excluded.last_seen_at
    returning id, code
)
insert into public.vehicle_locations (
    vehicle_id,
    location,
    battery_percent,
    speed_kph,
    heading,
    recorded_at
)
select
    u.id,
    ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326),
    s.battery_percent,
    0,
    s.heading,
    now()
from upserted u
join source s on s.code = u.code;
