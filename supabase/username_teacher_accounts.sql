-- Brian English Studio: username-based teacher accounts
-- Run once in Supabase SQL Editor. Safe to run repeatedly.

alter table public.profiles
  add column if not exists username text,
  add column if not exists contact_email text,
  add column if not exists auth_mode text not null default 'email',
  add column if not exists must_change_password boolean not null default false;

update public.profiles
set auth_mode = case
  when email ilike '%@accounts.brianenglish.studio' then 'username'
  else coalesce(nullif(auth_mode, ''), 'email')
end
where auth_mode is null
   or auth_mode = ''
   or email ilike '%@accounts.brianenglish.studio';

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create unique index if not exists profiles_contact_email_lower_unique
  on public.profiles (lower(contact_email))
  where contact_email is not null and btrim(contact_email) <> '';

create index if not exists profiles_auth_mode_idx
  on public.profiles (auth_mode);

comment on column public.profiles.username is
  'Stable login name for Admin-created teacher accounts. Authentication uses a hidden internal email.';
comment on column public.profiles.contact_email is
  'Teacher-provided contact/recovery email. This does not change the username used to sign in.';
comment on column public.profiles.auth_mode is
  'Account login mode: email, google, or username.';
comment on column public.profiles.must_change_password is
  'When true, Brian shows a blocking password-change prompt after sign-in.';

-- The Edge Function writes these fields with the service role. Existing profile
-- triggers and RLS policies are left untouched to avoid changing current accounts.
