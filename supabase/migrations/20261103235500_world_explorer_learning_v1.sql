-- World Explorer Learning v1. Additive schema: preserves hourly publications and existing data.
alter table public.world_explorer_settings
  add column if not exists learning_enabled boolean not null default false,
  add column if not exists auto_generate_learning boolean not null default true;

create table if not exists public.world_explorer_learning_packs (
 id uuid primary key default gen_random_uuid(),
 publication_id uuid not null references public.world_explorer_publications(id) on delete restrict,
 content_hash text not null check(length(content_hash)=64),
 version integer not null default 1 check(version>=1),
 status text not null default 'pending'
   check(status in ('pending','processing','ready','needs_review','failed','superseded')),
 vocabulary jsonb not null default '[]'::jsonb check(jsonb_typeof(vocabulary)='array'),
 grammar jsonb not null default '[]'::jsonb check(jsonb_typeof(grammar)='array'),
 question_count integer not null default 0 check(question_count>=0),
 quality_score numeric(5,2),
 validation_summary jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 unique(publication_id,content_hash,version)
);
create index if not exists world_explorer_pack_pub_idx
  on public.world_explorer_learning_packs(publication_id,version desc);

create table if not exists public.world_explorer_learning_questions (
 id uuid primary key,
 learning_pack_id uuid not null references public.world_explorer_learning_packs(id) on delete restrict,
 question_type text not null
   check(question_type in ('true_false','single_choice','matching','gap_fill','short_answer')),
 skill text not null,
 stem_en text not null,
 stem_vi text,
 options jsonb not null default '[]'::jsonb check(jsonb_typeof(options)='array'),
 answer_key jsonb not null check(jsonb_typeof(answer_key)='object'),
 explanation_en text not null,
 explanation_vi text,
 evidence jsonb not null check(jsonb_typeof(evidence)='object'),
 points numeric(5,2) not null default 1 check(points>0),
 order_index integer not null,
 validation_status text not null default 'verified' check(validation_status in ('verified','rejected')),
 unique(learning_pack_id,order_index)
);
create index if not exists world_explorer_questions_pack_idx
  on public.world_explorer_learning_questions(learning_pack_id,order_index);

create table if not exists public.world_explorer_learning_jobs (
 id uuid primary key default gen_random_uuid(),
 publication_id uuid not null unique references public.world_explorer_publications(id) on delete cascade,
 requested_version integer not null default 1,
 status text not null default 'pending'
   check(status in ('pending','processing','ready','needs_review','failed')),
 attempts integer not null default 0 check(attempts between 0 and 20),
 locked_until timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists world_explorer_jobs_queue_idx
  on public.world_explorer_learning_jobs(status,updated_at);

create table if not exists public.world_explorer_learning_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 learning_pack_id uuid not null references public.world_explorer_learning_packs(id) on delete restrict,
 status text not null default 'in_progress' check(status in ('in_progress','completed')),
 score numeric(8,2) not null default 0,
 max_score numeric(8,2) not null default 0,
 started_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists we_attempts_user_idx
  on public.world_explorer_learning_attempts(user_id,started_at desc);

create table if not exists public.world_explorer_learning_responses (
 attempt_id uuid not null references public.world_explorer_learning_attempts(id) on delete cascade,
 question_id uuid not null references public.world_explorer_learning_questions(id) on delete restrict,
 answer jsonb not null,
 is_correct boolean not null,
 points numeric(6,2) not null,
 created_at timestamptz not null default now(),
 primary key(attempt_id,question_id)
);
create table if not exists public.world_explorer_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 publication_id uuid not null references public.world_explorer_publications(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,publication_id)
);

alter table public.world_explorer_learning_packs enable row level security;
alter table public.world_explorer_learning_questions enable row level security;
alter table public.world_explorer_learning_jobs enable row level security;
alter table public.world_explorer_learning_attempts enable row level security;
alter table public.world_explorer_learning_responses enable row level security;
alter table public.world_explorer_bookmarks enable row level security;

revoke all on public.world_explorer_learning_packs,public.world_explorer_learning_questions,
 public.world_explorer_learning_jobs,public.world_explorer_learning_attempts,
 public.world_explorer_learning_responses,public.world_explorer_bookmarks
 from public,anon,authenticated;
grant select on public.world_explorer_learning_packs to anon,authenticated;
grant select on public.world_explorer_learning_attempts,public.world_explorer_learning_responses to authenticated;
grant select,insert,delete on public.world_explorer_bookmarks to authenticated;

create policy we_packs_public_read on public.world_explorer_learning_packs
for select to anon,authenticated using (
 (status='ready'
  and exists(select 1 from public.world_explorer_publications p
    where p.id=publication_id and p.is_visible)
  and exists(select 1 from public.world_explorer_settings s
    where s.id=1 and s.enabled and s.learning_enabled))
 or exists(select 1 from public.profiles profile where profile.id=(select auth.uid())
      and profile.role='admin' and profile.approved)
);
create policy we_attempts_owner_read on public.world_explorer_learning_attempts
for select to authenticated using(user_id=(select auth.uid()));
create policy we_responses_owner_read on public.world_explorer_learning_responses
for select to authenticated using (
 exists(select 1 from public.world_explorer_learning_attempts a
  where a.id=attempt_id and a.user_id=(select auth.uid()))
);
create policy we_bookmarks_owner_read on public.world_explorer_bookmarks
for select to authenticated using(user_id=(select auth.uid()));
create policy we_bookmarks_owner_insert on public.world_explorer_bookmarks
for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(
 select 1 from public.world_explorer_publications p where p.id=publication_id and p.is_visible)
);
create policy we_bookmarks_owner_delete on public.world_explorer_bookmarks
for delete to authenticated using(user_id=(select auth.uid()));

-- New publications are queued without blocking the existing hourly generator.
create or replace function public.we_queue_new_publication()
returns trigger language plpgsql security definer set search_path='' as $f$
begin
 insert into public.world_explorer_learning_jobs(publication_id)
 values(new.id) on conflict(publication_id) do nothing;
 return new;
end $f$;
revoke all on function public.we_queue_new_publication() from public,anon,authenticated;
drop trigger if exists we_publication_learning_queue on public.world_explorer_publications;
create trigger we_publication_learning_queue after insert on public.world_explorer_publications
for each row execute function public.we_queue_new_publication();

-- Non-sensitive public question projection: answer_key never leaves the protected table.
create or replace function public.we_get_learning_questions(p_publication_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare v_pack public.world_explorer_learning_packs%rowtype;
declare v_questions jsonb;
begin
 if not exists(select 1 from public.world_explorer_settings
     where id=1 and enabled and learning_enabled) then
   return jsonb_build_object('status','disabled','questions','[]'::jsonb);
 end if;
 select lp.* into v_pack from public.world_explorer_learning_packs lp
 join public.world_explorer_publications pub on pub.id=lp.publication_id
 where lp.publication_id=p_publication_id and lp.status='ready' and pub.is_visible
 order by lp.version desc limit 1;
 if not found then return jsonb_build_object('status','pending','questions','[]'::jsonb); end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',q.id,'question_type',q.question_type,'skill',q.skill,
  'stem_en',q.stem_en,'stem_vi',q.stem_vi,'options',q.options,
  'points',q.points,'order_index',q.order_index
 ) order by q.order_index),'[]'::jsonb)
 into v_questions from public.world_explorer_learning_questions q
 where q.learning_pack_id=v_pack.id and q.validation_status='verified';
 return jsonb_build_object('status','ready','pack_id',v_pack.id,
   'version',v_pack.version,'question_count',v_pack.question_count,
   'vocabulary',v_pack.vocabulary,'grammar',v_pack.grammar,'questions',v_questions);
end $f$;
revoke all on function public.we_get_learning_questions(uuid) from public,anon,authenticated;
grant execute on function public.we_get_learning_questions(uuid) to anon,authenticated;

create or replace function public.we_start_learning_attempt(p_pack_id uuid)
returns uuid language plpgsql security definer set search_path='' as $f$
declare v_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'LOGIN_REQUIRED'; end if;
 if not exists(select 1 from public.world_explorer_learning_packs lp
    join public.world_explorer_publications p on p.id=lp.publication_id
    join public.world_explorer_settings s on s.id=1
    where lp.id=p_pack_id and lp.status='ready' and p.is_visible and s.enabled and s.learning_enabled)
 then raise exception 'LEARNING_PACK_NOT_READY'; end if;
 insert into public.world_explorer_learning_attempts(user_id,learning_pack_id)
 values((select auth.uid()),p_pack_id) returning id into v_id;
 return v_id;
end $f$;
revoke all on function public.we_start_learning_attempt(uuid) from public,anon,authenticated;
grant execute on function public.we_start_learning_attempt(uuid) to authenticated;

-- Feedback is an intentional self-study feature, not an exam anti-cheating service.
-- The public can ask to check a bounded answer, but never SELECT protected answer keys.
create or replace function public.we_submit_learning_answer(
 p_question_id uuid,p_answer jsonb,p_attempt_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare q public.world_explorer_learning_questions%rowtype;
declare v_status text;
declare v_match jsonb;
declare v_value text;
declare v_expected text;
declare v_correct boolean:=false;
declare v_points numeric:=0;
declare v_count integer:=0;
declare v_total integer:=0;
declare v_existing public.world_explorer_learning_responses%rowtype;
declare v_pair record;
begin
 if p_answer is null or length(p_answer::text)>1200 then raise exception 'INVALID_ANSWER'; end if;
 select lq.* into q from public.world_explorer_learning_questions lq
 join public.world_explorer_learning_packs lp on lp.id=lq.learning_pack_id
 join public.world_explorer_publications pub on pub.id=lp.publication_id
 join public.world_explorer_settings s on s.id=1
 where lq.id=p_question_id and lq.validation_status='verified' and lp.status='ready'
   and pub.is_visible and s.enabled and s.learning_enabled;
 if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
 if p_attempt_id is not null then
   select a.status into v_status from public.world_explorer_learning_attempts a
   where a.id=p_attempt_id and a.user_id=(select auth.uid()) and a.learning_pack_id=q.learning_pack_id;
   if not found then raise exception 'ACCESS_DENIED'; end if;
   select * into v_existing from public.world_explorer_learning_responses
     where attempt_id=p_attempt_id and question_id=p_question_id;
   if found then
     return jsonb_build_object('correct',v_existing.is_correct,'earned',v_existing.points,
       'max_points',q.points,'answer_key',q.answer_key,'explanation_en',q.explanation_en,
       'explanation_vi',q.explanation_vi,'evidence',q.evidence,'already_submitted',true);
   end if;
   if v_status <> 'in_progress' then raise exception 'ATTEMPT_ALREADY_COMPLETED'; end if;
 end if;
 if q.question_type='matching' then
   if jsonb_typeof(p_answer)='object' then
     for v_pair in select key,value from jsonb_each_text(q.answer_key->'pairs') loop
       v_total:=v_total+1;
       if p_answer->>v_pair.key=v_pair.value then v_count:=v_count+1; end if;
     end loop;
     if v_total>0 then v_points:=round(q.points*v_count/v_total,2); end if;
     v_correct:=v_total>0 and v_count=v_total;
   end if;
 else
   if jsonb_typeof(p_answer)='string' then
     v_value:=lower(btrim(trim(both '"' from p_answer::text)));
     v_value:=regexp_replace(v_value,'[[:space:]]+',' ','g');
     v_value:=regexp_replace(v_value,'[.,!?;:]+$','');
     select exists(select 1 from jsonb_array_elements_text(q.answer_key->'accepted') t(value)
       where regexp_replace(lower(btrim(value)),'[.,!?;:]+$','')=v_value)
     into v_correct;
     if v_correct then v_points:=q.points; end if;
   end if;
 end if;
 if p_attempt_id is not null then
   insert into public.world_explorer_learning_responses(attempt_id,question_id,answer,is_correct,points)
   values(p_attempt_id,p_question_id,p_answer,v_correct,v_points)
   on conflict(attempt_id,question_id) do nothing;
 end if;
 return jsonb_build_object('correct',v_correct,'earned',v_points,
   'max_points',q.points,'answer_key',q.answer_key,
   'explanation_en',q.explanation_en,'explanation_vi',q.explanation_vi,
   'evidence',q.evidence,'already_submitted',false);
end $f$;
revoke all on function public.we_submit_learning_answer(uuid,jsonb,uuid)
 from public,anon,authenticated;
grant execute on function public.we_submit_learning_answer(uuid,jsonb,uuid) to anon,authenticated;

create or replace function public.we_complete_learning_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare a public.world_explorer_learning_attempts%rowtype;
declare v_score numeric;declare v_max numeric;declare v_done integer;
begin
 select * into a from public.world_explorer_learning_attempts
 where id=p_attempt_id and user_id=(select auth.uid());
 if not found then raise exception 'ACCESS_DENIED'; end if;
 select coalesce(sum(points),0),count(*) into v_score,v_done
 from public.world_explorer_learning_responses where attempt_id=p_attempt_id;
 select coalesce(sum(points),0) into v_max from public.world_explorer_learning_questions
 where learning_pack_id=a.learning_pack_id and validation_status='verified';
 if a.status='in_progress' then
   update public.world_explorer_learning_attempts set
     status='completed',score=v_score,max_score=v_max,completed_at=now()
   where id=p_attempt_id;
 else v_score:=a.score;v_max:=a.max_score;end if;
 return jsonb_build_object('score',v_score,'max_score',v_max,'answered',v_done,
   'completed',true,'attempt_id',p_attempt_id);
end $f$;
revoke all on function public.we_complete_learning_attempt(uuid) from public,anon,authenticated;
grant execute on function public.we_complete_learning_attempt(uuid) to authenticated;

create or replace function public.we_queue_learning_regeneration(p_publication_id uuid)
returns boolean language plpgsql security definer set search_path='' as $f$
declare v_version integer;
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid())
      and p.role='admin' and p.approved) then raise exception 'ACCESS_DENIED'; end if;
 if not exists(select 1 from public.world_explorer_publications where id=p_publication_id)
 then raise exception 'ARTICLE_NOT_FOUND'; end if;
 select coalesce(max(version),0)+1 into v_version
 from public.world_explorer_learning_packs where publication_id=p_publication_id;
 insert into public.world_explorer_learning_jobs(publication_id,requested_version,status,attempts,last_error,updated_at)
 values(p_publication_id,v_version,'pending',0,null,now())
 on conflict(publication_id) do update set
  requested_version=excluded.requested_version,status='pending',attempts=0,
  last_error=null,locked_until=null,updated_at=now(),completed_at=null;
 return true;
end $f$;
revoke all on function public.we_queue_learning_regeneration(uuid) from public,anon,authenticated;
grant execute on function public.we_queue_learning_regeneration(uuid) to authenticated;

-- Backfill recent published articles without modifying their article text.
insert into public.world_explorer_learning_jobs(publication_id)
 select p.id from public.world_explorer_publications p where p.is_visible
 order by p.published_at desc limit 120
on conflict(publication_id) do nothing;
