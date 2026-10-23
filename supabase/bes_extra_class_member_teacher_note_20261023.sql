-- Independent teacher notes per extra-class enrollment.
-- Safe to re-run: no student codes or other existing roster data are changed.
ALTER TABLE public.bes_extra_class_members
  ADD COLUMN IF NOT EXISTS teacher_note text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.bes_extra_class_members.teacher_note IS
  'Ghi chú tự do của giáo viên cho học sinh trong lớp phụ đạo/bồi dưỡng; tách biệt mã học sinh và ghi chú điểm danh.';
