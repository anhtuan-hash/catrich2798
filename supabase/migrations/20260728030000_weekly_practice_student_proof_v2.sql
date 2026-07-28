-- Brian English Studio: weekly practice student identity, 45-minute lock and proof image v2

alter table public.weekly_practice_items
  alter column collect_results set default true;

update public.weekly_practice_items
set collect_results = true,
    duration_minutes = greatest(duration_minutes, 45)
where collect_results = false or duration_minutes < 45;

alter table public.weekly_practice_results
  add column if not exists proof_path text not null default '';

alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_class_allowed;
alter table public.weekly_practice_results
  add constraint weekly_practice_result_class_allowed
  check (class_code in (
    '10.1','10.2','10.3','10.4','10.5','10.6','10.7','10.8','10.9','10.10','10.11','10.12',
    '11.1','11.2','11.3','11.4','11.5','11.6',
    '12.1','12.2','12.3','12.4','12.5','12.6','12.7','12.8','12.9'
  )) not valid;

alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_minimum_duration;
alter table public.weekly_practice_results
  add constraint weekly_practice_result_minimum_duration
  check (duration_seconds is not null and duration_seconds >= 2700) not valid;

alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_proof_required;
alter table public.weekly_practice_results
  add constraint weekly_practice_result_proof_required
  check (char_length(proof_path) between 1 and 500) not valid;

create index if not exists weekly_practice_results_student_lookup_idx
  on public.weekly_practice_results (practice_id, class_code, student_name, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'weekly-practice-proofs',
  'weekly-practice-proofs',
  false,
  3145728,
  array['image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Students may upload only PNG proof images under a published practice UUID prefix.
drop policy if exists "Public can upload weekly practice proof" on storage.objects;
create policy "Public can upload weekly practice proof"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'weekly-practice-proofs'
  and exists (
    select 1
    from public.weekly_practice_items item
    where item.id::text = split_part(name, '/', 1)
      and item.status = 'published'
      and item.collect_results = true
  )
);

-- Proof images are private; only Admin/TTCM publishers may view or delete them.
drop policy if exists "Publishers can read weekly practice proof" on storage.objects;
create policy "Publishers can read weekly practice proof"
on storage.objects
for select
to authenticated
using (bucket_id = 'weekly-practice-proofs' and public.can_publish_department());

drop policy if exists "Publishers can delete weekly practice proof" on storage.objects;
create policy "Publishers can delete weekly practice proof"
on storage.objects
for delete
to authenticated
using (bucket_id = 'weekly-practice-proofs' and public.can_publish_department());

-- Replace the guest result policy with mandatory identity, allowed class, 45-minute duration and proof path checks.
drop policy if exists "Public can submit enabled weekly practice results" on public.weekly_practice_results;
create policy "Public can submit enabled weekly practice results"
on public.weekly_practice_results
for insert
to anon, authenticated
with check (
  char_length(btrim(student_name)) between 2 and 120
  and class_code in (
    '10.1','10.2','10.3','10.4','10.5','10.6','10.7','10.8','10.9','10.10','10.11','10.12',
    '11.1','11.2','11.3','11.4','11.5','11.6',
    '12.1','12.2','12.3','12.4','12.5','12.6','12.7','12.8','12.9'
  )
  and duration_seconds >= 2700
  and char_length(proof_path) between 1 and 500
  and proof_path like practice_id::text || '/%'
  and exists (
    select 1
    from public.weekly_practice_items item
    where item.id = practice_id
      and item.status = 'published'
      and item.collect_results = true
  )
);

comment on column public.weekly_practice_results.proof_path is
  'Private PNG completion proof uploaded to the weekly-practice-proofs bucket.';
