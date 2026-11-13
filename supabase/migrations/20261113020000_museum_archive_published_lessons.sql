-- Fix: previously an assignment with a published exhibition could not
-- be removed from the active lesson list, despite the Admin UI offering Delete.
-- Retain the published gallery and all audit/student records intact.
-- The operation is a soft archive (not a permanent delete).
create or replace function public.gcp_admin_archive_assignment(p_assignment uuid,p_actor uuid)
returns text language plpgsql security definer set search_path='' as $$
declare a public.gcp_assignments;
begin
 select * into a from public.gcp_assignments where id=p_assignment for update;
 if not found or a.archived_at is not null then raise exception 'assignment_missing';end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor and p.role='admin'
   and p.approved=true and trim(p.school)=a.school_scope) then raise exception 'admin_required';end if;
 -- Published exhibitions are independent Gallery records. Archiving a
 -- lesson must NEVER remove their rooms, assets or publication links.
 -- It only hides the lesson from active management and revokes group passes.
 update public.gcp_assignments set status='closed',archived_at=now(),archived_by=p_actor where id=a.id;
 update public.gcp_sessions set revoked_at=now()
  where revoked_at is null and group_id in (select id from public.gcp_groups where assignment_id=a.id);
 update public.gcp_invites set revoked_at=now()
  where revoked_at is null and group_id in (select id from public.gcp_groups where assignment_id=a.id);
 return 'archived';
end; $$;

-- Only the server-side service role may call this privileged, school-scoped RPC.
revoke all on function public.gcp_admin_archive_assignment(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.gcp_admin_archive_assignment(uuid,uuid) to service_role;
