
-- Museum Lab private passcodes: encrypted recovery only for authenticated school admins.
-- An existing one-way hash cannot be reversed; legacy invitations remain unrecoverable
-- until their codes are explicitly rotated by the admin.
alter table public.gcp_invites add column if not exists secret_envelope text;
comment on column public.gcp_invites.secret_envelope is 'AES-256-GCM encrypted passcode; decrypt only in authenticated server admin routes';
revoke all on table public.gcp_invites from anon,authenticated;

create or replace function public.gcp_staff_issue_assignment(
 p_teacher uuid,p_reviewer uuid,p_school text,p_class text,p_title text,
 p_brief text,p_deadline timestamptz,p_tokens jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $gcp_issue$
declare a public.gcp_assignments; gid uuid; token jsonb;
 issued jsonb:='[]'::jsonb; seq integer:=0; label text;
begin
 if jsonb_typeof(p_tokens)<>'array' or jsonb_array_length(p_tokens) not between 1 and 12
   or pg_column_size(p_tokens)>12000 then raise exception 'invalid_group_count';end if;
 if p_deadline<now()+interval '1 hour' or p_deadline>now()+interval '120 days'
   then raise exception 'invalid_deadline';end if;
 if not (select enabled from public.gcp_settings where id=true) then
   raise exception 'creator_pass_disabled';end if;
 if not exists(select 1 from public.profiles p where p.id=p_teacher
     and p.approved=true and p.school=p_school
     and lower(p.role) in ('admin','teacher','department_head','ttcm','department-head','to_truong'))
    or (not exists(select 1 from public.profiles z where z.id=p_teacher
        and z.role='admin' and z.approved=true and z.school=p_school)
     and (not exists(select 1 from public.gcp_reviewer_grants g
        join public.profiles p on p.id=g.reviewer_id
       where g.reviewer_id=p_reviewer and g.school_scope=p_school
         and g.can_publish and g.active and p.approved and p.school=p_school)
       or p_teacher=p_reviewer)) then raise exception 'assignment_authority_denied';end if;
 insert into public.gcp_assignments(created_by,reviewer_id,school_scope,
  class_scope,title,brief,deadline_at)
 values(p_teacher,p_reviewer,p_school,p_class,p_title,p_brief,p_deadline)
 returning * into a;
 for token in select value from pg_catalog.jsonb_array_elements(p_tokens)
 loop
   if length(coalesce(token->>'handle','')) not between 16 and 80
     or length(coalesce(token->>'secret_hash',''))<>64
     or (token ? 'secret_envelope'
       and (length(coalesce(token->>'secret_envelope',''))<40
          or length(token->>'secret_envelope')>512))
     then raise exception 'invalid_group_token';end if;
   seq:=seq+1;
   label:='Nhóm '||lpad(seq::text,2,'0');
   insert into public.gcp_groups(assignment_id,label)
   values(a.id,label) returning id into gid;
   insert into public.gcp_drafts(group_id)values(gid);
   insert into public.gcp_invites(group_id,handle,secret_hash,secret_envelope,expires_at)
   values(gid,token->>'handle',token->>'secret_hash',token->>'secret_envelope',p_deadline);
   issued:=issued||pg_catalog.jsonb_build_array(
     pg_catalog.jsonb_build_object('groupId',gid,'label',label,'handle',token->>'handle')
   );
 end loop;
 return pg_catalog.jsonb_build_object('assignment',
  pg_catalog.jsonb_build_object('id',a.id,'title',a.title,'deadline_at',a.deadline_at),
  'groups',issued);
end; $gcp_issue$;
revoke all on function public.gcp_staff_issue_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb)
  from public,anon,authenticated;
grant execute on function public.gcp_staff_issue_assignment(uuid,uuid,text,text,text,text,timestamptz,jsonb)
  to service_role;

-- One transaction: either every group secret rotates or none do.
-- Handles stay unchanged, so previously printed QR codes remain valid.
create or replace function public.gcp_admin_rotate_assignment_passcodes(
 p_assignment uuid,p_actor uuid,p_school text,p_tokens jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $rotate$
declare
 assignment public.gcp_assignments;
 g record;
 token jsonb;
 n integer;
 touched integer;
begin
 select * into assignment from public.gcp_assignments where id=p_assignment for update;
 if assignment.id is null or assignment.archived_at is not null or assignment.status<>'active'
   then raise exception 'assignment_missing';end if;
 if assignment.school_scope<>p_school or assignment.created_by<>p_actor
   or not exists(select 1 from public.profiles p where p.id=p_actor
      and p.role='admin' and p.approved=true and p.school=p_school)
   then raise exception 'admin_required';end if;
 select count(*) into n from public.gcp_groups where assignment_id=p_assignment;
 if n<1 or n>12 or jsonb_typeof(p_tokens)<>'array'
    or jsonb_array_length(p_tokens)<>n or pg_column_size(p_tokens)>20000
   then raise exception 'invalid_group_count';end if;
 for g in
   select id from public.gcp_groups where assignment_id=p_assignment order by id for update
 loop
   select v.value into token from pg_catalog.jsonb_array_elements(p_tokens) v(value)
    where v.value->>'groupId'=g.id::text;
   if token is null or length(coalesce(token->>'secret_hash',''))<>64
      or length(coalesce(token->>'secret_envelope',''))<40
      or length(token->>'secret_envelope')>512
     then raise exception 'invalid_group_token';end if;
   if (select count(*) from pg_catalog.jsonb_array_elements(p_tokens) v(value)
       where v.value->>'groupId'=g.id::text)<>1
     then raise exception 'duplicate_group_token';end if;
   update public.gcp_invites set secret_hash=token->>'secret_hash',
     secret_envelope=token->>'secret_envelope',
     failed_attempts=0,locked_until=null
   where group_id=g.id and revoked_at is null;
   get diagnostics touched=row_count;
   if touched<>1 then raise exception 'invite_missing';end if;
   update public.gcp_sessions set revoked_at=now()
    where group_id=g.id and revoked_at is null;
 end loop;
 return pg_catalog.jsonb_build_object('updated',n,'assignmentId',p_assignment);
end; $rotate$;
revoke all on function public.gcp_admin_rotate_assignment_passcodes(uuid,uuid,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.gcp_admin_rotate_assignment_passcodes(uuid,uuid,text,jsonb)
  to service_role;
