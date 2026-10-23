-- Supabase migration applied to ESL Brian production
-- bes_event_audit_and_reannounce

create table if not exists public.bes_event_audit_logs(
 id bigint generated always as identity primary key,
 event_id uuid not null references public.bes_events(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists bes_event_audit_log_event_idx on public.bes_event_audit_logs(event_id,created_at desc);
alter table public.bes_event_audit_logs enable row level security;
create policy "bes_event_audit_admin_read" on public.bes_event_audit_logs for select to authenticated using ((select public.is_admin()));
create policy "bes_event_audit_admin_insert" on public.bes_event_audit_logs for insert to authenticated with check ((select public.is_admin()));
grant select,insert on public.bes_event_audit_logs to authenticated;
grant usage,select on sequence public.bes_event_audit_logs_id_seq to authenticated;

create or replace function public.bes_event_touch_audit()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $fn$
begin
 if TG_OP='UPDATE' then
  NEW.updated_at=now();
  NEW.updated_by=auth.uid();
 end if;
 return NEW;
end $fn$;
create trigger bes_event_touch_before_update
before update on public.bes_events
for each row execute function public.bes_event_touch_audit();

create or replace function public.bes_event_audit_trigger()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $fn$
begin
 insert into public.bes_event_audit_logs(event_id,actor_id,action,details)
 values (NEW.id,auth.uid(),lower(TG_OP),
 jsonb_build_object('status',NEW.status,'previous_status',case when TG_OP='UPDATE' then OLD.status else null end,
 'version',NEW.version,'previous_version',case when TG_OP='UPDATE' then OLD.version else null end));
 return NEW;
end $fn$;
create trigger bes_event_audit_after_change
after insert or update on public.bes_events
for each row execute function public.bes_event_audit_trigger();

create or replace function public.bes_reannounce_event(p_event_id uuid)
returns public.bes_events language plpgsql security invoker set search_path=public,pg_temp as $fn$
declare result public.bes_events;
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 update public.bes_events set version=version+1
 where id=p_event_id and status='published' and display_end_at>now()
 returning * into result;
 if not found then raise exception 'Only active published events may be reannounced'; end if;
 return result;
end $fn$;
revoke all on function public.bes_reannounce_event(uuid) from public,anon;
grant execute on function public.bes_reannounce_event(uuid) to authenticated;

