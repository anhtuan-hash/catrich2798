-- Brian English Studio V12.37.0
-- Unified AI Governance Cloud Sync
-- Run once in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

create or replace function public.bes_v1237_is_ai_admin(target_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  jwt_role text := lower(coalesce(jwt->'app_metadata'->>'role', jwt->'user_metadata'->>'role', jwt->>'role', ''));
  jwt_email text := lower(coalesce(jwt->>'email', ''));
  resolved_role text := '';
begin
  if target_user is null then return false; end if;
  if target_user = auth.uid() and (jwt_role in ('admin','ttcm','leader','department_head','department-head','head') or jwt_email = 'anhtuan@pek.edu.vn') then
    return true;
  end if;

  if to_regprocedure('public.bes_v1099_current_role(uuid)') is not null then
    begin
      execute 'select public.bes_v1099_current_role($1)' into resolved_role using target_user;
      if lower(coalesce(resolved_role,'')) in ('admin','department_head') then return true; end if;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.system_roles') is not null then
    begin
      if exists(select 1 from public.system_roles where user_id = target_user and active = true and lower(role) in ('admin','department_head')) then
        return true;
      end if;
    exception when others then null;
    end;
  end if;

  return false;
end;
$$;

grant execute on function public.bes_v1237_is_ai_admin(uuid) to authenticated;

create table if not exists public.ai_governance_settings (
  scope text primary key default 'global',
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint ai_governance_settings_scope_check check (length(scope) between 1 and 80),
  constraint ai_governance_settings_object_check check (jsonb_typeof(settings) = 'object')
);

create table if not exists public.ai_governance_events (
  id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_email text not null default '',
  actor_role text not null default 'teacher',
  event_type text not null default 'event',
  status text not null default 'info',
  label text not null default 'AI event',
  task_id text not null default 'default',
  provider text not null default '',
  model text not null default '',
  transport text not null default '',
  operation_id text not null default '',
  action_id text not null default '',
  target text not null default '',
  source text not null default '',
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  provider_calls integer not null default 0 check (provider_calls >= 0),
  fallback_used boolean not null default false,
  privacy_redactions integer not null default 0 check (privacy_redactions >= 0),
  validation_repairs integer not null default 0 check (validation_repairs >= 0),
  runtime_retries integer not null default 0 check (runtime_retries >= 0),
  runtime_cache_hit boolean not null default false,
  runtime_dedupe_hit boolean not null default false,
  runtime_timeout boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  usage_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  constraint ai_governance_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.ai_governance_daily (
  usage_date date not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_email text not null default '',
  actor_role text not null default 'teacher',
  requests integer not null default 0,
  successes integer not null default 0,
  errors integer not null default 0,
  actions integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  duration_ms bigint not null default 0,
  provider_calls integer not null default 0,
  fallbacks integer not null default 0,
  privacy_redactions integer not null default 0,
  validation_repairs integer not null default 0,
  runtime_retries integer not null default 0,
  runtime_cache_hits integer not null default 0,
  runtime_dedupe_hits integer not null default 0,
  runtime_timeouts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (usage_date, actor_id)
);

create index if not exists ai_governance_events_created_idx on public.ai_governance_events(created_at desc);
create index if not exists ai_governance_events_actor_date_idx on public.ai_governance_events(actor_id, usage_date desc);
create index if not exists ai_governance_events_task_idx on public.ai_governance_events(task_id, usage_date desc);
create index if not exists ai_governance_events_provider_idx on public.ai_governance_events(provider, usage_date desc);
create index if not exists ai_governance_daily_date_idx on public.ai_governance_daily(usage_date desc);

alter table public.ai_governance_settings enable row level security;
alter table public.ai_governance_events enable row level security;
alter table public.ai_governance_daily enable row level security;

drop policy if exists ai_governance_settings_read_v1237 on public.ai_governance_settings;
create policy ai_governance_settings_read_v1237 on public.ai_governance_settings
for select to authenticated using (true);

drop policy if exists ai_governance_settings_admin_v1237 on public.ai_governance_settings;
create policy ai_governance_settings_admin_v1237 on public.ai_governance_settings
for all to authenticated
using (public.bes_v1237_is_ai_admin(auth.uid()))
with check (public.bes_v1237_is_ai_admin(auth.uid()));

drop policy if exists ai_governance_events_read_v1237 on public.ai_governance_events;
create policy ai_governance_events_read_v1237 on public.ai_governance_events
for select to authenticated
using (actor_id = auth.uid() or public.bes_v1237_is_ai_admin(auth.uid()));

drop policy if exists ai_governance_daily_read_v1237 on public.ai_governance_daily;
create policy ai_governance_daily_read_v1237 on public.ai_governance_daily
for select to authenticated
using (actor_id = auth.uid() or public.bes_v1237_is_ai_admin(auth.uid()));

grant select on public.ai_governance_settings, public.ai_governance_events, public.ai_governance_daily to authenticated;
revoke insert, update, delete on public.ai_governance_events, public.ai_governance_daily from authenticated;

insert into public.ai_governance_settings(scope, settings, updated_at)
values (
  'global',
  '{
    "schemaVersion":4,
    "enabled":true,
    "allowActions":true,
    "requireActionConfirmation":true,
    "dailyRequestLimit":120,
    "dailyTokenBudget":180000,
    "maxOutputTokens":2800,
    "fairUse":{"enabled":true,"perUserDailyRequestLimit":60,"perUserDailyTokenBudget":90000,"warningPercent":80,"blockAtLimit":true,"exemptAdmins":true},
    "privacy":{"enabled":true,"mode":"mask","maskEmails":true,"maskPhones":true,"maskStudentIds":true,"maskNationalIds":true,"maskBirthDates":true,"maskAddresses":true,"maskNamedPeople":true,"maskSecrets":true,"scanAttachments":true,"blockSensitiveImages":false,"forceLocalForSensitive":false},
    "outputValidation":{"enabled":true,"validateJson":true,"rejectEmpty":true,"detectDuplicates":true,"autoRepair":true,"maxRepairAttempts":1},
    "runtime":{"enabled":true,"maxConcurrent":2,"requestTimeoutMs":45000,"transientRetries":1,"retryBaseDelayMs":800,"dedupeInFlight":true,"cacheEnabled":true,"cacheTtlMs":300000,"cacheMaxEntries":40,"circuitBreakerEnabled":true,"circuitFailureThreshold":3,"circuitFailureWindowMs":120000,"circuitCooldownMs":90000},
    "actionTargets":{"worksheet-factory":true,"exam-studio":true,"word2graph":true,"textlab-activities":true,"library":true,"current-app":true},
    "profiles":{"chat":{"label":"Brian AI Chat","maxOutputTokens":2400},"worksheet":{"label":"Worksheet Factory","maxOutputTokens":3200},"document":{"label":"Document analysis","maxOutputTokens":2800},"administration":{"label":"School administration","maxOutputTokens":1800},"diagnostic":{"label":"Provider connection test","maxOutputTokens":64},"default":{"label":"Default","maxOutputTokens":2200}},
    "updatedAt":""
  }'::jsonb,
  now()
)
on conflict (scope) do nothing;

create or replace function public.bes_v1237_save_ai_governance_settings(next_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.bes_v1237_is_ai_admin(auth.uid()) then raise exception 'Admin access required' using errcode = '42501'; end if;
  if next_settings is null or jsonb_typeof(next_settings) <> 'object' then raise exception 'Settings must be a JSON object'; end if;

  insert into public.ai_governance_settings(scope, settings, updated_by, updated_at)
  values ('global', next_settings, auth.uid(), now())
  on conflict (scope) do update set settings = excluded.settings, updated_by = excluded.updated_by, updated_at = excluded.updated_at;

  return jsonb_build_object('saved', true, 'updatedAt', now());
end;
$$;

grant execute on function public.bes_v1237_save_ai_governance_settings(jsonb) to authenticated;

create or replace function public.bes_v1237_get_ai_governance_settings()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when auth.uid() is null then jsonb_build_object('settings', '{}'::jsonb)
    else jsonb_build_object(
      'settings', coalesce((select settings from public.ai_governance_settings where scope = 'global'), '{}'::jsonb),
      'updatedAt', (select updated_at from public.ai_governance_settings where scope = 'global')
    )
  end;
$$;

grant execute on function public.bes_v1237_get_ai_governance_settings() to authenticated;

create or replace function public.bes_v1237_ingest_ai_events(event_batch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  actor_email_value text := lower(coalesce(jwt->>'email', ''));
  actor_role_value text := lower(coalesce(jwt->'app_metadata'->>'role', jwt->'user_metadata'->>'role', jwt->>'role', 'teacher'));
  item jsonb;
  inserted_id uuid;
  event_id_value uuid;
  created_value timestamptz;
  date_value date;
  event_type_value text;
  status_value text;
  accepted_count integer := 0;
  duplicate_count integer := 0;
  request_inc integer;
  success_inc integer;
  error_inc integer;
  action_inc integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if event_batch is null or jsonb_typeof(event_batch) <> 'array' then raise exception 'event_batch must be a JSON array'; end if;
  if jsonb_array_length(event_batch) > 60 then raise exception 'Maximum 60 events per batch'; end if;

  for item in select value from jsonb_array_elements(event_batch)
  loop
    begin
      event_id_value := coalesce(nullif(item->>'id','')::uuid, gen_random_uuid());
    exception when others then
      event_id_value := gen_random_uuid();
    end;
    begin
      created_value := coalesce(nullif(item->>'created_at','')::timestamptz, now());
    exception when others then
      created_value := now();
    end;
    date_value := (created_value at time zone 'utc')::date;
    event_type_value := left(coalesce(nullif(item->>'event_type',''), 'event'), 40);
    status_value := left(coalesce(nullif(item->>'status',''), 'info'), 24);
    inserted_id := null;

    insert into public.ai_governance_events(
      id, actor_id, actor_email, actor_role, event_type, status, label, task_id,
      provider, model, transport, operation_id, action_id, target, source,
      input_tokens, output_tokens, duration_ms, provider_calls, fallback_used,
      privacy_redactions, validation_repairs, runtime_retries, runtime_cache_hit,
      runtime_dedupe_hit, runtime_timeout, metadata, usage_date, created_at
    ) values (
      event_id_value, actor, actor_email_value, actor_role_value, event_type_value, status_value,
      left(coalesce(item->>'label','AI event'),180), left(coalesce(item->>'task_id','default'),80),
      left(coalesce(item->>'provider',''),80), left(coalesce(item->>'model',''),140), left(coalesce(item->>'transport',''),80),
      left(coalesce(item->>'operation_id',''),120), left(coalesce(item->>'action_id',''),120), left(coalesce(item->>'target',''),120), left(coalesce(item->>'source',''),120),
      least(1000000000, greatest(0, coalesce((item->>'input_tokens')::integer,0))),
      least(1000000000, greatest(0, coalesce((item->>'output_tokens')::integer,0))),
      least(1000000000, greatest(0, coalesce((item->>'duration_ms')::integer,0))),
      least(1000000, greatest(0, coalesce((item->>'provider_calls')::integer,0))),
      coalesce((item->>'fallback_used')::boolean,false),
      least(1000000, greatest(0, coalesce((item->>'privacy_redactions')::integer,0))),
      least(1000000, greatest(0, coalesce((item->>'validation_repairs')::integer,0))),
      least(1000000, greatest(0, coalesce((item->>'runtime_retries')::integer,0))),
      coalesce((item->>'runtime_cache_hit')::boolean,false),
      coalesce((item->>'runtime_dedupe_hit')::boolean,false),
      coalesce((item->>'runtime_timeout')::boolean,false),
      case when jsonb_typeof(item->'metadata') = 'object' then item->'metadata' else '{}'::jsonb end,
      date_value, created_value
    )
    on conflict (id) do nothing
    returning id into inserted_id;

    if inserted_id is null then
      duplicate_count := duplicate_count + 1;
      continue;
    end if;

    accepted_count := accepted_count + 1;
    request_inc := case when event_type_value = 'request' then 1 else 0 end;
    success_inc := case when event_type_value = 'request' and status_value = 'success' then 1 else 0 end;
    error_inc := case when event_type_value = 'request' and status_value in ('error','blocked') then 1 else 0 end;
    action_inc := case when event_type_value = 'action' then 1 else 0 end;

    insert into public.ai_governance_daily(
      usage_date, actor_id, actor_email, actor_role, requests, successes, errors, actions,
      input_tokens, output_tokens, duration_ms, provider_calls, fallbacks,
      privacy_redactions, validation_repairs, runtime_retries, runtime_cache_hits,
      runtime_dedupe_hits, runtime_timeouts, updated_at
    ) values (
      date_value, actor, actor_email_value, actor_role_value, request_inc, success_inc, error_inc, action_inc,
      coalesce((item->>'input_tokens')::integer,0), coalesce((item->>'output_tokens')::integer,0), coalesce((item->>'duration_ms')::integer,0),
      coalesce((item->>'provider_calls')::integer,0), case when coalesce((item->>'fallback_used')::boolean,false) then 1 else 0 end,
      coalesce((item->>'privacy_redactions')::integer,0), coalesce((item->>'validation_repairs')::integer,0), coalesce((item->>'runtime_retries')::integer,0),
      case when coalesce((item->>'runtime_cache_hit')::boolean,false) then 1 else 0 end,
      case when coalesce((item->>'runtime_dedupe_hit')::boolean,false) then 1 else 0 end,
      case when coalesce((item->>'runtime_timeout')::boolean,false) then 1 else 0 end,
      now()
    )
    on conflict (usage_date, actor_id) do update set
      actor_email = excluded.actor_email,
      actor_role = excluded.actor_role,
      requests = public.ai_governance_daily.requests + excluded.requests,
      successes = public.ai_governance_daily.successes + excluded.successes,
      errors = public.ai_governance_daily.errors + excluded.errors,
      actions = public.ai_governance_daily.actions + excluded.actions,
      input_tokens = public.ai_governance_daily.input_tokens + excluded.input_tokens,
      output_tokens = public.ai_governance_daily.output_tokens + excluded.output_tokens,
      duration_ms = public.ai_governance_daily.duration_ms + excluded.duration_ms,
      provider_calls = public.ai_governance_daily.provider_calls + excluded.provider_calls,
      fallbacks = public.ai_governance_daily.fallbacks + excluded.fallbacks,
      privacy_redactions = public.ai_governance_daily.privacy_redactions + excluded.privacy_redactions,
      validation_repairs = public.ai_governance_daily.validation_repairs + excluded.validation_repairs,
      runtime_retries = public.ai_governance_daily.runtime_retries + excluded.runtime_retries,
      runtime_cache_hits = public.ai_governance_daily.runtime_cache_hits + excluded.runtime_cache_hits,
      runtime_dedupe_hits = public.ai_governance_daily.runtime_dedupe_hits + excluded.runtime_dedupe_hits,
      runtime_timeouts = public.ai_governance_daily.runtime_timeouts + excluded.runtime_timeouts,
      updated_at = now();
  end loop;

  return jsonb_build_object('accepted', accepted_count, 'duplicates', duplicate_count, 'received', jsonb_array_length(event_batch));
end;
$$;

grant execute on function public.bes_v1237_ingest_ai_events(jsonb) to authenticated;

create or replace function public.bes_v1237_get_ai_governance_dashboard(lookback_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  days_value integer := least(45, greatest(1, coalesce(lookback_days,14)));
  start_date date := ((now() at time zone 'utc')::date - (least(45, greatest(1, coalesce(lookback_days,14))) - 1));
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.bes_v1237_is_ai_admin(auth.uid()) then raise exception 'Admin access required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'schema', 'bes-ai-cloud-dashboard/1.0',
    'lookbackDays', days_value,
    'generatedAt', now(),
    'totals', jsonb_build_object(
      'requests', coalesce(sum(requests),0),
      'successes', coalesce(sum(successes),0),
      'errors', coalesce(sum(errors),0),
      'actions', coalesce(sum(actions),0),
      'inputTokens', coalesce(sum(input_tokens),0),
      'outputTokens', coalesce(sum(output_tokens),0),
      'providerCalls', coalesce(sum(provider_calls),0),
      'fallbacks', coalesce(sum(fallbacks),0),
      'privacyRedactions', coalesce(sum(privacy_redactions),0),
      'validationRepairs', coalesce(sum(validation_repairs),0),
      'activeUsers', count(distinct actor_id)
    ),
    'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.usage_date desc) from public.ai_governance_daily d where d.usage_date >= start_date), '[]'::jsonb),
    'providers', coalesce((select jsonb_agg(jsonb_build_object('id', provider, 'value', total) order by total desc) from (select coalesce(nullif(provider,''),'Unknown') provider, count(*) total from public.ai_governance_events where usage_date >= start_date and event_type='request' group by 1 order by 2 desc limit 12) p), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', task_id, 'value', total) order by total desc) from (select coalesce(nullif(task_id,''),'default') task_id, count(*) total from public.ai_governance_events where usage_date >= start_date and event_type='request' group by 1 order by 2 desc limit 12) t), '[]'::jsonb),
    'transports', coalesce((select jsonb_agg(jsonb_build_object('id', transport, 'value', total) order by total desc) from (select coalesce(nullif(transport,''),'unknown') transport, count(*) total from public.ai_governance_events where usage_date >= start_date and event_type='request' group by 1 order by 2 desc limit 8) tr), '[]'::jsonb)
  ) into result
  from public.ai_governance_daily
  where usage_date >= start_date;

  return result;
end;
$$;

grant execute on function public.bes_v1237_get_ai_governance_dashboard(integer) to authenticated;

comment on table public.ai_governance_events is 'Privacy-safe AI telemetry only. Prompts, responses, attachments, images, API keys and secrets are intentionally excluded.';
comment on function public.bes_v1237_ingest_ai_events(jsonb) is 'Ingests privacy-safe AI metadata and atomically updates per-account daily aggregates.';

commit;
