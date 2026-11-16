begin;
create table public.museum_p2_worksheets (
 session_id uuid not null references public.museum_live_sessions(id) on delete restrict,
 group_id uuid not null references public.gcp_groups(id) on delete restrict,
 form text not null check (form in ('I1-A','I1-B','B1','B2','B3','C1','C2','C2-score','C3-share','C3-answer','C3-score','D1','D2','E1','E3','E4','I2-A','I2-B','I3')),
 slot text not null default '' check (slot ~ '^[A-Z0-9_-]{0,20}$'),
 values jsonb not null check (jsonb_typeof(values)='object' and octet_length(values::text)<18000),
 snapshot jsonb check (snapshot is null or (form='C3-share' and octet_length(snapshot::text)<115000)),
 version integer not null default 1 check (version>0),
 updated_at timestamptz not null default now(),
 primary key (session_id,group_id,form,slot)
);
alter table public.museum_p2_worksheets enable row level security;
revoke all on public.museum_p2_worksheets from public,anon,authenticated;
grant select,insert,update on public.museum_p2_worksheets to service_role;
create trigger museum_completed_readonly
 before insert or update or delete on public.museum_p2_worksheets
 for each row execute function public.museum_block_frozen_changes('session');
commit;
