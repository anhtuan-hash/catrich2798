# Supplemental Learning Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Admin-managed recurring and ad-hoc `Học bổ sung` attendance that shares the existing daily attendance, history, reporting, permissions, and `Giờ GV` behavior without converting supplemental learning into an extra class.

**Architecture:** Keep the current `bes_extra_*` class-centric write model untouched. Add dedicated supplemental student/group/membership/session/participant tables plus hardened RPCs, then normalize extra-class and supplemental sessions to one source-neutral `AttendanceActivity` shape for frontend consumers. Install the supplemental UI as an isolated Attendance runtime module so a supplemental failure cannot break existing remedial/enrichment attendance.

**Tech Stack:** React 18, browser DOM runtime modules, Supabase/PostgreSQL RPCs/RLS, Node contract tests, Playwright/GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-11-supplemental-learning-attendance-design.md`

## Global Constraints

- `Học bổ sung` is not a `bes_extra_classes` row and must not add a third extra-class `class_type`.
- Only approved Admin accounts can manage supplemental identities, groups, sessions, memberships, or identity links.
- Existing `attendance:quick` remains the global attendance-operator permission; ordinary operators remain subject to `Giờ GV`.
- Admin/report bypass behavior remains unchanged; teacher/group assignment is never an attendance authorization requirement.
- Attendance actor (`checked_by`) remains separate from instructional teacher attribution.
- Historical student/session text is snapshotted and never rewritten by later profile, group, or membership changes.
- Cancelled sessions never create absences or enter attendance denominators.
- Existing `bes_extra_*` history is never rewritten or deleted.
- Database changes are additive and forward-only.
- Implementation is TDD-first; every production batch follows RED -> minimal implementation -> GREEN on the exact branch head.

---

### Task 1: Supplemental persistence, authorization, and atomic attendance RPCs

**Files:**
- Create: `supabase/migrations/20260911_supplemental_learning_attendance.sql`
- Create: `scripts/test-supplemental-learning-database-contract.mjs`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- Produces tables `bes_supplemental_students`, `bes_supplemental_groups`, `bes_supplemental_group_memberships`, `bes_supplemental_sessions`, `bes_supplemental_session_participants`.
- Produces management RPCs `bes_list_supplemental_admin_data`, `bes_upsert_supplemental_student`, `bes_link_supplemental_student`, `bes_upsert_supplemental_group`, `bes_set_supplemental_membership`, `bes_upsert_supplemental_session`, `bes_cancel_supplemental_session`.
- Produces attendance RPCs `bes_list_supplemental_attendance`, `bes_begin_supplemental_attendance`, `bes_confirm_supplemental_attendance`.
- Produces read RPCs `bes_list_attendance_activities`, `bes_list_supplemental_history`, `bes_supplemental_student_report`.

- [ ] **Step 1: Write the failing database contract.** Assert the migration contains five dedicated tables; explicit checks for `scheduled|in_progress|confirmed|cancelled`, `recurring|adhoc`, effective-date membership, frozen roster, canonical identity, unique session/canonical participant, Admin-management gate, `public.can_take_extra_class_attendance()` attendance gate, central time decision reuse, server `clock_timestamp()`, cancelled-session rejection, and no writes to existing `bes_extra_*` tables.

```js
assert.match(sql, /create table if not exists public\.bes_supplemental_students/i);
assert.match(sql, /create table if not exists public\.bes_supplemental_groups/i);
assert.match(sql, /create table if not exists public\.bes_supplemental_group_memberships/i);
assert.match(sql, /create table if not exists public\.bes_supplemental_sessions/i);
assert.match(sql, /create table if not exists public\.bes_supplemental_session_participants/i);
assert.match(sql, /can_take_extra_class_attendance\(\)/i);
assert.doesNotMatch(sql, /insert\s+into\s+public\.bes_extra_/i);
```

- [ ] **Step 2: Wire the contract into Critical E2E and verify RED on the exact PR head.**

Run in CI: `node scripts/test-supplemental-learning-database-contract.mjs`
Expected: FAIL because the migration/RPC implementation does not exist yet.

- [ ] **Step 3: Implement the additive migration.** Harden public RPCs with `security definer` and `set search_path = ''`; use a private Admin assertion helper; keep table access behind RLS/RPCs; make roster freezing and confirm transactional; derive actor/time on the server; enforce one canonical student per session.

- [ ] **Step 4: Verify GREEN and existing attendance contracts.**

Run in CI:
```bash
node scripts/test-supplemental-learning-database-contract.mjs
node scripts/test-attendance-time-access-control.mjs
node scripts/test-global-attendance-operator-permission.mjs
```
Expected: PASS.

### Task 2: Source-neutral AttendanceActivity adapter

**Files:**
- Create: `src/attendance/attendanceActivity.js`
- Create: `src/attendance/supplementalLearningApi.js`
- Create: `scripts/test-supplemental-learning-activity-contract.mjs`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- `normalizeSupplementalActivity(row)` -> `{ id, source:'supplemental', activityType:'supplemental', title, subject, teacherName, date, timeRange, room, participantCount, status, supplementalKind }`.
- `normalizeExtraClassActivity(row)` preserves `remedial|enrichment` source labels without changing the existing write path.
- `loadSupplementalAttendanceActivities(client, range)` calls `bes_list_supplemental_attendance` and returns normalized rows.

- [ ] **Step 1: Add failing source-contract tests** for the exact adapter shape, the `HỌC BỔ SUNG` label, `Nhóm dài ngày` / `Phát sinh`, and absence of `bes_extra_classes` writes.
- [ ] **Step 2: Verify RED** with `node scripts/test-supplemental-learning-activity-contract.mjs`.
- [ ] **Step 3: Implement the adapter/API modules** with no DOM assumptions and no authorization decisions in the browser.
- [ ] **Step 4: Verify GREEN** plus production build in Critical E2E.

### Task 3: Admin-only Supplemental Learning management workspace

**Files:**
- Create: `src/supplementalLearningBootstrap.js`
- Create: `src/styles/SupplementalLearning.css`
- Create: `scripts/test-supplemental-learning-admin-ui-contract.mjs`
- Modify: `src/applicationBootstrap.jsx`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- Runtime installs only when an Attendance workspace is present.
- Adds one Admin-only navigation control labeled `Học bổ sung` adjacent to attendance management controls.
- Renders two primary actions: `Tạo nhóm học bổ sung` and `Tạo buổi phát sinh`.
- Uses Task 1 RPCs only; non-Admin UI is absent, while server authorization remains authoritative.

- [ ] **Step 1: Add failing UI contract** asserting the Admin-only tab, the two creation flows, manual reusable student flow, official-student linking action `Liên kết với học sinh chính thức`, and effective-stop prompt `Ngừng tham gia từ ngày nào?`.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement isolated runtime + CSS.** Load it lazily from `applicationBootstrap.jsx`; render forms/dialogs without changing existing extra-class management DOM; search official students through server-provided normalized student candidates and reusable manual identities.
- [ ] **Step 4: Verify GREEN/build.**

### Task 4: Unified daily calendar and supplemental quick attendance

**Files:**
- Create: `src/supplementalAttendanceQuickBootstrap.js`
- Create: `scripts/test-supplemental-learning-quick-attendance-contract.mjs`
- Modify: `src/applicationBootstrap.jsx`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- Supplemental daily cards carry `data-bes-attendance-source="supplemental"` and `data-bes-supplemental-session-id`.
- Opening a supplemental card calls `bes_begin_supplemental_attendance`, receives the authoritative frozen participant snapshot, and renders present/absent/tardy using the same interaction semantics as extra-class attendance.
- Confirmation calls `bes_confirm_supplemental_attendance`; browser never supplies authoritative actor/time.

- [ ] **Step 1: Add failing contract** for unified card labels, source/session data attributes, begin/confirm RPC names, status values, evidence/note fields, and the explicit absence of teacher-identity authorization.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement card injection and source-neutral supplemental roll call.** Respect existing `attendance:quick` + `Giờ GV` client affordance while relying on server enforcement for authority.
- [ ] **Step 4: Verify GREEN** with existing time-access and operator-permission contracts.

### Task 5: Unified History, report filtering, and supplemental PDF semantics

**Files:**
- Create: `src/supplementalAttendanceReportingBootstrap.js`
- Create: `scripts/test-supplemental-learning-reporting-contract.mjs`
- Modify: `src/applicationBootstrap.jsx`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- Adds activity filter values `all`, `remedial`, `enrichment`, `supplemental` to History/Report surfaces.
- Supplemental-only reports use title `BÁO CÁO HỌC BỔ SUNG KIẾN THỨC`.
- Student aggregation uses canonical linked identity for grouping but historical snapshot text for rendered rows.
- Combined totals occur only after explicit `all` selection; default existing remedial/enrichment report totals remain unchanged.

- [ ] **Step 1: Add failing reporting contract** for filter labels/values, supplemental report title, canonical aggregation, cancelled-session denominator exclusion, and explicit combined-mode behavior.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement isolated History/Report augmentation** backed by Task 1 read RPCs; do not mutate legacy session rows.
- [ ] **Step 4: Verify GREEN/build.**

### Task 6: End-to-end regression and release-ready PR

**Files:**
- Create: `tests/e2e/supplemental-learning-attendance.spec.js`
- Modify: `.github/workflows/critical-e2e.yml`

**Interfaces:**
- Browser contract verifies the visible supplemental management and daily-attendance integration without requiring production data mutation.

- [ ] **Step 1: Add Playwright coverage** for Admin `Học bổ sung` navigation, recurring/ad-hoc entry points, card label rendering, and History activity filter.
- [ ] **Step 2: Run full Critical E2E on Chromium and WebKit** plus all supplemental Node contracts.
- [ ] **Step 3: Verify the exact branch head has green Frontend Build, Critical E2E, and attendance guard workflows.**
- [ ] **Step 4: Review the PR diff for forbidden changes:** no existing attendance-history deletion, no new Giám thị role, no teacher-assignment authorization, no supplemental rows inserted into `bes_extra_classes`.

## Self-review result

- Spec coverage: identity reuse/linking, recurring/ad-hoc flows, Admin-only management, global quick operator + Giờ GV, roster snapshotting, unified calendar/history/reporting, PDF title, cancellation semantics, and production compatibility all map to explicit tasks above.
- Placeholder scan: no TBD/TODO/"implement later" placeholders remain.
- Type/name consistency: `supplemental`, `recurring|adhoc`, `scheduled|in_progress|confirmed|cancelled`, RPC names, `AttendanceActivity`, and `data-bes-*` integration names are consistent across tasks.
