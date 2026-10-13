-- Assessment 4.0 metadata facets (additive, separate from legacy catalog RPC signature).
create table if not exists public.lesson_check_activity_attributes (
 activity_id uuid primary key references public.lesson_check_activities(id) on delete cascade,
 difficulty text not null default 'unclassified' check(difficulty in ('A1','A2','B1','B2','C1','C2','mixed','unclassified')),
 duration_minutes smallint not null default 15 check(duration_minutes between 1 and 120),
 delivery_mode text not null default 'whole_class' check(delivery_mode in ('individual','group','whole_class','hybrid')),
 keywords text[] not null default '{}',
 learning_goal text not null default '',
 updated_by uuid references public.profiles(id) on delete set null,
 updated_at timestamptz not null default now(),
 constraint lesson_check_activity_attrs_keywords_limit check(cardinality(keywords)<=15)
);
alter table public.lesson_check_activity_attributes enable row level security;
drop policy if exists "Approved teachers can read activity facets" on public.lesson_check_activity_attributes;
create policy "Approved teachers can read activity facets" on public.lesson_check_activity_attributes
 for select to authenticated using(public.lesson_check_is_approved_user());
drop policy if exists "Only leaders can manage activity facets" on public.lesson_check_activity_attributes;
create policy "Only leaders can manage activity facets" on public.lesson_check_activity_attributes
 for all to authenticated using(public.lesson_check_is_leader())
 with check(public.lesson_check_is_leader());
grant select,insert,update,delete on public.lesson_check_activity_attributes to authenticated;
create index if not exists lesson_check_activity_attrs_search on public.lesson_check_activity_attributes (difficulty,delivery_mode,duration_minutes);
