-- SHEREHE: schedule the 30-day photo purge to run via the edge function.
--
-- The previous migration (0001) installed a local plpgsql purger as a fallback.
-- This migration replaces it with an hourly pg_cron job that POSTs to the
-- `purge-event-photos` Supabase Edge Function via pg_net. The edge function
-- uses the Storage API (correct ownership + audit trail) instead of poking
-- `storage.objects` directly.
--
-- One-time setup before running:
--   1. Deploy the function:  supabase functions deploy purge-event-photos --no-verify-jwt
--   2. Store secrets used by both pg_cron and the function:
--        select vault.create_secret('https://<project-ref>.supabase.co', 'sherehe_project_url');
--        select vault.create_secret('<service-role-key>',                'sherehe_service_role_key');
--        select vault.create_secret('<random-shared-secret>',            'sherehe_purge_secret');
--      (or replace the three `current_setting` calls below with literal values
--       if you don't use Vault — but never commit the literals to git.)
--   3. Set the matching secrets on the edge function:
--        supabase secrets set PURGE_SHARED_SECRET=<random-shared-secret>
--      `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into
--      every edge function so they don't need to be set manually.
--
-- Re-running this migration is idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Convenience wrapper so the cron schedule is a one-liner and we can inspect
-- the latest invocation via `select * from net._http_response order by id desc;`.
create or replace function public.sherehe_invoke_purge_event_photos()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url    text := current_setting('app.sherehe_project_url', true);
  service_key    text := current_setting('app.sherehe_service_role_key', true);
  shared_secret  text := current_setting('app.sherehe_purge_secret', true);
  request_id     bigint;
begin
  if project_url is null or service_key is null then
    raise notice 'sherehe_invoke_purge_event_photos: missing app.sherehe_project_url / app.sherehe_service_role_key — falling back to in-DB purger';
    perform public.sherehe_purge_expired_event_photos();
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/purge-event-photos',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', case when shared_secret is null
                            then 'Bearer ' || service_key
                            else 'Bearer ' || shared_secret
                       end,
      -- Supabase requires the anon/service-role key on edge function calls
      -- even when the function is `--no-verify-jwt`. Sending it as `apikey`
      -- satisfies the gateway without conflicting with our shared secret.
      'apikey', service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into request_id;

  return request_id;
end;
$$;

-- Unschedule the previous in-DB job (0001) if present so we don't double-purge.
do $$
begin
  perform cron.unschedule('sherehe-purge-event-photos')
  where exists (select 1 from cron.job where jobname = 'sherehe-purge-event-photos');
exception when others then
  null;
end $$;

-- New hourly schedule, on the hour.
select cron.schedule(
  'sherehe-purge-event-photos',
  '0 * * * *',
  $$select public.sherehe_invoke_purge_event_photos();$$
);
