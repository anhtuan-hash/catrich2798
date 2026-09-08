# Attendance Material 3 + Monthly Reporting Design

**Date:** 2026-09-08  
**Scope:** Only the `Điểm danh lớp phụ đạo & bồi dưỡng` module. No redesign of the rest of Brian English.

## 1. Goals

Redesign the entire attendance module with a Material 3 / Android tablet visual language and add reliable lesson-period tracking, class cancellation, and monthly reporting.

The redesigned module must:

1. Remove the text `Mỗi lớp chỉ chốt một lần mỗi ngày · giờ xác nhận lưu theo máy chủ` from the module header.
2. Keep the existing rule that each `class_id + attendance_date` can have only one finalized session.
3. Require the actual teacher for the session to be selected from the class's normalized teacher assignments when a class has multiple teachers.
4. Require the Admin to select the number of taught periods for a normal session: `1`, `1.5`, or `2`.
5. Allow the Admin to mark a scheduled class as cancelled for a date.
6. Add a monthly report workspace with per-teacher detail and total period statistics.
7. Preserve current Admin-only permissions, server-side locking, server timestamps, manual teacher additions, class/member management, attendance deletion, and monthly calendar behavior.

## 2. UX Direction

The module becomes a self-contained Material 3 workspace inspired by a modern Android tablet app. It keeps the current top-level navigation entry in the Brian English global nav but redesigns everything inside the attendance dialog/workspace.

### 2.1 Material 3 language

Use:

- large top app bar with clear title hierarchy;
- rounded tonal surfaces instead of dense bordered boxes;
- filled, tonal, and outlined buttons according to action priority;
- segmented controls for fixed options such as period count;
- chips/badges for state;
- spacious tablet-first layout with desktop responsiveness;
- higher visual contrast between information groups;
- no global restyling outside this attendance module.

### 2.2 Status colors

Colors have semantic meaning and must remain consistent across Attendance, Calendar, History, and Reports:

- **Primary blue:** current selection and primary actions.
- **Green:** completed attendance / present students.
- **Red/coral:** absent students and destructive actions.
- **Amber/orange:** cancelled class sessions.
- **Purple:** teacher and period statistics.
- **Cyan/teal:** calendar or date-oriented information.
- **Neutral tonal surfaces:** structural layers and secondary information.

Color must never be the only status signal; each status also uses text and/or an icon.

## 3. Navigation

The attendance workspace contains five tabs:

1. `Điểm danh`
2. `Lịch tháng`
3. `Quản lý lớp`
4. `Lịch sử`
5. `Báo cáo`

Existing features map into these tabs without changing their permission model.

## 4. Attendance Session Model

### 4.1 Existing invariant

One class can have only one finalized session for one attendance date. The database remains authoritative using a unique constraint/index on:

```text
(class_id, attendance_date)
```

The UI is only a convenience layer; duplicate prevention must continue to be enforced server-side.

### 4.2 New fields on attendance sessions

Add the following session fields:

- `session_status text not null default 'completed'`
  - allowed values: `completed`, `cancelled`
- `lesson_periods numeric(3,1) not null default 1`
  - completed sessions: exactly `1`, `1.5`, or `2`
  - cancelled sessions: exactly `0`
- `cancellation_reason text not null default ''`

The existing session snapshot fields remain, including `teacher_name`, attendance date, server checked time, class snapshot, counts, and note.

### 4.3 Completed session

For a normal attendance confirmation:

- date is required and cannot be in the future using `Asia/Ho_Chi_Minh` rules;
- teacher is required;
- the selected teacher must be present in the normalized teacher assignments for that class;
- period count must be one of `1`, `1.5`, `2`;
- present/absent records are generated as today;
- `session_status = 'completed'`;
- `lesson_periods` stores the selected value;
- `cancellation_reason = ''`.

### 4.4 Cancelled session

When the Admin selects `Hủy buổi học`:

- date is required and cannot be in the future;
- the day becomes locked by the same unique `class_id + attendance_date` rule;
- `session_status = 'cancelled'`;
- `lesson_periods = 0`;
- no attendance records are created for individual students;
- `total_students`, `present_count`, and `absent_count` are stored as `0` for the cancelled session;
- a cancellation reason is required before confirmation;
- no teacher is required for a cancelled session, because no teaching occurred;
- cancelled sessions contribute `0` periods to every teacher statistic.

Deleting a cancelled session from History removes the lock for that class/date exactly like deleting a completed attendance session.

## 5. Attendance Screen

### 5.1 Header

The old explanatory line:

```text
Mỗi lớp chỉ chốt một lần mỗi ngày · giờ xác nhận lưu theo máy chủ
```

is removed completely and is not replaced with another sentence.

### 5.2 Session card

The top of the attendance pane becomes one Material session card containing:

- attendance date;
- teacher selector;
- segmented period selector: `1 tiết | 1,5 tiết | 2 tiết`;
- session status chip: `Chưa chốt`, `Đã chốt`, or `Đã hủy`.

Teacher behavior:

- one assigned teacher: auto-select and display the teacher;
- multiple assigned teachers: require explicit selection;
- teacher options are the merged normalized assignments, including manually added teachers already supported by the module;
- no account-directory teacher source is reintroduced.

### 5.3 Main actions

Use two visually distinct actions:

- filled primary: `Xác nhận điểm danh`;
- amber tonal/destructive-secondary: `Hủy buổi học`.

`Hủy buổi học` opens an inline Material confirmation surface/dialog requiring the cancellation reason. It does not use the present/absent roster as part of the cancellation operation.

### 5.4 Locked day

For a completed day:

- roster is read-only;
- teacher and periods are shown from the saved session snapshot;
- status is `Đã chốt`;
- exact server confirmation time remains visible in session/history details, but not as header marketing copy.

For a cancelled day:

- roster is read-only / visually de-emphasized;
- status is `Đã hủy` using amber;
- cancellation reason is visible;
- period count shows `0`;
- there are no student attendance rows associated with the cancelled session.

## 6. Monthly Calendar

The existing monthly calendar is retained but redesigned to Material 3.

Each calendar day can show:

### Completed session

- green tonal day surface;
- completed icon/state;
- `present_count / total_students`;
- actual teacher name;
- lesson periods (`1`, `1.5`, or `2` periods).

### Cancelled session

- amber tonal day surface;
- `Đã hủy`;
- short cancellation reason when space allows;
- `0 tiết`;
- no presence ratio.

### Empty date

- neutral surface;
- `Chưa điểm danh` when appropriate.

### Today

Today receives a primary outline/accent independent of session state.

Clicking a completed or cancelled date opens the corresponding History detail.

## 7. Class Management

Current capabilities remain:

- import class roster;
- add/remove students;
- add teachers manually;
- delete class;
- persist all changes in Supabase.

Only the visual treatment changes to Material 3. Teacher chips/surfaces should distinguish normalized assigned teachers clearly and preserve manually added teachers.

No new teacher directory sourced from website accounts is introduced.

## 8. History

History supports both session statuses.

### 8.1 Completed history item

Show:

- green `Đã điểm danh` chip;
- class;
- date/time;
- teacher;
- lesson periods;
- presence summary;
- absence details;
- note;
- existing delete-session action.

### 8.2 Cancelled history item

Show:

- amber `Đã hủy` chip;
- class;
- date/time when cancellation was confirmed;
- cancellation reason;
- `0 tiết`;
- no student absence list;
- existing delete-session action.

Deleting either type of session opens that class/date for a new session.

## 9. Monthly Reports

Add a fifth tab: `Báo cáo`.

### 9.1 Filters

Minimum filters:

- month (`YYYY-MM`);
- class: all classes or one class;
- teacher: all teachers or one teacher.

Default month is the current month in `Asia/Ho_Chi_Minh`.

### 9.2 Summary metrics

Show Material metric cards for:

- total completed teaching sessions;
- total cancelled sessions;
- total taught periods;
- total present student instances;
- total absent student instances;
- attendance rate for completed sessions where student records exist.

Cancelled sessions are excluded from attendance rate and period totals except for the separate cancelled-session count.

### 9.3 Per-teacher period summary

For each teacher with completed sessions in the selected month, calculate:

- teacher name;
- total completed sessions;
- total lesson periods;
- number of distinct classes taught;
- optional present/absent aggregate for sessions taught by that teacher.

Period aggregation is a plain sum of `lesson_periods`, so decimal `.5` values are preserved exactly.

A teacher manually added to a class is treated exactly like a teacher from the official assignment catalog once that teacher is selected for a completed session.

### 9.4 Detailed monthly table

One row per session, ordered by attendance date then class name.

Columns:

- date;
- class;
- subject;
- teacher;
- status;
- lesson periods;
- total students;
- present;
- absent;
- attendance rate;
- note / cancellation reason.

For cancelled rows:

- status = `Đã hủy`;
- lesson periods = `0`;
- total/present/absent/rate display `—` rather than misleading zeros in the report UI;
- cancellation reason is shown.

## 10. Report Export

Provide two report export actions from the Reports tab:

### 10.1 Excel

Export one `.xlsx` workbook with at least:

- `Tong quan`: month, filters, summary metrics;
- `Theo giao vien`: per-teacher session count and total periods;
- `Chi tiet buoi hoc`: one row per completed/cancelled session;
- `Chi tiet vang`: absence rows for completed sessions only.

Use Vietnamese column labels and keep decimal periods as numeric values.

### 10.2 PDF

Export a printable PDF monthly report containing:

- report title and month;
- applied filters;
- summary metrics;
- per-teacher period table;
- detailed session table;
- clear visual distinction for cancelled sessions.

The PDF is generated on demand from current report data; it is not stored permanently unless the user explicitly downloads/saves it.

## 11. Data Access and Security

All write operations remain Admin-only.

New/updated RPCs must:

- use `SECURITY DEFINER` only where required;
- use `set search_path = public`;
- explicitly check `can_manage_extra_class_attendance()`;
- revoke execution from `public` and `anon`;
- grant execution only to `authenticated`;
- validate teacher assignment and allowed period values on the server;
- preserve the class/date uniqueness invariant.

Reads continue through RLS-protected tables for authenticated Admins.

## 12. Migration and Backward Compatibility

Existing completed sessions need a deterministic migration:

- `session_status = 'completed'`;
- `lesson_periods = 1` for historical rows because no prior period value exists;
- `cancellation_reason = ''`.

This migration assumption is explicitly chosen so historical sessions remain countable in monthly reporting instead of becoming null/invalid. It does not claim that old sessions were factually one period; it is a compatibility default for records created before period tracking existed.

The Reports UI should visually indicate that pre-migration sessions use the compatibility default only if a dedicated provenance flag is later introduced. No provenance flag is added in this scope.

## 13. Technical Structure

Avoid expanding `GlobalAttendanceNavigationTab.jsx` indefinitely. This change should split major responsibilities into focused units while keeping the current module entry point stable.

Recommended structure:

- `GlobalAttendanceNavigationTab.jsx` — shell, global state coordination, top-level tab routing;
- `AttendanceQuickView.jsx` — daily attendance and cancellation workflow;
- `AttendanceMonthlyCalendar.jsx` — month calendar;
- `AttendanceClassManagement.jsx` — existing class/student/teacher management;
- `AttendanceHistoryView.jsx` — history and deletion;
- `AttendanceMonthlyReport.jsx` — report filters, metrics, teacher summary, detail table;
- `attendanceReport.js` — pure aggregation and export-data transforms;
- Material 3 attendance-scoped CSS files/tokens under the existing components/styles area;
- Supabase migration for status/periods/cancellation RPC support.

The split is targeted: only attendance code is refactored, with no unrelated application-wide component rewrite.

## 14. Error Handling

The UI must surface concise Vietnamese errors for:

- future date;
- duplicate class/date lock;
- missing teacher on completed session;
- teacher no longer assigned;
- missing/invalid lesson periods;
- missing cancellation reason;
- database/RPC failure;
- export failure.

If a class/day changes on the server while another browser is open, the RPC response remains authoritative and the client reloads that date/session state.

## 15. Testing Requirements

Use TDD for data/rule changes.

Required automated coverage:

1. Header copy is removed.
2. Completed session only accepts lesson periods `1`, `1.5`, `2`.
3. Cancelled session stores status `cancelled`, periods `0`, and no student attendance records.
4. Cancellation requires a reason.
5. Class/date unique lock applies to both completed and cancelled sessions.
6. Deleting either session type unlocks the date.
7. Multi-teacher completed session requires a valid assigned teacher.
8. Manually added teachers remain valid selectable teachers.
9. Calendar renders distinct completed/cancelled states.
10. Monthly report aggregation sums decimal periods correctly.
11. Cancelled sessions do not contribute periods or attendance-rate denominators.
12. Per-teacher totals aggregate correctly across multiple classes.
13. Excel export dataset contains overview, teacher totals, session detail, and absence detail.
14. Production build and existing Critical E2E/Supabase guard workflows remain green.

## 16. Acceptance Criteria

The feature is ready for production when:

- the approved Material 3 visual hierarchy is implemented across all five attendance tabs;
- the old header sentence is absent;
- Admin can complete a session with teacher + `1/1.5/2` periods;
- Admin can cancel a class for a date with a required reason;
- completed and cancelled sessions both lock the class/date exactly once;
- deleting a history session unlocks the date;
- monthly calendar distinguishes completed/cancelled days and shows periods;
- Reports tab produces correct monthly metrics, per-teacher totals, and detailed rows;
- Excel and PDF exports reflect the active report filters;
- existing class/member/manual-teacher functionality remains intact;
- database permission checks and CI verification pass before merge.
