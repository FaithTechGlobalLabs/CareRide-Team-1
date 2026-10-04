-- Dashboard totals count only accounts that still exist.
--
-- Deleting an account switches its profile off but keeps the organization and driver rows (with their
-- APPROVED status) for ride history, so get_impact() was still counting them.
--   * Organizations: approved, with at least one active partner or transport-provider account.
--     (A driver the org added doesn't keep a deleted organization on the count.)
--   * Verified drivers: approved, with an active profile (the same rule matching uses).
-- Completed rides and fares saved stay as they are: those trips really happened.

create or replace function public.get_impact()
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
    (select count(*) from public.organizations o
      where o.status = 'APPROVED'
        and exists (select 1 from public.profiles p
                    where p.org_id = o.id and p.is_active and p.role in ('PARTNER', 'ORG_ADMIN'))),
    (select count(*) from public.drivers d
      join public.profiles p on p.id = d.profile_id
      where d.status = 'APPROVED' and p.is_active)
$$;
