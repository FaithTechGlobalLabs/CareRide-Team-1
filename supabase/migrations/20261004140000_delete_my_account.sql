-- A driver or partner organization closes their own sign-in.
--
-- The profile, driver, organization, and ride rows stay, so history still has a name.
-- profiles.is_active is switched off, which is what every access check looks at.
-- The delete-my-account Edge Function then removes the Auth login. If that second step
-- fails, this function can be called again while the session still exists: an already
-- inactive profile just returns the login id so removal can finish.
--
-- A driver with a client in the car has to finish that ride first. Accepted rides go
-- back out to other drivers. A partner's rides that have not started are cancelled,
-- because nobody would be left to manage them. A ride already under way finishes.

create function public.deactivate_my_account()
returns uuid -- the login to delete next
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles;
  v_driver_id uuid;
  v_ride public.rides;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where auth_user_id = v_uid for update;
  if not found then
    raise exception 'Account not found.' using errcode = 'P0001';
  end if;
  if v_profile.role not in ('DRIVER', 'PARTNER') then
    raise exception 'This account can''t be closed from here.' using errcode = 'P0001';
  end if;
  if not v_profile.is_active then
    return v_profile.auth_user_id;
  end if;

  if v_profile.role = 'DRIVER' then
    select d.id into v_driver_id from public.drivers d where d.profile_id = v_profile.id;

    if v_driver_id is not null then
      -- Lock every ride this driver is part of (rides first, in a fixed order, like the ride functions).
      perform 1 from public.rides r
       where (r.driver_id = v_driver_id and r.status in ('ACCEPTED', 'PICKED_UP'))
          or exists (select 1 from public.ride_offers o
                     where o.ride_id = r.id and o.driver_id = v_driver_id and o.status = 'PENDING')
       order by r.id
       for update of r;

      if exists (select 1 from public.rides r where r.driver_id = v_driver_id and r.status = 'PICKED_UP') then
        raise exception 'You have a client in the car right now. Finish that ride, then close your account.'
          using errcode = 'P0001';
      end if;
    end if;

    -- Switch the account off first, so matching no longer picks this driver.
    update public.profiles set is_active = false where id = v_profile.id;

    if v_driver_id is not null then
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
  else
    perform 1 from public.rides r
     where r.org_id = v_profile.org_id
       and r.status in ('SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION')
     order by r.id
     for update of r;

    update public.profiles set is_active = false where id = v_profile.id;

    for v_ride in
      select r.* from public.rides r
      where r.org_id = v_profile.org_id
        and r.status in ('SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION')
      order by r.id
    loop
      update public.rides
         set status = 'CANCELLED',
             cancel_reason = 'The organization closed its CareRide account.',
             cancelled_at = now()
       where id = v_ride.id;
      perform private.close_pending_offers(v_ride.id);
    end loop;
  end if;

  return v_profile.auth_user_id;
end;
$$;

revoke execute on function public.deactivate_my_account() from public, anon;
grant execute on function public.deactivate_my_account() to authenticated;
