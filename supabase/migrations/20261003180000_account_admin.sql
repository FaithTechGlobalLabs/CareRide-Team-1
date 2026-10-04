-- CareRide account administration (guide Step 14).
--
-- Removing an account happens in two parts, because they live in different services:
--   1. admin_deactivate_account() (here): one transaction that switches the CareRide account off, so the
--      access rules stop authorizing it immediately, and moves the driver's open work to other drivers.
--   2. The admin-delete-account Edge Function then deletes the Supabase login with the server-only key.
-- If step 2 fails, the account stays deactivated and still appears in the admin list, so deleting it
-- again finishes the job. Profiles, drivers and past rides are kept for history.
--
-- Password resets need no database change: the app asks Supabase Auth to email a reset link.

create function public.admin_deactivate_account(p_profile_id uuid)
returns uuid -- the login to delete next, or null if the account never had one
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_driver_id uuid;
  v_ride public.rides;
begin
  if not private.is_admin() then
    raise exception 'Only a CareRide admin can delete accounts.' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Account not found.' using errcode = 'P0001';
  end if;
  if not v_profile.is_active then
    return v_profile.auth_user_id; -- already switched off: let the login removal finish
  end if;

  if v_profile.role = 'PLATFORM_ADMIN'
     and (select count(*) from public.profiles p where p.role = 'PLATFORM_ADMIN' and p.is_active) <= 1 then
    raise exception 'This is the only CareRide admin account, so it can''t be deleted.' using errcode = 'P0001';
  end if;

  select d.id into v_driver_id from public.drivers d where d.profile_id = p_profile_id;

  if v_driver_id is not null then
    -- Lock every ride this driver is part of (rides first, in a fixed order, like the ride functions).
    perform 1 from public.rides r
     where (r.driver_id = v_driver_id and r.status in ('ACCEPTED', 'PICKED_UP'))
        or exists (select 1 from public.ride_offers o
                   where o.ride_id = r.id and o.driver_id = v_driver_id and o.status = 'PENDING')
     order by r.id
     for update of r;

    if exists (select 1 from public.rides r where r.driver_id = v_driver_id and r.status = 'PICKED_UP') then
      raise exception 'This driver has a client in the car right now. Try again once the ride is finished.'
        using errcode = 'P0001';
    end if;
  end if;

  -- Switch the account off first, so matching no longer picks this driver.
  update public.profiles set is_active = false where id = p_profile_id;

  if v_driver_id is not null then
    -- Requests waiting on them move to the next driver.
    for v_ride in
      select r.* from public.rides r
      where exists (select 1 from public.ride_offers o
                    where o.ride_id = r.id and o.driver_id = v_driver_id and o.status = 'PENDING')
      order by r.id
    loop
      update public.ride_offers set status = 'EXPIRED'
       where ride_id = v_ride.id and driver_id = v_driver_id and status = 'PENDING';
      perform private.dispatch_if_unanswered(v_ride.id);
    end loop;

    -- Upcoming rides they accepted go back out to other drivers.
    for v_ride in
      select r.* from public.rides r
      where r.driver_id = v_driver_id and r.status = 'ACCEPTED'
      order by r.id
    loop
      update public.rides set
        status = 'SEARCHING',
        driver_id = null, accepted_at = null, driver_on_the_way_at = null, driver_eta = null, driver_arrived_at = null
      where id = v_ride.id;
      perform private.dispatch(v_ride.id);
    end loop;
  end if;

  return v_profile.auth_user_id;
end;
$$;

revoke execute on function public.admin_deactivate_account(uuid) from public, anon;
grant execute on function public.admin_deactivate_account(uuid) to authenticated;

-- The admin list also shows switched-off accounts whose login still exists (a removal that didn't finish),
-- so deleting them again can complete it.
create or replace function public.admin_list_accounts()
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  role public.user_role,
  org_id uuid,
  house_id uuid
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only a CareRide admin can list accounts.' using errcode = 'P0001';
  end if;
  return query
    select p.id, p.name, p.phone, u.email::text, p.role, p.org_id, p.house_id
    from public.profiles p
    join auth.users u on u.id = p.auth_user_id
    order by p.name;
end;
$$;
