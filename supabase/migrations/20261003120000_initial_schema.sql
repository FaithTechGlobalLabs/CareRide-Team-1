-- CareRide initial schema.
-- Mirrors src/types/index.ts. Columns are snake_case; the service layer maps them to camelCase.
-- RLS is enabled on every table with no policies yet, so the browser API can read/write nothing
-- until the access-policy migration (guide Step 7) adds explicit rules.

-- ---------------------------------------------------------------------------
-- Enums (match the TypeScript string unions)
-- ---------------------------------------------------------------------------

create type public.verification_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.org_type as enum ('PARTNER_ORG', 'TRANSPORT_PROVIDER');
create type public.user_role as enum ('PLATFORM_ADMIN', 'ORG_ADMIN', 'PARTNER', 'DRIVER');
create type public.driver_background as enum ('TAXI', 'RIDESHARE', 'ORG_DRIVER', 'INDEPENDENT');
create type public.ride_type as enum ('ON_DEMAND', 'SCHEDULED');
create type public.ride_status as enum (
  'SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION', 'PICKED_UP', 'COMPLETED', 'NO_SHOW', 'CANCELLED'
);
create type public.offer_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'TAKEN');
create type public.driver_document_type as enum ('LICENCE', 'PROFESSIONAL_PROOF');

-- Keeps updated_at current on every UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations: partner orgs (request rides) and transport providers (give rides)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (length(trim(name)) > 0),
  type                  public.org_type not null,
  contact_name          text not null,
  contact_phone         text not null,
  booking_notifications text,                   -- phone or email that hears about new bookings
  status                public.verification_status not null default 'PENDING',
  reviewed_by           uuid,                   -- FK to profiles added below (circular reference)
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- houses: point A, the partner org's pickup location
-- ---------------------------------------------------------------------------

create table public.houses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id),
  name       text not null,
  address    text not null,
  city       text not null,
  phone      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Current rule: one location per partner organization. Drop this to allow several.
  constraint houses_one_per_org unique (org_id)
);

-- ---------------------------------------------------------------------------
-- profiles: CareRide's app identity. auth_user_id is optional so an organization
-- can add a driver who has no login; an invitation can link one later.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name         text not null check (length(trim(name)) > 0),
  phone        text,
  email        text,                            -- display/contact only; Auth owns the login email
  role         public.user_role not null,
  org_id       uuid references public.organizations (id),
  house_id     uuid references public.houses (id),
  is_active    boolean not null default true,   -- deactivate instead of deleting (keeps ride history)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_partner_has_location check (role <> 'PARTNER' or (org_id is not null and house_id is not null)),
  constraint profiles_org_admin_has_org check (role <> 'ORG_ADMIN' or org_id is not null),
  constraint profiles_platform_admin_no_org check (role <> 'PLATFORM_ADMIN' or org_id is null)
);

alter table public.organizations
  add constraint organizations_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id);

-- ---------------------------------------------------------------------------
-- drivers: vehicle and eligibility details, one per DRIVER profile
-- ---------------------------------------------------------------------------

create table public.drivers (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null unique references public.profiles (id),
  org_id                uuid references public.organizations (id),   -- set if the driver belongs to an org
  background            public.driver_background not null,
  vehicle               text not null,
  wheelchair_accessible boolean not null default false,
  seats                 integer not null check (seats > 0),          -- spaces for passengers
  service_cities        text[] not null default '{}',
  -- Seven entries, 0 = Sunday ... 6 = Saturday. Each is null or {"from":"HH:MM","to":"HH:MM"}.
  request_hours         jsonb not null
                          check (jsonb_typeof(request_hours) = 'array' and jsonb_array_length(request_hours) = 7),
  request_hours_tz      text not null default 'America/Vancouver',
  min_notice_hours      integer not null default 0 check (min_notice_hours >= 0),
  status                public.verification_status not null default 'PENDING',
  reviewed_by           uuid references public.profiles (id),
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- destinations: point B, saved by a partner org
-- ---------------------------------------------------------------------------

create table public.destinations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id),
  name       text not null check (length(trim(name)) > 0),
  address    text not null,
  city       text not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rides: one-way trips. A return trip is a separate ride linked by return_of_ride_id.
-- Pickup and destination name/address are snapshots so later edits don't rewrite history.
-- ---------------------------------------------------------------------------

create table public.rides (
  id                    uuid primary key default gen_random_uuid(),
  -- Sent by the browser per submission so a retried request can't create a second booking.
  client_request_id     uuid unique,
  type                  public.ride_type not null,
  org_id                uuid not null references public.organizations (id),
  house_id              uuid not null references public.houses (id),
  requested_by          uuid not null references public.profiles (id),
  rider_names           text[],
  passengers            integer not null check (passengers > 0),
  pickup_address        text not null,
  pickup_instructions   text,
  destination_id        uuid references public.destinations (id) on delete set null,
  destination_name      text not null,
  destination_address   text not null,
  pickup_time           timestamptz not null,
  needs_wheelchair      boolean not null default false,
  needs_assistance      boolean not null default false,
  notes                 text,
  status                public.ride_status not null default 'SEARCHING',
  driver_id             uuid references public.drivers (id),
  preferred_driver_id   uuid references public.drivers (id),
  reconfirm_driver_id   uuid references public.drivers (id),
  return_of_ride_id     uuid references public.rides (id),
  -- Bumped whenever the ride is sent out again (edit or retry); offers carry the revision they answer.
  dispatch_revision     integer not null default 1 check (dispatch_revision > 0),
  cancel_reason         text,
  expired               boolean not null default false,   -- cancelled automatically: nobody accepted in time
  estimated_fare_saved  numeric(10, 2) not null default 0 check (estimated_fare_saved >= 0),
  dropped_by_driver_id  uuid references public.drivers (id),
  dropped_at            timestamptz,
  created_at            timestamptz not null default now(),
  accepted_at           timestamptz,
  driver_on_the_way_at  timestamptz,
  driver_eta            timestamptz,
  driver_arrived_at     timestamptz,
  picked_up_at          timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  changed_at            timestamptz,
  updated_at            timestamptz not null default now(),
  constraint rides_assigned_has_driver
    check (status not in ('ACCEPTED', 'PICKED_UP', 'COMPLETED', 'NO_SHOW') or driver_id is not null),
  constraint rides_not_own_return check (return_of_ride_id is null or return_of_ride_id <> id),
  constraint rides_dropped_pair check ((dropped_by_driver_id is null) = (dropped_at is null))
);

-- ---------------------------------------------------------------------------
-- ride_offers: a request sent to one driver for one dispatch round of a ride
-- ---------------------------------------------------------------------------

create table public.ride_offers (
  id                uuid primary key default gen_random_uuid(),
  ride_id           uuid not null references public.rides (id),
  driver_id         uuid not null references public.drivers (id),
  dispatch_revision integer not null,
  status            public.offer_status not null default 'PENDING',
  sent_at           timestamptz not null default now(),
  expires_at        timestamptz not null,
  responded_at      timestamptz,
  constraint ride_offers_expiry_after_sent check (expires_at > sent_at),
  -- A driver is asked at most once per round of a ride.
  constraint ride_offers_one_per_round unique (ride_id, driver_id, dispatch_revision)
);

-- ---------------------------------------------------------------------------
-- driver_documents: references to private files in Storage (never the file itself)
-- ---------------------------------------------------------------------------

create table public.driver_documents (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references public.drivers (id),
  doc_type          public.driver_document_type not null,
  storage_path      text not null unique,      -- e.g. <driver-id>/<document-id>.pdf in the private bucket
  original_filename text not null,             -- display only
  content_type      text,
  size_bytes        bigint check (size_bytes is null or size_bytes > 0),
  uploaded_by       uuid references public.profiles (id),
  uploaded_at       timestamptz not null default now(),
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes for frequent lookups (Postgres does not index foreign keys automatically)
-- ---------------------------------------------------------------------------

create index profiles_org_id_idx           on public.profiles (org_id);
create index profiles_house_id_idx         on public.profiles (house_id);
create index drivers_org_id_idx            on public.drivers (org_id);
create index drivers_status_idx            on public.drivers (status);
create index destinations_org_id_idx       on public.destinations (org_id);
create index rides_org_id_idx              on public.rides (org_id);
create index rides_house_id_idx            on public.rides (house_id);
create index rides_driver_id_idx           on public.rides (driver_id);
create index rides_status_pickup_idx       on public.rides (status, pickup_time);
create index rides_return_of_ride_id_idx   on public.rides (return_of_ride_id);
create index ride_offers_ride_id_idx       on public.ride_offers (ride_id);
create index ride_offers_driver_status_idx on public.ride_offers (driver_id, status);
create index ride_offers_pending_expiry_idx on public.ride_offers (expires_at) where status = 'PENDING';
create index driver_documents_driver_id_idx on public.driver_documents (driver_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger houses_set_updated_at before update on public.houses
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger drivers_set_updated_at before update on public.drivers
  for each row execute function public.set_updated_at();
create trigger destinations_set_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();
create trigger rides_set_updated_at before update on public.rides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, no policies yet = no browser access.
-- ---------------------------------------------------------------------------

alter table public.organizations    enable row level security;
alter table public.houses           enable row level security;
alter table public.profiles         enable row level security;
alter table public.drivers          enable row level security;
alter table public.destinations     enable row level security;
alter table public.rides            enable row level security;
alter table public.ride_offers      enable row level security;
alter table public.driver_documents enable row level security;
