-- Supabase schema for RentQuad mobility backend
-- Run this file via the Supabase SQL editor or CLI after creating your project.

-- Required extensions -------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- Enumerated types ---------------------------------------------------------

-- Vehicle lifecycle on the platform
do $$
begin
    if not exists (select 1 from pg_type where typname = 'vehicle_status') then
        create type public.vehicle_status as enum ('offline', 'available', 'reserved', 'maintenance', 'retired');
    end if;
end $$;

-- Reservation states
do $$
begin
    if not exists (select 1 from pg_type where typname = 'reservation_status') then
        create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled', 'expired');
    end if;
end $$;

-- Ride lifecycle
do $$
begin
    if not exists (select 1 from pg_type where typname = 'ride_status') then
        create type public.ride_status as enum ('starting', 'in_progress', 'finding', 'ended', 'cancelled');
    end if;
end $$;

-- Payment metadata
do $$
begin
    if not exists (select 1 from pg_type where typname = 'payment_status') then
        create type public.payment_status as enum ('initiated', 'authorized', 'captured', 'refunded', 'failed');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'payment_provider') then
        create type public.payment_provider as enum ('iyzico', 'stripe', 'iyzico_test', 'manual');
    end if;
end $$;

-- Maintenance jobs
do $$
begin
    if not exists (select 1 from pg_type where typname = 'maintenance_status') then
        create type public.maintenance_status as enum ('new', 'assigned', 'in_progress', 'resolved', 'dismissed');
    end if;
end $$;

-- Core domain tables -------------------------------------------------------

-- 1. Profiles extend the built-in auth.users table with domain fields
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null,
    phone_number text unique,
    license_number text,
    license_verified_at timestamptz,
    date_of_birth date,
    photo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_phone on public.profiles (phone_number);

-- 2. Vehicles registered on the platform
create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    display_name text not null,
    model text,
    license_plate text unique,
    vin text unique,
    status vehicle_status not null default 'offline',
    battery_percent numeric(5,2) not null default 0,
    mileage_km numeric(10,2) not null default 0,
    current_location geography(Point, 4326),
    heading numeric(6,2),
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_status on public.vehicles (status);
create index if not exists idx_vehicles_location on public.vehicles using gist (current_location);

-- 3. Vehicle location history for analytics & tracking
create table if not exists public.vehicle_locations (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles (id) on delete cascade,
    location geography(Point, 4326) not null,
    battery_percent numeric(5,2),
    speed_kph numeric(6,2),
    heading numeric(6,2),
    recorded_at timestamptz not null default now()
);

create index if not exists idx_vehicle_locations_vehicle_time on public.vehicle_locations (vehicle_id, recorded_at desc);
create index if not exists idx_vehicle_locations_location on public.vehicle_locations using gist (location);

-- 4. Vehicle media stored in Supabase Storage (keep metadata here)
create table if not exists public.vehicle_media (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles (id) on delete cascade,
    file_path text not null,
    is_primary boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_vehicle_media_vehicle on public.vehicle_media (vehicle_id);

-- 5. Pricing rules snapshot configurable per city/segment
create table if not exists public.pricing_rules (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    base_fee numeric(10,2) not null default 0,
    unlock_fee numeric(10,2) not null default 0,
    per_minute_fee numeric(10,2) not null default 0,
    per_km_fee numeric(10,2) not null default 0,
    currency char(3) not null default 'TRY',
    is_active boolean not null default true,
    effective_from timestamptz not null default now(),
    effective_to timestamptz,
    created_at timestamptz not null default now()
);

-- 6. Reservations hold a vehicle for a rider before scanning
create table if not exists public.reservations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    vehicle_id uuid not null references public.vehicles (id) on delete cascade,
    status reservation_status not null default 'pending',
    qr_code text,
    starts_at timestamptz not null default now(),
    expires_at timestamptz not null,
    reserved_at timestamptz not null default now(),
    confirmed_at timestamptz,
    cancelled_at timestamptz,
    cancel_reason text,
    created_at timestamptz not null default now()
);

create index if not exists idx_reservations_user_status on public.reservations (user_id, status);
create index if not exists idx_reservations_vehicle_active on public.reservations (vehicle_id) where status in ('pending','confirmed');

-- 7. Reservation event log keeps audit trail
create table if not exists public.reservation_events (
    id uuid primary key default gen_random_uuid(),
    reservation_id uuid not null references public.reservations (id) on delete cascade,
    event_type text not null,
    payload jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_reservation_events_reservation on public.reservation_events (reservation_id, created_at);

-- 8. Rides represent an active/on-going trip
create table if not exists public.rides (
    id uuid primary key default gen_random_uuid(),
    reservation_id uuid unique references public.reservations (id) on delete set null,
    user_id uuid not null references public.profiles (id) on delete cascade,
    vehicle_id uuid not null references public.vehicles (id) on delete cascade,
    pricing_rule_id uuid references public.pricing_rules (id),
    status ride_status not null default 'starting',
    started_at timestamptz,
    ended_at timestamptz,
    pickup_position geography(Point, 4326),
    dropoff_position geography(Point, 4326),
    distance_km numeric(10,2),
    duration_seconds integer,
    base_amount numeric(10,2) not null default 0,
    distance_amount numeric(10,2) not null default 0,
    time_amount numeric(10,2) not null default 0,
    discounts_amount numeric(10,2) not null default 0,
    total_amount numeric(10,2) not null default 0,
    currency char(3) not null default 'TRY',
    created_at timestamptz not null default now()
);

create index if not exists idx_rides_user on public.rides (user_id, created_at desc);
create index if not exists idx_rides_vehicle on public.rides (vehicle_id, started_at desc);
create index if not exists idx_rides_status on public.rides (status);

-- 9. Ride events capture telematics, QR scans, etc.
create table if not exists public.ride_events (
    id uuid primary key default gen_random_uuid(),
    ride_id uuid not null references public.rides (id) on delete cascade,
    event_type text not null,
    payload jsonb,
    recorded_at timestamptz not null default now()
);

create index if not exists idx_ride_events_ride on public.ride_events (ride_id, recorded_at desc);

-- 10. Payments for completed rides
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    ride_id uuid not null references public.rides (id) on delete cascade,
    amount numeric(10,2) not null,
    currency char(3) not null default 'TRY',
    status payment_status not null default 'initiated',
    provider payment_provider not null default 'iyzico_test',
    provider_reference text,
    error_code text,
    issued_at timestamptz not null default now(),
    settled_at timestamptz
);

create index if not exists idx_payments_ride on public.payments (ride_id);
create index if not exists idx_payments_status on public.payments (status);

-- 11. Maintenance jobs keep vehicles healthy
create table if not exists public.maintenance_jobs (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles (id) on delete cascade,
    status maintenance_status not null default 'new',
    issue_code text not null,
    notes text,
    assigned_to uuid references public.profiles (id),
    opened_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists idx_maintenance_vehicle on public.maintenance_jobs (vehicle_id);
create index if not exists idx_maintenance_status on public.maintenance_jobs (status);

-- 12. Support tickets for user issues (optional but useful)
create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    ride_id uuid references public.rides (id) on delete set null,
    category text not null,
    description text not null,
    status text not null default 'open',
    created_at timestamptz not null default now(),
    closed_at timestamptz
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id);

-- Utility triggers ---------------------------------------------------------
-- Update updated_at columns automatically
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger set_vehicles_updated_at
    before update on public.vehicles
    for each row execute function public.set_updated_at();
