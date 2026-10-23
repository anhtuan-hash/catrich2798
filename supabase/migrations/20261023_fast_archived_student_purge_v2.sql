-- Fast, field-aware scrub: bypass expensive recursive traversal of
-- 19 historical class backups (~10 MB expanded JSON).
create or replace function public.bes_cloud_archived_purge_fast_v2(
  p_doc jsonb, p_ids text[], p_codes text[], p_names text[]
) returns jsonb language plpgsql immutable set search_path = '' as $fn$
declare
  v_result jsonb := p_doc;
  v_key text;
  v_value jsonb;
  v_scrubbed jsonb;
begin
  if jsonb_typeof(p_doc) <> 'object' then return p_doc; end if;

  -- Large ID-indexed maps: remove one key per student, no tree walk.
  foreach v_key in array array['studentRecords'] loop
    v_value := v_result->v_key;
    if jsonb_typeof(v_value) = 'object' then
      v_result := pg_catalog.jsonb_set(v_result, array[v_key], v_value - p_ids, true);
    end if;
  end loop;

  -- Large attendance map: date/session -> student ID -> value.
  v_value := v_result->'attendance';
  if jsonb_typeof(v_value) = 'object' then
    select coalesce(pg_catalog.jsonb_object_agg(key,
      case when jsonb_typeof(value)='object' then value - p_ids else value end
    ), '{}'::jsonb) into v_scrubbed
    from pg_catalog.jsonb_each(v_value) as e(key,value);
    v_result := pg_catalog.jsonb_set(v_result,'{attendance}',v_scrubbed,true);
  end if;

  v_value := v_result->'students';
  if jsonb_typeof(v_value) = 'array' then
    select coalesce(pg_catalog.jsonb_agg(value order by ord),'[]'::jsonb) into v_scrubbed
    from pg_catalog.jsonb_array_elements(v_value) with ordinality e(value,ord)
    where not public.bes_cloud_archived_match_v1(value,p_ids,p_codes,p_names);
    v_result := pg_catalog.jsonb_set(v_result,'{students}',v_scrubbed,true);
  end if;

  -- Existing backups contain complete class snapshots. Rewrite ONLY the
  -- snapshot fields that may contain student data; retain backup metadata.
  v_value := v_result->'backups';
  if jsonb_typeof(v_value) = 'array' then
    select coalesce(pg_catalog.jsonb_agg(
      case when jsonb_typeof(value->'snapshot')='object' then
        pg_catalog.jsonb_set(value,'{snapshot}',
          public.bes_cloud_archived_purge_fast_v2(value->'snapshot',p_ids,p_codes,p_names),true)
      else value end order by ord
    ),'[]'::jsonb) into v_scrubbed
    from pg_catalog.jsonb_array_elements(v_value) with ordinality e(value,ord);
    v_result := pg_catalog.jsonb_set(v_result,'{backups}',v_scrubbed,true);
  end if;

  -- Most other collections are flat records keyed by studentId/student_ref.
  -- Retain unrelated rows without recursively walking their full contents.
  foreach v_key in array array[
    'conductRecords','learningRecords','incidents','supportPlans',
    'subjectFeedback','parentContacts','alerts','attachments','records',
    'competitionEvents','correctionRequests','scheduledMessages',
    'auditLogs','announcements','reminders'
  ] loop
    v_value := v_result->v_key;
    if jsonb_typeof(v_value) = 'array' then
      select coalesce(pg_catalog.jsonb_agg(value order by ord),'[]'::jsonb)
        into v_scrubbed
      from pg_catalog.jsonb_array_elements(v_value) with ordinality e(value,ord)
      where not public.bes_cloud_archived_match_v1(value,p_ids,p_codes,p_names);
      v_result := pg_catalog.jsonb_set(v_result,array[v_key],v_scrubbed,true);
    end if;
  end loop;

  -- Conduct summaries and gradebook use nested rows; keep recursion scoped
  -- to these compact sections, not the multi-MB snapshots.
  foreach v_key in array array['conductWeekSummaries','learningGradebook','teams'] loop
    v_value := v_result->v_key;
    if v_value is not null and v_value <> 'null'::jsonb then
      v_result := pg_catalog.jsonb_set(v_result,array[v_key],
        public.bes_cloud_archived_purge_v1(v_value,p_ids,p_codes,p_names),true);
    end if;
  end loop;
  return v_result;
end;
$fn$;
revoke all on function public.bes_cloud_archived_purge_fast_v2(jsonb,text[],text[],text[]) from public, anon, authenticated;