-- Brian Sync Doctor Stage 6 — metadata-only automatic health monitoring.
-- Aggregated statistics only, never stores names, student IDs, scores or PII.
create table if not exists public.bes_sync_monitor_runs(
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  school_year text not null check (school_year ~ '^20[0-9]{2}-20[0-9]{2}$'),
  canonical_classes integer not null,
  gradebook_workspaces integer not null,
  homeroom_workspaces integer not null,
  possible_missing_links integer not null,
  affected_workspaces integer not null,
  status text not null check (status in ('healthy','attention','partial')),
  note text not null default ''
);
create index if not exists bes_sync_monitor_runs_at_idx on public.bes_sync_monitor_runs(checked_at desc);
alter table public.bes_sync_monitor_runs enable row level security;
revoke all on public.bes_sync_monitor_runs from public,anon,authenticated;
grant select on public.bes_sync_monitor_runs to authenticated;
create policy bes_sync_monitor_runs_read_admin on public.bes_sync_monitor_runs for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid())
  and p.approved is true and p.role in ('admin','department_head')));

create or replace function bes_internal.bes_sync_run_health_monitor()
returns void
language plpgsql security definer set search_path=''
as $fn$
declare
  yr text:=case when extract(month from now() at time zone 'Asia/Ho_Chi_Minh')>=8 then
    concat(extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer,'-',
      extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer+1)
  else concat(extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer-1,'-',
      extract(year from now() at time zone 'Asia/Ho_Chi_Minh')::integer) end;
  c int:=0;g int:=0;h int:=0;missing_links int:=0;affected int:=0;
begin
  select count(*) into c from public.bes_class_rosters r
   where r.school_year=yr and r.roster_key like 'class:%';
  select count(*) into g from public.bes_gradebook_workspaces r
   where r.school_year=yr and r.class_type='subject';
  select count(*) into h from public.bes_homeroom_workspaces r where r.school_year=yr;
  -- This is advisory, NOT authoritative identity matching. It does not
  -- trigger any repair. Never compare only by name.
  with possible as (
   select distinct gb.owner_id,gb.workspace_id,cs.value->>'rosterStudentId' student_ref
   from public.bes_class_rosters cr
   join public.bes_gradebook_workspaces gb on gb.school_year=cr.school_year
      and gb.class_name=cr.class_name and gb.class_type='subject'
   cross join lateral jsonb_array_elements(
     case when jsonb_typeof(cr.students)='array' then cr.students else '[]'::jsonb end
   ) cs(value)
   where cr.school_year=yr and cr.roster_key like 'class:%'
    and cs.value->>'active' is distinct from 'false'
    and coalesce(cs.value->>'archivedAt','')=''
    and coalesce(cs.value->>'deletedAt','')=''
    and coalesce(cs.value->>'rosterStudentId','')<>''
    and not exists(
      select 1 from jsonb_array_elements(
        case when jsonb_typeof(gb.payload->'students')='array'
          then gb.payload->'students' else '[]'::jsonb end
      ) local(value)
      where coalesce(local.value->>'rosterStudentId',local.value->>'id','')=cs.value->>'rosterStudentId'
      or (coalesce(cs.value->>'code','')<>'' and
          lower(trim(coalesce(local.value->>'code','')))=lower(trim(cs.value->>'code')))
    )
  )
  select count(*),count(distinct (owner_id,workspace_id)) into missing_links,affected from possible;

  insert into public.bes_sync_monitor_runs(school_year,canonical_classes,gradebook_workspaces,
    homeroom_workspaces,possible_missing_links,affected_workspaces,status,note)
  values(yr,c,g,h,missing_links,affected,
   case when c=0 or g=0 then 'partial' when missing_links>0 then 'attention' else 'healthy' end,
   'Automated advisory snapshot, possible missing association count only');
  -- Keep a fixed-size time window, protecting historical privacy and storage.
  delete from public.bes_sync_monitor_runs where checked_at<now()-interval '90 days';
end
$fn$;
revoke execute on function bes_internal.bes_sync_run_health_monitor() from public,anon,authenticated;

-- Daily check at 04:00 UTC (11:00 ICT), not a continuous monitor.
select cron.schedule('bes_sync_monitor_daily_v2','0 4 * * *',
  'select bes_internal.bes_sync_run_health_monitor();');
comment on table public.bes_sync_monitor_runs is
  'Aggregated daily advisory scans; never includes student identity or grades.';
