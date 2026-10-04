-- CareRide data service support (guide Step 10).
--   * admin_list_accounts(): the admin Accounts page, including login emails (hidden from all other reads).
--   * get_impact(): platform-wide totals without exposing the rows behind them.
--   * Driver settings: the database re-checks what drivers can now edit directly from the browser.

-- ---------------------------------------------------------------------------
-- admin_list_accounts(): everyone who can sign in, with the email their login uses.
-- ---------------------------------------------------------------------------

create function public.admin_list_accounts()
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
    where p.is_active
    order by p.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_impact(): totals shown on dashboards. Counts only, never the underlying rides or people.
-- ---------------------------------------------------------------------------

create function public.get_impact()
returns table (
  rides_completed bigint,
  money_saved numeric,
  organizations bigint,
  verified_drivers bigint
)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from public.rides r where r.status = 'COMPLETED'),
    (select coalesce(sum(r.estimated_fare_saved), 0) from public.rides r where r.status = 'COMPLETED'),
    (select count(*) from public.organizations o where o.status = 'APPROVED'),
    (select count(*) from public.drivers d where d.status = 'APPROVED')
$$;

revoke execute on function public.admin_list_accounts() from public, anon;
revoke execute on function public.get_impact() from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.get_impact() to authenticated;

-- ---------------------------------------------------------------------------
-- Driver settings guards. Drivers update these columns directly (column grant in the policies
-- migration), so the same rules sign-up applies are enforced by the table itself.
-- ---------------------------------------------------------------------------

-- A pure validator; the check constraint runs it as the updating user.
grant execute on function private.valid_request_hours(jsonb) to authenticated;

alter table public.drivers
  add constraint drivers_request_hours_valid check (private.valid_request_hours(request_hours) is not null),
  add constraint drivers_vehicle_not_blank check (length(trim(vehicle)) > 0),
  add constraint drivers_seats_max check (seats <= 20),
  add constraint drivers_notice_max check (min_notice_hours <= 336),
  add constraint drivers_has_city check (cardinality(service_cities) > 0);
