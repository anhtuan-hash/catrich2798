-- Brian v11.7.0 · Question Bank review lifecycle
alter table public.assessment_items drop constraint if exists assessment_items_status_check;
alter table public.assessment_items
  add constraint assessment_items_status_check
  check (status = any(array['draft'::text,'review'::text,'approved'::text,'retired'::text,'archived'::text]));

alter table public.assessment_items drop constraint if exists assessment_items_visibility_check;
alter table public.assessment_items
  add constraint assessment_items_visibility_check
  check (visibility = any(array['personal'::text,'department'::text]));
