# Report-access extra-class creation implementation plan

> **Execution:** Use the approved bounded-capability design. Report access (`attendance:report`) may create/import new Phụ đạo/Bồi dưỡng classes, but must not inherit roster editing, teacher changes, class deletion, or other Admin capabilities.

**Goal:** Allow Admins and approved accounts with Attendance report access to create new `bes_extra_classes` (manual + Excel import) without widening existing class-management mutations.

**Design:** Introduce a narrow create capability separate from `can_manage_extra_class_roster()`. Frontend exposes the Quản lý lớp surface to report holders only for read/create/import actions; existing-class mutations remain guarded by `attendance:manage`. Backend manual creation and a new transactional create-with-members RPC use the new create gate. Report-only import is create-only: existing classes are skipped, never updated.

## Task 1 — Lock the authorization contract with a failing test

**Files:**
- Create: `scripts/test-attendance-report-class-creation-permission.mjs`
- Modify: `.github/workflows/frontend-build.yml`

1. Assert `attendance:report` is recognized as a class-creation capability without changing `attendance:manage` semantics.
2. Assert the manual class bridge admits report access.
3. Assert the Manage tab/workspace separates `canCreateClasses` from `canManageMembers`.
4. Assert report-only Excel import uses a create-only RPC and skips existing-class mutation.
5. Assert the new migration defines a narrow `can_create_extra_class_roster()` gate and leaves edit/delete/member-management gates unchanged.
6. Run `node scripts/test-attendance-report-class-creation-permission.mjs` and confirm RED before production changes.

## Task 2 — Add the narrow backend create capability

**Files:**
- Create: `supabase/migrations/20260914120000_attendance_report_class_creation.sql`

1. Define `can_create_extra_class_roster()` for approved Admin / legacy Attendance / `attendance:manage` / `attendance:report` callers.
2. Re-gate `bes_create_extra_class_with_teachers(...)` from `can_manage_extra_class_roster()` to the new create-only helper.
3. Add `bes_create_extra_class_with_members(...)` as a SECURITY DEFINER transactional RPC for creating one new class, normalized teacher rows, and initial members.
4. Reject duplicate active class identity and invalid payloads server-side.
5. Revoke execution from `public`/`anon`; grant only `authenticated`.
6. Do not modify `can_manage_extra_class_roster()`, `bes_add_extra_class_teacher`, `bes_delete_extra_class`, or class/member update RPCs.

## Task 3 — Expose create/import to report holders without widening management

**Files:**
- Modify: `src/components/GlobalAttendanceAdminPersistenceBridge.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/attendance/AttendanceClassManagementWorkspace.jsx`

1. Manual “Tạo lớp mới”: allow Admin, `attendance:manage`, or `attendance:report` while continuing to call the transactional create RPC.
2. Treat report access as sufficient to open the Quản lý lớp surface, but keep `canManageMembers` tied only to the existing Manage permission/Admin.
3. Pass a separate `canCreateClasses` capability into the workspace.
4. Keep import/create controls visible only to create-capable users.
5. For report-only import, skip any class that already exists and call `bes_create_extra_class_with_members` only for new classes. Do not update/reactivate any existing class/member.
6. Keep edit class, add/remove student, add teacher, and delete class controls unavailable to report-only users.

## Task 4 — Verify and review

1. Run `node scripts/test-attendance-report-class-creation-permission.mjs` — GREEN.
2. Run `node scripts/test-attendance-granular-permissions.mjs` — GREEN.
3. Run `node scripts/test-attendance-manual-class-teacher-persistence.mjs` — GREEN.
4. Run `npm run build` — GREEN.
5. Let the PR Frontend Build workflow run and inspect failures before claiming completion.
6. Review the diff for privilege expansion: report-only must be able to create/import *new* classes only; no existing-class mutation privilege is added.
