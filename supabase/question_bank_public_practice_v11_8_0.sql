-- Brian v11.8.0 · Public tokenized Practice links and live item statistics.

alter table public.assessment_practice_attempts alter column learner_id drop not null;
alter table public.assessment_practice_attempts add column if not exists anonymous_session_id uuid;
alter table public.assessment_practice_attempts add column if not exists learner_label text not null default '';

create table if not exists public.assessment_practice_share_tokens(
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.assessment_practice_sets(id) on delete cascade,
  owner_id uuid not null,
  token_hash text not null unique,
  active boolean not null default true,
  expires_at timestamptz,
  max_attempts integer not null default 500 check (max_attempts between 1 and 100000),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.assessment_practice_share_tokens enable row level security;
drop policy if exists assessment_practice_share_owner on public.assessment_practice_share_tokens;
create policy assessment_practice_share_owner on public.assessment_practice_share_tokens for all
using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))))
with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

grant select,insert,update,delete on public.assessment_practice_share_tokens to authenticated;
revoke all on public.assessment_practice_share_tokens from anon;

create or replace function public.qb_create_practice_share(
  p_practice_id uuid,
  p_expires_at timestamptz default null,
  p_max_attempts integer default 500
)
returns table(token text, expires_at timestamptz, max_attempts integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_owner uuid;
  v_token text;
begin
  select owner_id into v_owner from public.assessment_practice_sets where id=p_practice_id;
  if v_owner is null then raise exception 'Practice set not found'; end if;
  if v_owner<>auth.uid() and not public.bes_v1093_is_leader(auth.uid()) then raise exception 'Forbidden'; end if;

  update public.assessment_practice_share_tokens set active=false where practice_id=p_practice_id and active=true;

  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.assessment_practice_share_tokens(practice_id,owner_id,token_hash,active,expires_at,max_attempts)
  values(p_practice_id,v_owner,md5(v_token),true,p_expires_at,greatest(1,least(coalesce(p_max_attempts,500),100000)));

  update public.assessment_practice_sets set status='published',updated_at=now() where id=p_practice_id;
  return query select v_token,p_expires_at,greatest(1,least(coalesce(p_max_attempts,500),100000));
end;
$$;

revoke execute on function public.qb_create_practice_share(uuid,timestamptz,integer) from public,anon;
grant execute on function public.qb_create_practice_share(uuid,timestamptz,integer) to authenticated;

create or replace function public.qb_disable_practice_share(p_practice_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.assessment_practice_sets where id=p_practice_id;
  if v_owner is null then return false; end if;
  if v_owner<>auth.uid() and not public.bes_v1093_is_leader(auth.uid()) then raise exception 'Forbidden'; end if;
  update public.assessment_practice_share_tokens set active=false where practice_id=p_practice_id and active=true;
  return true;
end;
$$;

revoke execute on function public.qb_disable_practice_share(uuid) from public,anon;
grant execute on function public.qb_disable_practice_share(uuid) to authenticated;

create or replace function public.qb_public_practice_get(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_practice public.assessment_practice_sets%rowtype;
  v_attempts bigint;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;

  select count(*) into v_attempts from public.assessment_practice_attempts where practice_id=v_share.practice_id and status='submitted';
  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  select * into v_practice from public.assessment_practice_sets where id=v_share.practice_id;
  if v_practice.id is null or v_practice.status<>'published' then return jsonb_build_object('ok',false,'error','unavailable'); end if;

  update public.assessment_practice_share_tokens set last_used_at=now() where id=v_share.id;

  return jsonb_build_object(
    'ok',true,
    'practice',jsonb_build_object(
      'id',v_practice.id,'title',v_practice.title,'grade',v_practice.grade,
      'schoolYear',v_practice.school_year,'settings',v_practice.settings
    ),
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'position',pi.position,'stem',i.stem,'options',i.options,
        'questionType',i.question_type,'cefr',i.cefr,'topic',i.topic,
        'bundleId',i.bundle_id,'bundleTitle',b.title,'bundleContext',b.context_text,
        'bundleInstructions',b.instructions
      ) order by pi.position)
      from public.assessment_practice_items pi
      join public.assessment_items i on i.id=pi.item_id
      left join public.assessment_bundles b on b.id=i.bundle_id
      where pi.practice_id=v_practice.id and i.status='approved'
    ),'[]'::jsonb)
  );
end;
$$;

revoke execute on function public.qb_public_practice_get(text) from public;
grant execute on function public.qb_public_practice_get(text) to anon,authenticated;

create or replace function public.qb_public_practice_submit(
  p_token text,
  p_session_id uuid,
  p_learner_label text,
  p_responses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_share public.assessment_practice_share_tokens%rowtype;
  v_attempt_id uuid;
  v_score numeric;
  v_max numeric;
  v_attempts bigint;
begin
  select * into v_share
  from public.assessment_practice_share_tokens
  where token_hash=md5(coalesce(p_token,'')) and active=true
  limit 1;

  if v_share.id is null then return jsonb_build_object('ok',false,'error','invalid_or_disabled'); end if;
  if v_share.expires_at is not null and v_share.expires_at<now() then return jsonb_build_object('ok',false,'error','expired'); end if;
  select count(*) into v_attempts from public.assessment_practice_attempts where practice_id=v_share.practice_id and status='submitted';
  if v_attempts>=v_share.max_attempts then return jsonb_build_object('ok',false,'error','attempt_limit'); end if;

  if p_session_id is null then p_session_id := gen_random_uuid(); end if;

  insert into public.assessment_practice_attempts(
    practice_id,learner_id,anonymous_session_id,learner_label,status,score,max_score,started_at,submitted_at,metadata
  )
  values(
    v_share.practice_id,auth.uid(),p_session_id,left(coalesce(p_learner_label,''),120),'submitted',
    0,0,now(),now(),jsonb_build_object('publicShare',true)
  )
  returning id into v_attempt_id;

  insert into public.assessment_practice_responses(
    attempt_id,item_id,selected_answer,is_correct,response_time_seconds
  )
  select
    v_attempt_id,pi.item_id,upper(left(coalesce(r.answer,''),1)),
    upper(left(coalesce(r.answer,''),1))=upper(left(i.correct_answer,1)),
    case when r.seconds is null then null else greatest(0,least(r.seconds,7200)) end
  from public.assessment_practice_items pi
  join public.assessment_items i on i.id=pi.item_id
  left join jsonb_to_recordset(coalesce(p_responses,'[]'::jsonb)) as r(item_id uuid,answer text,seconds integer)
    on r.item_id=pi.item_id
  where pi.practice_id=v_share.practice_id;

  select count(*) filter(where r.is_correct)::numeric,count(*)::numeric
  into v_score,v_max
  from public.assessment_practice_responses r
  where r.attempt_id=v_attempt_id;

  update public.assessment_practice_attempts
  set score=v_score,max_score=v_max,submitted_at=now()
  where id=v_attempt_id;

  update public.assessment_practice_share_tokens set last_used_at=now() where id=v_share.id;

  return jsonb_build_object(
    'ok',true,'attemptId',v_attempt_id,'score',v_score,'maxScore',v_max,
    'results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemId',i.id,'selectedAnswer',r.selected_answer,'isCorrect',r.is_correct,
        'correctAnswer',i.correct_answer,'explanation',i.explanation
      ) order by pi.position)
      from public.assessment_practice_items pi
      join public.assessment_items i on i.id=pi.item_id
      join public.assessment_practice_responses r on r.item_id=i.id and r.attempt_id=v_attempt_id
      where pi.practice_id=v_share.practice_id
    ),'[]'::jsonb)
  );
end;
$$;

revoke execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) from public;
grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to anon,authenticated;

create or replace function public.qb_refresh_stats_after_practice_responses()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_ids uuid[];
begin
  select array_agg(distinct item_id) into v_ids from new_rows;
  if v_ids is not null and array_length(v_ids,1)>0 then
    perform public.qb_recompute_item_statistics(v_ids);
  end if;
  return null;
end;
$$;

revoke execute on function public.qb_refresh_stats_after_practice_responses() from public,anon,authenticated;

drop trigger if exists trg_qb_refresh_stats_after_practice_responses on public.assessment_practice_responses;
create trigger trg_qb_refresh_stats_after_practice_responses
after insert on public.assessment_practice_responses
referencing new table as new_rows
for each statement execute function public.qb_refresh_stats_after_practice_responses();
