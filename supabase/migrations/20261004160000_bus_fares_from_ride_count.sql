-- Bus fares saved is completed rides × $2.58, never a stored or placeholder amount.
-- Matches src/logic/estimateFare.ts. Restated from 20261004120000_live_account_totals.sql
-- so dashboards stay right even if older estimated_fare_saved rows still hold the $25 taxi figure.

update public.rides
set estimated_fare_saved = 2.58
where estimated_fare_saved is distinct from 2.58;

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
    (select count(*) * 2.58 from public.rides r where r.status = 'COMPLETED'),
    (select count(*) from public.organizations o
      where o.status = 'APPROVED'
        and exists (select 1 from public.profiles p
                    where p.org_id = o.id and p.is_active and p.role in ('PARTNER', 'ORG_ADMIN'))),
    (select count(*) from public.drivers d
      join public.profiles p on p.id = d.profile_id
      where d.status = 'APPROVED' and p.is_active)
$$;
