-- Live audience external screen URL configured by approved Supabase editors.
-- RLS on bes_slideshow_albums already restricts writes to approved staff.
alter table public.bes_slideshow_albums
  add column if not exists audience_screen_url text not null default '';

alter table public.bes_slideshow_albums
  drop constraint if exists bes_slideshow_albums_audience_screen_url_ck;
alter table public.bes_slideshow_albums
  add constraint bes_slideshow_albums_audience_screen_url_ck
  check (
    audience_screen_url = ''
    or (
      length(audience_screen_url) <= 500
      and audience_screen_url ~ '^https://(www[.])?qrvote[.]org/c/[a-z0-9-]+/screen$'
    )
  );

-- Preconfigure the exact existing QRvote screen provided by the organizer.
-- Use the verified album UUID, not the mistaken 73hb72 vs 73bb72 slug.
update public.bes_slideshow_albums
set audience_screen_url = 'https://qrvote.org/c/halloween-showcase-ry29/screen',
    updated_at = now()
where id = 'e1fc3295-2c5d-4e05-8538-b9a7aeef5a67'
  and audience_screen_url = '';

comment on column public.bes_slideshow_albums.audience_screen_url is
  'Optional external QRvote screen iframe URL; configured only by an authorized editor. QRvote retains full control and may disallow embedding.';
