-- Three groups allow a distinct visitor for each round. The lesson has ten destinations.
create or replace function public.museum_issue_templated_assignment(
  p_teacher uuid,p_reviewer uuid,p_school text,p_class text,p_title text,
  p_brief text,p_deadline timestamptz,p_tokens jsonb,p_template text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_template is distinct from 'asean-in-three-frames'
    or jsonb_typeof(p_tokens) is distinct from 'array'
 then raise exception 'invalid_lesson_template'; end if;
 if jsonb_array_length(p_tokens) not between 3 and 10
 then raise exception 'invalid_group_count'; end if;
 result:=public.gcp_staff_issue_assignment(p_teacher,p_reviewer,p_school,p_class,p_title,p_brief,p_deadline,p_tokens);
 update public.gcp_assignments set lesson_template=p_template where id=(result#>>'{assignment,id}')::uuid;
 return jsonb_set(result,'{assignment,lesson_template}',to_jsonb(p_template));
end;
$$;
