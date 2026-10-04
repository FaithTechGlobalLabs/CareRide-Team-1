-- Partners can correct or remove a saved place.
-- Past rides keep the address copied onto them when they were booked.
-- org_id is not updatable, so a place cannot be moved to another organization.

grant update (name, address, city, notes) on public.destinations to authenticated;
grant delete on public.destinations to authenticated;

create policy destinations_update_own_org on public.destinations
  for update to authenticated
  using (
    (select private.my_role()) = 'PARTNER'
    and org_id = (select private.my_managed_org_id())
  )
  with check (
    (select private.my_role()) = 'PARTNER'
    and org_id = (select private.my_managed_org_id())
  );

create policy destinations_delete_own_org on public.destinations
  for delete to authenticated
  using (
    (select private.my_role()) = 'PARTNER'
    and org_id = (select private.my_managed_org_id())
  );
