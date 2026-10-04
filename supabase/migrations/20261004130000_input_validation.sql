-- Server-side input rules that match the registration, destination, and driver-settings forms.
-- Sign-up metadata, destination inserts, and driver column updates are untrusted: the table and
-- these functions reject junk even when the browser checks are skipped.

-- Ten digits or more, so "604-555-0123", "(604) 555 0123" and "+1 604 555 0123" all pass.
-- Matches src/logic/validate.ts isPhone().
create function private.valid_phone(p_value text, p_label text default 'Phone')
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.required_text(p_value, p_label, 40);
begin
  if length(regexp_replace(v, '[^0-9]', '', 'g')) < 10 then
    raise exception 'Please enter a 10-digit phone number.' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Cities drivers serve and partner destinations may use. Matches src/constants.ts CITIES.
create function private.required_city(p_value text, p_label text default 'City')
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.required_text(p_value, p_label, 100);
begin
  if v not in ('Vancouver', 'Richmond') then
    raise exception 'Choose Vancouver or Richmond.' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Street address: not blank, not a one-word paste, and not a novel.
create function private.required_address(p_value text, p_label text default 'Address')
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := private.required_text(p_value, p_label, 300);
begin
  if length(v) < 5 then
    raise exception 'Add the full street address, so drivers can find it.' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

revoke execute on function private.valid_phone(text, text) from public;
revoke execute on function private.required_city(text, text) from public;
revoke execute on function private.required_address(text, text) from public;

-- Typed ride destinations (not a saved place) use the same address length rules as the booking form.
create or replace function private.resolve_destination(p_details jsonb, p_org_id uuid, out name text, out address text, out destination_id uuid)
language plpgsql stable set search_path = ''
as $$
begin
  destination_id := nullif(p_details ->> 'destinationId', '')::uuid;
  if destination_id is not null then
    select d.name, d.address into name, address
      from public.destinations d
      where d.id = destination_id and d.org_id = p_org_id;
    if not found then
      raise exception 'Choose one of your saved destinations.' using errcode = 'P0001';
    end if;
    return;
  end if;
  address := nullif(trim(coalesce(p_details ->> 'destinationAddress', '')), '');
  if address is null then
    raise exception 'Choose where the ride is going.' using errcode = 'P0001';
  end if;
  address := private.required_address(address, 'Destination');
  name := coalesce(private.optional_text(p_details ->> 'destinationName', 'Destination name', 80), address);
end;
$$;

-- Ride notes and other optional fields defaulted to 1000; the forms cap them at 500.
create or replace function private.optional_text(p_value text, p_label text, p_max integer default 500)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := nullif(trim(coalesce(p_value, '')), '');
begin
  if length(v) > p_max then
    raise exception '% is too long.', p_label using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table checks: destination inserts and driver settings updates skip the functions above.
-- ---------------------------------------------------------------------------

alter table public.organizations
  add constraint organizations_phone_digits
    check (length(regexp_replace(contact_phone, '[^0-9]', '', 'g')) >= 10 and char_length(contact_phone) <= 40);

alter table public.houses
  add constraint houses_phone_digits
    check (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10 and char_length(phone) <= 40),
  add constraint houses_address_len
    check (char_length(trim(address)) between 5 and 300),
  add constraint houses_city_len
    check (char_length(trim(city)) between 1 and 100);

alter table public.profiles
  add constraint profiles_phone_digits
    check (
      phone is null
      or (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10 and char_length(phone) <= 40)
    ),
  add constraint profiles_name_max
    check (char_length(trim(name)) <= 200);

alter table public.destinations
  add constraint destinations_name_max
    check (char_length(trim(name)) <= 80),
  add constraint destinations_address_len
    check (char_length(trim(address)) between 5 and 300),
  add constraint destinations_city_known
    check (city in ('Vancouver', 'Richmond')),
  add constraint destinations_notes_max
    check (notes is null or char_length(trim(notes)) <= 500);

-- Vehicle already has not-blank. Cities already require at least one; <@ rejects unknown names.
-- Empty arrays are contained by any array, so drivers_has_city stays.
alter table public.drivers
  add constraint drivers_vehicle_max
    check (char_length(trim(vehicle)) <= 80),
  add constraint drivers_cities_known
    check (service_cities <@ array['Vancouver', 'Richmond']::text[]);

-- ---------------------------------------------------------------------------
-- Sign-up / add-driver: same phone, city, address, and vehicle rules as the forms.
-- ---------------------------------------------------------------------------

create or replace function private.insert_driver(
  p_profile_id uuid, p_org_id uuid, p_details jsonb, p_default_background public.driver_background
)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_driver_id uuid;
  v_seats integer;
  v_notice integer;
  v_cities text[];
begin
  v_seats := (p_details ->> 'seats')::integer;
  if v_seats is null or v_seats < 1 or v_seats > 20 then
    raise exception 'Choose how many passengers your vehicle can take.' using errcode = 'P0001';
  end if;

  v_notice := coalesce((p_details ->> 'minNoticeHours')::integer, 0);
  if v_notice < 0 or v_notice > 336 then
    raise exception 'Choose how much notice you need.' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_details -> 'serviceCities', '[]'::jsonb)) is distinct from 'array' then
    raise exception 'Choose at least one city.' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(trim(c)) filter (where trim(c) <> ''), '{}')
    into v_cities
    from jsonb_array_elements_text(coalesce(p_details -> 'serviceCities', '[]'::jsonb)) as c;
  if cardinality(v_cities) = 0 then
    raise exception 'Choose at least one city.' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_cities) as c where c not in ('Vancouver', 'Richmond')) then
    raise exception 'Choose Vancouver or Richmond.' using errcode = 'P0001';
  end if;

  insert into public.drivers (
    profile_id, org_id, background, vehicle, seats, wheelchair_accessible,
    service_cities, request_hours, min_notice_hours, status
  ) values (
    p_profile_id,
    p_org_id,
    coalesce((p_details ->> 'background')::public.driver_background, p_default_background),
    private.required_text(p_details ->> 'vehicle', 'Vehicle', 80),
    v_seats,
    coalesce((p_details ->> 'wheelchairAccessible')::boolean, false),
    v_cities,
    private.valid_request_hours(p_details -> 'requestHours'),
    v_notice,
    'PENDING'
  )
  returning id into v_driver_id;

  return v_driver_id;
end;
$$;

create or replace function public.complete_onboarding()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_details jsonb;
  v_profile_id uuid;
  v_org_id uuid;
  v_house_id uuid;
  v_org_name text;
  v_phone text;
  v_dest jsonb;
begin
  if v_uid is null then
    raise exception 'Please sign in first.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('careride-onboarding:' || v_uid::text, 0));

  select p.id into v_profile_id from public.profiles p where p.auth_user_id = v_uid;
  if found then
    return v_profile_id;
  end if;

  select u.email, u.raw_user_meta_data -> 'careride_onboarding'
    into v_email, v_details
    from auth.users u
    where u.id = v_uid;

  if v_details is null or jsonb_typeof(v_details) <> 'object' then
    raise exception 'We couldn''t find your registration details. Please register again or contact CareRide.'
      using errcode = 'P0001';
  end if;

  case v_details ->> 'role'
    when 'PARTNER' then
      v_org_name := private.required_text(v_details ->> 'orgName', 'Organization name');
      v_phone := private.valid_phone(v_details ->> 'contactPhone', 'Phone');

      insert into public.organizations (name, type, contact_name, contact_phone, status)
      values (v_org_name, 'PARTNER_ORG', private.required_text(v_details ->> 'contactName', 'Your name'), v_phone, 'PENDING')
      returning id into v_org_id;

      insert into public.houses (org_id, name, address, city, phone)
      values (
        v_org_id,
        v_org_name,
        private.required_address(v_details ->> 'address', 'Address'),
        private.required_text(v_details ->> 'city', 'City', 100),
        v_phone
      )
      returning id into v_house_id;

      insert into public.profiles (auth_user_id, name, phone, email, role, org_id, house_id)
      values (v_uid, v_org_name, v_phone, v_email, 'PARTNER', v_org_id, v_house_id)
      returning id into v_profile_id;

      if jsonb_typeof(v_details -> 'destinations') = 'array' then
        if jsonb_array_length(v_details -> 'destinations') > 50 then
          raise exception 'Add up to 50 destinations during sign-up.' using errcode = 'P0001';
        end if;
        for v_dest in select value from jsonb_array_elements(v_details -> 'destinations') loop
          insert into public.destinations (org_id, name, address, city)
          values (
            v_org_id,
            private.required_text(v_dest ->> 'name', 'Destination name', 80),
            private.required_address(v_dest ->> 'address', 'Destination address'),
            private.required_city(v_dest ->> 'city', 'Destination city')
          );
        end loop;
      end if;

    when 'DRIVER' then
      insert into public.profiles (auth_user_id, name, phone, email, role)
      values (
        v_uid,
        private.required_text(v_details ->> 'name', 'Your name'),
        private.valid_phone(v_details ->> 'phone', 'Phone'),
        v_email,
        'DRIVER'
      )
      returning id into v_profile_id;

      perform private.insert_driver(v_profile_id, null, v_details, 'INDEPENDENT');

    else
      raise exception 'Choose whether you are registering an organization or as a driver.' using errcode = 'P0001';
  end case;

  return v_profile_id;
end;
$$;

create or replace function public.add_org_driver(p_details jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_org_id uuid := private.my_managed_org_id();
  v_profile_id uuid;
begin
  if v_org_id is null then
    raise exception 'Only an organization account can add drivers.' using errcode = 'P0001';
  end if;
  if (select o.status from public.organizations o where o.id = v_org_id) = 'REJECTED' then
    raise exception 'This organization can''t add drivers.' using errcode = 'P0001';
  end if;

  insert into public.profiles (name, phone, role, org_id)
  values (
    private.required_text(p_details ->> 'name', 'Driver name'),
    private.valid_phone(p_details ->> 'phone', 'Phone'),
    'DRIVER',
    v_org_id
  )
  returning id into v_profile_id;

  return private.insert_driver(v_profile_id, v_org_id, p_details, 'ORG_DRIVER');
end;
$$;
