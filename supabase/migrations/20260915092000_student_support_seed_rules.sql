begin;

insert into public.student_support_rules (
  code, name, description, rule_type, enabled, scope, config, version
)
values
  (
    'absence_3_in_14d',
    'Vắng 3 lần trong 14 ngày',
    'Tạo cảnh báo khi số lần vắng đã chuẩn hóa đạt ít nhất 3 trong 14 ngày gần nhất.',
    'attendance_count',
    true,
    'school',
    '{"status":"absent","threshold":3,"days":14}'::jsonb,
    1
  ),
  (
    'absence_5_in_30d',
    'Vắng 5 lần trong 30 ngày',
    'Tạo cảnh báo khi số lần vắng đã chuẩn hóa đạt ít nhất 5 trong 30 ngày gần nhất.',
    'attendance_count',
    true,
    'school',
    '{"status":"absent","threshold":5,"days":30}'::jsonb,
    1
  ),
  (
    'late_3_in_14d',
    'Đi trễ 3 lần trong 14 ngày',
    'Tạo cảnh báo khi số lần đi trễ đạt ít nhất 3 trong 14 ngày gần nhất.',
    'attendance_count',
    true,
    'school',
    '{"status":"late","threshold":3,"days":14}'::jsonb,
    1
  ),
  (
    'grade_drop_3v3_1point',
    'Điểm giảm 1,0 giữa hai nhóm 3 bài',
    'So sánh trung bình 3 điểm gần nhất với 3 điểm liền trước; chỉ cảnh báo khi giảm từ 1,0 điểm trở lên.',
    'grade_window_drop',
    false,
    'school',
    '{"sampleSize":3,"delta":1}'::jsonb,
    1
  ),
  (
    'incomplete_3_in_14d',
    'Ba ghi nhận chưa hoàn thành nhiệm vụ trong 14 ngày',
    'Tạo cảnh báo khi có ít nhất 3 ghi nhận TASK_INCOMPLETE trong 14 ngày gần nhất.',
    'observation_count',
    false,
    'school',
    '{"observationType":"TASK_INCOMPLETE","threshold":3,"days":14}'::jsonb,
    1
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  rule_type = excluded.rule_type,
  enabled = excluded.enabled,
  scope = excluded.scope,
  config = excluded.config,
  version = excluded.version,
  updated_at = now();

commit;
