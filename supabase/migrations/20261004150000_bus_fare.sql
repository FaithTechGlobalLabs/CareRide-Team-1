-- Each trip counts as one adult one-zone Vancouver bus fare ($2.58).
-- TransLink fares are municipal transit and GST/HST-exempt, so nothing is added on top.
-- Matches src/logic/estimateFare.ts.

update public.rides
set estimated_fare_saved = 2.58
where estimated_fare_saved is distinct from 2.58;

-- Restated from 20261003160000_ride_functions.sql so new bookings store the bus fare.
create or replace function public.request_ride(p_ride jsonb, p_client_request_id uuid default null)
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
      2.58 -- adult one-zone Vancouver bus fare (src/logic/estimateFare.ts)
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
