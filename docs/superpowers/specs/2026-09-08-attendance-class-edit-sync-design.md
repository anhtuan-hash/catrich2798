# Attendance Class Editing and Sync Design

## Goal

Make `Quản lý lớp` the single authoritative place for Admins to edit current extra-class metadata and current student roster information, while keeping every already-confirmed attendance session immutable as a historical snapshot.

## Scope

Admins can edit the current class name, subject, grade level, teaching room, teaching time range, and scheduled weekdays. Admins can also edit a current student's student code, full name, and main-school class. Existing add/remove student and teacher-assignment flows remain available.

The change must synchronize current data across Quick Attendance, Monthly Calendar, Class Management, future attendance confirmations, and any report/query that resolves the current class or roster. Historical attendance sessions and records must not be rewritten when current class or student data changes.

## Historical Snapshot Rule

Confirmed or cancelled rows in `bes_extra_attendance_sessions` and their `bes_extra_attendance_records` are snapshots of what happened at that time.

Example: if a class used room A103 on 08/09/2026 and an Admin changes the current room to A205 on 09/09/2026, the 08/09/2026 history/report remains A103 while new attendance sessions default to A205.

The same rule applies to student code, student full name, and main-school class. A student's current roster data changes for future use, while existing attendance records retain their stored snapshot values.

## Source of Truth

`bes_extra_classes` becomes the authoritative source for current class scheduling metadata:

- `class_name`
- `subject`
- `grade_level`
- `room`
- `time_range`
- `weekdays`

The existing 2026–2027 hard-coded schedule catalog remains only as a bootstrap/fallback source for rows that have not yet been populated. After persisted class fields exist, runtime scheduling and room display must use the class row first.

`bes_extra_class_members` remains the authoritative source for the current roster:

- `student_code`
- `student_full_name`
- `school_class_name`
- `member_key`
- active/inactive membership state

## Scheduling Model

`weekdays` stores JavaScript weekday numbers as an integer array: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.

Runtime schedule resolution follows this order:

1. If `classRow.weekdays` contains valid weekday values, use it.
2. Otherwise, use the existing 2026–2027 catalog as a compatibility fallback.
3. If neither source yields a schedule, keep the class usable rather than hiding or disabling it.

Room resolution follows this order:

1. `classRow.room`
2. existing 2026–2027 catalog room fallback
3. empty string

Teaching time for an unconfirmed session defaults from `classRow.time_range`.

## Admin Editing UI

In `Quản lý lớp`, an Admin sees a dedicated `Thông tin lớp học` editing surface for the selected class. It supports:

- class name
- subject
- grade level
- room
- time range
- multi-select weekdays, including Monday through Sunday

The same management view exposes a `Sửa` action for active roster members. Student editing supports:

- student code
- full name
- main-school class

Saving either form refreshes the shared attendance data using the existing `loadAll()` flow so all current tabs immediately read the persisted values.

Non-Admin users may retain read access to the Management tab if their permissions allow it, but they must not see or execute these edit actions.

## Server-Side Authorization

UI hiding is not sufficient. Supabase must expose Admin-only RPCs for class and student edits.

### Class RPC

`bes_admin_update_extra_class(...)`

Validates the caller as an Admin, validates required fields, normalizes weekdays, updates only the current `bes_extra_classes` row, and updates `updated_by` / `updated_at`.

It must not update any historical attendance session or record.

### Student RPC

`bes_admin_update_extra_class_member(...)`

Validates the caller as an Admin, validates that the member belongs to the expected class, trims/normalizes editable fields, recalculates `member_key`, prevents collision with another active member in the same class, and updates `updated_by` / `updated_at`.

It must not update any historical attendance record.

## Data Backfill

A migration may populate missing `room`, `weekdays`, and `time_range` values for known 2026–2027 classes using existing schedule data where a deterministic match exists. Backfill must be additive and must not overwrite non-empty Admin-maintained values.

The frontend compatibility fallback remains temporarily so deployments stay safe if a class row is incomplete.

## Current-Screen Synchronization

Quick Attendance must use persisted class weekdays to decide whether a class is on schedule for the selected date. The room chip and new-session defaults use persisted room/time values.

Monthly Calendar continues to display historical sessions from snapshot rows. It does not rewrite old dates when the current class schedule changes.

Class Management displays current persisted class/member values.

History and attendance reports continue to use session/record snapshot fields for completed or cancelled sessions.

## Error Handling

Admin edit forms remain open on validation/server failure and display the Supabase error using the attendance error banner.

Class validation rejects blank class name, unsupported grade level, invalid weekday values, and malformed time/room payload types.

Student validation rejects blank full name or main-school class and rejects an active-member key collision.

No partial historical rewrite is attempted, so an edit failure cannot corrupt old attendance data.

## Testing Strategy

Use test-first regression contracts before production edits.

Required coverage:

1. Schedule helper prefers `classRow.weekdays` over hard-coded catalog values.
2. Room helper prefers `classRow.room` over hard-coded catalog room.
3. Unknown/incomplete class metadata stays usable through fallback behavior.
4. Management UI contains Admin class-edit and student-edit controls and does not expose them to non-Admins.
5. UI save flows call the dedicated Admin RPCs and refresh `loadAll()` after success.
6. Supabase RPC SQL explicitly requires Admin privilege.
7. Class RPC updates only `bes_extra_classes` and does not update `bes_extra_attendance_sessions` or `bes_extra_attendance_records`.
8. Student RPC updates only the current member row and does not update historical attendance records.
9. Member-key collision is rejected.
10. Existing attendance schedule, room-chip, history, report, permission, production-build, and critical browser smoke tests remain green.

## Files Expected to Change

- `src/components/GlobalAttendanceNavigationTab.jsx`
- `src/components/attendance/AttendanceMaterial3.css`
- `src/utils/extraClassSchedule2026.js`
- one new Supabase migration under the repository's existing migration directory
- regression contract scripts under `scripts/`
- frontend CI workflow only if the new regression scripts are not already auto-discovered

## Out of Scope

- Rewriting historical attendance sessions or records after edits
- Editable teacher catalog redesign
- Timetable conflict detection across all school classes
- Replacing the entire existing import workflow
- Creating a second schedule table unless future requirements exceed the current one-schedule-per-class model
