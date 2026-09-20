-- Brian production observability v11.9.2

create table if not exists public.app_runtime_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  route text not null default '',
  scope text not null default 'runtime',
  message text not null default '',
  stack text not null default '',
  component_stack text not null default '',
  user_agent text not null default '',
  online boolean,
  app_version text not null default '',
  runtime_version text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists app_runtime_errors_created_idx
  on public.app_runtime_errors(created_at desc);
create index if not exists app_runtime_errors_user_created_idx
  on public.app_runtime_errors(user_id,created_at desc);

alter table public.app_runtime_errors enable row level security;
revoke all on table public.app_runtime_errors from public;
revoke all on table public.app_runtime_errors from anon;
revoke all on table public.app_runtime_errors from authenticated;
grant all on table public.app_runtime_errors to service_role;

drop policy if exists app_runtime_errors_deny_direct_v1192 on public.app_runtime_errors;
create policy app_runtime_errors_deny_direct_v1192
on public.app_runtime_errors
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.app_report_runtime_error(p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_message text := left(trim(coalesce(p_payload->>'message','')),800);
begin
  if v_uid is null or v_message='' then return false; end if;
  if not public.app_public_rate_limit_allow('runtime_error',v_uid::text,60,3600) then return false; end if;

  insert into public.app_runtime_errors(
    user_id,route,scope,message,stack,component_stack,user_agent,online,app_version,runtime_version
  )
  values(
    v_uid,
    left(coalesce(p_payload->>'route',''),300),
    left(coalesce(p_payload->>'scope','runtime'),120),
    v_message,
    left(coalesce(p_payload->>'stack',''),6000),
    left(coalesce(p_payload->>'componentStack',''),6000),
    left(coalesce(p_payload->>'userAgent',''),500),
    case when p_payload ? 'online' then (p_payload->>'online')::boolean else null end,
    left(coalesce(p_payload->>'appVersion',''),40),
    left(coalesce(p_payload->>'runtimeVersion',''),40)
  );
  return true;
end;
$function$;

revoke execute on function public.app_report_runtime_error(jsonb) from public;
revoke execute on function public.app_report_runtime_error(jsonb) from anon;
grant execute on function public.app_report_runtime_error(jsonb) to authenticated;
grant execute on function public.app_report_runtime_error(jsonb) to service_role;

create or replace function public.app_runtime_error_summary(p_hours integer default 24)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $function$
  select case
    when auth.uid() is null or not public.is_admin() then jsonb_build_object('ok',false,'error','forbidden')
    else jsonb_build_object(
      'ok',true,
      'hours',greatest(1,least(coalesce(p_hours,24),720)),
      'total',(
        select count(*)::int from public.app_runtime_errors e
        where e.created_at >= now()-(greatest(1,least(coalesce(p_hours,24),720))*interval '1 hour')
      ),
      'byScope',coalesce((
        select jsonb_object_agg(scope,n order by scope)
        from (
          select scope,count(*)::int n
          from public.app_runtime_errors e
          where e.created_at >= now()-(greatest(1,least(coalesce(p_hours,24),720))*interval '1 hour')
          group by scope
        ) s
      ),'{}'::jsonb),
      'latest',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',e.id,'route',e.route,'scope',e.scope,'message',e.message,
          'appVersion',e.app_version,'runtimeVersion',e.runtime_version,'createdAt',e.created_at
        ) order by e.created_at desc)
        from (
          select * from public.app_runtime_errors
          where created_at >= now()-(greatest(1,least(coalesce(p_hours,24),720))*interval '1 hour')
          order by created_at desc limit 50
        ) e
      ),'[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.app_runtime_error_summary(integer) from public;
revoke execute on function public.app_runtime_error_summary(integer) from anon;
grant execute on function public.app_runtime_error_summary(integer) to authenticated;
grant execute on function public.app_runtime_error_summary(integer) to service_role;

create or replace function public.app_purge_runtime_errors(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Forbidden' using errcode='42501';
  end if;
  delete from public.app_runtime_errors
  where created_at < now()-(greatest(7,least(coalesce(p_days,30),365))*interval '1 day');
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;

revoke execute on function public.app_purge_runtime_errors(integer) from public;
revoke execute on function public.app_purge_runtime_errors(integer) from anon;
grant execute on function public.app_purge_runtime_errors(integer) to authenticated;
grant execute on function public.app_purge_runtime_errors(integer) to service_role;
