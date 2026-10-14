-- Atomic and idempotent single-activity saves.
-- Additive only: existing activity RPCs, records, grants and content remain untouched.
create table if not exists public.lesson_check_save_receipts (
  actor_id uuid not null,
  request_id uuid not null,
  payload_hash text not null,
  activity_id uuid references public.lesson_check_activities(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(actor_id, request_id),
  constraint lesson_check_receipt_hash_length check(char_length(payload_hash)=32)
);
alter table public.lesson_check_save_receipts enable row level security;
revoke all on public.lesson_check_save_receipts from public, anon, authenticated;
create index if not exists lesson_check_save_receipts_activity_idx
 on public.lesson_check_save_receipts(activity_id);

create or replace function public.lesson_check_save_activity_reliable(
 p_request_id uuid,
 target_activity uuid,
 p_title text,
 p_book_key text,
 p_grade smallint,
 p_unit_no smallint,
 p_unit_title text,
 p_lesson_key text,
 p_lesson_title text,
 p_class_label text,
 p_activity_type text,
 p_notes text,
 p_source_host text,
 p_embed_kind text,
 p_embed_code text,
 p_focus_area text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
 who uuid := auth.uid();
 saved_id uuid;
 did_insert boolean;
 existing_hash text;
 fingerprint text;
begin
 if who is null or not public.lesson_check_is_leader() then
   raise exception 'Only TTCM/Admin can create or edit activities';
 end if;
 if p_request_id is null then raise exception 'Save request ID required'; end if;
 if p_focus_area is null or p_focus_area not in
 ('vocabulary','grammar','reading','listening','speaking','mixed') then
   raise exception 'A valid learning focus is required';
 end if;

 fingerprint := md5(jsonb_build_object(
 'target',target_activity,'title',p_title,'book',p_book_key,
 'grade',p_grade,'unit',p_unit_no,'unit_title',p_unit_title,
 'lesson_key',p_lesson_key,'lesson_title',p_lesson_title,
 'class',p_class_label,'type',p_activity_type,'notes',p_notes,
 'host',p_source_host,'kind',p_embed_kind,'embed',p_embed_code,
 'focus',p_focus_area
 )::text);

 -- The PK serializes concurrent retries. An ambiguous network failure cannot
 -- create a second activity when the same request key is retried.
 insert into public.lesson_check_save_receipts(actor_id,request_id,payload_hash)
 values(who,p_request_id,fingerprint)
 on conflict do nothing
 returning true into did_insert;

 if not coalesce(did_insert,false) then
   select payload_hash,activity_id into existing_hash,saved_id
   from public.lesson_check_save_receipts
   where actor_id=who and request_id=p_request_id;
   if existing_hash is distinct from fingerprint then
     raise exception 'Save request reused for different content; start a new save';
   end if;
   if saved_id is null then raise exception 'Previously saved activity is unavailable';
   end if;
   return saved_id;
 end if;

 -- Existing security-definer RPC performs the validated activity/content write.
 -- The focus update shares the same transaction, so failure rolls it all back.
 saved_id := public.lesson_check_save_activity(
   target_activity,p_title,p_book_key,p_grade,p_unit_no,p_unit_title,
   p_lesson_key,p_lesson_title,p_class_label,p_activity_type,p_notes,
   p_source_host,p_embed_kind,p_embed_code
 );
 update public.lesson_check_activities set focus_area=p_focus_area
 where id=saved_id;
 if not found then raise exception 'Saved activity is unavailable'; end if;
 update public.lesson_check_save_receipts
 set activity_id=saved_id where actor_id=who and request_id=p_request_id;
 return saved_id;
end; $$;
revoke all on function public.lesson_check_save_activity_reliable(
 uuid,uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text,text
) from public,anon;
grant execute on function public.lesson_check_save_activity_reliable(
 uuid,uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text,text
) to authenticated;
