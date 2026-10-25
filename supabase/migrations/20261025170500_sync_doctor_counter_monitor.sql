-- Sync Doctor v1.8 — aggregate student counter drift surveillance.
-- Only changes monitor metadata, not academic records.
alter table public.bes_sync_monitor_runs
  add column if not exists counter_mismatch_workspaces integer
    check (counter_mismatch_workspaces>=0);

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
  c int:=0;g int:=0;h int:=0;missing_links int:=0;affected int:=0;drift int:=0;
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

  select count(*) into drift from public.bes_gradebook_workspaces gb
    where gb.school_year=yr and
      (coalesce(jsonb_typeof(gb.payload->'students'),'null')<>'array'
        or gb.student_count is distinct from (
          select count(*)::int from jsonb_array_elements(
            case when jsonb_typeof(gb.payload->'students')='array'
            then gb.payload->'students' else '[]'::jsonb end
          ) students(value) where students.value->>'active' is distinct from 'false'
        ));
  insert into public.bes_sync_monitor_runs(school_year,canonical_classes,gradebook_workspaces,
    homeroom_workspaces,possible_missing_links,affected_workspaces,counter_mismatch_workspaces,status,note)
  values(yr,c,g,h,missing_links,affected,drift,
   case when c=0 or g=0 then 'partial' when missing_links>0 or drift>0 then 'attention' else 'healthy' end,
   'Advisory snapshot of missing links and active-student counter inconsistencies');
  -- Keep a fixed-size time window, protecting historical privacy and storage.
  delete from public.bes_sync_monitor_runs where checked_at<now()-interval '90 days';
end
$fn$;

revoke execute on function bes_internal.bes_sync_run_health_monitor()
  from public,anon,authenticated;
