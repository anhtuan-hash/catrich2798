# Attendance Class Teacher Editing Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow Admins and users granted `attendance:manage` to replace the assigned teacher list while editing an extra attendance class, with normalized teacher rows as the current source of truth and confirmed attendance history left unchanged.

**Architecture:** Extend the existing class editor to edit an ordered `teacher_names` array and save it through a dedicated SECURITY DEFINER RPC. The RPC validates `can_manage_extra_class_roster()`, replaces `bes_extra_class_teachers` rows and mirrors the joined names onto `bes_extra_classes.teacher_name` in the same transaction. The frontend resolves normalized teacher rows first; the static gifted catalog remains fallback only for classes that have no normalized assignments.

**Tech Stack:** React, Supabase/PostgreSQL migrations, Node static contract tests, GitHub Actions, Vercel.

---

### Task 1: Lock the behavior with a failing regression

**Files:**
- Modify: `scripts/test-attendance-class-edit-sync.mjs`

**Step 1:** Add assertions for the teacher chips/editor, `p_teacher_names`, normalized-first resolution, the new backend RPC, Manage authorization, atomic teacher-row replacement, class mirror update, and historical-session preservation.

**Step 2:** Open a draft PR and verify the Frontend Build fails specifically because the approved teacher-edit behavior is not implemented yet.

### Task 2: Implement source-of-truth class teacher editing

**Files:**
- Modify: `src/components/attendance/AttendanceClassEditor.jsx`
- Modify: `src/components/attendance/AttendanceClassEditor.css`
- Modify: `src/components/attendance/AttendanceClassManagementWorkspace.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Create: `supabase/migrations/20260910_attendance_edit_class_teachers.sql`

**Step 1:** Pass the selected class teacher-name array from the global attendance source through the management workspace into the editor.

**Step 2:** Add removable teacher chips plus an add-teacher input inside `Sửa thông tin lớp`; require at least one teacher and prevent duplicate names case-insensitively.

**Step 3:** Save class metadata and the full teacher list through `bes_update_extra_class_with_teachers`.

**Step 4:** Add the RPC migration. Enforce `can_manage_extra_class_roster()`, normalize/dedupe names, lock the active class, replace normalized teacher rows, mirror `teacher_name`, revoke public/anon execution, grant authenticated execution, and never touch attendance session/record snapshots.

**Step 5:** Make normalized `bes_extra_class_teachers` rows authoritative whenever present; only consult the static gifted catalog / legacy class field if no normalized rows exist.

### Task 3: Verify and release

**Files:**
- Verify all changed files above.

**Step 1:** Confirm the focused regression passes.

**Step 2:** Confirm Frontend Build, Critical E2E, and the repository P0/P1/P2 gates pass on the final PR head.

**Step 3:** Review the changed-file list and final diff, then mark the PR ready and merge only the verified head SHA.

**Step 4:** Apply/confirm the Supabase migration through the connected project when available, in a rollout-safe order.

**Step 5:** Wait for the Vercel commit status on the merge commit to report deployment success before reporting production completion.
