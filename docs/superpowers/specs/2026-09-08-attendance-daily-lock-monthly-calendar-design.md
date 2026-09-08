# Attendance Daily Lock & Monthly Calendar Design

## Goal
Make extra-class attendance date-aware: each class can be confirmed only once per Vietnam calendar day, multi-teacher classes require selecting the actual teacher for that session, and Admin can review attendance in a month calendar.

## Scope
- Applies to the existing extra-class attendance module only.
- Admin remains the only role allowed to confirm/delete attendance.
- Existing authoritative grade 10–12 gifted-teacher assignments remain the teacher source; website account registrations are never used as teacher choices.
- Existing delete-session behavior remains: deleting a session unlocks that class/date for a replacement attendance record.

## Data model
`bes_extra_attendance_sessions` gains `attendance_date date not null`. The date is interpreted in `Asia/Ho_Chi_Minh` and is distinct from `checked_at`, which remains the exact server confirmation timestamp.

A unique constraint/index on `(class_id, attendance_date)` is the authoritative lock. This prevents duplicate attendance for the same class/date even across multiple browsers or concurrent clicks.

The existing `teacher_name` field becomes the immutable snapshot of the teacher actually selected for that session. `teacher_id` may remain null because assignment teachers do not need website accounts.

## Attendance confirmation RPC
`bes_confirm_extra_class_attendance` accepts:
- `p_class_id uuid`
- `p_attendance_date date`
- `p_teacher_name text`
- `p_absent_member_keys text[]`
- `p_note text`

Server rules:
1. Admin permission required.
2. Date cannot be in the future relative to `Asia/Ho_Chi_Minh`.
3. The class must be active.
4. The selected teacher must belong to `bes_extra_class_teachers` for that class. A single-teacher class may still send that one teacher explicitly.
5. A class/date pair may be confirmed only once. The unique database lock is the final authority.
6. `checked_at` uses server time; `attendance_date` stores the chosen date; teacher name is snapshotted into the session.

## Quick attendance UI
- Add a date picker, defaulting to today in Vietnam time.
- Permit today and past dates; reject future dates.
- For a class with one assigned teacher, show that teacher as fixed for the selected date.
- For a class with multiple assigned teachers, show a required `Giáo viên dạy hôm nay` selector containing only teachers assigned to that class.
- When a session already exists for the chosen class/date, lock student checkboxes and notes and replace the confirm action with a clear `Đã chốt DD/MM/YYYY` state showing teacher and exact confirmation time.
- Deleting that session from History removes the lock for that class/date.

## Monthly calendar UI
Add a fourth tab `Lịch tháng`.

Controls:
- class selector
- month picker

Calendar:
- 7-column Monday–Sunday layout
- each confirmed day shows a check mark, teacher name, and `present/total`
- today receives a distinct marker
- blank days have no attendance state
- clicking a confirmed date opens the existing history detail for that session

Monthly data must be queried by class and month boundaries, not by the existing 400-session list limit.

## Error handling
- Duplicate class/date: show `Lớp này đã được điểm danh ngày DD/MM/YYYY.`
- Future date: show a Vietnam-date validation message.
- Invalid teacher: show `Giáo viên không thuộc phân công của lớp.`
- Stale roster validation remains unchanged.

## Testing
Regression contract must assert:
- `attendance_date` exists and has a class/date unique lock.
- confirm RPC accepts date and teacher and validates assigned teacher.
- UI has date picker, `Giáo viên dạy hôm nay`, locked-state copy, and `Lịch tháng`.
- website teacher-account RPC remains absent from the attendance UI.
- monthly calendar queries are class/month scoped.

Run Frontend Build, Critical E2E, Supabase guard workflows, apply migration to production, verify schema/index/RPC, merge, then verify Vercel production.