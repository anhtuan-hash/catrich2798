-- Halloween Showcase 2026. Already applied on production xpkbgqdlfonsinriggmj.
-- Run idempotently on additional environments; service-role access only.
create table if not exists public.bes_halloween_awards_2026 (
  album_id uuid primary key references public.bes_slideshow_albums(id),
  status text not null default 'frozen' check (status in ('frozen','published')),
  cutoff_at timestamptz not null default '2026-10-30 08:15:00+00',
  snapshot jsonb not null,
  judge_count integer not null,
  vote_count bigint not null,
  frozen_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.bes_halloween_awards_2026 enable row level security;
revoke all on public.bes_halloween_awards_2026 from anon,authenticated;
grant select,insert,update on public.bes_halloween_awards_2026 to service_role;
create or replace function public.bes_halloween_awards_2026_guard()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if tg_op='INSERT' then
  if clock_timestamp()<timestamptz '2026-10-30 08:15:00+00'
     then raise exception 'Awards cutoff has not passed'; end if;
  if new.status<>'frozen' or jsonb_typeof(new.snapshot)<>'array'
     or jsonb_array_length(new.snapshot)<>18 or new.judge_count<3
     then raise exception 'Invalid awards snapshot'; end if;
  return new;
 end if;
 if old.status<>'frozen' or new.status<>'published'
  or new.snapshot is distinct from old.snapshot
  or new.judge_count is distinct from old.judge_count
  or new.vote_count is distinct from old.vote_count
  or new.album_id is distinct from old.album_id
  or new.cutoff_at is distinct from old.cutoff_at
  or new.frozen_at is distinct from old.frozen_at
  then raise exception 'Frozen award rankings cannot be edited'; end if;
 new.published_at:=clock_timestamp();
 return new;
end $fn$;
revoke all on function public.bes_halloween_awards_2026_guard() from public,anon,authenticated;
create or replace trigger bes_halloween_awards_2026_guard
before insert or update on public.bes_halloween_awards_2026
for each row execute function public.bes_halloween_awards_2026_guard();
