-- Configurable BRIAN Halloween 2026 result cutoff & release. QRvote closes separately.
create table if not exists public.bes_halloween_awards_schedule_2026 (
  album_id uuid primary key references public.bes_slideshow_albums(id),
  vote_close_at timestamptz not null default '2026-10-30 08:15:00+00',
  announce_at timestamptz not null default '2026-10-30 08:20:00+00',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint halloween_schedule_order check (announce_at >= vote_close_at)
);
alter table public.bes_halloween_awards_schedule_2026 enable row level security;
revoke all on public.bes_halloween_awards_schedule_2026 from anon,authenticated;
grant select,insert,update on public.bes_halloween_awards_schedule_2026 to service_role;
insert into public.bes_halloween_awards_schedule_2026 (album_id,vote_close_at,announce_at)
values (
 'e1fc3295-2c5d-4e05-8538-b9a7aeef5a67',
 '2026-10-30 08:15:00+00',
 '2026-10-30 08:20:00+00'
)
on conflict (album_id) do nothing;
