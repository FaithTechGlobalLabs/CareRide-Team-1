-- Drivers no longer pick how much notice they need. They can decline any request,
-- so last-minute rides are offered the same as any other.

revoke update (min_notice_hours) on public.drivers from authenticated;

create or replace function private.match_drivers(p_ride public.rides, p_exclude uuid[], p_at timestamptz, p_check_hours boolean)
returns setof uuid
language sql stable set search_path = ''
as $$
  select d.id
  from public.drivers d
  join public.profiles p on p.id = d.profile_id
  join public.houses h on h.id = p_ride.house_id
  where d.status = 'APPROVED'
    and p.is_active
    and not (d.id = any(coalesce(p_exclude, '{}')))
    and h.city = any(d.service_cities)
    and d.seats >= p_ride.passengers
    and (not p_ride.needs_wheelchair or d.wheelchair_accessible)
    and (not p_check_hours or private.within_request_hours(d.request_hours, d.request_hours_tz, p_at))
  order by
    (case when d.id = p_ride.preferred_driver_id then -1000 else 0 end)
      + (case when d.wheelchair_accessible and not p_ride.needs_wheelchair then 100 else 0 end)
      + d.seats,
    d.id
$$;

drop function public.booking_driver_pool();

create function public.booking_driver_pool()
returns table (
  seats integer,
  wheelchair_accessible boolean,
  service_cities text[],
  request_hours jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.my_role() is distinct from 'PARTNER' and not private.is_admin() then
    raise exception 'Only partner organizations can preview drivers.' using errcode = 'P0001';
  end if;
  return query
    select d.seats, d.wheelchair_accessible, d.service_cities, d.request_hours
    from public.drivers d
    join public.profiles p on p.id = d.profile_id
    where d.status = 'APPROVED' and p.is_active
    order by random();
end;
$$;

revoke execute on function public.booking_driver_pool() from public, anon;
grant execute on function public.booking_driver_pool() to authenticated;

create or replace function private.insert_driver(
  p_profile_id uuid, p_org_id uuid, p_details jsonb, p_default_background public.driver_background
)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_driver_id uuid;
  v_seats integer;
  v_cities text[];
begin
  v_seats := (p_details ->> 'seats')::integer;
  if v_seats is null or v_seats < 1 or v_seats > 20 then
    raise exception 'Choose how many passengers your vehicle can take.' using errcode = 'P0001';
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
    service_cities, request_hours, status
  ) values (
    p_profile_id,
    p_org_id,
    coalesce((p_details ->> 'background')::public.driver_background, p_default_background),
    private.required_text(p_details ->> 'vehicle', 'Vehicle', 80),
    v_seats,
    coalesce((p_details ->> 'wheelchairAccessible')::boolean, false),
    v_cities,
    private.valid_request_hours(p_details -> 'requestHours'),
    'PENDING'
  )
  returning id into v_driver_id;

  return v_driver_id;
end;
$$;

alter table public.drivers drop constraint if exists drivers_notice_max;
alter table public.drivers drop column min_notice_hours;
