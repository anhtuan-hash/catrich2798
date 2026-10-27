-- Normalize whitespace consistently when preventing duplicate ownership of a teacher's
-- attendance sessions across multiple report recipients.
create unique index if not exists bes_learning_teacher_session_name_normalized_once
on public.bes_learning_report_class_bindings (
  head_id,report_kind,class_id,
  lower(regexp_replace(btrim(attendance_teacher_name),'\s+',' ','g'))
)
where nullif(btrim(attendance_teacher_name),'') is not null;
