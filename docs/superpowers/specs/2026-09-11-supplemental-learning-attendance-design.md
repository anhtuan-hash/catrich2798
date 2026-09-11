# Supplemental Learning Attendance Design

## Goal
Add a first-class `Học bổ sung` workflow to the existing Attendance workspace for students who need supplemental learning but do not belong to a remedial (`Phụ đạo`) or enrichment (`Bồi dưỡng`) extra class. The workflow must support both recurring multi-session groups and one-off ad-hoc sessions, while reusing the existing attendance permission, time-window, history, reporting, and proof patterns without turning supplemental learning into a fake extra class.

## Product Decisions
The following decisions are fixed for this feature:

- `Học bổ sung` is a separate managed activity type, not a third `bes_extra_classes.class_type` value.
- Admin can create both recurring supplemental-learning groups and one-off ad-hoc sessions.
- A recurring group has its own membership lifecycle and schedule; an ad-hoc session can exist without a group.
- Students may come from the school's existing student data or be entered manually.
- Manually entered students are reusable identities, not throwaway strings.
- A manual identity can later be linked to an official student identity without rewriting historical snapshots.
- Only Admin can create, edit, stop, cancel, or otherwise manage supplemental-learning groups, sessions, schedules, membership, or identity linking.
- Accounts with the existing `attendance:quick` permission can take attendance for any supplemental-learning session, subject to the existing `Giờ GV` restriction.
- Admin and existing attendance-report bypass behavior remain unchanged.
- The teacher shown for a supplemental-learning session is instructional attribution; the attendance operator is still the authenticated actor and does not need to be that teacher.
- Supplemental learning uses the same attendance states and evidence model as current attendance: present, absent, tardy, absence reason/note, session note, and proof where applicable.
- Supplemental-learning sessions appear in the existing daily attendance/calendar flow alongside remedial and enrichment classes, with a distinct `HỌC BỔ SUNG` label.
- History and reporting stay unified, with activity-type filtering. Supplemental learning must not be silently merged into remedial/enrichment totals by default.
- Historical attendance and membership are immutable snapshots with respect to later roster/profile changes.

## Why a Separate Subsystem
The current extra-class attendance domain is class-centric: attendance sessions and records are anchored to an existing extra class through `class_id`. That is appropriate for `Phụ đạo` and `Bồi dưỡng`, where a durable class roster exists, but it is the wrong abstraction for a one-off supplemental session involving students drawn from unrelated school classes or manually entered students.

The implementation therefore adds a supplemental-learning subsystem with its own group/session/membership/identity tables. The Attendance UI will expose a unified read model over extra-class and supplemental-learning sessions, but the underlying write models remain separate. This avoids weakening current `class_id` invariants, avoids fake classes, and minimizes risk to production data.

## Core Domain Model

### Supplemental student identity
Create a reusable supplemental student identity entity. Each record represents one real student as known to the supplemental-learning subsystem.

Required fields:
- stable UUID primary key
- source type: `official` or `manual`
- optional stable reference/key to an official school student when known
- student code snapshot/current working value
- full name
- regular school class name
- active flag
- created/updated timestamps and actor fields
- optional `linked_official_key` or equivalent canonical reference when a manual identity is linked later

Rules:
- Searching for students when building a group/session must search official students and reusable manual identities.
- Admin may create a manual identity when the student cannot be found.
- Linking a manual identity to an official student changes canonical identity resolution for future search/report aggregation, but never rewrites historical attendance rows.
- Duplicate active identities should be prevented where a reliable official key or student code uniquely identifies the same student.
- If two identities are linked as the same student, the same attendance session cannot contain both identities as separate participants.
- Identities referenced by historical attendance cannot be hard-deleted; they may be deactivated.

### Supplemental-learning group
A group represents a recurring, multi-session arrangement such as `Bổ sung Toán 10 – Nhóm 1`.

Required fields:
- UUID primary key
- group name
- subject
- optional grade level
- teacher id/name/email snapshot/current working values
- room
- start date and end date
- weekdays/schedule definition
- time range
- active/status flag
- created/updated actor and timestamps

A group is not an extra class and must not be inserted into `bes_extra_classes`.

### Group membership lifecycle
A recurring group has time-aware membership instead of a mutable roster that overwrites history.

Required fields:
- group id
- supplemental student identity id
- effective-from date
- optional effective-until date
- created/updated actor fields
- optional removal reason

Rules:
- A student belongs to the group for a session date only when that date falls within the membership effective interval.
- Removing a student asks for the effective stop date and does not delete prior membership history.
- Adding a student affects only sessions whose roster snapshot has not yet been frozen and whose session date is within the new effective range.
- The same canonical student may not have overlapping active membership rows in the same group.

### Supplemental-learning session
A session is the actual attendance unit. It can either reference a recurring group or stand alone as an ad-hoc session.

Required fields:
- UUID primary key
- optional group id
- kind: `recurring` or `adhoc`
- attendance date
- subject
- teacher id/name/email
- room
- teaching time range
- session status
- optional cancellation reason
- roster-frozen timestamp
- attendance-confirmed timestamp where applicable
- attendance operator (`checked_by`, `checked_by_name`) when confirmed
- session note
- proof path where applicable
- summary counts
- created/updated actor and timestamps

Session lifecycle:
- `scheduled`: prepared by Admin, roster may still reflect future membership changes until frozen
- `in_progress`: roster is frozen and an authorized operator can edit attendance
- `confirmed`: attendance has been committed; participant snapshot is immutable except through the existing controlled post-confirm edit path
- `cancelled`: session does not count as absence and cannot be normally confirmed

For recurring groups, upcoming sessions may be materialized lazily or ahead of time. Regardless of generation strategy, the authoritative roster is determined and frozen only when the session enters attendance/in-progress state, not when the group is first created.

### Session participant snapshot
Each session gets a participant snapshot independent of the current identity/group state.

Required fields:
- session id
- supplemental student identity id
- canonical identity reference at snapshot time where available
- student code snapshot
- full name snapshot
- regular school class snapshot
- attendance status
- absence reason code
- absence note
- recorded/updated timestamps as required by the current attendance editing model

Rules:
- A roster snapshot is created atomically when attendance begins or at the first authoritative server-side attendance action.
- For recurring sessions, snapshot candidates are memberships effective on the session date.
- For ad-hoc sessions, Admin explicitly selects the participants before the session is available to operators.
- After the roster is frozen, later group membership or identity edits do not add, remove, or rename participants in that session.
- After confirmation, participant identity snapshots remain immutable; attendance status edits use the controlled existing edit rules rather than roster mutation.

## Admin UX
Add an Admin-only `Học bổ sung` management area inside the Attendance workspace, positioned with other attendance management functions rather than as a new global app module.

The landing view provides:
- `Tạo nhóm học bổ sung`
- `Tạo buổi phát sinh`
- search/filter for group/session name, student, subject, teacher, date, and status
- grouped views for active groups and upcoming/recent sessions

### Create recurring group
Admin supplies:
- group name
- subject
- optional grade level
- teacher
- room
- start/end date
- weekday recurrence
- teaching time range
- initial student list

Student picker behavior:
- search official school students first
- include reusable manual supplemental identities in results
- provide `Thêm học sinh thủ công` when no suitable identity exists
- prevent the same canonical student from being selected twice

### Create ad-hoc session
Admin supplies:
- date
- subject
- teacher
- room
- teaching time range
- participant list
- optional note

No group is required. The created session immediately participates in the unified attendance calendar for its date.

### Manage a recurring group
The group detail view contains:
- group metadata and schedule
- current and historical membership
- upcoming and completed sessions

When Admin removes a student, the UI asks `Ngừng tham gia từ ngày nào?`. The operation closes the membership interval rather than deleting it.

When Admin changes teacher, room, or schedule, the change applies to future/unfrozen sessions only. Confirmed sessions retain their stored metadata.

### Manual identity linking
Admin can open a reusable manual student identity and choose `Liên kết với học sinh chính thức`.

The UI must:
- search official students
- show enough identifying information to prevent an accidental match
- reject linking that would cause duplicate canonical participation in the same frozen/unfrozen session
- preserve all previous attendance snapshots
- make future searches/reports aggregate the linked manual and official identity as one canonical student

## Attendance Calendar and Quick Attendance
The existing attendance calendar/daily list becomes a unified activity feed containing:
- `PHỤ ĐẠO`
- `BỒI DƯỠNG`
- `HỌC BỔ SUNG`

Supplemental cards display at minimum:
- `HỌC BỔ SUNG` label
- group name when present, otherwise an ad-hoc title derived from subject/date
- `Nhóm dài ngày` or `Phát sinh`
- teaching time
- room
- teacher
- participant count
- session state

Opening a supplemental session reuses the existing attendance interaction pattern. Operators should not need to learn a separate attendance screen merely because the underlying source is not an extra class.

The operator can set/use the same supported states and fields as extra-class attendance, including present, absent, tardy, absence reason/note, session note, and proof where supported.

## Authorization
Authorization boundaries are strict.

### Management
Only approved Admin accounts may:
- create/update/deactivate recurring groups
- create/update/cancel ad-hoc sessions
- change supplemental session metadata before freeze/confirmation
- add/stop group membership
- create/deactivate manual supplemental identities
- link manual identities to official students

These rules must be enforced server-side, not only by hiding UI controls.

### Attendance operation
An approved account may take supplemental attendance when the same central rules used for extra-class attendance allow it:
- Admin: allowed with existing Admin bypass
- attendance-report bypass account: preserve existing behavior
- account with `attendance:quick`: allowed globally for supplemental sessions
- ordinary quick-permission operators remain subject to configured `Giờ GV`
- class/group teacher assignment is not an authorization requirement

The existing attendance operator identity is stored separately from the instructional teacher identity.

## Unified History
The existing History experience gains an activity-type dimension and can show extra-class and supplemental sessions together.

Required filters include:
- all activity types
- remedial
- enrichment
- supplemental learning

Supplemental-specific filtering may additionally use student, subject, teacher, group, date, and session status.

History rows must clearly identify supplemental learning and whether the source was recurring-group or ad-hoc.

For a student search, results should aggregate identities that Admin has explicitly linked to the same canonical student while still rendering each historical row from its own snapshot values.

## Reporting and PDF
Reporting remains a single Attendance reporting area with explicit activity-type filtering.

Default behavior must not silently add supplemental totals into remedial/enrichment totals. A combined total is shown only when Admin intentionally chooses `Tất cả hoạt động` or another explicit combined view.

Supplemental reporting supports at least:
- session-oriented reporting: date, subject, teacher, room, roster, present/absent/tardy counts, reasons/notes, proof metadata as applicable
- student-oriented reporting: student identity, subjects attended, assigned/eligible session count, present/absent/tardy counts, attendance rate, and participation date range

PDF/export views use the existing report visual system but identify the report as `BÁO CÁO HỌC BỔ SUNG KIẾN THỨC` when filtered to supplemental learning.

Cancelled supplemental sessions are excluded from absence denominators and must never create automatic absences.

## Data Integrity and Historical Immutability
The following invariants are non-negotiable:

1. Group changes never rewrite confirmed session metadata or participant snapshots.
2. Student identity/profile changes never rewrite historical participant snapshots.
3. A manual-to-official identity link changes canonical aggregation, not historical text snapshots.
4. A cancelled session does not count as an absence and cannot produce normal attendance records.
5. The same canonical student can appear at most once in a supplemental session.
6. A confirmed session cannot gain or lose participants through ordinary group/session editing.
7. Deactivating a group, membership, or supplemental identity never cascades into historical attendance deletion.
8. Attendance counts are computed server-side from the authoritative frozen roster/records and committed atomically with confirmation.
9. Browser-supplied timestamps do not determine authoritative attendance time.
10. The attendance actor and instructional teacher remain separate fields.

## Integration Strategy
Do not retrofit nullable supplemental semantics into the current extra-class tables. Add dedicated supplemental-learning tables and RPCs, then expose a small unified read/model layer to the UI.

Recommended boundaries:
- database: dedicated identity/group/membership/session/participant tables plus security-definer RPCs for management, roster freeze, attendance confirm/edit, and read models
- frontend data adapter: normalize extra-class and supplemental sessions into one `AttendanceActivity` shape for calendar/history/report consumers
- Admin supplemental-management UI: isolated module available only to Admin
- attendance renderer/editor: reuse existing visual interaction through a source-neutral activity adapter rather than duplicating the whole screen
- history/report filters: extend existing filters/read adapter with `activity_type`

Existing extra-class tables and confirmed records stay untouched by the migration except for safe additive views/RPCs or compatibility wrappers if needed.

## Migration and Rollout Safety
The feature is delivered with forward-only additive migrations.

Rollout sequence:
1. add supplemental tables, indexes, constraints, RLS/RPC authorization, and server-side tests/contracts
2. add frontend domain adapter and Admin management UI behind the presence of the new RPC/data model
3. add unified calendar/quick-attendance support
4. add unified History filters and supplemental student aggregation
5. add Reporting/PDF support

The database must remain compatible with the current production frontend during rollout. Existing remedial/enrichment attendance must remain fully functional if the supplemental frontend fails to load.

No migration may rewrite or delete existing `bes_extra_*` attendance history.

## Testing Requirements
Implementation follows TDD. At minimum cover:
- Admin-only group/session/membership/manual-identity management
- non-Admin management denial at RPC level
- `attendance:quick` operator can attend any supplemental session within `Giờ GV`
- operator does not need to match session teacher
- outside-window denial for ordinary quick operator
- Admin/report bypass preservation
- recurring membership effective-date resolution
- roster freeze snapshot immutability
- ad-hoc roster snapshot behavior
- duplicate canonical student prevention
- manual identity creation and reuse
- manual-to-official linking without historical rewrite
- cancelled-session exclusion from absence/report denominators
- confirmed-session roster lock
- unified calendar includes all three activity labels
- unified History type filtering
- student history aggregation across linked identities
- supplemental-only report and combined-report semantics
- current extra-class attendance contracts remain green

## Out of Scope
This feature does not:
- create a new role named `Giám thị`
- grant attendance access based on teacher/group assignment
- permit non-Admin users to create ad-hoc sessions
- convert `Học bổ sung` into a fake `bes_extra_classes` row
- rewrite existing remedial/enrichment attendance data
- automatically merge manual identities based only on fuzzy name similarity
- delete historical records when a student/group becomes inactive
