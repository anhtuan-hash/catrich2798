-- Assessment 5.0 - additive private classroom queue, never modify grades or grants.
create table if not exists public.lesson_check_teaching_queue (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 activity_ids uuid[] not null default '{}',
 class_name text not null default '',
 default_minutes smallint not null default 5 check(default_minutes between 1 and 60),
 updated_at timestamptz not null default now(),
 constraint lesson_check_queue_max_items check(cardinality(activity_ids) <= 20),
 constraint lesson_check_queue_class_length check(length(class_name) <= 80)
);
alter table public.lesson_check_teaching_queue enable row level security;
drop policy if exists "Teacher owns teaching queue" on public.lesson_check_teaching_queue;
create policy "Teacher owns teaching queue" on public.lesson_check_teaching_queue
 for all to authenticated using (user_id=auth.uid() and public.lesson_check_is_approved_user())
 with check (user_id=auth.uid() and public.lesson_check_is_approved_user());
grant select, insert, update, delete on public.lesson_check_teaching_queue to authenticated;

-- Validate each referenced activity and require grants for teachers; leaders may queue any.
create or replace function public.lesson_check_guard_teaching_queue()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id or not public.lesson_check_is_approved_user()
 then raise exception 'Invalid teaching queue owner'; end if;
 if cardinality(new.activity_ids)>20 or cardinality(new.activity_ids)<>(
   select count(distinct u) from unnest(new.activity_ids) u
 ) then raise exception 'Maximum 20 unique activities per queue'; end if;
 if exists(select 1 from unnest(new.activity_ids) u where u is null
   or not exists(select 1 from public.lesson_check_activities a where a.id=u)
   or not public.lesson_check_has_activity_access(u))
 then raise exception 'Queue includes an unavailable activity'; end if;
 new.updated_at=now();
 return new;
end; $$;
revoke all on function public.lesson_check_guard_teaching_queue() from public,anon,authenticated;
drop trigger if exists lesson_check_guard_teaching_queue_trigger on public.lesson_check_teaching_queue;
create trigger lesson_check_guard_teaching_queue_trigger
 before insert or update on public.lesson_check_teaching_queue for each row
 execute function public.lesson_check_guard_teaching_queue();

-- Only update recently-opened IDs, preserving favorites, collections and Lesson Runner settings.
create or replace function public.lesson_check_mark_recent(p_activity uuid)
returns uuid[] language plpgsql security definer set search_path=public as $$
declare ids uuid[]; who uuid:=auth.uid();
begin
 if who is null or not public.lesson_check_is_approved_user() or p_activity is null
 or not public.lesson_check_has_activity_access(p_activity) or
 not exists(select 1 from public.lesson_check_activities where id=p_activity)
 then raise exception 'This activity is not available'; end if;
 insert into public.lesson_check_workspace_state(user_id,recent_ids,updated_at)
 values (who,array[p_activity],now())
 on conflict (user_id) do update
   set recent_ids = array_prepend(p_activity,
     coalesce((select array_agg(x order by ord) from unnest(
       array_remove(coalesce(lesson_check_workspace_state.recent_ids,'{}'::uuid[]),p_activity)
     ) with ordinality t(x,ord) where ord<=29),'{}'::uuid[])),
     updated_at=now()
 returning recent_ids into ids;
 return ids;
end; $$;
revoke all on function public.lesson_check_mark_recent(uuid) from public,anon;
grant execute on function public.lesson_check_mark_recent(uuid) to authenticated;
