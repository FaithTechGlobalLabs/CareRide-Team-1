-- CareRide live updates (guide Step 15).
--
-- Adds the tables screens care about to Supabase Realtime (Postgres Changes). Realtime checks each
-- subscriber's access rules before sending an insert or update, so people only hear about rows they can
-- already read. The app treats every event as "something changed, reload", never as data to display.
--
-- Note: Postgres can't check access rules for deleted rows, so delete events carry only the row id.
-- That only happens to ride_offers (when a ride is edited or retried), and an offer id reveals nothing.

alter publication supabase_realtime add table
  public.rides,
  public.ride_offers,
  public.organizations,
  public.drivers,
  public.destinations;
