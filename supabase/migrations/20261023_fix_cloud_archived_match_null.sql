-- Ensure absent student codes/names evaluate to false, not NULL,
-- so unrelated records in backups are retained.
create or replace function public.bes_cloud_archived_match_v1(
  p_item jsonb, p_ids text[], p_codes text[], p_names text[]
) returns boolean language sql immutable set search_path = '' as $fn$
 select case when jsonb_typeof(p_item) <> 'object' then false else
   coalesce(coalesce(p_item->>'studentId', p_item->>'student_id', p_item->>'studentRef',
     p_item->>'student_ref', p_item->>'rosterStudentId', p_item->>'id', '') = any(p_ids),false)
   or (
     p_item ?| array['fullName','full_name','studentName','rosterStudentId','student_ref','code']
     and (
       coalesce(nullif(pg_catalog.regexp_replace(pg_catalog.lower(coalesce(p_item->>'code','')), '[^a-z0-9]', '', 'g'),'') = any(p_codes),false)
       or coalesce(nullif(pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(
           coalesce(p_item->>'fullName',p_item->>'full_name',p_item->>'studentName','')),
           '[[:space:]]+', ' ', 'g')),'') = any(p_names),false)
     )
   )
 end
$fn$;
revoke all on function public.bes_cloud_archived_match_v1(jsonb,text[],text[],text[]) from public, anon, authenticated;