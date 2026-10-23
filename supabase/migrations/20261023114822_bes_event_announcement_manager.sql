-- Supabase migration applied to ESL Brian production
-- bes_event_announcement_manager

create table if not exists public.bes_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 4 and 180),
 category text not null default 'general',
 summary text not null default '',
 description text not null default '',
 organizer text not null default 'Tổ Tiếng Anh THPT',
 school_year text not null default '2026-2027',
 event_start_at timestamptz not null,
 event_end_at timestamptz not null,
 display_start_at timestamptz not null,
 display_end_at timestamptz not null,
 timezone text not null default 'Asia/Ho_Chi_Minh',
 venue_type text not null default 'online' check (venue_type in ('online','offline','hybrid')),
 venue_name text not null default '',
 meeting_url text not null default '',
 meeting_code text not null default '',
 poster_path text,
 priority text not null default 'normal' check (priority in ('normal','important','urgent')),
 frequency text not null default 'once' check (frequency in ('once','daily','until_ack')),
 status text not null default 'draft' check (status in ('draft','published','cancelled','archived')),
 version integer not null default 1 check (version between 1 and 10000),
 created_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint bes_event_times_valid check (event_end_at > event_start_at and display_end_at > display_start_at)
);
create table if not exists public.bes_event_recipients(
 event_id uuid not null references public.bes_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
create table if not exists public.bes_event_receipts(
 event_id uuid not null,
 user_id uuid not null,
 event_version integer not null default 1,
 first_shown_at timestamptz,
 last_shown_at timestamptz,
 impression_count integer not null default 0 check (impression_count >= 0),
 detail_viewed_at timestamptz,
 acknowledged_at timestamptz,
 dismissed_at timestamptz,
 snooze_until timestamptz,
 hidden_until timestamptz,
 updated_at timestamptz not null default now(),
 primary key(event_id,user_id,event_version),
 foreign key (event_id,user_id) references public.bes_event_recipients(event_id,user_id) on delete cascade
);
create index if not exists bes_events_published_dates_idx on public.bes_events(status,display_start_at,display_end_at);
create index if not exists bes_event_recipients_user_idx on public.bes_event_recipients(user_id,event_id);
create index if not exists bes_event_receipts_user_idx on public.bes_event_receipts(user_id,event_id);
alter table public.bes_events enable row level security;
alter table public.bes_event_recipients enable row level security;
alter table public.bes_event_receipts enable row level security;
create policy "bes_events_admin_manage" on public.bes_events for all to authenticated
 using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "bes_events_recipient_read" on public.bes_events for select to authenticated
 using (
  status='published' and display_start_at <= now() and display_end_at > now()
  and exists (select 1 from public.bes_event_recipients r where r.event_id=id and r.user_id=(select auth.uid()))
 );
create policy "bes_recipients_admin_manage" on public.bes_event_recipients for all to authenticated
 using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "bes_recipients_self_read" on public.bes_event_recipients for select to authenticated
 using (user_id=(select auth.uid()));
create policy "bes_receipts_admin_read" on public.bes_event_receipts for select to authenticated
 using ((select public.is_admin()));
create policy "bes_receipts_self_read" on public.bes_event_receipts for select to authenticated
 using (user_id=(select auth.uid()));
create policy "bes_receipts_self_insert" on public.bes_event_receipts for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "bes_receipts_self_update" on public.bes_event_receipts for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select,insert,update,delete on public.bes_events to authenticated;
grant select,insert,update,delete on public.bes_event_recipients to authenticated;
grant select,insert,update on public.bes_event_receipts to authenticated;
create or replace function public.bes_publish_event(p_event_id uuid,p_recipients uuid[])
 returns public.bes_events language plpgsql security invoker set search_path=public,pg_temp
as $fn$
declare v_event public.bes_events;
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 if coalesce(array_length(p_recipients,1),0)=0 then raise exception 'At least one recipient required'; end if;
 select * into v_event from public.bes_events where id=p_event_id for update;
 if not found then raise exception 'Event does not exist'; end if;
 if v_event.status not in ('draft','published') then raise exception 'Cannot publish cancelled/archived event'; end if;
 delete from public.bes_event_recipients where event_id=p_event_id
   and not (user_id=any(p_recipients));
 insert into public.bes_event_recipients(event_id,user_id)
 select p_event_id,p.id from public.profiles p
 where p.id=any(p_recipients) and p.approved=true
 and p.role in ('admin','department_head','teacher')
 on conflict do nothing;
 if not exists(select 1 from public.bes_event_recipients where event_id=p_event_id) then
   raise exception 'No approved recipients';
 end if;
 update public.bes_events set status='published',published_at=coalesce(published_at,now()),
 updated_at=now(),updated_by=auth.uid() where id=p_event_id returning * into v_event;
 return v_event;
end $fn$;
revoke all on function public.bes_publish_event(uuid,uuid[]) from public,anon;
grant execute on function public.bes_publish_event(uuid,uuid[]) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('bes-event-assets','bes-event-assets',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy "bes_event_assets_admin_insert" on storage.objects for insert to authenticated
 with check (bucket_id='bes-event-assets' and (select public.is_admin()));
create policy "bes_event_assets_admin_update" on storage.objects for update to authenticated
 using (bucket_id='bes-event-assets' and (select public.is_admin()))
 with check (bucket_id='bes-event-assets' and (select public.is_admin()));
create policy "bes_event_assets_admin_delete" on storage.objects for delete to authenticated
 using (bucket_id='bes-event-assets' and (select public.is_admin()));
create policy "bes_event_assets_read" on storage.objects for select to authenticated
 using (
  bucket_id='bes-event-assets' and (
  (select public.is_admin()) or exists(
   select 1 from public.bes_events e
   join public.bes_event_recipients r on r.event_id=e.id
   where e.poster_path=name and e.status='published'
   and e.display_start_at <= now() and e.display_end_at>now()
   and r.user_id=(select auth.uid())
  ))
 );

