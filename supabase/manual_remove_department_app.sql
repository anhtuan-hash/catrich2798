-- One-time cleanup after removing the Tổ chuyên môn app.
-- Run in Supabase SQL Editor only after backing up any data you still need.

begin;

-- Remove storage policies tied only to the deleted app.
drop policy if exists "Users can upload their own department evidence" on storage.objects;
drop policy if exists "Users can read their own department evidence" on storage.objects;
drop policy if exists "Department publishers can read every evidence file" on storage.objects;
drop policy if exists "Approved users can read department request attachments" on storage.objects;
drop policy if exists "Users can update their own department evidence" on storage.objects;
drop policy if exists "Users can delete their own department evidence" on storage.objects;

-- Remove app tables.
drop table if exists public.department_submissions cascade;
drop table if exists public.department_submission_requests cascade;
drop table if exists public.department_workspace_snapshots cascade;

-- Remove files and the private bucket.
delete from storage.objects where bucket_id = 'department-evidence';
delete from storage.buckets where id = 'department-evidence';

commit;
