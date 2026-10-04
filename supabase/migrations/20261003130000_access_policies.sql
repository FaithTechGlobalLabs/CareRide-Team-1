-- CareRide access policies (guide Step 7).
--
-- Model:
--   * anon (signed out, publishable key only): no table access at all.
--   * authenticated: table grants limit WHICH operations/columns exist; RLS policies limit WHICH rows.
--   * Identity always comes from auth.uid() -> profiles.auth_user_id. A browser-supplied org_id or
--     driver_id is only a filter, never proof of membership.
--   * Ride and offer changes are NOT granted here. They will go through database functions (Step 11).
--   * service_role (server-only secret key) keeps full access; never use it in the browser.

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then add back only what the browser needs.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.organizations,
  public.houses,
  public.drivers,
  public.destinations,
  public.rides,
  public.ride_offers,
  public.driver_documents
to authenticated;

-- profiles.email is left out on purpose: rows shared with a partner or driver must not leak emails.
-- The signed-in user's own email comes from their Auth session; admins get emails via a server function (Step 14).
grant select (id, auth_user_id, name, phone, role, org_id, house_id, is_active, created_at, updated_at)
  on public.profiles to authenticated;

-- Partners add saved destinations. id/timestamps are server-generated, so they are not insertable.
grant insert (org_id, name, address, city, notes) on public.destinations to authenticated;

-- Drivers edit only their own settings. status, org_id, profile_id, background, review fields stay locked.
grant update (vehicle, seats, wheelchair_accessible, service_cities, request_hours, min_notice_hours)
  on public.drivers to authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER lets them read profiles/drivers/rides without triggering
-- RLS again (which would otherwise recurse). They live in a schema the API does not expose,
-- and every one returns null/false for a signed-out or deactivated caller.
-- ---------------------------------------------------------------------------

create schema private;
grant usage on schema private to authenticated;

create function private.my_profile_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.profiles p
  where p.auth_user_id = (select auth.uid()) and p.is_active
$$;

create function private.my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.auth_user_id = (select auth.uid()) and p.is_active
$$;

create function private.my_org_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.org_id from public.profiles p
  where p.auth_user_id = (select auth.uid()) and p.is_active
$$;

-- The org this caller manages: set for PARTNER and ORG_ADMIN accounts, null for drivers and admins.
-- (A driver who belongs to an org must not see all of that org's bookings.)
create function private.my_managed_org_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.org_id from public.profiles p
  where p.auth_user_id = (select auth.uid()) and p.is_active and p.role in ('PARTNER', 'ORG_ADMIN')
$$;

create function private.my_driver_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select d.id from public.drivers d
  join public.profiles p on p.id = d.profile_id
  where p.auth_user_id = (select auth.uid()) and p.is_active
$$;

create function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = (select auth.uid()) and p.is_active and p.role = 'PLATFORM_ADMIN'
  )
$$;

-- True when the caller is this driver, or the transport-provider admin of this driver's org.
create function private.acts_for_driver(p_driver_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.drivers d
    where d.id = p_driver_id
      and (
        d.id = private.my_driver_id()
        or (private.my_role() = 'ORG_ADMIN' and d.org_id = private.my_org_id())
      )
  )
$$;

-- True when the caller (or a driver they act for) was ever sent an offer for this ride.
create function private.offered_to_me(p_ride_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.ride_offers o
    where o.ride_id = p_ride_id and private.acts_for_driver(o.driver_id)
  )
$$;

-- True when the caller is on the driver side of this ride: assigned, or offered it.
create function private.driver_side_of_ride(p_ride_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rides r
    where r.id = p_ride_id
      and (private.acts_for_driver(r.driver_id) or private.offered_to_me(r.id))
  )
$$;

create function private.ride_org_id(p_ride_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select r.org_id from public.rides r where r.id = p_ride_id
$$;

-- True when this driver is (or was) linked to a ride booked by the caller's org,
-- so the partner may see who is driving, who must reconfirm, or who dropped it.
create function private.driver_on_my_org_ride(p_driver_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rides r
    where r.org_id = private.my_managed_org_id()
      and p_driver_id in (r.driver_id, r.preferred_driver_id, r.reconfirm_driver_id, r.dropped_by_driver_id)
  )
$$;

create function private.house_on_my_driver_ride(p_house_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rides r
    where r.house_id = p_house_id and private.driver_side_of_ride(r.id)
  )
$$;

create function private.org_on_my_driver_ride(p_org_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rides r
    where r.org_id = p_org_id and private.driver_side_of_ride(r.id)
  )
$$;

-- True when this profile belongs to a driver the caller may see.
create function private.profile_is_visible_driver(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.drivers d
    where d.profile_id = p_profile_id
      and (
        d.org_id = private.my_managed_org_id()
        or private.acts_for_driver(d.id)
        or private.driver_on_my_org_ride(d.id)
      )
  )
$$;

-- Functions are executable by PUBLIC by default; only signed-in users need these (inside policies).
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Policies. (select private.fn()) is evaluated once per query instead of once per row.
-- ---------------------------------------------------------------------------

-- organizations: admins; members of the org; drivers/providers on a ride booked by the org.
create policy organizations_select on public.organizations
  for select to authenticated
  using (
    (select private.is_admin())
    or id = (select private.my_org_id())
    or private.org_on_my_driver_ride(id)
  );

-- houses: admins; the owning org's staff; drivers/providers on a ride starting there (pickup contact).
create policy houses_select on public.houses
  for select to authenticated
  using (
    (select private.is_admin())
    or org_id = (select private.my_managed_org_id())
    or private.house_on_my_driver_ride(id)
  );

-- profiles: admins; yourself; your org's staff can see org members; visible drivers' names/phones.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (select private.is_admin())
    or id = (select private.my_profile_id())
    or org_id = (select private.my_managed_org_id())
    or private.profile_is_visible_driver(id)
  );

-- drivers: admins; yourself (or your provider admin); your org's drivers; drivers on your org's rides.
create policy drivers_select on public.drivers
  for select to authenticated
  using (
    (select private.is_admin())
    or private.acts_for_driver(id)
    or org_id = (select private.my_managed_org_id())
    or private.driver_on_my_org_ride(id)
  );

-- A driver updates only their own row (columns limited by the grant above).
create policy drivers_update_own on public.drivers
  for update to authenticated
  using (id = (select private.my_driver_id()))
  with check (id = (select private.my_driver_id()));

-- destinations: admins and the owning partner org.
create policy destinations_select on public.destinations
  for select to authenticated
  using (
    (select private.is_admin())
    or org_id = (select private.my_managed_org_id())
  );

-- Only a partner account may add destinations, and only to its own org.
create policy destinations_insert_own_org on public.destinations
  for insert to authenticated
  with check (
    (select private.my_role()) = 'PARTNER'
    and org_id = (select private.my_managed_org_id())
  );

-- rides: admins; the booking org's staff; the assigned/offered driver or their provider admin.
create policy rides_select on public.rides
  for select to authenticated
  using (
    (select private.is_admin())
    or org_id = (select private.my_managed_org_id())
    or private.acts_for_driver(driver_id)
    or private.offered_to_me(id)
  );

-- ride_offers: admins; the driver (or provider admin) it was sent to; the org that booked the ride.
create policy ride_offers_select on public.ride_offers
  for select to authenticated
  using (
    (select private.is_admin())
    or private.acts_for_driver(driver_id)
    or private.ride_org_id(ride_id) = (select private.my_managed_org_id())
  );

-- driver_documents: admins and the driver themselves. Uploads are added in Step 13.
create policy driver_documents_select on public.driver_documents
  for select to authenticated
  using (
    (select private.is_admin())
    or driver_id = (select private.my_driver_id())
  );
