-- Lesson Check · atomic save of activity, embed content, and required focus tag.
-- Existing API remains untouched for backward compatibility. A failure rolls back
-- all steps rather than leaving a new record with no focus classification.
create or replace function public.lesson_check_save_activity_v2(
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
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_saved_id uuid;
begin
  if not public.lesson_check_is_leader() then
    raise exception 'Only TTCM/Admin can save activities';
  end if;
  if coalesce(p_focus_area,'') not in ('vocabulary','grammar','reading','listening','speaking','mixed')
  then raise exception 'Choose a learning focus before saving'; end if;

  v_saved_id := public.lesson_check_save_activity(
    target_activity,p_title,p_book_key,p_grade,p_unit_no,p_unit_title,
    p_lesson_key,p_lesson_title,p_class_label,p_activity_type,p_notes,
    p_source_host,p_embed_kind,p_embed_code
  );
  update public.lesson_check_activities
    set focus_area=p_focus_area
    where id=v_saved_id;
  if not found then raise exception 'Activity was not found after save'; end if;
  return v_saved_id;
end;
$$;
revoke all on function public.lesson_check_save_activity_v2(
 uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text,text
) from public,anon;
grant execute on function public.lesson_check_save_activity_v2(
 uuid,text,text,smallint,smallint,text,text,text,text,text,text,text,text,text,text
) to authenticated;
