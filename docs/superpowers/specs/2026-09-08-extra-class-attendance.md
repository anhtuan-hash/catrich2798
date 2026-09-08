# Extra Class Attendance Design

## Goal
Add an Admin-only attendance workspace for remedial classes (phụ đạo) and gifted-student enrichment classes (bồi dưỡng HSG), surfaced as an independent navigation tab immediately to the right of TTCM and explicitly unrelated to Homeroom/GVCN.

## UX
- Global navigation gets a standalone `Điểm danh` tab after `TTCM`.
- Opening it shows an attendance workspace with three areas: `Điểm danh nhanh`, `Quản lý lớp`, and `Lịch sử`.
- Admin imports extra-class rosters from Excel. Each row represents one student membership in one extra class and includes: class type, extra-class name, subject, teacher, student code, student full name, and regular school class.
- Quick attendance starts with every currently active member marked present. Admin only ticks absent students. Live counters show present/total and absent count.
- Attendance is persisted only when Admin presses `Xác nhận điểm danh`. The database stamps the attendance time with server time at insertion.
- History shows date/time, class, teacher, class type, totals and the absent-student list.

## Manual membership maintenance
After import, Admin can add or remove students manually from any extra class.

Removal is lifecycle-based rather than destructive:
- A removed student becomes inactive for future attendance.
- `left_at`, `removed_by`, and optional removal reason are stored.
- Old attendance sessions and records are immutable snapshots and continue to show the student exactly as recorded at that session.
- A previously removed student may be re-added later by creating/reactivating a current membership while preserving old attendance history.

Manual add supports either selecting/typing an existing school student identity or entering student code, full name and regular class directly. Duplicate active membership in the same extra class is rejected.

## Data model
- `bes_extra_classes`: remedial/gifted class metadata and assigned teacher.
- `bes_extra_class_members`: membership lifecycle with active flag, joined/left timestamps, actor fields and stable `member_key`.
- `bes_extra_attendance_sessions`: one confirmed attendance event, with server timestamp, actor and summary counts.
- `bes_extra_attendance_records`: immutable per-student snapshot for a session.

## Permissions
- Only approved Admin accounts may read/write the module through RLS and security-definer RPCs.
- Teachers and department heads do not gain attendance write access merely because they are assigned to an extra class.
- The teacher directory used by the importer/class editor is read through an Admin-guarded RPC.

## Integrity rules
- Attendance session counts must equal the number of active members at confirmation time.
- One record is written per active member in the same transaction as the session.
- `checked_at` is database-generated server time and is not supplied by the browser.
- Historical attendance records snapshot student code/name/regular class so later membership edits cannot rewrite history.
- Removing a member never cascades into attendance history.
