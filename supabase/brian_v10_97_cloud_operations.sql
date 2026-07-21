-- Brian English Studio V10.97.0
-- Cloud Operations & Background Automation
-- Durable queue, pg_cron worker, retry/dead-letter handling and in-app digests.
-- Safe to rerun. Existing automation rules/runs/events are preserved.

begin;
create extension if not exists pgcrypto;

do $$ begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception when others then
    raise notice 'pg_cron is unavailable; manual worker RPC remains available: %', sqlerrm;
  end;
end $$;

create or replace function public.bes_v1097_try_uuid(value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
begin
  if value is not null and value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return value::uuid; end if;
  return null;
end; $$;

create or replace function public.bes_v1097_is_leader(target_user uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare jwt jsonb:=coalesce(auth.jwt(),'{}'::jsonb); role_text text:=lower(coalesce(jwt->'app_metadata'->>'role',jwt->'user_metadata'->>'role',jwt->>'role','')); email_text text:=lower(coalesce(jwt->>'email','')); matched boolean:=false;
begin
  if target_user is null then return false; end if;
  if target_user=auth.uid() and (role_text in('admin','ttcm','leader','department_head','department-head','head') or email_text='anhtuan@pek.edu.vn') then return true; end if;
  if to_regclass('public.profiles') is null then return false; end if;
  select exists(select 1 from public.profiles p cross join lateral(select to_jsonb(p) j)x
    where coalesce(public.bes_v1097_try_uuid(x.j->>'id'),public.bes_v1097_try_uuid(x.j->>'user_id'),public.bes_v1097_try_uuid(x.j->>'profile_id'))=target_user
      and (lower(coalesce(x.j->>'role','')) in('admin','ttcm','leader','department_head','department-head','head') or lower(coalesce(x.j->>'email',''))='anhtuan@pek.edu.vn')) into matched;
  return coalesce(matched,false);
exception when others then return false;
end; $$;

create or replace function public.bes_v1097_set_updated_at()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$ begin new.updated_at=now(); return new; end; $$;

create table if not exists public.automation_cloud_jobs(
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.automation_rules(id) on delete set null,
  owner_id uuid not null,
  event_id uuid references public.automation_events(id) on delete set null,
  rule_name text not null default 'Automation',
  trigger_type text not null default 'schedule',
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null default '',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text not null default '',
  approved_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint automation_cloud_jobs_status_check check(status in('queued','claimed','processing','pending_approval','success','failed','dead','cancelled')),
  constraint automation_cloud_jobs_payload_object check(jsonb_typeof(payload)='object'),
  constraint automation_cloud_jobs_attempts_check check(attempts>=0 and max_attempts between 1 and 20)
);
create unique index if not exists automation_cloud_jobs_dedupe_idx on public.automation_cloud_jobs(dedupe_key) where dedupe_key<>'';
create index if not exists automation_cloud_jobs_queue_idx on public.automation_cloud_jobs(status,run_after,created_at);
create index if not exists automation_cloud_jobs_owner_idx on public.automation_cloud_jobs(owner_id,created_at desc);
drop trigger if exists automation_cloud_jobs_updated_trg on public.automation_cloud_jobs;
create trigger automation_cloud_jobs_updated_trg before update on public.automation_cloud_jobs for each row execute function public.bes_v1097_set_updated_at();

create table if not exists public.automation_delivery_log(
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.automation_cloud_jobs(id) on delete set null,
  owner_id uuid not null,
  channel text not null default 'in_app',
  status text not null default 'ready',
  title text not null default 'Brian English Studio',
  body text not null default '',
  route text not null default '',
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint automation_delivery_status_check check(status in('ready','delivered','failed','cancelled')),
  constraint automation_delivery_payload_object check(jsonb_typeof(payload)='object')
);
create index if not exists automation_delivery_owner_idx on public.automation_delivery_log(owner_id,created_at desc);
create index if not exists automation_delivery_job_idx on public.automation_delivery_log(job_id,created_at desc);

create table if not exists public.automation_worker_heartbeats(
  worker_key text primary key,
  last_seen_at timestamptz not null default now(),
  last_job_count integer not null default 0,
  last_error text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  constraint automation_worker_metadata_object check(jsonb_typeof(metadata)='object')
);

create table if not exists public.automation_digest_preferences(
  owner_id uuid primary key,
  enabled boolean not null default true,
  cadence text not null default 'daily',
  delivery_time time not null default '17:00',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  include_summary boolean not null default true,
  include_failures boolean not null default true,
  include_pending boolean not null default true,
  next_delivery_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint automation_digest_cadence_check check(cadence in('daily','weekly'))
);

drop trigger if exists automation_digest_updated_trg on public.automation_digest_preferences;
create trigger automation_digest_updated_trg before update on public.automation_digest_preferences for each row execute function public.bes_v1097_set_updated_at();

create or replace function public.bes_v1097_next_run(config jsonb, base_time timestamptz default now())
returns timestamptz language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare frequency text:=lower(coalesce(config->>'frequency','daily')); run_time time:='08:00'; weekday integer:=coalesce(nullif(config->>'weekday','')::integer,1); candidate timestamptz;
begin
  begin run_time:=coalesce(nullif(config->>'time','')::time,'08:00'::time); exception when others then run_time:='08:00'; end;
  if frequency='hourly' then return date_trunc('hour',base_time)+interval '1 hour'; end if;
  if frequency='weekly' then
    weekday:=greatest(0,least(6,weekday));
    candidate:=date_trunc('day',base_time)+(((weekday-extract(dow from base_time)::integer+7)%7)||' days')::interval+run_time;
    if candidate<=base_time then candidate:=candidate+interval '7 days'; end if;
    return candidate;
  end if;
  candidate:=date_trunc('day',base_time)+run_time;
  if candidate<=base_time then candidate:=candidate+interval '1 day'; end if;
  return candidate;
exception when others then return base_time+interval '1 day';
end; $$;

create or replace function public.bes_v1097_enqueue_due_rules()
returns integer language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare r public.automation_rules%rowtype; due_time timestamptz; next_time timestamptz; inserted_count integer:=0; dedupe text;
begin
  if to_regclass('public.automation_rules') is null then return 0; end if;
  for r in select * from public.automation_rules where enabled=true and trigger_type='schedule' loop
    due_time:=coalesce(r.next_run_at, public.bes_v1097_next_run(r.trigger_config,coalesce(r.last_run_at,r.created_at)-interval '1 minute'));
    if due_time<=now() then
      dedupe:='schedule:'||r.id::text||':'||floor(extract(epoch from due_time)/60)::bigint::text;
      insert into public.automation_cloud_jobs(rule_id,owner_id,rule_name,trigger_type,payload,dedupe_key,run_after)
      values(r.id,r.owner_id,r.name,'schedule',jsonb_build_object('scheduled_at',due_time,'source','server-cron'),dedupe,now())
      on conflict(dedupe_key) where dedupe_key<>'' do nothing;
      if found then inserted_count:=inserted_count+1; end if;
      next_time:=public.bes_v1097_next_run(r.trigger_config,greatest(now(),due_time));
      update public.automation_rules set next_run_at=next_time where id=r.id;
    elsif r.next_run_at is null then
      update public.automation_rules set next_run_at=due_time where id=r.id;
    end if;
  end loop;
  return inserted_count;
end; $$;

create or replace function public.bes_v1097_enqueue_event_jobs()
returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare r public.automation_rules%rowtype;
begin
  for r in select * from public.automation_rules where enabled=true and trigger_type='event' and trigger_config->>'event'=new.event_type loop
    insert into public.automation_cloud_jobs(rule_id,owner_id,event_id,rule_name,trigger_type,payload,dedupe_key,run_after)
    values(r.id,r.owner_id,new.id,r.name,'event',new.payload,'event:'||new.id::text||':'||r.id::text,now())
    on conflict(dedupe_key) where dedupe_key<>'' do nothing;
  end loop;
  return new;
end; $$;

drop trigger if exists automation_events_cloud_queue_v1097 on public.automation_events;
create trigger automation_events_cloud_queue_v1097 after insert on public.automation_events for each row execute function public.bes_v1097_enqueue_event_jobs();

create or replace function public.bes_v1097_create_delivery(target_job uuid, target_owner uuid, target_channel text, target_title text, target_body text, target_route text, target_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare delivery_id uuid;
begin
  insert into public.automation_delivery_log(job_id,owner_id,channel,status,title,body,route,payload,delivered_at)
  values(target_job,target_owner,target_channel,'delivered',coalesce(nullif(target_title,''),'Brian English Studio'),coalesce(target_body,''),coalesce(target_route,''),coalesce(target_payload,'{}'::jsonb),now()) returning id into delivery_id;
  return delivery_id;
end; $$;

create or replace function public.bes_v1097_execute_job(target_job uuid, force_approved boolean default false)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare j public.automation_cloud_jobs%rowtype; r public.automation_rules%rowtype; title_text text; body_text text; route_text text; delivery_id uuid; project_id uuid; result jsonb;
begin
  select * into j from public.automation_cloud_jobs where id=target_job for update;
  if not found then raise exception 'Cloud job not found'; end if;
  if j.status in('success','cancelled') then return jsonb_build_object('job_id',j.id,'status',j.status); end if;
  select * into r from public.automation_rules where id=j.rule_id;
  if not found then update public.automation_cloud_jobs set status='dead',last_error='Source rule not found',finished_at=now() where id=j.id; return jsonb_build_object('job_id',j.id,'status','dead'); end if;

  if r.requires_approval and j.approved_at is null and not force_approved then
    update public.automation_cloud_jobs set status='pending_approval',locked_at=null,locked_by='' where id=j.id;
    insert into public.automation_runs(rule_id,owner_id,rule_name,status,trigger_type,input_json,approval_required,started_at,created_at)
    select r.id,r.owner_id,r.name,'pending_approval',j.trigger_type,j.payload||jsonb_build_object('cloud_job_id',j.id),true,now(),now()
    where not exists(select 1 from public.automation_runs ar where ar.input_json->>'cloud_job_id'=j.id::text);
    return jsonb_build_object('job_id',j.id,'status','pending_approval');
  end if;

  update public.automation_cloud_jobs set status='processing',attempts=attempts+1,locked_at=now(),locked_by='bes-v1097-worker',last_error='' where id=j.id;
  title_text:=coalesce(nullif(r.action_config->>'title',''),r.name);
  body_text:=coalesce(r.action_config->>'message',r.description,'');
  route_text:=coalesce(r.action_config->>'route','');

  if r.action_type='notification' then
    delivery_id:=public.bes_v1097_create_delivery(j.id,j.owner_id,'in_app',title_text,body_text,route_text,j.payload);
    if to_regclass('public.work_hub_notifications') is not null then
      execute 'insert into public.work_hub_notifications(user_id,notification_type,title,body,created_at) values($1,$2,$3,$4,now())'
      using j.owner_id,'automation',title_text,body_text;
    end if;
  elsif r.action_type='practice_draft' and to_regclass('public.content_factory_projects') is not null then
    execute 'insert into public.content_factory_projects(owner_id,title,output_type,level,item_count,instruction,source_text,status) values($1,$2,$3,$4,$5,$6,$7,$8) returning id'
      into project_id using j.owner_id,title_text,coalesce(r.action_config->>'output_type','worksheet'),coalesce(r.action_config->>'level','B2'),greatest(1,least(100,coalesce(nullif(r.action_config->>'item_count','')::integer,15))),body_text,coalesce(r.action_config->>'source_text',j.payload->>'summary',''),'draft';
    delivery_id:=public.bes_v1097_create_delivery(j.id,j.owner_id,'practice_draft',title_text,body_text,'content-factory',jsonb_build_object('project_id',project_id,'context',j.payload));
  else
    delivery_id:=public.bes_v1097_create_delivery(j.id,j.owner_id,r.action_type,title_text,body_text,route_text,j.payload);
  end if;

  result:=jsonb_build_object('delivery_id',delivery_id,'action_type',r.action_type,'cloud_job_id',j.id);
  insert into public.automation_runs(rule_id,owner_id,rule_name,status,trigger_type,input_json,output_json,approval_required,approved_at,started_at,finished_at,created_at)
  values(r.id,r.owner_id,r.name,'success',j.trigger_type,j.payload||jsonb_build_object('cloud_job_id',j.id),result,r.requires_approval,j.approved_at,now(),now(),now());
  update public.automation_rules set last_run_at=now(),run_count=run_count+1,success_count=success_count+1 where id=r.id;
  update public.automation_cloud_jobs set status='success',finished_at=now(),locked_at=null,locked_by='',last_error='' where id=j.id;
  return jsonb_build_object('job_id',j.id,'status','success','output',result);
exception when others then
  update public.automation_cloud_jobs set status=case when attempts>=max_attempts then 'dead' else 'failed' end,last_error=sqlerrm,run_after=now()+make_interval(mins=>least(60,greatest(2,attempts*5))),locked_at=null,locked_by='',finished_at=case when attempts>=max_attempts then now() else null end where id=target_job;
  insert into public.automation_runs(rule_id,owner_id,rule_name,status,trigger_type,input_json,error_message,approval_required,started_at,finished_at,created_at)
  select j.rule_id,j.owner_id,coalesce(r.name,j.rule_name),'failed',j.trigger_type,j.payload||jsonb_build_object('cloud_job_id',j.id),sqlerrm,coalesce(r.requires_approval,false),now(),now(),now() where j.id is not null;
  return jsonb_build_object('job_id',target_job,'status','failed','error',sqlerrm);
end; $$;

create or replace function public.bes_v1097_generate_digests()
returns integer language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare pref public.automation_digest_preferences%rowtype; complete_count integer; fail_count integer; pending_count integer; body_text text; generated integer:=0; next_time timestamptz;
begin
  for pref in select * from public.automation_digest_preferences where enabled=true and coalesce(next_delivery_at,now())<=now() loop
    select count(*) filter(where status='success'),count(*) filter(where status in('failed','dead')),count(*) filter(where status='pending_approval') into complete_count,fail_count,pending_count from public.automation_cloud_jobs where owner_id=pref.owner_id and created_at>=now()-interval '24 hours';
    body_text:=format('24 giờ qua: %s hoàn tất · %s lỗi · %s chờ duyệt.',complete_count,fail_count,pending_count);
    perform public.bes_v1097_create_delivery(null,pref.owner_id,'digest','Bản tin vận hành Brian English',body_text,'cloud-operations',jsonb_build_object('success',complete_count,'failed',fail_count,'pending',pending_count));
    next_time:=date_trunc('day',now())+pref.delivery_time+case when pref.cadence='weekly' then interval '7 days' else interval '1 day' end;
    update public.automation_digest_preferences set next_delivery_at=next_time where owner_id=pref.owner_id;
    generated:=generated+1;
  end loop;
  return generated;
end; $$;

create or replace function public.bes_v1097_worker_tick(batch_size integer default 25)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare job record; processed integer:=0; enqueued integer:=0; digests integer:=0; last_error text:='';
begin
  if auth.uid() is not null and not public.bes_v1097_is_leader(auth.uid()) then raise exception 'Only Admin/TTCM can run the cloud worker manually.'; end if;
  enqueued:=public.bes_v1097_enqueue_due_rules();
  digests:=public.bes_v1097_generate_digests();
  for job in select id from public.automation_cloud_jobs where status in('queued','failed') and run_after<=now() and attempts<max_attempts order by run_after,created_at for update skip locked limit greatest(1,least(100,batch_size)) loop
    perform public.bes_v1097_execute_job(job.id,false); processed:=processed+1;
  end loop;
  insert into public.automation_worker_heartbeats(worker_key,last_seen_at,last_job_count,last_error,metadata)
  values('primary',now(),processed,'',jsonb_build_object('enqueued',enqueued,'digests',digests,'batch_size',batch_size,'version','10.97.0'))
  on conflict(worker_key) do update set last_seen_at=excluded.last_seen_at,last_job_count=excluded.last_job_count,last_error=excluded.last_error,metadata=excluded.metadata;
  return jsonb_build_object('processed',processed,'enqueued',enqueued,'digests',digests,'checked_at',now());
exception when others then
  last_error:=sqlerrm;
  insert into public.automation_worker_heartbeats(worker_key,last_seen_at,last_job_count,last_error,metadata)
  values('primary',now(),processed,last_error,jsonb_build_object('version','10.97.0'))
  on conflict(worker_key) do update set last_seen_at=excluded.last_seen_at,last_job_count=excluded.last_job_count,last_error=excluded.last_error,metadata=excluded.metadata;
  raise;
end; $$;

create or replace function public.bes_v1097_approve_job(target_job uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare job_owner uuid; rule_scope text;
begin
  select j.owner_id,r.scope into job_owner,rule_scope from public.automation_cloud_jobs j left join public.automation_rules r on r.id=j.rule_id where j.id=target_job;
  if auth.uid() is null or (auth.uid()<>job_owner and not public.bes_v1097_is_leader(auth.uid())) or (rule_scope='department' and not public.bes_v1097_is_leader(auth.uid())) then raise exception 'Not allowed to approve this job.'; end if;
  update public.automation_cloud_jobs set approved_at=now(),status='queued',run_after=now(),last_error='' where id=target_job and status='pending_approval';
  return public.bes_v1097_execute_job(target_job,true);
end; $$;

create or replace function public.bes_v1097_retry_job(target_job uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare owner_uuid uuid;
begin
  select owner_id into owner_uuid from public.automation_cloud_jobs where id=target_job;
  if auth.uid() is null or (auth.uid()<>owner_uuid and not public.bes_v1097_is_leader(auth.uid())) then raise exception 'Not allowed to retry this job.'; end if;
  update public.automation_cloud_jobs set status='queued',run_after=now(),last_error='',finished_at=null where id=target_job and status in('failed','dead');
  return jsonb_build_object('job_id',target_job,'status','queued');
end; $$;

create or replace function public.bes_v1097_cancel_job(target_job uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare owner_uuid uuid;
begin
  select owner_id into owner_uuid from public.automation_cloud_jobs where id=target_job;
  if auth.uid() is null or (auth.uid()<>owner_uuid and not public.bes_v1097_is_leader(auth.uid())) then raise exception 'Not allowed to cancel this job.'; end if;
  update public.automation_cloud_jobs set status='cancelled',finished_at=now(),locked_at=null,locked_by='' where id=target_job and status not in('success','cancelled');
  return jsonb_build_object('job_id',target_job,'status','cancelled');
end; $$;

create or replace function public.bes_v1097_cloud_status()
returns jsonb language plpgsql stable security definer set search_path=public,extensions,cron,pg_temp as $$
declare heartbeat jsonb; scheduler boolean:=false;
begin
  select to_jsonb(h) into heartbeat from public.automation_worker_heartbeats h where worker_key='primary';
  if to_regclass('cron.job') is not null then execute 'select exists(select 1 from cron.job where jobname=''bes-v1097-worker'')' into scheduler; end if;
  return jsonb_build_object('available',true,'scheduler',scheduler,'cron_job_name','bes-v1097-worker','heartbeat',heartbeat,'mode','cloud');
exception when others then return jsonb_build_object('available',true,'scheduler',false,'cron_job_name','bes-v1097-worker','heartbeat',heartbeat,'mode','cloud','warning',sqlerrm);
end; $$;

alter table public.automation_cloud_jobs enable row level security;
alter table public.automation_delivery_log enable row level security;
alter table public.automation_worker_heartbeats enable row level security;
alter table public.automation_digest_preferences enable row level security;

do $$ declare p record; t text; begin
  foreach t in array array['automation_cloud_jobs','automation_delivery_log','automation_worker_heartbeats','automation_digest_preferences'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t and policyname like '%_v1097' loop execute format('drop policy if exists %I on public.%I',p.policyname,t); end loop;
  end loop;
end $$;

create policy automation_cloud_jobs_read_v1097 on public.automation_cloud_jobs for select to authenticated using(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid()));
create policy automation_delivery_read_v1097 on public.automation_delivery_log for select to authenticated using(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid()));
create policy automation_delivery_update_v1097 on public.automation_delivery_log for update to authenticated using(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid()));
create policy automation_heartbeat_read_v1097 on public.automation_worker_heartbeats for select to authenticated using(true);
create policy automation_digest_all_v1097 on public.automation_digest_preferences for all to authenticated using(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid())) with check(owner_id=auth.uid() or public.bes_v1097_is_leader(auth.uid()));

revoke all on public.automation_cloud_jobs,public.automation_delivery_log,public.automation_worker_heartbeats,public.automation_digest_preferences from anon;
grant select on public.automation_cloud_jobs,public.automation_worker_heartbeats to authenticated;
grant select,update on public.automation_delivery_log to authenticated;
grant select,insert,update,delete on public.automation_digest_preferences to authenticated;
grant execute on function public.bes_v1097_cloud_status(),public.bes_v1097_worker_tick(integer),public.bes_v1097_approve_job(uuid),public.bes_v1097_retry_job(uuid),public.bes_v1097_cancel_job(uuid) to authenticated;

do $$ declare t text; begin
  foreach t in array array['automation_cloud_jobs','automation_delivery_log','automation_worker_heartbeats','automation_digest_preferences'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
exception when undefined_object then raise notice 'supabase_realtime is unavailable.'; end $$;

do $$ declare existing_job bigint; begin
  if to_regclass('cron.job') is not null then
    for existing_job in select jobid from cron.job where jobname='bes-v1097-worker' loop perform cron.unschedule(existing_job); end loop;
    perform cron.schedule('bes-v1097-worker','*/5 * * * *','select public.bes_v1097_worker_tick(25);');
  else raise notice 'pg_cron is not installed; use the Run worker button or enable pg_cron later.';
  end if;
exception when others then raise notice 'Could not register pg_cron worker: %',sqlerrm; end $$;

insert into public.automation_worker_heartbeats(worker_key,last_seen_at,last_job_count,last_error,metadata)
values('primary',now(),0,'',jsonb_build_object('installed',true,'version','10.97.0'))
on conflict(worker_key) do update set metadata=excluded.metadata;

insert into public.bes_schema_registry(component,version,installed_at) values
('application','10.97.0',now()),('runtime_core','1.4.0',now()),('cloud_operations','10.97.0',now())
on conflict(component) do update set version=excluded.version,installed_at=excluded.installed_at;

commit;
select 'automation_cloud_jobs' object,count(*) rows from public.automation_cloud_jobs
union all select 'automation_delivery_log',count(*) from public.automation_delivery_log
union all select 'automation_worker_heartbeats',count(*) from public.automation_worker_heartbeats
union all select 'automation_digest_preferences',count(*) from public.automation_digest_preferences;
