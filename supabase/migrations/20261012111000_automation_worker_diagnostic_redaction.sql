-- Prevent ordinary signed-in users (including pending teacher accounts)
-- from reading privileged automation worker errors and opaque metadata.
-- The current app only checks the "available" status; preserve the public
-- RPC signature, generic status fields and Admin/TTCM diagnostics.
CREATE OR REPLACE FUNCTION public.bes_v1097_cloud_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'cron', 'pg_temp'
AS $function$
DECLARE
  heartbeat jsonb;
  scheduler boolean := false;
  leader boolean := false;
BEGIN
  leader := coalesce(public.bes_v1097_is_leader(auth.uid()), false);

  SELECT to_jsonb(h) INTO heartbeat
  FROM public.automation_worker_heartbeats h
  WHERE worker_key = 'primary';

  -- Do not leak internal job diagnostics via a SECURITY DEFINER RPC.
  IF NOT leader AND heartbeat IS NOT NULL THEN
    heartbeat := heartbeat - 'last_error' - 'metadata';
  END IF;

  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = ''bes-v1097-worker'')'
    INTO scheduler;
  END IF;

  RETURN jsonb_build_object(
    'available',true,
    'scheduler',scheduler,
    'cron_job_name','bes-v1097-worker',
    'heartbeat',heartbeat,
    'mode','cloud'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'available',true,
    'scheduler',false,
    'cron_job_name','bes-v1097-worker',
    'heartbeat',CASE WHEN leader THEN heartbeat ELSE heartbeat - 'last_error' - 'metadata' END,
    'mode','cloud',
    'warning',CASE WHEN leader THEN sqlerrm ELSE 'Cloud worker status unavailable' END
  );
END;
$function$;
