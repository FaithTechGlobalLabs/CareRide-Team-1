-- CareRide ride lifecycle (guide Step 11).
--
-- Every change to a ride goes through one of these functions. Each one:
--   * works out who the caller is from their login (never from browser-supplied ids),
--   * locks the ride row first (then the driver, then offers) so simultaneous actions queue up,
--   * checks the ride's current status before changing it, and
--   * sets timestamps and the fare estimate on the server.
--
-- The rules mirror src/services/mockService.ts and src/logic/{dispatch,matchDrivers}.ts.
-- Timing (also in src/logic/dispatch.ts): offers last 5 min (on-demand) / 60 min (scheduled);
-- an unaccepted on-demand ride is called off 30 min after booking, a scheduled one at pickup;
-- "dropped off" / "no-show" can be undone for 15 min.

-- ---------------------------------------------------------------------------
-- Offers: a driver may be asked again after losing a race (TAKEN), so uniqueness only applies
-- to requests that are still open.
-- ---------------------------------------------------------------------------

alter table public.ride_offers drop constraint ride_offers_one_per_round;
create unique index ride_offers_one_pending on public.ride_offers (ride_id, driver_id) where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Small rules
-- ---------------------------------------------------------------------------

create function private.cant_change(p_status public.ride_status)
returns text
language sql immutable set search_path = ''
as $$
  select case p_status
    when 'CANCELLED' then 'This ride was cancelled.'
    when 'PICKED_UP' then 'The client is already in the car.'
    when 'COMPLETED' then 'This ride is already finished.'
    when 'NO_SHOW' then 'This ride is already finished.'
    else 'This ride has changed. Please check it again.'
  end
$$;

-- Is this a time the driver wants to hear about requests? Uses the driver's own time zone and 0 = Sunday.
create function private.within_request_hours(p_hours jsonb, p_tz text, p_at timestamptz)
returns boolean
language plpgsql stable set search_path = ''
as $$
declare
  v_local timestamp := p_at at time zone p_tz;
  v_day jsonb := p_hours -> extract(dow from v_local)::integer;
  v_time text := to_char(v_local, 'HH24:MI');
begin
  if v_day is null or jsonb_typeof(v_day) <> 'object' then
    return false;
  end if;
  return v_time collate "C" >= (v_day ->> 'from') collate "C" and v_time collate "C" <= (v_day ->> 'to') collate "C";
end;
$$;

-- When a ride still without a driver is called off.
create function private.no_driver_deadline(p_type public.ride_type, p_pickup timestamptz)
returns timestamptz
language sql immutable set search_path = ''
as $$
  select case when p_type = 'ON_DEMAND' then p_pickup + interval '30 minutes' else p_pickup end
$$;

-- The biggest approved vehicle's spaces; 4 before anyone is approved.
create function private.max_passengers()
returns integer
language sql stable set search_path = ''
as $$
  select coalesce(max(d.seats), 4)
  from public.drivers d
  join public.profiles p on p.id = d.profile_id
  where d.status = 'APPROVED' and p.is_active
$$;

create function private.check_passengers(p_passengers integer)
returns void
language plpgsql stable set search_path = ''
as $$
declare
  v_max integer := private.max_passengers();
begin
  if p_passengers is null or p_passengers < 1 then
    raise exception 'Add at least 1 passenger.' using errcode = 'P0001';
  end if;
  if p_passengers > v_max then
    raise exception 'A ride can take up to % passengers. Book two rides for a bigger group.', v_max using errcode = 'P0001';
  end if;
end;
$$;

-- Keeps one trimmed name per passenger; null when none were given.
create function private.clean_names(p_names jsonb, p_passengers integer)
returns text[]
language sql immutable set search_path = ''
as $$
  select case when bool_or(trim(t.name) <> '') then array_agg(left(trim(t.name), 100) order by t.i) end
  from jsonb_array_elements_text(case when jsonb_typeof(p_names) = 'array' then p_names else '[]'::jsonb end)
    with ordinality as t(name, i)
  where t.i <= p_passengers
$$;

-- Optional free text: trimmed, null when blank, length-limited.
create function private.optional_text(p_value text, p_label text, p_max integer default 1000)
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
-- Matching and dispatch
-- ---------------------------------------------------------------------------

-- Drivers who already answered (or are still deciding). Those who lost a race (TAKEN) never said no.
create function private.already_asked(p_ride_id uuid)
returns uuid[]
language sql stable set search_path = ''
as $$
  select coalesce(array_agg(o.driver_id), '{}')
  from public.ride_offers o
  where o.ride_id = p_ride_id and o.status <> 'TAKEN'
$$;

-- Drivers heading to an on-demand pickup or with a client in the car can't take an on-demand ride.
-- The outbound trip of a return doesn't count: that driver is the best one to bring the client back.
create function private.busy_driver_ids(p_ride public.rides)
returns uuid[]
language sql stable set search_path = ''
as $$
  select case
    when p_ride.type <> 'ON_DEMAND' then '{}'::uuid[]
    else coalesce((
      select array_agg(r.driver_id)
      from public.rides r
      where r.driver_id is not null
        and r.id is distinct from p_ride.return_of_ride_id
        and (r.status = 'PICKED_UP' or (r.status = 'ACCEPTED' and r.type = 'ON_DEMAND'))
    ), '{}')
  end
$$;

-- Drivers who can take this ride, best match first: approved and active, serve the pickup city, have room,
-- fit wheelchair needs, want requests now (unless p_check_hours is false), and got enough notice.
-- Preferred driver first; wheelchair-accessible and larger vehicles are kept for rides that need them.
create function private.match_drivers(p_ride public.rides, p_exclude uuid[], p_at timestamptz, p_check_hours boolean)
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
    and (p_ride.type = 'ON_DEMAND' or p_ride.pickup_time - p_at >= make_interval(hours => d.min_notice_hours))
  order by
    (case when d.id = p_ride.preferred_driver_id then -1000 else 0 end)
      + (case when d.wheelchair_accessible and not p_ride.needs_wheelchair then 100 else 0 end)
      + d.seats,
    d.id
$$;

-- A scheduled ride nobody can be asked about right now can wait for a driver whose hours open before pickup.
create function private.can_wait_for_drivers(p_ride public.rides)
returns boolean
language sql stable set search_path = ''
as $$
  select p_ride.type = 'SCHEDULED'
    and p_ride.pickup_time > now()
    and exists (select 1 from private.match_drivers(p_ride, private.already_asked(p_ride.id), now(), false))
$$;

create function private.close_pending_offers(p_ride_id uuid, p_status public.offer_status default 'EXPIRED')
returns void
language sql set search_path = ''
as $$
  update public.ride_offers set status = p_status where ride_id = p_ride_id and status = 'PENDING'
$$;

-- Sends the ride to everyone who can take it right now (or only the preferred driver, if they can),
-- or works out whether it can wait or needs the partner's attention. Caller holds the ride lock.
create function private.dispatch(p_ride_id uuid)
returns void
language plpgsql set search_path = ''
as $$
declare
  r public.rides;
  v_now timestamptz := now();
  v_drivers uuid[];
begin
  select * into r from public.rides where id = p_ride_id for update;

  v_drivers := array(
    select private.match_drivers(r, private.already_asked(r.id) || private.busy_driver_ids(r), v_now, true)
  );
  if r.preferred_driver_id is not null and r.preferred_driver_id = any(v_drivers) then
    v_drivers := array[r.preferred_driver_id];
  end if;

  if cardinality(v_drivers) = 0 then
    update public.rides
       set status = case
         when exists (select 1 from public.ride_offers o where o.ride_id = r.id and o.status = 'PENDING') then 'OFFERED'
         when private.can_wait_for_drivers(r) then 'SEARCHING'
         else 'NEEDS_ATTENTION'
       end::public.ride_status
     where id = r.id;
    return;
  end if;

  insert into public.ride_offers (ride_id, driver_id, dispatch_revision, status, sent_at, expires_at)
  select r.id, driver_id, r.dispatch_revision, 'PENDING', v_now,
         v_now + case when r.type = 'ON_DEMAND' then interval '5 minutes' else interval '60 minutes' end
  from unnest(v_drivers) as driver_id
  on conflict do nothing;

  update public.rides set status = 'OFFERED' where id = r.id;
end;
$$;

-- Once nobody is left to answer, asks the next drivers (if any).
create function private.dispatch_if_unanswered(p_ride_id uuid)
returns void
language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.rides r where r.id = p_ride_id and r.status = 'OFFERED')
     and not exists (select 1 from public.ride_offers o where o.ride_id = p_ride_id and o.status = 'PENDING') then
    perform private.dispatch(p_ride_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may act
-- ---------------------------------------------------------------------------

-- The caller's partner account, which must belong to an approved organization to book or resend rides.
create function private.require_approved_partner()
returns void
language plpgsql stable set search_path = ''
as $$
begin
  if private.my_role() is distinct from 'PARTNER' then
    raise exception 'Only a partner organization account can book rides.' using errcode = 'P0001';
  end if;
  if (select o.status from public.organizations o where o.id = private.my_managed_org_id()) is distinct from 'APPROVED' then
    raise exception 'Your organization is waiting for approval. You can book rides once CareRide approves it.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- Locks a ride booked by the caller's organization.
create function private.lock_partner_ride(p_ride_id uuid)
returns public.rides
language plpgsql set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = p_ride_id for update;
  if not found or private.my_role() is distinct from 'PARTNER' or r.org_id is distinct from private.my_managed_org_id() then
    raise exception 'Ride not found.' using errcode = 'P0001';
  end if;
  return r;
end;
$$;

-- Locks a ride assigned to the caller (or to a driver their transport provider manages).
create function private.lock_driver_ride(p_ride_id uuid)
returns public.rides
language plpgsql set search_path = ''
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found.' using errcode = 'P0001';
  end if;
  if not private.acts_for_driver(r.driver_id) then
    raise exception 'This ride belongs to another driver.' using errcode = 'P0001';
  end if;
  return r;
end;
$$;

-- Where a ride is going: a saved destination of this org, or a typed address.
create function private.resolve_destination(p_details jsonb, p_org_id uuid, out name text, out address text, out destination_id uuid)
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
  address := private.required_text(address, 'Destination', 300);
  name := coalesce(private.optional_text(p_details ->> 'destinationName', 'Destination name', 200), address);
end;
$$;

-- The pickup time: now for on-demand rides, otherwise a future time.
create function private.resolve_pickup(p_type public.ride_type, p_details jsonb)
returns timestamptz
language plpgsql stable set search_path = ''
as $$
declare
  v_pickup timestamptz;
begin
  if p_type = 'ON_DEMAND' then
    return now();
  end if;
  v_pickup := nullif(p_details ->> 'pickupTime', '')::timestamptz;
  if v_pickup is null or v_pickup <= now() then
    raise exception 'Pick a time in the future.' using errcode = 'P0001';
  end if;
  return v_pickup;
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner operations
-- ---------------------------------------------------------------------------

-- Books a ride from the caller's location (or back from an outbound ride's destination for a return).
-- p_client_request_id: sent once per submission; a retry with the same id returns the first booking.
create function public.request_ride(p_ride jsonb, p_client_request_id uuid default null)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  v_org_id uuid;
  v_house public.houses;
  v_type public.ride_type;
  v_passengers integer;
  v_dest record;
  v_outbound public.rides;
  v_pickup_address text;
  v_preferred uuid;
  r public.rides;
begin
  perform private.require_approved_partner();
  v_org_id := private.my_managed_org_id();
  select h.* into v_house from public.houses h join public.profiles p on p.house_id = h.id where p.id = private.my_profile_id();

  if p_client_request_id is not null then
    select * into r from public.rides where client_request_id = p_client_request_id;
    if found then
      if r.org_id is distinct from v_org_id then
        raise exception 'Something went wrong. Please try again.' using errcode = 'P0001';
      end if;
      return r; -- already booked by an earlier attempt
    end if;
  end if;

  v_type := (p_ride ->> 'type')::public.ride_type;
  if v_type is null then
    raise exception 'Choose on-demand or scheduled.' using errcode = 'P0001';
  end if;
  v_passengers := (p_ride ->> 'passengers')::integer;
  perform private.check_passengers(v_passengers);
  select * into v_dest from private.resolve_destination(p_ride, v_org_id);

  if nullif(p_ride ->> 'returnOfRideId', '') is not null then
    select * into v_outbound from public.rides
      where id = (p_ride ->> 'returnOfRideId')::uuid and org_id = v_org_id;
    if not found then
      raise exception 'The outbound ride was not found.' using errcode = 'P0001';
    end if;
    v_pickup_address := v_outbound.destination_address; -- the client comes back from where they went
    v_preferred := v_outbound.driver_id;                -- ask the same driver first
  else
    v_pickup_address := v_house.address;
  end if;

  begin
    insert into public.rides (
      client_request_id, type, org_id, house_id, requested_by, rider_names, passengers,
      pickup_address, pickup_instructions, destination_id, destination_name, destination_address,
      pickup_time, needs_wheelchair, needs_assistance, notes, status,
      preferred_driver_id, return_of_ride_id, estimated_fare_saved
    ) values (
      p_client_request_id, v_type, v_org_id, v_house.id, private.my_profile_id(),
      private.clean_names(p_ride -> 'riderNames', v_passengers), v_passengers,
      v_pickup_address, private.optional_text(p_ride ->> 'pickupInstructions', 'Pickup instructions', 500),
      v_dest.destination_id, v_dest.name, v_dest.address,
      private.resolve_pickup(v_type, p_ride),
      coalesce((p_ride ->> 'needsWheelchair')::boolean, false),
      coalesce((p_ride ->> 'needsAssistance')::boolean, false),
      private.optional_text(p_ride ->> 'notes', 'Notes'),
      'SEARCHING',
      v_preferred, v_outbound.id,
      25 -- flat taxi estimate for the impact counter (src/logic/estimateFare.ts)
    )
    returning * into r;
  exception when unique_violation then
    -- The same submission arrived twice at once: return the booking that won.
    select * into r from public.rides where client_request_id = p_client_request_id and org_id = v_org_id;
    if not found then raise; end if;
    return r;
  end;

  perform private.dispatch(r.id);
  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- Changes a booking before pickup. Changing when, where or how many sends it back to drivers,
-- asking the driver who had accepted first. Names, notes and instructions alone don't.
create function public.update_ride(p_ride_id uuid, p_changes jsonb)
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
  v_pickup := private.resolve_pickup(v_type, p_changes); -- an on-demand ride is wanted now, so editing restarts the clock
  v_passengers := (p_changes ->> 'passengers')::integer;
  perform private.check_passengers(v_passengers);
  v_wheelchair := coalesce((p_changes ->> 'needsWheelchair')::boolean, false);
  select * into v_dest from private.resolve_destination(p_changes, r.org_id);

  v_resend := v_type <> r.type
    or (v_type = 'SCHEDULED' and v_pickup <> r.pickup_time)
    or v_passengers <> r.passengers
    or v_wheelchair <> r.needs_wheelchair
    or v_dest.address <> r.destination_address;

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

-- Asks drivers again for a ride that needs attention, including those who declined before.
create function public.retry_ride(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
begin
  r := private.lock_partner_ride(p_ride_id);
  if r.status <> 'NEEDS_ATTENTION' then
    raise exception '%', private.cant_change(r.status) using errcode = 'P0001';
  end if;
  perform private.require_approved_partner();
  if private.no_driver_deadline(r.type, r.pickup_time) <= now() then
    raise exception 'The pickup time has passed. Please book a new ride.' using errcode = 'P0001';
  end if;

  delete from public.ride_offers where ride_id = r.id and status not in ('ACCEPTED', 'WITHDRAWN');
  update public.rides set dispatch_revision = dispatch_revision + 1 where id = r.id;
  perform private.dispatch(r.id);

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

create function public.cancel_ride(p_ride_id uuid, p_reason text)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
begin
  r := private.lock_partner_ride(p_ride_id);
  if r.status not in ('SEARCHING', 'OFFERED', 'ACCEPTED', 'NEEDS_ATTENTION') then
    raise exception '%', private.cant_change(r.status) using errcode = 'P0001';
  end if;

  update public.rides
     set status = 'CANCELLED', cancel_reason = private.optional_text(p_reason, 'Reason', 500), cancelled_at = now()
   where id = r.id;
  perform private.close_pending_offers(r.id);

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Driver operations
-- ---------------------------------------------------------------------------

-- Accepts or declines a request. The first acceptance wins; everyone else's request closes as TAKEN.
create function public.respond_to_offer(p_offer_id uuid, p_accept boolean)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  o public.ride_offers;
  r public.rides;
  v_now timestamptz := now();
begin
  select * into o from public.ride_offers where id = p_offer_id;
  if not found or not private.acts_for_driver(o.driver_id) then
    raise exception 'Request not found.' using errcode = 'P0001';
  end if;

  -- Lock order: ride, then driver, then offers (the same order every function uses).
  select * into r from public.rides where id = o.ride_id for update;
  select * into o from public.ride_offers where id = p_offer_id for update;

  if not exists (
    select 1 from public.drivers d join public.profiles p on p.id = d.profile_id
    where d.id = o.driver_id and d.status = 'APPROVED' and p.is_active
  ) then
    raise exception 'Your driver account needs to be approved before you can answer requests.' using errcode = 'P0001';
  end if;

  if o.status <> 'PENDING' then
    raise exception '%', case when r.driver_id is not null then 'Another driver already accepted this ride.' else 'This request is no longer open.' end
      using errcode = 'P0001';
  end if;
  -- The real deadline decides, even if the expiry job hasn't run yet.
  if o.expires_at <= v_now
     or o.dispatch_revision <> r.dispatch_revision
     or r.status not in ('SEARCHING', 'OFFERED', 'NEEDS_ATTENTION')
     or private.no_driver_deadline(r.type, r.pickup_time) <= v_now then
    raise exception 'This request is no longer open.' using errcode = 'P0001';
  end if;

  if p_accept then
    if r.driver_id is not null then
      raise exception 'Another driver already accepted this ride.' using errcode = 'P0001';
    end if;
    -- One acceptance at a time per driver, so the busy rule holds across two rides.
    perform 1 from public.drivers where id = o.driver_id for update;
    if o.driver_id = any(private.busy_driver_ids(r)) then
      raise exception 'Finish your current ride before accepting another on-demand ride.' using errcode = 'P0001';
    end if;

    update public.ride_offers set status = 'ACCEPTED', responded_at = v_now where id = o.id;
    perform private.close_pending_offers(r.id, 'TAKEN');
    update public.rides
       set status = 'ACCEPTED', driver_id = o.driver_id, accepted_at = v_now, reconfirm_driver_id = null
     where id = r.id;
  else
    update public.ride_offers set status = 'DECLINED', responded_at = v_now where id = o.id;
    perform private.dispatch_if_unanswered(r.id);
  end if;

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- The assigned driver can't make it: record it and ask other drivers.
create function public.drop_ride(p_ride_id uuid, p_driver_id uuid)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
begin
  r := private.lock_driver_ride(p_ride_id);
  if r.driver_id is distinct from p_driver_id then
    raise exception 'This ride belongs to another driver.' using errcode = 'P0001';
  end if;
  if r.status <> 'ACCEPTED' then
    raise exception '%', private.cant_change(r.status) using errcode = 'P0001';
  end if;

  -- Withdrawn, so they aren't asked again and the partner can see it
  update public.ride_offers set status = 'WITHDRAWN'
   where ride_id = r.id and driver_id = p_driver_id and status = 'ACCEPTED';
  -- Back to SEARCHING in the same update (an ACCEPTED ride must have a driver); dispatch sets the final status.
  update public.rides set
    status = 'SEARCHING',
    dropped_by_driver_id = p_driver_id, dropped_at = now(),
    driver_id = null, accepted_at = null, driver_on_the_way_at = null, driver_eta = null, driver_arrived_at = null
  where id = r.id;
  perform private.dispatch(r.id);

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- Trip progress: ON_THE_WAY (optional ETA), ARRIVED, PICKED_UP, COMPLETED, NO_SHOW.
create function public.advance_ride(p_ride_id uuid, p_step text, p_eta_minutes integer default null)
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

-- Takes back the driver's last step. Finishing (drop-off or no-show) can be undone for 15 minutes.
create function public.undo_driver_step(p_ride_id uuid, p_driver_id uuid)
returns public.rides
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
begin
  r := private.lock_driver_ride(p_ride_id);
  if r.driver_id is distinct from p_driver_id then
    raise exception 'This ride belongs to another driver.' using errcode = 'P0001';
  end if;

  case r.status
    when 'COMPLETED' then
      if r.completed_at is null or now() - r.completed_at >= interval '15 minutes' then
        raise exception 'This ride finished a while ago, so it can no longer be changed.' using errcode = 'P0001';
      end if;
      update public.rides set status = 'PICKED_UP', completed_at = null where id = r.id;
    when 'NO_SHOW' then
      if r.cancelled_at is null or now() - r.cancelled_at >= interval '15 minutes' then
        raise exception 'This ride finished a while ago, so it can no longer be changed.' using errcode = 'P0001';
      end if;
      update public.rides set status = 'ACCEPTED', cancel_reason = null, cancelled_at = null where id = r.id;
    when 'PICKED_UP' then
      update public.rides set status = 'ACCEPTED', picked_up_at = null where id = r.id;
    when 'ACCEPTED' then
      if r.driver_arrived_at is not null then
        update public.rides set driver_arrived_at = null where id = r.id;
      elsif r.driver_on_the_way_at is not null then
        update public.rides set driver_on_the_way_at = null, driver_eta = null where id = r.id;
      else
        raise exception 'There''s nothing to undo. To give up the ride, choose “I can''t make it”.' using errcode = 'P0001';
      end if;
    else
      raise exception '%', private.cant_change(r.status) using errcode = 'P0001';
  end case;

  select * into r from public.rides where id = r.id;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Booking preview: what the form needs to say "3 drivers could take this", without saying who.
-- ---------------------------------------------------------------------------

create function public.booking_driver_pool()
returns table (
  seats integer,
  wheelchair_accessible boolean,
  service_cities text[],
  request_hours jsonb,
  min_notice_hours integer
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.my_role() is distinct from 'PARTNER' and not private.is_admin() then
    raise exception 'Only partner organizations can preview drivers.' using errcode = 'P0001';
  end if;
  return query
    select d.seats, d.wheelchair_accessible, d.service_cities, d.request_hours, d.min_notice_hours
    from public.drivers d
    join public.profiles p on p.id = d.profile_id
    where d.status = 'APPROVED' and p.is_active
    order by random(); -- no stable order that could hint at who is who
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute permissions
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public;
grant execute on function private.valid_request_hours(jsonb) to authenticated; -- used by a drivers table check

revoke execute on function public.request_ride(jsonb, uuid) from public, anon;
revoke execute on function public.update_ride(uuid, jsonb) from public, anon;
revoke execute on function public.retry_ride(uuid) from public, anon;
revoke execute on function public.cancel_ride(uuid, text) from public, anon;
revoke execute on function public.respond_to_offer(uuid, boolean) from public, anon;
revoke execute on function public.drop_ride(uuid, uuid) from public, anon;
revoke execute on function public.advance_ride(uuid, text, integer) from public, anon;
revoke execute on function public.undo_driver_step(uuid, uuid) from public, anon;
revoke execute on function public.booking_driver_pool() from public, anon;

grant execute on function public.request_ride(jsonb, uuid) to authenticated;
grant execute on function public.update_ride(uuid, jsonb) to authenticated;
grant execute on function public.retry_ride(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid, text) to authenticated;
grant execute on function public.respond_to_offer(uuid, boolean) to authenticated;
grant execute on function public.drop_ride(uuid, uuid) to authenticated;
grant execute on function public.advance_ride(uuid, text, integer) to authenticated;
grant execute on function public.undo_driver_step(uuid, uuid) to authenticated;
grant execute on function public.booking_driver_pool() to authenticated;
