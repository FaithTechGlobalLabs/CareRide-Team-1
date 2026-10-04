-- Scheduled rides store the driver's ETA relative to the booked pickup time
-- (early / on time / late), not "I'll be there in N minutes from now".

drop function public.advance_ride(uuid, text, integer);

create function public.advance_ride(
  p_ride_id uuid,
  p_step text,
  p_eta_minutes integer default null,
  p_eta_from_pickup boolean default false
)
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
        driver_eta = case
          when p_eta_minutes is null then null
          when p_eta_from_pickup then r.pickup_time + make_interval(mins => greatest(-120, least(p_eta_minutes, 180)))
          when p_eta_minutes > 0 then now() + make_interval(mins => least(p_eta_minutes, 600))
        end
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

revoke execute on function public.advance_ride(uuid, text, integer, boolean) from public, anon;
grant execute on function public.advance_ride(uuid, text, integer, boolean) to authenticated;
