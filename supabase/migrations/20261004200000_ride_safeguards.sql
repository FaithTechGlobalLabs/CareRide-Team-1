-- Ride safeguards:
--   * A driver keeps a client's details only while the ride is theirs or the request is still open.
--   * A no-show requires the driver to have arrived and waited.
--   * Closing a partner account leaves a ride the driver has already set off for.
--   * A notes-only edit does not restart an on-demand ride's give-up clock.
--   * The deadline job does not rewrite a ride whose status did not change.
--   * Approved drivers cannot change passenger spaces or wheelchair access.
--   * Profile changes (including a closed account) reach open screens.

-- ---------------------------------------------------------------------------
-- Who may still read a ride
-- ---------------------------------------------------------------------------

-- Open requests only. A decline, a lost race, an expiry, or a withdrawal does not keep
-- the rider's name, notes, or destination readable.
create or replace function private.offered_to_me(p_ride_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.ride_offers o
    where o.ride_id = p_ride_id
      and o.status = 'PENDING'
      and o.expires_at > now()
      and private.acts_for_driver(o.driver_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Dispatch: write the ride only when its status actually changes.
-- New offers still insert, and those rows are what open screens hear about.
-- ---------------------------------------------------------------------------

create or replace function private.dispatch(p_ride_id uuid)
returns void
language plpgsql set search_path = ''
as $$
declare
  r public.rides;
  v_now timestamptz := now();
  v_drivers uuid[];
  v_next public.ride_status;
begin
  select * into r from public.rides where id = p_ride_id for update;

  v_drivers := array(
    select private.match_drivers(r, private.already_asked(r.id) || private.busy_driver_ids(r), v_now, true)
  );
  if r.preferred_driver_id is not null and r.preferred_driver_id = any(v_drivers) then
    v_drivers := array[r.preferred_driver_id];
  end if;

  if cardinality(v_drivers) = 0 then
    v_next := case
      when exists (select 1 from public.ride_offers o where o.ride_id = r.id and o.status = 'PENDING') then 'OFFERED'
      when private.can_wait_for_drivers(r) then 'SEARCHING'
      else 'NEEDS_ATTENTION'
    end::public.ride_status;
    if r.status is distinct from v_next then
      update public.rides set status = v_next where id = r.id;
    end if;
    return;
  end if;

  insert into public.ride_offers (ride_id, driver_id, dispatch_revision, status, sent_at, expires_at)
  select r.id, driver_id, r.dispatch_revision, 'PENDING', v_now,
         v_now + case when r.type = 'ON_DEMAND' then interval '5 minutes' else interval '60 minutes' end
  from unnest(v_drivers) as driver_id
  on conflict do nothing;

  if r.status is distinct from 'OFFERED' then
    update public.rides set status = 'OFFERED' where id = r.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Edits: names and notes keep an on-demand ride's original give-up clock.
-- ---------------------------------------------------------------------------

create or replace function public.update_ride(p_ride_id uuid, p_changes jsonb)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
  v_type public.ride_type;
  v_pickup timestamptz;
  v_passengers integer;
  v_wheelchair boolean;
  v_dest record;
  v_resend boolean;
  v_previous_driver uuid;
begin
  r := private.lock_partner_ride(p_ride_id);
  if r.status not in ('SEARCHING', 'OFFERED', 'NEEDS_ATTENTION', 'ACCEPTED') then
    raise exception '%', private.cant_change(r.status) using errcode = 'P0001';
  end if;
  perform private.require_approved_partner();

  v_type := coalesce((p_changes ->> 'type')::public.ride_type, r.type);
  v_passengers := (p_changes ->> 'passengers')::integer;
  perform private.check_passengers(v_passengers);
  v_wheelchair := coalesce((p_changes ->> 'needsWheelchair')::boolean, false);
  select * into v_dest from private.resolve_destination(p_changes, r.org_id);

  if v_type = 'SCHEDULED' then
    v_pickup := private.resolve_pickup(v_type, p_changes);
  end if;

  v_resend := v_type <> r.type
    or (v_type = 'SCHEDULED' and v_pickup <> r.pickup_time)
    or v_passengers <> r.passengers
    or v_wheelchair <> r.needs_wheelchair
    or v_dest.address <> r.destination_address;

  -- A real change means the ride is wanted now. A notes-only edit leaves the clock alone.
  if v_type = 'ON_DEMAND' then
    v_pickup := case when v_resend then now() else r.pickup_time end;
  end if;

  update public.rides set
    type = v_type,
    pickup_time = v_pickup,
    passengers = v_passengers,
    rider_names = private.clean_names(p_changes -> 'riderNames', v_passengers),
    needs_wheelchair = v_wheelchair,
    needs_assistance = coalesce((p_changes ->> 'needsAssistance')::boolean, false),
    pickup_instructions = private.optional_text(p_changes ->> 'pickupInstructions', 'Pickup instructions', 500),
    notes = private.optional_text(p_changes ->> 'notes', 'Notes'),
    destination_id = v_dest.destination_id,
    destination_name = v_dest.name,
    destination_address = v_dest.address,
    changed_at = now()
  where id = r.id;

  if v_resend then
    -- Earlier answers were about the old ride. Drivers who dropped it already said they can't make it.
    v_previous_driver := r.driver_id;
    perform private.close_pending_offers(r.id);
    delete from public.ride_offers where ride_id = r.id and status <> 'WITHDRAWN';
    update public.rides set
      dispatch_revision = dispatch_revision + 1,
      status = 'SEARCHING',
      driver_id = null, accepted_at = null, driver_on_the_way_at = null, driver_eta = null, driver_arrived_at = null,
      preferred_driver_id = coalesce(v_previous_driver, preferred_driver_id),
      reconfirm_driver_id = coalesce(v_previous_driver, reconfirm_driver_id)
    where id = r.id;
    perform private.dispatch(r.id);
  end if;

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- No-show: arrive, then wait. Matches src/logic/dispatch.ts NO_SHOW_WAIT_MINUTES.
-- ---------------------------------------------------------------------------

create or replace function public.advance_ride(p_ride_id uuid, p_step text, p_eta_minutes integer default null)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
begin
  r := private.lock_driver_ride(p_ride_id);

  case p_step
    when 'ON_THE_WAY' then
      if r.status <> 'ACCEPTED' then raise exception '%', private.cant_change(r.status) using errcode = 'P0001'; end if;
      update public.rides set
        driver_on_the_way_at = now(),
        driver_eta = case when p_eta_minutes > 0 then now() + make_interval(mins => least(p_eta_minutes, 600)) end
      where id = r.id;
    when 'ARRIVED' then
      if r.status <> 'ACCEPTED' then
        raise exception 'You can only say you are here on a confirmed ride.' using errcode = 'P0001';
      end if;
      update public.rides set driver_on_the_way_at = coalesce(driver_on_the_way_at, now()), driver_arrived_at = now()
      where id = r.id;
    when 'PICKED_UP' then
      if r.status <> 'ACCEPTED' then raise exception '%', private.cant_change(r.status) using errcode = 'P0001'; end if;
      update public.rides set status = 'PICKED_UP', picked_up_at = now() where id = r.id;
    when 'COMPLETED' then
      if r.status <> 'PICKED_UP' then
        raise exception '%', case when r.status = 'ACCEPTED' then 'Mark the client as picked up first.' else private.cant_change(r.status) end
          using errcode = 'P0001';
      end if;
      update public.rides set status = 'COMPLETED', completed_at = now() where id = r.id;
    when 'NO_SHOW' then
      if r.status <> 'ACCEPTED' then raise exception '%', private.cant_change(r.status) using errcode = 'P0001'; end if;
      if r.driver_arrived_at is null then
        raise exception 'Say you are here, and wait with the front desk, before marking a no-show.' using errcode = 'P0001';
      end if;
      if r.driver_arrived_at > now() - interval '10 minutes' then
        raise exception 'Wait 10 minutes after you arrive before marking a no-show.' using errcode = 'P0001';
      end if;
      update public.rides
         set status = 'NO_SHOW', cancel_reason = 'Client did not show up. The ride is lost.', cancelled_at = now()
       where id = r.id;
    else
      raise exception 'Unknown ride step.' using errcode = 'P0001';
  end case;

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- A partner closing their account cancels rides that have not started.
-- A driver already on the way, or already at the door, finishes the trip.
-- ---------------------------------------------------------------------------

create or replace function public.deactivate_my_account()
returns uuid
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
       and (
         r.status in ('SEARCHING', 'OFFERED', 'NEEDS_ATTENTION')
         or (r.status = 'ACCEPTED' and r.driver_on_the_way_at is null and r.driver_arrived_at is null)
       )
     order by r.id
     for update of r;

    update public.profiles set is_active = false where id = v_profile.id;

    for v_ride in
      select r.* from public.rides r
      where r.org_id = v_profile.org_id
        and (
          r.status in ('SEARCHING', 'OFFERED', 'NEEDS_ATTENTION')
          or (r.status = 'ACCEPTED' and r.driver_on_the_way_at is null and r.driver_arrived_at is null)
        )
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

-- ---------------------------------------------------------------------------
-- Approved capacity stays put. Vehicle description, cities, and request hours still change.
-- ---------------------------------------------------------------------------

create function private.freeze_approved_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'APPROVED'
     and (new.seats is distinct from old.seats or new.wheelchair_accessible is distinct from old.wheelchair_accessible) then
    raise exception 'Passenger spaces and wheelchair access stay as they were when you were approved. Contact CareRide to change them.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function private.freeze_approved_capacity() from public, anon;
grant execute on function private.freeze_approved_capacity() to authenticated;

create trigger drivers_freeze_approved_capacity
  before update on public.drivers
  for each row execute function private.freeze_approved_capacity();

-- profiles.email stays off the column grant. Realtime still checks each subscriber's row access.
alter publication supabase_realtime add table public.profiles;
