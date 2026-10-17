-- QuestAtlas Vercel guest gateway cutover (STAGED - apply only with server secrets set).
-- Dependencies: foundation + live + department migration, and a Vercel Functions
-- gateway with QUESTATLAS_SUPABASE_SERVICE_KEY, QUESTATLAS_SUPABASE_URL,
-- QUESTATLAS_IP_SALT configured in the target environment.
-- Crucial: applying this migration BEFORE deploying/configuring the gateway
-- intentionally disables all existing direct anonymous guest play endpoints.

create table public.qatl_gateway_ip_budget (
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  action text not null check (action in ('join','view','submit')),
  minute_bucket timestamptz not null,
  hits integer not null default 1 check (hits between 1 and 100000),
  primary key(ip_hash,action,minute_bucket)
);
create index qatl_gateway_ip_budget_expiry_idx
  on public.qatl_gateway_ip_budget(minute_bucket);
alter table public.qatl_gateway_ip_budget enable row level security;
revoke all on public.qatl_gateway_ip_budget from public,anon,authenticated,service_role;

create function public.qatl_live_gateway_budget(p_ip_hash text,p_action text)
returns boolean language plpgsql security definer set search_path='' as $qatl_ip_budget$
declare v_hits integer; v_limit integer;
begin
  if p_ip_hash !~ '^[a-f0-9]{64}$' or p_action not in ('join','view','submit')
    then raise exception 'Invalid gateway budget arguments'; end if;
  -- A school often shares one public NAT IP across eight teams. Each team
  -- polls every 3 seconds: 8*20=160 view requests/minute per school IP.
  -- Token and room-specific quotas still enforce tighter limits downstream.
  v_limit=case p_action when 'join' then 40 when 'view' then 480 else 96 end;
  insert into public.qatl_gateway_ip_budget(ip_hash,action,minute_bucket,hits)
    values (p_ip_hash,p_action,date_trunc('minute',clock_timestamp()),1)
    on conflict (ip_hash,action,minute_bucket)
    do update set hits=least(public.qatl_gateway_ip_budget.hits+1,v_limit+1)
    returning hits into v_hits;
  return v_hits<=v_limit;
end $qatl_ip_budget$;
revoke all on function public.qatl_live_gateway_budget(text,text) from PUBLIC,anon,authenticated,service_role;
grant execute on function public.qatl_live_gateway_budget(text,text) to service_role;

-- Prevent clients from bypassing the Vercel IP gate via direct PostgREST RPC calls.
revoke execute on function public.qatl_live_join(text,integer,text) from public,anon,authenticated;
revoke execute on function public.qatl_live_view(text,text) from public,anon,authenticated;
revoke execute on function public.qatl_live_submit(text,text,text) from public,anon,authenticated;
grant execute on function public.qatl_live_join(text,integer,text) to service_role;
grant execute on function public.qatl_live_view(text,text) to service_role;
grant execute on function public.qatl_live_submit(text,text,text) to service_role;

-- Runtime cleanup is deliberately not enabled here; design retention and scheduled
-- jobs only after the staging environment has been verified.
