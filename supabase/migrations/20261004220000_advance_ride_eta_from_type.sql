-- "I'm on my way" must keep the original 3-argument advance_ride signature.
-- The live API still has that form; a fourth p_eta_from_pickup argument 404s
-- (PGRST202) and the driver sees a false "check your connection" error.
-- Scheduled vs travel ETA is already on the ride (type), so the extra argument
-- is unnecessary.

create or replace function public.advance_ride(
  p_ride_id uuid,
  p_step text,
  p_eta_minutes integer default null
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
          when r.type = 'SCHEDULED' then r.pickup_time + make_interval(mins => greatest(-120, least(p_eta_minutes, 180)))
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
      if r.driver_arrived_at is null then
        raise exception 'Say you are here, and wait with the front desk, before marking a no-show.' using errcode = 'P0001';
      end if;
      if r.driver_arrived_at > now() - interval '10 minutes' then
        raise exception 'Wait 10 minutes after you arrive before marking a no-show.' using errcode = 'P0001';
      end if;
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

drop function if exists public.advance_ride(uuid, text, integer, boolean);

revoke execute on function public.advance_ride(uuid, text, integer) from public, anon;
grant execute on function public.advance_ride(uuid, text, integer) to authenticated;
