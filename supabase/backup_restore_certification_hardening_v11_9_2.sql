-- Brian backup/restore certification hardening v11.9.2

create or replace function public.bes_v1099_snapshot_tables(p_scope text)
returns text[]
language sql
immutable
set search_path = pg_catalog, public
as $function$
select case lower(coalesce(p_scope,'collaboration'))
  when 'work' then array[
    'work_hub_items','work_hub_comments','work_hub_activity','work_hub_notifications'
  ]
  when 'knowledge' then array[
    'resource_categories','resource_items','resource_smart_metadata',
    'resource_collections','resource_collection_items','resource_comments',
    'resource_favorites','resource_saved_searches','resource_user_state'
  ]
  when 'assessment' then array[
    'assessment_taxonomy_terms','assessment_bundles','assessment_bundle_versions',
    'assessment_items','assessment_item_versions','assessment_blueprints',
    'assessment_tests','assessment_test_items','assessment_exam_batches',
    'assessment_practice_sets','assessment_practice_items',
    'assessment_practice_share_tokens','assessment_practice_attempts',
    'assessment_practice_responses'
  ]
  when 'automation' then array[
    'automation_rules','automation_runs','automation_events','automation_cloud_jobs',
    'automation_digest_preferences','automation_delivery_log'
  ]
  else array[
    'collaboration_spaces','collaboration_members','collaboration_threads',
    'collaboration_comments','content_versions','permission_overrides'
  ]
end
$function$;

create or replace function public.bes_v1099_create_snapshot(
  p_label text,
  p_scope text default 'collaboration',
  p_retention_days integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  sid uuid;
  tbl text;
  rows jsonb;
  payload jsonb='{}'::jsonb;
  total integer=0;
  uid uuid=auth.uid();
begin
  if not public.bes_v1099_is_leader(uid) then raise exception 'leader permission required'; end if;
  if to_regclass('public.backup_snapshots') is null then raise exception 'backup_snapshots is unavailable'; end if;

  insert into public.backup_snapshots(
    owner_id,label,scope,status,item_count,snapshot_data,created_by,expires_at,metadata
  )
  values(
    uid,
    left(coalesce(nullif(trim(p_label),''),p_scope||' snapshot'),240),
    lower(coalesce(p_scope,'collaboration')),
    'creating',
    0,
    '{}'::jsonb,
    uid,
    now()+make_interval(days=>greatest(1,least(365,p_retention_days))),
    jsonb_build_object('application_version','11.9.2','server_side',true)
  )
  returning id into sid;

  foreach tbl in array public.bes_v1099_snapshot_tables(p_scope) loop
    if to_regclass('public.'||tbl) is null then continue; end if;

    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select * from public.%I) t',
      tbl
    ) into rows;

    payload:=payload||jsonb_build_object(tbl,coalesce(rows,'[]'::jsonb));
    total:=total+jsonb_array_length(coalesce(rows,'[]'::jsonb));

    if to_regclass('public.backup_items') is not null then
      execute format(
        'insert into public.backup_items(snapshot_id,entity_type,entity_id,payload)
         select $1,$2,coalesce(value->>''id'',''''),value from jsonb_array_elements($3)'
      )
      using sid,tbl,coalesce(rows,'[]'::jsonb);
    end if;
  end loop;

  update public.backup_snapshots
  set status='ready',
      item_count=total,
      snapshot_data=payload,
      checksum=encode(extensions.digest(payload::text,'sha256'),'hex'),
      closed_at=now(),
      updated_at=now()
  where id=sid;

  return sid;
exception when others then
  if sid is not null then
    update public.backup_snapshots
    set status='failed',
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('error',sqlerrm),
        updated_at=now()
    where id=sid;
  end if;
  raise;
end
$function$;

create or replace function public.bes_v1099_restore_snapshot(
  p_snapshot uuid,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $function$
declare
  snap record;
  tbl text;
  rows jsonb;
  cols text;
  updates text;
  pk_cols text;
  pk_names text[];
  count_rows integer;
  result jsonb='[]'::jsonb;
  reg regclass;
begin
  if not public.bes_v1099_is_leader(auth.uid()) then raise exception 'leader permission required'; end if;

  select * into snap
  from public.backup_snapshots
  where id=p_snapshot and status='ready'
  for update;

  if snap.id is null then raise exception 'snapshot not found or not ready'; end if;

  if coalesce(snap.checksum,'')<>
     encode(extensions.digest(coalesce(snap.snapshot_data,'{}'::jsonb)::text,'sha256'),'hex')
  then
    raise exception 'snapshot checksum mismatch';
  end if;

  for tbl,rows in select key,value from jsonb_each(snap.snapshot_data) loop
    count_rows:=case when jsonb_typeof(rows)='array' then jsonb_array_length(rows) else 0 end;
    reg:=to_regclass('public.'||tbl);

    select array_agg(a.attname order by u.ord),
           string_agg(format('%I',a.attname),',' order by u.ord)
    into pk_names,pk_cols
    from pg_constraint c
    join unnest(c.conkey) with ordinality u(attnum,ord) on true
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
    where c.contype='p' and c.conrelid=reg;

    result:=result||jsonb_build_array(jsonb_build_object(
      'table',tbl,'count',count_rows,'dry_run',p_dry_run,
      'restorable',reg is not null and pk_cols is not null
    ));

    if p_dry_run
       or count_rows=0
       or not(tbl=any(public.bes_v1099_snapshot_tables(snap.scope)))
       or reg is null
       or pk_cols is null
    then continue; end if;

    select
      string_agg(format('%I',column_name),',' order by ordinal_position),
      string_agg(
        case when column_name=any(pk_names) then null else format('%1$I=excluded.%1$I',column_name) end,
        ',' order by ordinal_position
      )
    into cols,updates
    from information_schema.columns
    where table_schema='public'
      and table_name=tbl
      and is_generated='NEVER'
      and identity_generation is null;

    if cols is null then continue; end if;

    if updates is null or trim(updates)='' then
      execute format(
        'insert into public.%1$I (%2$s)
         select %2$s from jsonb_populate_recordset(null::public.%1$I,$1)
         on conflict (%3$s) do nothing',
        tbl,cols,pk_cols
      ) using rows;
    else
      execute format(
        'insert into public.%1$I (%2$s)
         select %2$s from jsonb_populate_recordset(null::public.%1$I,$1)
         on conflict (%3$s) do update set %4$s',
        tbl,cols,pk_cols,updates
      ) using rows;
    end if;
  end loop;

  if not p_dry_run then
    update public.backup_snapshots
    set restore_count=coalesce(restore_count,0)+1,last_restored_at=now(),updated_at=now()
    where id=p_snapshot;
  end if;

  return jsonb_build_object('snapshot_id',p_snapshot,'dry_run',p_dry_run,'tables',result);
end
$function$;
