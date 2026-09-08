# Extra Class Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Admin-only remedial/gifted-class attendance module with Excel import, manual member add/remove, fast attendance confirmation, and immutable history.

**Architecture:** Add a focused utility module for roster normalization and attendance draft logic, a standalone navigation/workspace React component mounted after TTCM, and a Supabase SQL migration that owns membership lifecycle plus transactional attendance confirmation. Keep Homeroom/GVCN code untouched. Historical records snapshot student identity so current roster changes cannot corrupt prior sessions.

**Tech Stack:** React, Vite, Supabase/Postgres/RLS/RPC, `read-excel-file/browser`, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-09-08-extra-class-attendance.md`

## Global Constraints

- `Điểm danh` is independent from Homeroom/GVCN and appears immediately to the right of `TTCM`.
- Only approved Admin accounts can use the module.
- Import supports remedial and gifted classes and assigned teacher identity.
- Admin can add and remove students manually after import.
- Removing a student is non-destructive and never changes old attendance history.
- Attendance time comes from the database server when Admin confirms.
- No new heavy Excel dependency; use the already installed `read-excel-file/browser` package.

---

### Task 1: Lock the feature contract with a failing test

**Files:**
- Create: `scripts/test-extra-class-attendance.mjs`
- Modify: `.github/workflows/frontend-build.yml`

**Interfaces:**
- Consumes: repository source files.
- Produces: a CI contract that requires the SQL schema, independent navigation component, manual membership controls, server-timestamp RPC, and immutable-history fields.

- [ ] **Step 1: Write the failing contract test**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const flatNav = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const utility = fs.readFileSync(new URL('../src/utils/extraClassAttendance.js', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/extra-class-attendance.sql', import.meta.url), 'utf8');

assert.match(flatNav, /GlobalTtcmNavigationTab[\s\S]*GlobalAttendanceNavigationTab/, 'Attendance must mount immediately after TTCM');
assert.match(attendance, /Điểm danh nhanh/);
assert.match(attendance, /Quản lý lớp/);
assert.match(attendance, /Lịch sử/);
assert.match(attendance, /Thêm học sinh/);
assert.match(attendance, /Xóa khỏi lớp/);
assert.match(attendance, /readSheet/);
assert.match(utility, /parseExtraClassRosterRows/);
assert.match(utility, /buildAttendanceDraft/);
assert.match(sql, /bes_extra_class_members/);
assert.match(sql, /left_at timestamptz/);
assert.match(sql, /removed_by uuid/);
assert.match(sql, /bes_confirm_extra_class_attendance/);
assert.match(sql, /clock_timestamp\(\)/);
assert.match(sql, /bes_extra_attendance_records/);
assert.match(sql, /student_full_name text not null/);
console.log('Extra class attendance contract OK');
```

- [ ] **Step 2: Add the test to Frontend Build**

```yaml
- name: Verify extra-class attendance contract
  run: node scripts/test-extra-class-attendance.mjs
```

- [ ] **Step 3: Open a draft PR and verify RED**

Expected: Frontend Build fails because `GlobalAttendanceNavigationTab.jsx`, `extraClassAttendance.js`, and `extra-class-attendance.sql` do not yet exist.

### Task 2: Implement pure roster and draft helpers

**Files:**
- Create: `src/utils/extraClassAttendance.js`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Produces: `normalizeExtraClassType(value)`, `memberKey(student)`, `parseExtraClassRosterRows(rows)`, `buildAttendanceDraft(members)`, `attendanceSummary(draft)`.

- [ ] **Step 1: Extend the failing test with behavioral imports**

```js
const mod = await import('../src/utils/extraClassAttendance.js');
assert.equal(mod.normalizeExtraClassType('Phụ đạo'), 'remedial');
assert.equal(mod.normalizeExtraClassType('Bồi dưỡng HSG'), 'gifted');
const draft = mod.buildAttendanceDraft([{ id: 'm1', member_key: 'a' }, { id: 'm2', member_key: 'b' }]);
assert.deepEqual(mod.attendanceSummary(draft), { total: 2, present: 2, absent: 0 });
```

- [ ] **Step 2: Implement minimal pure functions**

The parser recognizes aliases for `Loại lớp`, `Tên lớp`, `Môn`, `Giáo viên`, `Mã HS`, `Họ và tên`, and `Lớp chính khóa`, rejects missing required identity fields, normalizes class type to `remedial|gifted`, and creates stable member keys from student code or normalized name/class fallback.

- [ ] **Step 3: Keep the contract test green locally/CI after implementation**

### Task 3: Add Supabase schema, lifecycle-safe membership, and transactional attendance RPC

**Files:**
- Create: `supabase/extra-class-attendance.sql`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Produces tables `bes_extra_classes`, `bes_extra_class_members`, `bes_extra_attendance_sessions`, `bes_extra_attendance_records`.
- Produces RPCs `bes_extra_attendance_list_teachers()` and `bes_confirm_extra_class_attendance(p_class_id uuid, p_absent_member_keys text[], p_note text default '')`.

- [ ] **Step 1: Define Admin guard**

Create `public.can_manage_extra_class_attendance()` as a security-definer function that requires `profiles.id = auth.uid()`, `approved = true`, and role `admin`.

- [ ] **Step 2: Create class and lifecycle membership tables**

Membership rows contain `active`, `joined_at`, `left_at`, `created_by`, `updated_by`, `removed_by`, `removal_reason`, and stable `member_key`. A partial unique index prevents duplicate active member keys per class.

- [ ] **Step 3: Create immutable session and record tables**

Attendance records snapshot `student_code`, `student_full_name`, and `school_class_name`. No cascade from membership deletion is allowed to remove records.

- [ ] **Step 4: Create transactional confirmation RPC**

The RPC locks/reads active members, inserts one session using `clock_timestamp()` for `checked_at`, inserts one present/absent record per active member, computes summary counts server-side, and returns the created session row.

- [ ] **Step 5: Add RLS and grants**

All CRUD/select policies require the Admin guard. Teacher-directory RPC is also Admin-guarded.

### Task 4: Build the independent Attendance navigation/workspace

**Files:**
- Create: `src/components/GlobalAttendanceNavigationTab.jsx`
- Create: `src/components/GlobalAttendanceNavigationTab.css`
- Modify: `src/components/GlobalFlatNavigation.jsx`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Consumes: `getRuntimeClient`, `useRuntimeCore`, `normalizeSystemRole`, `SYSTEM_ROLES`, `readSheet`, and helper functions from `extraClassAttendance.js`.
- Produces: a portal-mounted `Điểm danh` nav button and Admin-only full workspace.

- [ ] **Step 1: Mount after TTCM**

Import `GlobalAttendanceNavigationTab` and render it immediately after `<GlobalTtcmNavigationTab {...props} />`.

- [ ] **Step 2: Implement three workspace tabs**

`Điểm danh nhanh` lists active extra classes and supports one-click opening of the class roster. `Quản lý lớp` handles import and roster maintenance. `Lịch sử` lists saved sessions with absent student details.

- [ ] **Step 3: Implement Excel import**

Use `readSheet(file)` and `parseExtraClassRosterRows(rows)`. Upsert class metadata and memberships. Existing active matching members stay active; imported members are added/reactivated without deleting unrelated historical attendance.

- [ ] **Step 4: Implement manual add/remove**

`Thêm học sinh` inserts/reactivates membership after validating duplicate active membership. `Xóa khỏi lớp` updates membership to `active=false`, stamps `left_at`, `removed_by`, `updated_by`, and optional `removal_reason`; it never deletes the row.

- [ ] **Step 5: Implement fast attendance**

All active members default present. Admin toggles only absent members. `Xác nhận điểm danh` calls the server RPC with absent member keys; no browser timestamp is sent.

- [ ] **Step 6: Implement history**

Load sessions and records, filter by date/class/teacher/type, and render server `checked_at` plus the snapshot absent list.

### Task 5: Verification and integration

**Files:**
- Verify all files above.

**Interfaces:**
- Produces: a reviewable PR with passing CI and no Homeroom/GVCN changes.

- [ ] **Step 1: Run Frontend Build through the PR**

Expected: `test-extra-class-attendance.mjs` passes and production Vite build succeeds.

- [ ] **Step 2: Review changed-file list**

Confirm no Homeroom/GVCN implementation file is modified.

- [ ] **Step 3: Review SQL integrity**

Confirm current-roster removals do not cascade into attendance records and that `checked_at` is generated with server time.

- [ ] **Step 4: Mark PR ready only after CI is green**
