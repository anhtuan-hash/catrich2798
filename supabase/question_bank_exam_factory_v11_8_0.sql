-- Brian v11.8.0 · Exam Factory persistence and balanced option order.

create table if not exists public.assessment_exam_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  blueprint_id uuid null references public.assessment_blueprints(id) on delete set null,
  title text not null,
  requested_count integer not null default 1,
  created_count integer not null default 0,
  max_overlap integer not null default 5,
  difficulty_tolerance numeric not null default 0.6,
  status text not null default 'draft' check (status in ('draft','complete','partial','archived')),
  settings jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessment_tests
  add column if not exists exam_batch_id uuid null references public.assessment_exam_batches(id) on delete set null;

create index if not exists assessment_exam_batches_owner_idx on public.assessment_exam_batches(owner_id,created_at desc);
create index if not exists assessment_tests_batch_idx on public.assessment_tests(exam_batch_id) where exam_batch_id is not null;

alter table public.assessment_exam_batches enable row level security;
drop policy if exists assessment_exam_batches_read on public.assessment_exam_batches;
create policy assessment_exam_batches_read on public.assessment_exam_batches for select
using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

drop policy if exists assessment_exam_batches_write on public.assessment_exam_batches;
create policy assessment_exam_batches_write on public.assessment_exam_batches for all
using (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))))
with check (owner_id=(select auth.uid()) or (select public.bes_v1093_is_leader((select auth.uid()))));

grant select,insert,update,delete on public.assessment_exam_batches to authenticated;

create or replace function public.qb_balanced_option_order(p_correct text, p_target integer)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare
  v_correct integer;
  v_target integer := ((coalesce(p_target,0) % 4) + 4) % 4;
  v_result integer[] := array[-1,-1,-1,-1];
  v_src integer;
  v_pos integer := 1;
begin
  v_correct := ascii(upper(left(coalesce(p_correct,'A'),1))) - ascii('A');
  if v_correct < 0 or v_correct > 3 then v_correct := 0; end if;
  v_result[v_target+1] := v_correct;
  foreach v_src in array array[0,1,2,3] loop
    if v_src <> v_correct then
      while v_pos <= 4 and v_result[v_pos] <> -1 loop v_pos := v_pos + 1; end loop;
      if v_pos <= 4 then
        v_result[v_pos] := v_src;
        v_pos := v_pos + 1;
      end if;
    end if;
  end loop;
  return to_jsonb(v_result);
end;
$$;

revoke execute on function public.qb_balanced_option_order(text,integer) from public,anon;
grant execute on function public.qb_balanced_option_order(text,integer) to authenticated,service_role;
