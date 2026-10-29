-- BRIAN Photo Story / judging system (private data, service-only API)
create table if not exists public.bes_judging_sessions (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null unique references public.bes_slideshow_albums(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  rubric jsonb not null default '[{"id":"creativity","label":"Tính sáng tạo","weight":30},{"id":"theme","label":"Bám sát chủ đề","weight":25},{"id":"art","label":"Bố cục và thẩm mỹ","weight":25},{"id":"message","label":"Thông điệp tác phẩm","weight":20}]'::jsonb,
  snapshot jsonb not null default '[]'::jsonb,
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.bes_judging_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bes_judging_sessions(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  submitted_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bes_judging_invites_session_idx on public.bes_judging_invites(session_id);
create table if not exists public.bes_judging_scores (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.bes_judging_invites(id) on delete cascade,
  slide_id uuid not null references public.bes_slideshow_slides(id) on delete restrict,
  criteria jsonb not null,
  total numeric(5,2) not null check (total between 0 and 100),
  comment text not null default '' check (char_length(comment) <= 800),
  updated_at timestamptz not null default now(),
  unique(invite_id,slide_id)
);
create index if not exists bes_judging_scores_invite_idx on public.bes_judging_scores(invite_id);
alter table public.bes_judging_sessions enable row level security;
alter table public.bes_judging_invites enable row level security;
alter table public.bes_judging_scores enable row level security;
-- No browser data API access. All access is server-side, with token or Admin auth checks.
revoke all on public.bes_judging_sessions, public.bes_judging_invites, public.bes_judging_scores from anon, authenticated;
grant all on public.bes_judging_sessions, public.bes_judging_invites, public.bes_judging_scores to service_role;
-- Lock image inventory once judging opens. Keep submitted results auditable.
create or replace function public.bes_judging_protect_inventory()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'bes_slideshow_albums' then
    if exists (select 1 from public.bes_judging_sessions j where j.album_id=old.id and j.status in ('open','closed')) then
      raise exception 'Album is locked by judging session';
    end if;
  else
    if exists (select 1 from public.bes_judging_sessions j where j.album_id=old.album_id and j.status in ('open','closed')) then
      raise exception 'Artwork inventory is locked by judging session';
    end if;
  end if;
  return old;
end;
$$;
revoke all on function public.bes_judging_protect_inventory() from public, anon, authenticated;
drop trigger if exists bes_judging_slide_guard on public.bes_slideshow_slides;
create trigger bes_judging_slide_guard before update or delete on public.bes_slideshow_slides
for each row execute function public.bes_judging_protect_inventory();
drop trigger if exists bes_judging_album_guard on public.bes_slideshow_albums;
create trigger bes_judging_album_guard before delete on public.bes_slideshow_albums
for each row execute function public.bes_judging_protect_inventory();
