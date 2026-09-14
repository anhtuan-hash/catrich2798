# Report-access extra-class creation implementation plan

> **Execution:** Use the approved bounded-capability design. Report access (`attendance:report`) may create/import new Phụ đạo/Bồi dưỡng classes, but must not inherit roster editing, teacher changes, class deletion, or other Admin capabilities.

**Goal:** Allow Admins and approved accounts with Attendance report access to create new `bes_extra_classes` (manual + Excel import) without widening existing class-management mutations.

**Design:** Introduce a narrow create capability separate from `can_manage_extra_class_roster()`. The existing persistence bridge exposes manual creation to Admin/Manage/Report accounts. For a report-only account, the bridge falls back to the Attendance header and adds a create-only Excel import action, so the account does not need to receive the broader `attendance:manage` UI capability. Backend manual creation and a new transactional create-with-members RPC use the new create gate. Report-only import is create-only: existing classes are skipped, never updated.

## Task 1 — Lock the authorization contract with a failing test

**Files:**
- Create: `scripts/test-attendance-report-class-creation-permission.mjs`
- Modify: `.github/workflows/frontend-build.yml`

1. Assert `attendance:report` remains distinct from `attendance:manage`.
2. Assert the class-creation bridge recognizes report access.
3. Assert report-only creation controls have an Attendance-header fallback even without the Manage tab.
4. Assert report-only Excel import uses a create-only RPC and skips existing-class mutation.
5. Assert the new migration defines a narrow `can_create_extra_class_roster()` gate and leaves edit/delete/member-management gates unchanged.
6. Run the contract in CI and confirm RED before production changes.

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

1. Manual “Tạo lớp mới”: allow Admin, `attendance:manage`, or `attendance:report` while continuing to call the transactional create RPC.
2. Keep the existing placement inside `.attendance-import-card` for Admin/Manage users.
3. For report-only users, fall back to `.attendance-top-actions`, making creation available without granting the Manage tab.
4. Add a report-only Excel import action that reads the existing class list, skips classes that already exist, and calls `bes_create_extra_class_with_members` only for genuinely new classes.
5. Do not issue direct UPDATE/DELETE calls against existing classes or members from the report-only bridge.

## Task 4 — Verify and review

1. Run `node scripts/test-attendance-report-class-creation-permission.mjs` — GREEN.
2. Run `node scripts/test-attendance-granular-permissions.mjs` — GREEN.
3. Run `node scripts/test-attendance-manual-class-teacher-persistence.mjs` — GREEN.
4. Run `npm run build` — GREEN.
5. Let the PR Frontend Build workflow run and inspect failures before claiming completion.
6. Review the diff for privilege expansion: report-only may create/import *new* classes only; no existing-class mutation privilege is added.
