-- CareRide scheduled dispatch (guide Step 12).
--
-- The mock runs checkDeadlines() whenever a screen loads data. A shared backend can't rely on someone
-- having CareRide open, so this job runs every minute on the server and:
--   1. expires requests nobody answered in time (5 min on-demand, 60 min scheduled),
--   2. asks the next drivers once everyone asked has answered or timed out,
--   3. asks drivers again for waiting (SEARCHING) rides, e.g. when someone's request hours open,
--   4. cancels rides nobody accepted by the deadline (30 min after booking on-demand, pickup time scheduled).
--
-- Safe to run twice: it only acts on rows whose deadline has passed or that are still waiting, and two
-- overlapping runs can't both work (advisory lock). Rides someone is changing right now are skipped
-- (SKIP LOCKED) and picked up next minute. Acceptance never waits for this job: respond_to_offer checks
-- the real deadline itself.

-- ---------------------------------------------------------------------------
-- Run log, so a stopped or failing job is visible. Not exposed to the API.
-- ---------------------------------------------------------------------------

create table private.job_runs (
  id                 bigint generated always as identity primary key,
  job                text not null,
  started_at         timestamptz not null default clock_timestamp(),
  finished_at        timestamptz,
  offers_expired     integer not null default 0,
  rides_dispatched   integer not null default 0, -- rides checked for drivers again
  rides_cancelled    integer not null default 0,
  rides_failed       integer not null default 0,
  skipped            boolean not null default false, -- another run was still going
  error              text                             -- the last error, if any ride failed
);

create index job_runs_job_started_idx on private.job_runs (job, started_at desc);

-- ---------------------------------------------------------------------------
-- The job
-- ---------------------------------------------------------------------------

create function private.process_ride_deadlines(p_batch integer default 200)
returns jsonb
language plpgsql set search_path = ''
as $$
declare
  v_run_id bigint;
  v_now timestamptz := now();
  v_ride public.rides;
  v_expired integer;
  v_offers_expired integer := 0;
  v_dispatched integer := 0;
  v_cancelled integer := 0;
  v_failed integer := 0;
  v_error text;
begin
  insert into private.job_runs (job) values ('ride-deadlines') returning id into v_run_id;

  -- Only one run at a time; the lock is released when this transaction ends.
  if not pg_try_advisory_xact_lock(hashtextextended('careride-ride-deadlines', 0)) then
    update private.job_runs set skipped = true, finished_at = clock_timestamp() where id = v_run_id;
    return jsonb_build_object('skipped', true);
  end if;

  for v_ride in
    select r.*
    from public.rides r
    where r.status in ('SEARCHING', 'OFFERED', 'NEEDS_ATTENTION')
      and (
        private.no_driver_deadline(r.type, r.pickup_time) <= v_now
        or r.status = 'SEARCHING'
        or exists (
          select 1 from public.ride_offers o
          where o.ride_id = r.id and o.status = 'PENDING' and o.expires_at <= v_now
        )
      )
    order by r.pickup_time
    limit p_batch
    for update of r skip locked
  loop
    -- Each ride in its own block: one ride failing is recorded and rolled back without blocking the rest.
    begin
      update public.ride_offers
         set status = 'EXPIRED'
       where ride_id = v_ride.id and status = 'PENDING' and expires_at <= v_now;
      get diagnostics v_expired = row_count;

      if private.no_driver_deadline(v_ride.type, v_ride.pickup_time) <= v_now then
        perform private.close_pending_offers(v_ride.id);
        update public.rides
           set status = 'CANCELLED',
               expired = true,
               cancelled_at = v_now,
               cancel_reason = case when v_ride.type = 'ON_DEMAND'
                                    then 'No driver accepted in time.'
                                    else 'No driver accepted before the pickup time.' end
         where id = v_ride.id;
        v_cancelled := v_cancelled + 1;
      elsif v_ride.status = 'SEARCHING' then
        perform private.dispatch(v_ride.id);
        v_dispatched := v_dispatched + 1;
      elsif v_expired > 0 then
        perform private.dispatch_if_unanswered(v_ride.id);
        v_dispatched := v_dispatched + 1;
      end if;
      v_offers_expired := v_offers_expired + v_expired;
    exception when others then
      v_failed := v_failed + 1;
      v_error := format('ride %s: %s', v_ride.id, sqlerrm);
    end;
  end loop;

  update private.job_runs
     set finished_at = clock_timestamp(),
         offers_expired = v_offers_expired,
         rides_dispatched = v_dispatched,
         rides_cancelled = v_cancelled,
         rides_failed = v_failed,
         error = v_error
   where id = v_run_id;

  -- Keep a week of history.
  delete from private.job_runs where started_at < v_now - interval '7 days';

  return jsonb_build_object(
    'offers_expired', v_offers_expired,
    'rides_dispatched', v_dispatched,
    'rides_cancelled', v_cancelled,
    'rides_failed', v_failed
  );
end;
$$;

revoke execute on function private.process_ride_deadlines(integer) from public;

-- ---------------------------------------------------------------------------
-- Schedule it every minute with Supabase Cron. Scheduling the same name again updates it.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('careride-ride-deadlines', '* * * * *', 'select private.process_ride_deadlines()');
