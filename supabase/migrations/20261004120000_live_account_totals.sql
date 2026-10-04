-- Dashboard totals stay right, and update live, when accounts change.
--
-- Deleting an account only switches its profile off (profiles.is_active), and profiles weren't sent over
-- Realtime, so open dashboards kept showing the old Organizations and Verified drivers totals until a
-- full reload. Realtime checks each subscriber's access rules first, so only people who can already read
-- a profile hear about it (admins, the person themselves, their org). The app only reloads on an event.
--
-- get_impact() is restated from 20261003200000_impact_active_accounts.sql so applying this file alone
-- also brings the totals up to date if that one wasn't applied yet.

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

alter publication supabase_realtime add table public.profiles;
