# Học bổ sung — Implementation Plan

**Date:** 2026-09-11
**Design:** `docs/superpowers/specs/2026-09-11-supplemental-classes-simplification-design.md`
**Branch:** `design/supplemental-classes-simplification-20260911`

## Goal

Replace the exposed “student registry + long-running group + adhoc session” workflow with a class-centric **Lớp học bổ sung** workflow while preserving all existing attendance history and snapshots. Supplemental data must be accessible only to approved Admins and the approved profile UUID `4c89bfa1-9e3f-4965-a082-99f6e974f5ba`.

## Safety constraints

- Do not mutate production until branch verification passes.
- Do not hard-delete legacy supplemental students, groups, sessions, participants, proof paths, or attendance history.
- Do not grant access from `route:attendance`, `attendance:quick`, `attendance:manage`, `attendance:history`, `attendance:report`, or from being listed as a class teacher.
- Keep the current single Attendance modal; do not add nested dialog/backdrop behavior.
- Changes to future rosters/sessions must not rewrite frozen or confirmed historical snapshots.

## Task 1 — Add a failing contract test first

**Files**
- Create: `scripts/test-supplemental-classes-simplification.mjs`
- Modify: `package.json`

**Test contract**
1. The frontend contains `Lớp học bổ sung` and no longer exposes `Nhóm dài ngày`, `Buổi phát sinh`, or `Liên kết với học sinh chính thức`.
2. A dedicated frontend access helper contains the stable profile UUID and requires an approved profile or approved Admin.
3. All supplemental entry bootstraps use the dedicated access helper rather than generic Attendance permissions.
4. The class API exposes class/member/teacher/archive operations.
5. A new migration creates `bes_supplemental_group_teachers`, archive/note fields, a strict supplemental manager guard, and class-centric RPCs.
6. The strict migration does not authorize supplemental access from generic Attendance permissions.

**Run:** `node scripts/test-supplemental-classes-simplification.mjs`

Expected before implementation: FAIL because the new helper/migration/API/UI do not exist yet.

## Task 2 — Implement strict supplemental authorization

**Files**
- Create: `src/supplementalAccess.js`
- Modify: `src/supplementalLearningBootstrap.js`
- Modify: `src/supplementalAttendanceQuickBootstrap.js`
- Modify: `src/supplementalAttendanceReportingBootstrap.js`
- Modify: `src/supplementalLearningRouteBootstrap.js`
- Modify any supplemental single-modal bridge only if needed to keep one modal.

**Implementation**
- Add a single frontend predicate for visibility only: approved Admin OR approved profile id `4c89bfa1-9e3f-4965-a082-99f6e974f5ba`.
- Remove generic Attendance permission checks as supplemental authorization.
- Keep backend as the security authority; frontend helper only controls visibility/navigation.

**Run:** contract test; expect permission-related assertions to pass while migration/UI assertions may still fail.

## Task 3 — Add additive backend migration and class-centric RPC facade

**Files**
- Create: `supabase/migrations/20260911150000_supplemental_classes_simplification.sql`

**Schema changes**
- Add `note`, `archived_at`, `archived_by` to `bes_supplemental_groups` if missing.
- Create `bes_supplemental_group_teachers` with optional profile id, manual name/email, display order, audit columns, RLS, revoke direct client table access, indexes.
- Backfill current single teacher metadata into the new teacher table without deleting old columns.

**Authorization changes**
- Add strict manager predicate/require helper using approved Admin OR the stable Hồng Thắm UUID.
- Make legacy supplemental admin/reader helpers delegate to the strict guard so old callable RPCs cannot bypass the new rule.
- Ensure supplemental begin/confirm/cancel/proof/history/report RPCs are guarded by the strict manager rule.
- Ensure shared aggregate Attendance/history/report RPCs exclude `activity_type = 'supplemental'` unless the caller is a supplemental manager.
- Permission failures use SQLSTATE `42501` where practical.

**Class-centric RPCs**
- `bes_list_supplemental_classes`
- `bes_upsert_supplemental_class`
- `bes_archive_supplemental_class`
- `bes_upsert_supplemental_class_member`
- `bes_set_supplemental_class_member_status`
- `bes_set_supplemental_class_teachers`

Each mutation must be transactional, preserve historical participant snapshots, and only modify/materialize future unfrozen recurring sessions.

**Verification before production**
- Parse/contract test locally/CI.
- Review migration text for grants/RLS and idempotency.
- After branch verification, apply migration to Supabase with `apply_migration`, never `execute_sql`, then run permission/data-count checks and Supabase security/performance advisors.

## Task 4 — Build the class-centric JS API

**Files**
- Modify: `src/attendance/supplementalLearningApi.js`

**Implementation**
- Add wrappers for list/upsert/archive class, add/edit member, member status, teacher replacement.
- Keep attendance/history/proof wrappers required by existing flows.
- Leave legacy wrappers only for compatibility; the new UI must not call official-link or adhoc creation paths.

**Run:** contract test.

## Task 5 — Replace the Admin UI with class list/detail management

**Files**
- Modify: `src/supplementalLearningBootstrap.js`
- Modify: `src/styles/SupplementalLearning.css`

**Class list**
- Header + `+ Tạo lớp học bổ sung`.
- Cards: class name, subject, grade, room, schedule, teachers, active student count, status.
- Actions: `Quản lý`, `Điểm danh`, `Lịch sử`, `Xóa lớp` (archive semantics).

**Class detail**
- Class form for name/subject/grade/room/date range/weekdays/time/note/status.
- Students section scoped to the selected class only: manual add/edit, `Đang học` / `Ngừng học`, reactivation.
- Teachers section: multiple manual teachers, add/remove/edit; explicitly metadata-only.
- No official-link UI, no global student registry, no adhoc session creation UI.

**Single-modal requirement**
- Render inside the existing Attendance modal content host; do not add a nested `role=dialog` or backdrop.

**Run:** contract test and build.

## Task 6 — Preserve/reuse rollcall, history and reporting

**Files**
- Modify only as required: `src/supplementalAttendanceQuickBootstrap.js`
- Modify only as required: `src/supplementalAttendanceReportingBootstrap.js`
- Modify only as required: `src/supplementalSingleModalBridge.js`

**Implementation**
- Class card `Điểm danh` opens/filters the existing supplemental attendance flow for that class/session.
- Class card `Lịch sử` opens/filters existing supplemental history for that class.
- Preserve present/absent/tardy, absence reason/note, proof attachment, cancellation, snapshots and confirmed history.
- Archived class and stopped students remain visible in historical snapshots.

**Run:** contract test, smoke tests, build.

## Task 7 — Full verification and review

**Run on branch**
- `node scripts/test-supplemental-classes-simplification.mjs`
- `npm test`
- `npm run build`
- Relevant existing supplemental/single-modal scripts if present in `package.json` or `scripts/`.

**GitHub review**
- Compare feature branch against `main`.
- Create a PR only after verification evidence is green.
- Inspect PR diff for accidental destructive SQL/data removal and unrelated changes.

**Production rollout after verified PR branch**
1. Apply only the new additive migration to project `xpkbgqdlfonsinriggmj` via `apply_migration`.
2. Verify tables/RPCs and permission behavior for approved Admin, Hồng Thắm UUID, and an ordinary teacher profile.
3. Confirm counts for supplemental sessions/participants/proof-bearing sessions are not reduced.
4. Run Supabase security and performance advisors.
5. Only then merge/deploy frontend through the repository’s normal deployment flow.

## Acceptance checklist

- Approved Admin can fully manage supplemental classes.
- Approved Hồng Thắm UUID can fully manage supplemental classes despite role `teacher`.
- All other teachers are denied, including those with general Attendance permissions or listed as class teachers.
- No forbidden legacy UI terminology/actions remain in the new management flow.
- Create/edit/archive class works without deleting history.
- Multiple teacher metadata works without granting access.
- Student stop/reactivate affects future rosters only.
- Attendance/history/proof stays compatible and snapshot-safe.
- Existing remedial/gifted Attendance behavior is unchanged.
