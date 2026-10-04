-- CareRide onboarding and approval (guide Step 9).
--
-- Sign-up flow:
--   1. The browser calls Auth signUp and stores the registration form in the login's metadata
--      under "careride_onboarding".
--   2. Once a session exists (straight away, or after the email link), the browser calls
--      complete_onboarding(). It builds the profile + pending organization/location/destinations,
--      or profile + pending driver, from that metadata in one transaction.
--   3. It is safe to call again: a login that already has a profile just gets its id back.
--
-- The metadata is user-editable, so it is treated as untrusted form input: only PARTNER or DRIVER
-- can be chosen, everything starts PENDING, and only a platform admin can approve.

-- Trims a required text field and rejects blanks or very long values.
create function private.required_text(p_value text, p_label text, p_max integer default 200)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := trim(coalesce(p_value, ''));
begin
  if v = '' then
    raise exception '% is required.', p_label using errcode = 'P0001';
  end if;
  if length(v) > p_max then
    raise exception '% is too long.', p_label using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Validates the 7-day request-hours shape: each day null or {"from":"HH:MM","to":"HH:MM"} with from < to.
create function private.valid_request_hours(p_hours jsonb)
returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  v_day jsonb;
begin
  if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours) <> 7 then
    raise exception 'Request hours must cover all seven days.' using errcode = 'P0001';
  end if;
  for v_day in select value from jsonb_array_elements(p_hours) loop
    continue when jsonb_typeof(v_day) = 'null';
    if jsonb_typeof(v_day) <> 'object'
       or coalesce(v_day ->> 'from', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_day ->> 'to', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (v_day ->> 'from') >= (v_day ->> 'to') then
      raise exception 'Each day''s request hours need a start time before the end time.' using errcode = 'P0001';
    end if;
  end loop;
  return p_hours;
end;
$$;

-- Inserts a driver's vehicle/eligibility row from form details. Shared by self sign-up and org-added drivers.
create function private.insert_driver(p_profile_id uuid, p_org_id uuid, p_details jsonb, p_default_background public.driver_background)
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

  select coalesce(array_agg(trim(c)) filter (where trim(c) <> ''), '{}')
    into v_cities
    from jsonb_array_elements_text(coalesce(p_details -> 'serviceCities', '[]'::jsonb)) as c;
  if cardinality(v_cities) = 0 then
    raise exception 'Choose at least one city.' using errcode = 'P0001';
  end if;

  insert into public.drivers (
    profile_id, org_id, background, vehicle, seats, wheelchair_accessible,
    service_cities, request_hours, min_notice_hours, status
  ) values (
    p_profile_id,
    p_org_id,
    coalesce((p_details ->> 'background')::public.driver_background, p_default_background),
    private.required_text(p_details ->> 'vehicle', 'Vehicle'),
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

-- ---------------------------------------------------------------------------
-- complete_onboarding(): build the caller's CareRide records from their sign-up details.
-- Returns the caller's profile id.
-- ---------------------------------------------------------------------------

create function public.complete_onboarding()
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

  -- Two tabs or a retry racing each other must not create two organizations.
  perform pg_advisory_xact_lock(hashtextextended('careride-onboarding:' || v_uid::text, 0));

  select p.id into v_profile_id from public.profiles p where p.auth_user_id = v_uid;
  if found then
    return v_profile_id; -- already done (or deactivated: the app's normal checks handle that)
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
      v_phone := private.required_text(v_details ->> 'contactPhone', 'Phone', 40);

      insert into public.organizations (name, type, contact_name, contact_phone, status)
      values (v_org_name, 'PARTNER_ORG', private.required_text(v_details ->> 'contactName', 'Your name'), v_phone, 'PENDING')
      returning id into v_org_id;

      -- A partner organization is one location; its shared account carries the org's name.
      insert into public.houses (org_id, name, address, city, phone)
      values (
        v_org_id,
        v_org_name,
        private.required_text(v_details ->> 'address', 'Address', 300),
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
            private.required_text(v_dest ->> 'name', 'Destination name'),
            private.required_text(v_dest ->> 'address', 'Destination address', 300),
            private.required_text(v_dest ->> 'city', 'Destination city', 100)
          );
        end loop;
      end if;

    when 'DRIVER' then
      insert into public.profiles (auth_user_id, name, phone, email, role)
      values (
        v_uid,
        private.required_text(v_details ->> 'name', 'Your name'),
        private.required_text(v_details ->> 'phone', 'Phone', 40),
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

-- ---------------------------------------------------------------------------
-- add_org_driver(): a partner org or transport provider adds a driver who has no login.
-- The org is the caller's own, never a value from the browser. Returns the new driver id.
-- ---------------------------------------------------------------------------

create function public.add_org_driver(p_details jsonb)
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
    private.required_text(p_details ->> 'phone', 'Phone', 40),
    'DRIVER',
    v_org_id
  )
  returning id into v_profile_id;

  return private.insert_driver(v_profile_id, v_org_id, p_details, 'ORG_DRIVER');
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin review. Records who reviewed and when.
-- ---------------------------------------------------------------------------

create function public.review_organization(p_org_id uuid, p_status public.verification_status)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only a CareRide admin can review organizations.' using errcode = 'P0001';
  end if;
  update public.organizations
     set status = p_status, reviewed_by = private.my_profile_id(), reviewed_at = now()
   where id = p_org_id;
  if not found then
    raise exception 'Organization not found.' using errcode = 'P0001';
  end if;
end;
$$;

create function public.review_driver(p_driver_id uuid, p_status public.verification_status)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only a CareRide admin can review drivers.' using errcode = 'P0001';
  end if;
  update public.drivers
     set status = p_status, reviewed_by = private.my_profile_id(), reviewed_at = now()
   where id = p_driver_id;
  if not found then
    raise exception 'Driver not found.' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute permissions: signed-in users only. Internal helpers are not callable from the API at all.
-- ---------------------------------------------------------------------------

revoke execute on function private.required_text(text, text, integer) from public;
revoke execute on function private.valid_request_hours(jsonb) from public;
revoke execute on function private.insert_driver(uuid, uuid, jsonb, public.driver_background) from public;

revoke execute on function public.complete_onboarding() from public, anon;
revoke execute on function public.add_org_driver(jsonb) from public, anon;
revoke execute on function public.review_organization(uuid, public.verification_status) from public, anon;
revoke execute on function public.review_driver(uuid, public.verification_status) from public, anon;

grant execute on function public.complete_onboarding() to authenticated;
grant execute on function public.add_org_driver(jsonb) to authenticated;
grant execute on function public.review_organization(uuid, public.verification_status) to authenticated;
grant execute on function public.review_driver(uuid, public.verification_status) to authenticated;
