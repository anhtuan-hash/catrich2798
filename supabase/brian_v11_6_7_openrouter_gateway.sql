begin;


create table if not exists public.api_security_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  endpoint text not null,
  action text not null,
  status text not null,
  request_id text,
  ip_hash text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists api_security_events_actor_idx on public.api_security_events(actor_id,created_at desc);
create index if not exists api_security_events_endpoint_idx on public.api_security_events(endpoint,created_at desc);
alter table public.api_security_events enable row level security;
drop policy if exists api_security_events_read_v1099 on public.api_security_events;
drop policy if exists api_security_events_read_openrouter_v1167 on public.api_security_events;
create policy api_security_events_read_openrouter_v1167 on public.api_security_events for select to authenticated
using (actor_id = auth.uid());
grant select on public.api_security_events to authenticated;

create table if not exists public.ai_runtime_settings (
  id text primary key default 'global' check (id = 'global'),
  enabled boolean not null default true,
  model text not null default 'openrouter/free',
  per_minute_limit integer not null default 12 check (per_minute_limit between 1 and 120),
  daily_request_limit integer not null default 160 check (daily_request_limit between 1 and 10000),
  daily_token_budget integer not null default 180000 check (daily_token_budget between 1000 and 100000000),
  max_output_tokens integer not null default 2800 check (max_output_tokens between 128 and 8192),
  profiles jsonb not null default '{"chat":2400,"worksheet":2800,"document":2600,"administration":1800,"teaching-content":3200,"default":2200}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.ai_runtime_settings(id) values ('global') on conflict (id) do nothing;
alter table public.ai_runtime_settings enable row level security;
drop policy if exists ai_runtime_settings_read_v1167 on public.ai_runtime_settings;
create policy ai_runtime_settings_read_v1167 on public.ai_runtime_settings for select to authenticated using (true);
grant select on public.ai_runtime_settings to authenticated;

create table if not exists public.ai_usage_daily (
  day date not null default current_date,
  user_id uuid not null references auth.users(id) on delete cascade,
  minute_start timestamptz not null default date_trunc('minute', now()),
  minute_count integer not null default 0,
  requests integer not null default 0,
  successes integer not null default 0,
  errors integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  reserved_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(day, user_id)
);
create index if not exists ai_usage_daily_user_idx on public.ai_usage_daily(user_id, day desc);
alter table public.ai_usage_daily enable row level security;
drop policy if exists ai_usage_daily_read_v1167 on public.ai_usage_daily;
create policy ai_usage_daily_read_v1167 on public.ai_usage_daily for select to authenticated
using (user_id = auth.uid());
grant select on public.ai_usage_daily to authenticated;

create or replace function public.bes_ai_reserve_quota_v1167(
  p_user_id uuid,
  p_per_minute integer,
  p_daily_requests integer,
  p_daily_tokens bigint,
  p_input_tokens bigint,
  p_output_reserve bigint
) returns jsonb language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
declare r public.ai_usage_daily; minute_value integer; next_requests integer; next_tokens bigint;
begin
  if p_user_id is null or p_user_id <> auth.uid() then return jsonb_build_object('allowed',false,'reason','auth'); end if;
  insert into public.ai_usage_daily(day,user_id,minute_start,minute_count,requests,input_tokens,reserved_tokens,updated_at)
  values(current_date,p_user_id,date_trunc('minute',now()),0,0,0,0,now()) on conflict(day,user_id) do nothing;
  select * into r from public.ai_usage_daily where day=current_date and user_id=p_user_id for update;
  minute_value := case when r.minute_start < date_trunc('minute',now()) then 0 else r.minute_count end;
  next_requests := r.requests + 1;
  next_tokens := r.input_tokens + r.output_tokens + r.reserved_tokens + greatest(0,p_input_tokens) + greatest(0,p_output_reserve);
  if minute_value + 1 > greatest(1,p_per_minute) then return jsonb_build_object('allowed',false,'reason','minute_limit','retry_after',60); end if;
  if next_requests > greatest(1,p_daily_requests) then return jsonb_build_object('allowed',false,'reason','request_limit'); end if;
  if next_tokens > greatest(1000,p_daily_tokens) then return jsonb_build_object('allowed',false,'reason','token_budget'); end if;
  update public.ai_usage_daily set
    minute_start=case when minute_start < date_trunc('minute',now()) then date_trunc('minute',now()) else minute_start end,
    minute_count=minute_value+1, requests=next_requests,
    input_tokens=input_tokens+greatest(0,p_input_tokens), reserved_tokens=reserved_tokens+greatest(0,p_output_reserve), updated_at=now()
  where day=current_date and user_id=p_user_id;
  return jsonb_build_object('allowed',true,'requests',next_requests,'reserved_tokens',greatest(0,p_output_reserve));
end $$;

grant execute on function public.bes_ai_reserve_quota_v1167(uuid,integer,integer,bigint,bigint,bigint) to authenticated;

create or replace function public.bes_ai_settle_quota_v1167(
  p_user_id uuid,
  p_output_reserve bigint,
  p_output_tokens bigint,
  p_success boolean
) returns boolean language plpgsql volatile security definer set search_path=public,auth,pg_temp as $$
begin
  if p_user_id is null or p_user_id <> auth.uid() then return false; end if;
  update public.ai_usage_daily set
    reserved_tokens=greatest(0,reserved_tokens-greatest(0,p_output_reserve)),
    output_tokens=output_tokens+greatest(0,p_output_tokens),
    successes=successes+case when p_success then 1 else 0 end,
    errors=errors+case when p_success then 0 else 1 end,
    updated_at=now()
  where day=current_date and user_id=p_user_id;
  return found;
end $$;
grant execute on function public.bes_ai_settle_quota_v1167(uuid,bigint,bigint,boolean) to authenticated;

commit;
