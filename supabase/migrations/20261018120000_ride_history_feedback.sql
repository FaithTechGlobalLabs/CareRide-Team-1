-- CareRide ride history (audit log) and ride feedback.
--
-- ride_events: one row per change to a ride. A trigger on rides writes them, so every database function and the
-- deadline job are covered without changing any of them. It follows rideEventsBetween in src/logic/rideEvents.ts.
-- The actor is whoever is signed in; nobody signed in (the deadline job) means CareRide did it on its own.
--
-- ride_feedback: on a finished ride, staff give a thumbs up or down (with an optional note) and drivers can flag
-- an issue. Only give_ride_feedback writes it. Only the author and platform admins can read it, so drivers never
-- see staff ratings.

create type public.ride_event_kind as enum (
  'REQUESTED', 'EDITED', 'SENT_AGAIN', 'NO_DRIVER_AVAILABLE', 'DRIVER_ACCEPTED', 'DRIVER_DROPPED', 'DRIVER_REMOVED',
  'ON_THE_WAY', 'ARRIVED', 'PICKED_UP', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'STEP_UNDONE'
);
create type public.feedback_rating as enum ('UP', 'DOWN');

-- ---------------------------------------------------------------------------
-- ride_events
-- ---------------------------------------------------------------------------

create table public.ride_events (
  id               bigint generated always as identity primary key, -- also the order within one change
  ride_id          uuid not null references public.rides (id),
  kind             public.ride_event_kind not null,
  actor_profile_id uuid references public.profiles (id),
  actor_role       public.user_role,          -- null: CareRide itself
  actor_name       text,                      -- as it was at the time
  detail           jsonb,                     -- see RideEventDetail in src/types/index.ts
  created_at       timestamptz not null default clock_timestamp()
);

create index ride_events_ride_id_idx on public.ride_events (ride_id, id);

alter table public.ride_events enable row level security;
grant select (id, ride_id, kind, actor_role, actor_name, detail, created_at) on public.ride_events to authenticated;

-- Staff see their own organization's rides; platform admins see everything. Drivers see none.
create policy ride_events_select on public.ride_events
  for select to authenticated
  using (
    (select private.is_admin())
    or private.ride_org_id(ride_id) = (select private.my_managed_org_id())
  );

-- One history line, signed by whoever is making the change.
create function private.add_ride_event(p_ride_id uuid, p_kind public.ride_event_kind, p_detail jsonb default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.profiles;
begin
  select * into v_actor from public.profiles where id = private.my_profile_id();
  insert into public.ride_events (ride_id, kind, actor_profile_id, actor_role, actor_name, detail)
  values (p_ride_id, p_kind, v_actor.id, v_actor.role, v_actor.name, nullif(jsonb_strip_nulls(p_detail), '{}'::jsonb));
end;
$$;

revoke execute on function private.add_ride_event(uuid, public.ride_event_kind, jsonb) from public;

-- Database functions often change a ride in two or three statements (e.g. update_ride saves the edit, then sends
-- the ride out again, then dispatch sets OFFERED). Each statement is compared on its own, so the in-between ones
-- must not add lines of their own; the comments below say which is which.
create function private.log_ride_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_waiting public.ride_status[] := array['SEARCHING', 'OFFERED', 'NEEDS_ATTENTION']::public.ride_status[];
  v_edited boolean;
  v_time_moved boolean;
  v_fields text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform private.add_ride_event(new.id, 'REQUESTED');
    if new.status = 'NEEDS_ATTENTION' then perform private.add_ride_event(new.id, 'NO_DRIVER_AVAILABLE'); end if;
    return null;
  end if;

  -- A partner's edit. An on-demand pickup time is just "as soon as possible", so it isn't listed.
  v_edited := new.changed_at is not null and new.changed_at is distinct from old.changed_at;
  if v_edited then
    v_time_moved := new.type = 'SCHEDULED' and new.pickup_time is distinct from old.pickup_time;
    if new.type is distinct from old.type then v_fields := array_append(v_fields, 'type'); end if;
    if v_time_moved then v_fields := array_append(v_fields, 'pickupTime'); end if;
    if new.passengers is distinct from old.passengers then v_fields := array_append(v_fields, 'passengers'); end if;
    if coalesce(array_to_string(new.rider_names, E'\n'), '') <> coalesce(array_to_string(old.rider_names, E'\n'), '') then
      v_fields := array_append(v_fields, 'riderNames');
    end if;
    if new.needs_wheelchair is distinct from old.needs_wheelchair then v_fields := array_append(v_fields, 'needsWheelchair'); end if;
    if new.needs_assistance is distinct from old.needs_assistance then v_fields := array_append(v_fields, 'needsAssistance'); end if;
    if coalesce(new.pickup_instructions, '') <> coalesce(old.pickup_instructions, '') then
      v_fields := array_append(v_fields, 'pickupInstructions');
    end if;
    if coalesce(new.notes, '') <> coalesce(old.notes, '') then v_fields := array_append(v_fields, 'notes'); end if;
    if new.destination_name is distinct from old.destination_name or new.destination_address is distinct from old.destination_address then
      v_fields := array_append(v_fields, 'destination');
    end if;
    perform private.add_ride_event(new.id, 'EDITED', jsonb_build_object(
      'fields', to_jsonb(v_fields),
      'fromPickupTime', case when v_time_moved and old.type = 'SCHEDULED' then old.pickup_time end,
      'toPickupTime', case when v_time_moved then new.pickup_time end
    ));
  end if;

  -- retry_ride bumps the round on its own before dispatching. (An edit bumps it while setting SEARCHING.)
  if new.dispatch_revision > old.dispatch_revision and old.status = 'NEEDS_ATTENTION' and new.status = 'NEEDS_ATTENTION' then
    perform private.add_ride_event(new.id, 'SENT_AGAIN');
  end if;

  if new.status is distinct from old.status then
    if new.status = 'ACCEPTED' and old.status = any (v_waiting) then
      perform private.add_ride_event(new.id, 'DRIVER_ACCEPTED');
    elsif new.status = 'PICKED_UP' and old.status = 'ACCEPTED' then
      perform private.add_ride_event(new.id, 'PICKED_UP');
    elsif new.status = 'COMPLETED' then
      perform private.add_ride_event(new.id, 'COMPLETED');
    elsif new.status = 'NO_SHOW' then
      perform private.add_ride_event(new.id, 'NO_SHOW');
    elsif new.status = 'CANCELLED' then
      perform private.add_ride_event(new.id, 'CANCELLED',
        jsonb_build_object('reason', new.cancel_reason, 'expired', case when new.expired then true end));
    elsif old.status = 'COMPLETED' and new.status = 'PICKED_UP' then
      perform private.add_ride_event(new.id, 'STEP_UNDONE', jsonb_build_object('undid', 'COMPLETED'));
    elsif old.status = 'NO_SHOW' and new.status = 'ACCEPTED' then
      perform private.add_ride_event(new.id, 'STEP_UNDONE', jsonb_build_object('undid', 'NO_SHOW'));
    elsif old.status = 'PICKED_UP' and new.status = 'ACCEPTED' then
      perform private.add_ride_event(new.id, 'STEP_UNDONE', jsonb_build_object('undid', 'PICKED_UP'));
    elsif old.status = 'ACCEPTED' and new.status = any (v_waiting) and not v_edited then
      if new.dropped_at is not null and new.dropped_at is distinct from old.dropped_at then
        perform private.add_ride_event(new.id, 'DRIVER_DROPPED');
      elsif new.dispatch_revision = old.dispatch_revision then
        -- The driver's account was closed (deactivate_my_account, admin_deactivate_account)
        perform private.add_ride_event(new.id, 'DRIVER_REMOVED');
      end if;
      -- Otherwise it's an edit sending the ride out again: its EDITED line already covers it
    end if;
  elsif new.status = 'ACCEPTED' and new.driver_id is not distinct from old.driver_id then
    if old.driver_arrived_at is null and new.driver_arrived_at is not null then
      perform private.add_ride_event(new.id, 'ARRIVED');
    elsif old.driver_on_the_way_at is null and new.driver_on_the_way_at is not null then
      perform private.add_ride_event(new.id, 'ON_THE_WAY', jsonb_build_object('eta', new.driver_eta));
    elsif old.driver_arrived_at is not null and new.driver_arrived_at is null then
      perform private.add_ride_event(new.id, 'STEP_UNDONE', jsonb_build_object('undid', 'ARRIVED'));
    elsif old.driver_on_the_way_at is not null and new.driver_on_the_way_at is null then
      perform private.add_ride_event(new.id, 'STEP_UNDONE', jsonb_build_object('undid', 'ON_THE_WAY'));
    end if;
  end if;

  if new.status = 'NEEDS_ATTENTION' and old.status is distinct from 'NEEDS_ATTENTION' then
    perform private.add_ride_event(new.id, 'NO_DRIVER_AVAILABLE');
  end if;
  return null;
end;
$$;

revoke execute on function private.log_ride_changes() from public;

-- Rides booked before this migration get a best-effort history from their stored times (backfillRideEvents).
-- Who cancelled one isn't stored, so those lines say so instead of naming anyone.
with steps as (
  select r.id as ride_id, s.ord, s.kind, s.at, s.actor, s.detail
  from public.rides r
  left join public.drivers d on d.id = r.driver_id
  cross join lateral (values
    (1, 'REQUESTED', r.created_at, r.requested_by, null::jsonb),
    (2, 'DRIVER_ACCEPTED', case when r.driver_id is not null then r.accepted_at end, d.profile_id, null),
    (3, 'ARRIVED', case when r.driver_id is not null then r.driver_arrived_at end, d.profile_id, null),
    (3, 'ON_THE_WAY', case when r.driver_id is not null and r.driver_arrived_at is null then r.driver_on_the_way_at end, d.profile_id, null),
    (4, 'PICKED_UP', case when r.driver_id is not null then r.picked_up_at end, d.profile_id, null),
    (5, 'COMPLETED', case when r.driver_id is not null then r.completed_at end, d.profile_id, null),
    (6, 'NO_SHOW', case when r.status = 'NO_SHOW' then r.cancelled_at end, d.profile_id, null),
    (6, 'CANCELLED', case when r.status = 'CANCELLED' then r.cancelled_at end, null,
      jsonb_build_object('reason', r.cancel_reason, 'expired', case when r.expired then true end, 'unknownActor', case when not r.expired then true end))
  ) as s(ord, kind, at, actor, detail)
  where s.at is not null
)
insert into public.ride_events (ride_id, kind, actor_profile_id, actor_role, actor_name, detail, created_at)
select st.ride_id, st.kind::public.ride_event_kind, p.id, p.role, p.name, nullif(jsonb_strip_nulls(st.detail), '{}'::jsonb), st.at
from steps st
left join public.profiles p on p.id = st.actor
order by st.at, st.ride_id, st.ord;

create trigger rides_log_changes after insert or update on public.rides
  for each row execute function private.log_ride_changes();

-- ---------------------------------------------------------------------------
-- ride_feedback
-- ---------------------------------------------------------------------------

create table public.ride_feedback (
  id                uuid primary key default gen_random_uuid(),
  ride_id           uuid not null references public.rides (id),
  author_role       public.user_role not null check (author_role in ('PARTNER', 'DRIVER')),
  author_profile_id uuid not null references public.profiles (id),
  org_id            uuid not null references public.organizations (id), -- the ride's partner organization
  driver_id         uuid references public.drivers (id),                -- the ride's driver
  rating            public.feedback_rating,
  note              text check (note is null or length(note) between 1 and 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One each per ride: the partner organization's shared account and the ride's driver
  constraint ride_feedback_one_per_side unique (ride_id, author_role),
  constraint ride_feedback_partner_rates check (author_role <> 'PARTNER' or rating is not null),
  constraint ride_feedback_driver_flags check (author_role <> 'DRIVER' or (rating is null and note is not null))
);

create index ride_feedback_driver_id_idx on public.ride_feedback (driver_id);
create index ride_feedback_org_id_idx on public.ride_feedback (org_id);

create trigger ride_feedback_set_updated_at before update on public.ride_feedback
  for each row execute function public.set_updated_at();

alter table public.ride_feedback enable row level security;
grant select (id, ride_id, author_role, org_id, driver_id, rating, note, updated_at) on public.ride_feedback to authenticated;

create policy ride_feedback_select on public.ride_feedback
  for select to authenticated
  using ((select private.is_admin()) or author_profile_id = (select private.my_profile_id()));

-- Saves (or replaces) the caller's feedback on a finished ride. Messages match src/logic/feedback.ts.
create function public.give_ride_feedback(p_ride_id uuid, p_rating public.feedback_rating default null, p_note text default null)
returns public.ride_feedback
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rides;
  v_author public.user_role;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_row public.ride_feedback;
begin
  select * into r from public.rides where id = p_ride_id;
  if r.id is not null and private.my_role() = 'PARTNER' and r.org_id = private.my_managed_org_id() then
    v_author := 'PARTNER';
  elsif r.id is not null and private.my_role() = 'DRIVER' and r.driver_id = private.my_driver_id() then
    v_author := 'DRIVER';
  else
    raise exception 'You can only give feedback on your own rides.' using errcode = 'P0001';
  end if;
  if r.status not in ('COMPLETED', 'NO_SHOW') then
    raise exception 'You can give feedback once the ride is over.' using errcode = 'P0001';
  end if;
  if length(v_note) > 500 then
    raise exception 'Keep it under 500 characters.' using errcode = 'P0001';
  end if;
  if v_author = 'PARTNER' and p_rating is null then
    raise exception 'Choose thumbs up or thumbs down.' using errcode = 'P0001';
  end if;
  if v_author = 'DRIVER' and v_note is null then
    raise exception 'Say what went wrong.' using errcode = 'P0001';
  end if;

  insert into public.ride_feedback (ride_id, author_role, author_profile_id, org_id, driver_id, rating, note)
  values (r.id, v_author, private.my_profile_id(), r.org_id, r.driver_id, case when v_author = 'PARTNER' then p_rating end, v_note)
  on conflict (ride_id, author_role) do update
    set rating = excluded.rating,
        note = excluded.note,
        author_profile_id = excluded.author_profile_id,
        driver_id = excluded.driver_id
  returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.give_ride_feedback(uuid, public.feedback_rating, text) from public, anon;
grant execute on function public.give_ride_feedback(uuid, public.feedback_rating, text) to authenticated;
