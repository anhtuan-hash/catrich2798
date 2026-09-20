-- Brian public surface hardening v11.9.2 · Homeroom Portal

create or replace function public.bes_homeroom_hash_legacy_pins()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_generated jsonb := '{}'::jsonb;
begin
  if new.payload ? 'pins' then
    select coalesce(
      jsonb_object_agg(
        e.key,
        encode(extensions.digest(trim(coalesce(e.value #>> '{}','')),'sha256'),'hex')
      ),
      '{}'::jsonb
    )
    into v_generated
    from jsonb_each(coalesce(new.payload->'pins','{}'::jsonb)) e;

    new.payload := jsonb_set(
      new.payload,
      '{pinHashes}',
      v_generated || coalesce(new.payload->'pinHashes','{}'::jsonb),
      true
    ) - 'pins';
  end if;

  return new;
end;
$function$;

revoke execute on function public.bes_homeroom_hash_legacy_pins() from public;
revoke execute on function public.bes_homeroom_hash_legacy_pins() from anon;
revoke execute on function public.bes_homeroom_hash_legacy_pins() from authenticated;
grant execute on function public.bes_homeroom_hash_legacy_pins() to service_role;

drop trigger if exists trg_bes_homeroom_hash_legacy_pins on public.bes_homeroom_portals;
create trigger trg_bes_homeroom_hash_legacy_pins
before insert or update of payload
on public.bes_homeroom_portals
for each row
execute function public.bes_homeroom_hash_legacy_pins();

update public.bes_homeroom_portals p
set payload = jsonb_set(
    p.payload,
    '{pinHashes}',
    coalesce((
      select jsonb_object_agg(
        e.key,
        encode(extensions.digest(trim(coalesce(e.value #>> '{}','')),'sha256'),'hex')
      )
      from jsonb_each(coalesce(p.payload->'pins','{}'::jsonb)) e
    ),'{}'::jsonb) || coalesce(p.payload->'pinHashes','{}'::jsonb),
    true
  ) - 'pins',
  updated_at=now()
where p.payload ? 'pins';

create or replace function public.get_homeroom_portal(
  p_code text,
  p_role text,
  p_student_code text default '',
  p_pin text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_attempt public.bes_homeroom_portal_attempts%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_role text := lower(trim(coalesce(p_role,'')));
  v_student_ref text := left(trim(coalesce(p_student_code,'')),120);
  v_view jsonb;
  v_hash text;
  v_expected_hash text;
  v_max_attempts integer := 5;
  v_lock_minutes integer := 15;
  v_session_minutes integer := 30;
  v_next_failed integer;
  v_rate_limit integer;
begin
  if v_role not in ('parent','student','subject') then
    return jsonb_build_object('ok',false,'message','Vai trò không hợp lệ.');
  end if;

  if length(v_code) not between 6 and 16 then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  v_rate_limit := case when v_role='subject' then 300 else 120 end;
  if not public.app_public_rate_limit_allow(
    'homeroom_portal_get',
    v_role||':'||v_code||':'||v_student_ref||':'||coalesce(inet_client_addr()::text,'unknown'),
    v_rate_limit,
    900
  ) then
    return jsonb_build_object('ok',false,'message','Có quá nhiều yêu cầu. Vui lòng thử lại sau.');
  end if;

  select * into v_portal
  from public.bes_homeroom_portals
  where case
    when v_role='parent' then upper(parent_code)=v_code
    when v_role='student' then upper(student_code)=v_code
    else upper(subject_code)=v_code
  end
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  v_max_attempts := greatest(3,least(10,coalesce(nullif(v_portal.payload->'meta'->>'maxFailedAttempts','')::integer,5)));
  v_lock_minutes := greatest(5,least(1440,coalesce(nullif(v_portal.payload->'meta'->>'lockMinutes','')::integer,15)));
  v_session_minutes := greatest(10,least(240,coalesce(nullif(v_portal.payload->'meta'->>'sessionMinutes','')::integer,30)));

  if v_role='subject' then
    v_view := v_portal.payload->'subjectView';
  else
    select * into v_attempt
    from public.bes_homeroom_portal_attempts
    where portal_id=v_portal.id
      and reader_role=v_role
      and student_ref=v_student_ref;

    if v_attempt.locked_until is not null and v_attempt.locked_until>now() then
      return jsonb_build_object(
        'ok',false,'locked',true,'lockedUntil',v_attempt.locked_until,
        'message','Cổng tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.'
      );
    end if;

    v_hash := encode(extensions.digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
    v_expected_hash := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');

    if v_student_ref='' or v_expected_hash='' or v_expected_hash<>v_hash then
      v_next_failed := coalesce(v_attempt.failed_count,0)+1;

      insert into public.bes_homeroom_portal_attempts(
        portal_id,reader_role,student_ref,failed_count,locked_until,last_attempt_at,ip_address
      )
      values(
        v_portal.id,v_role,v_student_ref,v_next_failed,
        case when v_next_failed>=v_max_attempts then now()+make_interval(mins=>v_lock_minutes) else null end,
        now(),inet_client_addr()
      )
      on conflict(portal_id,reader_role,student_ref) do update set
        failed_count=excluded.failed_count,
        locked_until=excluded.locked_until,
        last_attempt_at=now(),
        ip_address=inet_client_addr();

      return jsonb_build_object(
        'ok',false,
        'remainingAttempts',greatest(0,v_max_attempts-v_next_failed),
        'locked',v_next_failed>=v_max_attempts,
        'message',case
          when v_next_failed>=v_max_attempts then 'Cổng đã tạm khóa do nhập sai nhiều lần.'
          else 'Mã học sinh hoặc PIN không đúng.'
        end
      );
    end if;

    insert into public.bes_homeroom_portal_attempts(
      portal_id,reader_role,student_ref,failed_count,locked_until,last_attempt_at,last_success_at,ip_address
    )
    values(v_portal.id,v_role,v_student_ref,0,null,now(),now(),inet_client_addr())
    on conflict(portal_id,reader_role,student_ref) do update set
      failed_count=0,locked_until=null,last_attempt_at=now(),last_success_at=now(),ip_address=inet_client_addr();

    if v_role='parent' then
      v_view := v_portal.payload->'parentViews'->v_student_ref;
    else
      v_view := v_portal.payload->'studentViews'->v_student_ref;
    end if;
  end if;

  if v_view is null then return jsonb_build_object('ok',false,'message','Không tìm thấy dữ liệu phù hợp.'); end if;

  return jsonb_build_object(
    'ok',true,'role',v_role,'workspaceId',v_portal.workspace_id,
    'sessionExpiresAt',now()+make_interval(mins=>v_session_minutes),'view',v_view
  );
end;
$function$;

create or replace function public.acknowledge_homeroom_notice(
  p_code text,p_role text,p_student_code text,p_pin text,p_notice_id text,p_reader_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_role text := lower(trim(coalesce(p_role,'')));
  v_student_ref text := left(trim(coalesce(p_student_code,'')),120);
  v_hash text := encode(extensions.digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
  v_expected text;
  v_notice_id text := left(trim(coalesce(p_notice_id,'')),160);
  v_reader_name text := left(trim(regexp_replace(coalesce(p_reader_name,''),'[[:cntrl:]]','','g')),120);
  v_attempt public.bes_homeroom_portal_attempts%rowtype;
begin
  if v_role not in ('parent','student') or v_notice_id='' then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  if not public.app_public_rate_limit_allow(
    'homeroom_notice_ack',
    v_role||':'||v_code||':'||v_student_ref||':'||coalesce(inet_client_addr()::text,'unknown'),
    60,3600
  ) then
    return jsonb_build_object('ok',false,'message','Có quá nhiều yêu cầu. Vui lòng thử lại sau.');
  end if;

  select * into v_portal
  from public.bes_homeroom_portals
  where (v_role='parent' and upper(parent_code)=v_code)
     or (v_role='student' and upper(student_code)=v_code)
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  select * into v_attempt
  from public.bes_homeroom_portal_attempts
  where portal_id=v_portal.id and reader_role=v_role and student_ref=v_student_ref;

  if v_attempt.locked_until is not null and v_attempt.locked_until>now() then
    return jsonb_build_object('ok',false,'message','Cổng đang tạm khóa. Vui lòng thử lại sau.');
  end if;

  v_expected := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');
  if v_expected='' or v_expected<>v_hash then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  insert into public.bes_homeroom_portal_receipts(
    portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,read_at
  )
  values(
    v_portal.id,v_portal.owner_id,v_portal.workspace_id,v_notice_id,
    v_student_ref,v_role,v_reader_name,now()
  )
  on conflict(portal_id,notice_id,student_ref,reader_role) do update set
    reader_name=excluded.reader_name,read_at=now();

  return jsonb_build_object('ok',true,'readAt',now());
end;
$function$;

create or replace function public.submit_homeroom_portal_response(
  p_code text,p_role text,p_student_code text,p_pin text,p_notice_id text default '',
  p_message text default '',p_reader_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_role text := lower(trim(coalesce(p_role,'')));
  v_student_ref text := left(trim(coalesce(p_student_code,'')),120);
  v_hash text := encode(extensions.digest(trim(coalesce(p_pin,'')),'sha256'),'hex');
  v_expected text;
  v_id uuid;
  v_message text := left(trim(regexp_replace(coalesce(p_message,''),'[[:cntrl:]]','','g')),4000);
  v_notice_id text := left(trim(coalesce(p_notice_id,'')),160);
  v_reader_name text := left(trim(regexp_replace(coalesce(p_reader_name,''),'[[:cntrl:]]','','g')),120);
  v_attempt public.bes_homeroom_portal_attempts%rowtype;
begin
  if v_role not in ('parent','student') then
    return jsonb_build_object('ok',false,'message','Vai trò không được phép phản hồi.');
  end if;
  if length(v_message)<2 then
    return jsonb_build_object('ok',false,'message','Nội dung phản hồi quá ngắn.');
  end if;

  if not public.app_public_rate_limit_allow(
    'homeroom_portal_response',
    v_role||':'||v_code||':'||v_student_ref||':'||coalesce(inet_client_addr()::text,'unknown'),
    30,3600
  ) then
    return jsonb_build_object('ok',false,'message','Có quá nhiều phản hồi. Vui lòng thử lại sau.');
  end if;

  select * into v_portal
  from public.bes_homeroom_portals
  where (v_role='parent' and upper(parent_code)=v_code)
     or (v_role='student' and upper(student_code)=v_code)
  limit 1;

  if v_portal.id is null then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  select * into v_attempt
  from public.bes_homeroom_portal_attempts
  where portal_id=v_portal.id and reader_role=v_role and student_ref=v_student_ref;

  if v_attempt.locked_until is not null and v_attempt.locked_until>now() then
    return jsonb_build_object('ok',false,'message','Cổng đang tạm khóa. Vui lòng thử lại sau.');
  end if;

  v_expected := coalesce(v_portal.payload->'pinHashes'->>v_student_ref,'');
  if v_expected='' or v_expected<>v_hash then
    return jsonb_build_object('ok',false,'message','Thông tin xác thực không đúng.');
  end if;

  insert into public.bes_homeroom_portal_responses(
    portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,message
  )
  values(
    v_portal.id,v_portal.owner_id,v_portal.workspace_id,v_notice_id,
    v_student_ref,v_role,v_reader_name,v_message
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'createdAt',now());
end;
$function$;

create or replace function public.submit_homeroom_subject_feedback(
  p_code text,p_student_code text,p_subject text,p_teacher_name text,p_teacher_email text default '',
  p_period text default '',p_level text default 'Bình thường',p_comment text default '',p_action text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $function$
declare
  v_portal public.bes_homeroom_portals%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  v_student_ref text := left(trim(coalesce(p_student_code,'')),120);
  v_student_exists boolean := false;
  v_id uuid;
  v_subject text := left(trim(regexp_replace(coalesce(p_subject,''),'[[:cntrl:]]','','g')),120);
  v_teacher_name text := left(trim(regexp_replace(coalesce(p_teacher_name,''),'[[:cntrl:]]','','g')),120);
  v_teacher_email text := left(lower(trim(coalesce(p_teacher_email,''))),254);
  v_period text := left(trim(regexp_replace(coalesce(p_period,''),'[[:cntrl:]]','','g')),120);
  v_level text := left(trim(regexp_replace(coalesce(p_level,'Bình thường'),'[[:cntrl:]]','','g')),40);
  v_comment text := left(trim(regexp_replace(coalesce(p_comment,''),'[[:cntrl:]]','','g')),4000);
  v_action text := left(trim(regexp_replace(coalesce(p_action,''),'[[:cntrl:]]','','g')),2000);
begin
  if length(v_code) not between 6 and 16 then
    return jsonb_build_object('ok',false,'message','Mã giáo viên bộ môn không hợp lệ.');
  end if;

  if not public.app_public_rate_limit_allow(
    'homeroom_subject_feedback',
    v_code||':'||v_student_ref||':'||coalesce(inet_client_addr()::text,'unknown'),
    60,3600
  ) then
    return jsonb_build_object('ok',false,'message','Có quá nhiều phản hồi. Vui lòng thử lại sau.');
  end if;

  select * into v_portal from public.bes_homeroom_portals where upper(subject_code)=v_code limit 1;
  if v_portal.id is null then
    return jsonb_build_object('ok',false,'message','Mã giáo viên bộ môn không hợp lệ.');
  end if;

  select exists(
    select 1
    from jsonb_array_elements(coalesce(v_portal.payload->'subjectView'->'students','[]'::jsonb)) student
    where coalesce(student->>'code',student->>'id')=v_student_ref
  ) into v_student_exists;

  if not v_student_exists then
    return jsonb_build_object('ok',false,'message','Không tìm thấy học sinh trong lớp.');
  end if;
  if v_subject='' or v_teacher_name='' or v_comment='' then
    return jsonb_build_object('ok',false,'message','Thiếu môn học, tên giáo viên hoặc nội dung nhận xét.');
  end if;
  if v_teacher_email<>'' and v_teacher_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok',false,'message','Email giáo viên không hợp lệ.');
  end if;

  insert into public.bes_homeroom_feedback_inbox(
    portal_id,owner_id,workspace_id,student_ref,subject,teacher_name,teacher_email,
    period,level,comment,suggested_action,status
  )
  values(
    v_portal.id,v_portal.owner_id,v_portal.workspace_id,v_student_ref,
    v_subject,v_teacher_name,v_teacher_email,v_period,v_level,v_comment,v_action,'pending'
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'message','Đã gửi nhận xét đến GVCN.');
end;
$function$;

revoke execute on function public.get_homeroom_portal(text,text,text,text) from public;
grant execute on function public.get_homeroom_portal(text,text,text,text) to anon, authenticated, service_role;
revoke execute on function public.acknowledge_homeroom_notice(text,text,text,text,text,text) from public;
grant execute on function public.acknowledge_homeroom_notice(text,text,text,text,text,text) to anon, authenticated, service_role;
revoke execute on function public.submit_homeroom_portal_response(text,text,text,text,text,text,text) from public;
grant execute on function public.submit_homeroom_portal_response(text,text,text,text,text,text,text) to anon, authenticated, service_role;
revoke execute on function public.submit_homeroom_subject_feedback(text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_homeroom_subject_feedback(text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;
