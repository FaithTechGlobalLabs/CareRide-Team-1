-- Partner organizations book rides; they do not register drivers. Drivers sign up
-- themselves. Only a transport-provider admin (ORG_ADMIN) may add a driver.

create or replace function public.add_org_driver(p_details jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_org_id uuid := private.my_managed_org_id();
  v_profile_id uuid;
begin
  if private.my_role() is distinct from 'ORG_ADMIN' or v_org_id is null then
    raise exception 'Only a transport provider can add drivers.' using errcode = 'P0001';
  end if;
  if (select o.status from public.organizations o where o.id = v_org_id) = 'REJECTED' then
    raise exception 'This organization can''t add drivers.' using errcode = 'P0001';
  end if;

  insert into public.profiles (name, phone, role, org_id)
  values (
    private.required_text(p_details ->> 'name', 'Driver name'),
    private.valid_phone(p_details ->> 'phone', 'Phone'),
    'DRIVER',
    v_org_id
  )
  returning id into v_profile_id;

  return private.insert_driver(v_profile_id, v_org_id, p_details, 'ORG_DRIVER');
end;
$$;
