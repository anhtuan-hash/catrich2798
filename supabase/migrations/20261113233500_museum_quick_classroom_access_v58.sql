-- Quick classroom access is only a per-assignment optional feature.
-- Never store the default password in clear text or expose the verifier via Data API.
create table if not exists public.gcp_quick_access (
 assignment_id uuid primary key references public.gcp_assignments(id) on delete cascade,
 enabled boolean not null default false,
 password_salt text not null check (length(password_salt)=32 and password_salt ~ '^[0-9a-f]+$'),
 password_hash text not null check (length(password_hash)=64 and password_hash ~ '^[0-9a-f]+$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.gcp_quick_access enable row level security;
revoke all on table public.gcp_quick_access from public, anon, authenticated;
grant select,insert,update,delete on public.gcp_quick_access to service_role;
-- Distinguish quick sessions so disabling access invalidates them without affecting
-- passcode-based sessions, group drafts, submitted reviews, or QR handles.
alter table public.gcp_sessions
 add column if not exists auth_method text not null default 'private'
 check (auth_method in ('private','quick'));
