# Extra-class archive governance design

**Date:** 2026-09-14

## Goal

Replace destructive deletion of Phụ đạo/Bồi dưỡng classes with a recoverable archive-first lifecycle. Archiving must preserve the whole class as one restorable package. Permanent deletion must require explicit Admin approval.

## Scope

This design applies to `bes_extra_classes` and its dependent Phụ đạo/Bồi dưỡng data only. It does not change the separate Học bổ sung class model.

The existing class detail action currently labelled `Xóa lớp` will become archive-first. The existing attendance-history archive remains intact and continues to manage individual attendance-history entries separately.

## Roles and permissions

- Admin can archive a class, restore an archived class, request permanent deletion, reject a permanent-delete request, approve a permanent-delete request, and finalize permanent deletion.
- A non-Admin account with `attendance:manage` can archive a class, restore an archived class, and request permanent deletion.
- A report-only account cannot archive, restore, request permanent deletion, approve, reject, or finalize class deletion.
- Admin approval is mandatory before any class package can be permanently deleted.
- Frontend visibility is not the security boundary. Every mutating RPC must enforce the same rules server-side.

## Data model

Create a dedicated archive table for whole classes rather than overloading `bes_attendance_archive`, because the existing attendance archive is session-oriented and keyed around one attendance session/date.

Proposed table: `public.bes_extra_class_archive`.

Each row represents one archived class package and contains at minimum:

- archive id;
- original class id;
- class name, type, subject, grade, school year and display metadata needed for listing;
- `class_snapshot` containing the full original `bes_extra_classes` row;
- `members_snapshot` containing all `bes_extra_class_members` rows for the class, including inactive members;
- `teachers_snapshot` containing all `bes_extra_class_teachers` rows for the class;
- `sessions_snapshot` containing all `bes_extra_attendance_sessions` rows for the class;
- `records_snapshot` containing all `bes_extra_attendance_records` rows belonging to the archived class sessions;
- proof-path snapshot containing every attendance proof object path belonging to archived sessions;
- archive actor and timestamp;
- permanent-delete request status: `none`, `pending`, `approved`, or `rejected`;
- requester, request timestamp and reason;
- reviewer, review timestamp and review note.

Snapshots must retain original primary keys and foreign-key identifiers so restoration can return the package to the same logical identity.

## Archive transaction

Add a server RPC such as `bes_archive_extra_class(p_class_id uuid)`.

The RPC must:

1. Verify the caller is an approved Admin or has `attendance:manage`.
2. Lock the target class row.
3. Reject the request if the class is already archived.
4. Read the class, all members, all teacher assignments, all attendance sessions and all attendance records belonging to the class.
5. Store those rows in one `bes_extra_class_archive` row inside the same transaction.
6. Preserve all proof objects in storage; do not delete them during archive.
7. Remove the active class package from operational tables only after the archive row has been created successfully.
8. Return counts of archived students, teachers, sessions and records for UI feedback.

Because the dependent tables already use class/session relationships, the implementation may delete the active class package after snapshot creation, but only inside the same transaction so there is no state where the class is gone without a valid archive snapshot.

The legacy direct hard-delete path for normal UI use must no longer be callable as the first-step delete operation.

## Restore transaction

Add a server RPC such as `bes_restore_extra_class_archive(p_archive_id uuid)`.

The RPC must:

1. Verify the caller is an approved Admin or has `attendance:manage`.
2. Lock the archive row.
3. Refuse restoration while the delete request is `pending` or `approved`.
4. Validate that restoring the original class id/source key will not collide with an active class created after archiving.
5. Restore the class row first, then teacher assignments, members, sessions and attendance records in dependency order.
6. Preserve original ids and timestamps where valid.
7. Leave proof objects untouched because they were never removed during archive.
8. Delete the archive row only after the full package has been restored successfully.

If any required insert fails, the transaction must roll back and the archive package must remain intact.

## Permanent-delete request and Admin approval

Use the same governance states already established by attendance-history archive: `none -> pending -> approved/rejected`.

Add RPCs equivalent to:

- `bes_request_extra_class_archive_delete(p_archive_id uuid, p_reason text)` for Admin or `attendance:manage`;
- `bes_review_extra_class_archive_delete(p_archive_id uuid, p_approve boolean, p_note text)` for Admin only;
- `bes_finalize_extra_class_archive_delete(p_archive_id uuid)` for Admin only and only from `approved` state.

A request entering `pending` must notify approved Admin accounts. Resubmission after rejection should create a fresh notification.

Approval and finalization remain separate states so storage cleanup can fail safely without losing the database snapshot.

## Permanent deletion and proof cleanup

Permanent deletion is allowed only after Admin approval.

Finalization must:

1. Verify Admin role server-side.
2. Verify archive status is `approved`.
3. Delete every proof object referenced by the archived session snapshots.
4. If any proof deletion fails, keep the archive row and approved state so Admin can retry. Do not discard the database snapshot.
5. Delete the archive row only after storage cleanup succeeds.

The archived operational rows do not need to be deleted again because they were removed from active tables at archive time. Finalization therefore destroys the last recoverable class snapshot and associated proof files.

## Audit trail

Every lifecycle transition must write an audit event containing actor, class/archive id, timestamp and meaningful metadata.

Required actions:

- `attendance.class_archive`;
- `attendance.class_archive_restore`;
- `attendance.class_purge_requested`;
- `attendance.class_purge_approved`;
- `attendance.class_purge_rejected`;
- `attendance.class_purge_finalized`.

Audit metadata should include class name, original class id, request reason/review note where applicable, and snapshot counts.

## User interface

### Class management detail

The existing `Xóa lớp` action remains in the class detail action group, but its meaning changes to archive-first.

It is shown/enabled only for Admin and accounts with `attendance:manage`.

Clicking it opens a confirmation dialog that clearly states:

- the class is being moved to Kho lưu trữ, not permanently deleted;
- the class name;
- student count;
- teacher count;
- attendance-session count;
- the class can be restored later;
- permanent deletion will still require Admin approval.

After success, return to the class list, refresh active data, and show a success notice.

### Archive tab

The existing Kho lưu trữ screen will display both attendance-history items and archived whole classes in a unified user experience, while the backing tables remain separate.

Add a visible item type/filter for `Lớp học` in addition to the existing attendance sources.

A class archive card should show at least:

- `Lớp học` badge;
- class name;
- class type;
- subject and grade;
- school year;
- archived time and archived-by user;
- snapshot counts for students, teachers and attendance sessions;
- permanent-delete request status.

Actions:

- Admin or `attendance:manage`: `Khôi phục` when status is neither `pending` nor `approved`;
- Admin or `attendance:manage`: `Yêu cầu xóa vĩnh viễn` when status permits;
- Admin only: `Từ chối` and `Duyệt xóa vĩnh viễn` while pending;
- Admin only: retry/finalize permanent deletion while approved.

Report-only users do not receive these class-archive mutation actions.

## Compatibility with existing attendance archive

Do not change the meaning of `bes_attendance_archive`. Individual attendance sessions archived from Lịch sử/Báo cáo continue to use the existing APIs and UI lifecycle.

A whole-class archive is a distinct object. If a class contains active attendance sessions, those sessions are captured inside the class archive package rather than individually inserted into `bes_attendance_archive`.

This avoids duplicate ownership of the same session snapshot and keeps class restoration atomic.

## Error handling and conflicts

- Missing target class: return a not-found error without creating archive data.
- Already archived class: return an idempotent/already-archived response when safe, or a clear conflict error.
- Restore collision on original class id or unique `source_key`: keep the archive untouched and return a conflict requiring operator resolution.
- Pending/approved purge request: restoration is blocked.
- Unauthorized caller: return `42501`-style permission error from RPC.
- Storage cleanup failure after Admin approval: keep approved archive data for retry.

## Migration and legacy hard-delete path

Existing active classes stay unchanged.

The current `bes_delete_extra_class` function must not remain as a bypass around archive governance for normal authenticated users. The implementation should either:

- replace its behavior with archive-first semantics; or
- revoke normal execution and reserve a narrowly scoped internal/admin-only finalization path.

Preferred implementation: introduce explicit archive/restore/request/review/finalize RPCs and prevent the existing hard-delete RPC from being used as a first-step user action.

## Tests

Use TDD. Add failing contracts before implementation for these cases:

1. Admin can archive a class.
2. `attendance:manage` can archive a class.
3. Report-only account cannot archive a class.
4. Archive snapshot contains class, all members, all teachers, all sessions, all attendance records and proof paths.
5. Archiving removes the class from active management data without deleting proof files.
6. Restore recreates the complete package with original ids and relationships.
7. Restore is blocked for `pending` and `approved` purge states.
8. `attendance:manage` can request permanent deletion but cannot approve/reject/finalize it.
9. Admin can reject a request and the item becomes restorable again.
10. Admin can approve and finalize permanent deletion.
11. Storage cleanup failure preserves the approved archive for retry.
12. Existing attendance-history archive behavior remains unchanged.
13. UI contract: class delete action is archive-first and is not exposed to report-only accounts.
14. UI contract: Archive tab shows class items and Admin governance actions correctly.
15. Production build and Critical E2E continue to pass.

## Success criteria

The feature is complete only when all of the following are true:

- deleting a Phụ đạo/Bồi dưỡng class from the UI never immediately destroys it;
- the whole class can be restored exactly, including roster, teacher assignments and attendance history;
- proof files survive archive and restore;
- only Admin can authorize permanent deletion;
- permanent deletion cannot bypass the approval state machine through another authenticated RPC;
- archive lifecycle actions are audited;
- Admins are notified when permanent deletion is requested;
- existing attendance-history archive and unrelated Học bổ sung behavior remain intact.