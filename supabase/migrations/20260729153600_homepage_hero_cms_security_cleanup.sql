begin;

-- Compatibility cleanup if an earlier Hero CMS draft was applied before the
-- public/draft tables were separated.
drop policy if exists "Public can read published homepage Hero" on public.homepage_hero_settings;
drop policy if exists "Department leaders can insert homepage Hero" on public.homepage_hero_settings;
drop policy if exists "Department leaders can update homepage Hero" on public.homepage_hero_settings;

revoke all on public.homepage_hero_settings from anon;

commit;
