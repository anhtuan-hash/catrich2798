-- Schedule the independently authenticated World Explorer Edge Function every hour (UTC minute 0).
-- A random 256-bit cron token is read from Vault at invocation time, never
-- embedded in the cron job body, source code or client JavaScript.
do $job$
begin
  perform cron.schedule('world-explorer-auto-hourly','0 * * * *',
$task$
select net.http_post(
 url:='https://xpkbgqdlfonsinriggmj.supabase.co/functions/v1/world-explorer-hourly',
 headers:=jsonb_build_object('Content-Type','application/json',
   'x-world-explorer-cron-token',
   (select decrypted_secret from vault.decrypted_secrets where name='world_explorer_cron_token')),
 body:=jsonb_build_object('trigger','cron-hourly'),
 timeout_milliseconds:=120000
) as request_id
$task$);
end $job$;