-- Asynchronous learning pack worker. Does not change the existing hourly article cron.
-- Reuses the already protected World Explorer cron token from Supabase Vault.
do $job$
begin
 if exists(select 1 from cron.job where jobname='world-explorer-learning-every-5m') then
  perform cron.unschedule('world-explorer-learning-every-5m');
 end if;
 perform cron.schedule('world-explorer-learning-every-5m','*/5 * * * *',
$task$
select net.http_post(
 url:='https://xpkbgqdlfonsinriggmj.supabase.co/functions/v1/world-explorer-learning',
 headers:=jsonb_build_object('Content-Type','application/json',
   'x-world-explorer-cron-token',
   (select decrypted_secret from vault.decrypted_secrets where name='world_explorer_cron_token')),
 body:='{"trigger":"learning-worker"}'::jsonb,
 timeout_milliseconds:=120000
) as request_id
$task$);
end $job$;
