# Attendance Daily Lock & Monthly Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one attendance session per class per Vietnam calendar day, capture the actual assigned teacher for each session, and provide a class/month attendance calendar.

**Architecture:** Supabase is the source of truth for the daily lock and teacher validation. The React attendance workspace derives eligible teachers from normalized `bes_extra_class_teachers`, queries monthly sessions directly, and renders locked daily attendance and a dedicated monthly calendar tab.

**Tech Stack:** React, Supabase/Postgres PL/pgSQL, existing Vite frontend, GitHub Actions regression contract.

**Spec:** `docs/superpowers/specs/2026-09-08-attendance-daily-lock-monthly-calendar-design.md`

## Global Constraints
- Attendance day uses `Asia/Ho_Chi_Minh` semantics.
- One `(class_id, attendance_date)` only; database unique constraint is authoritative.
- Future attendance dates are rejected.
- Teacher choices come only from the class's authoritative assignment rows, never website accounts.
- Deleting a session unlocks that class/date.
- Admin-only write/delete permissions remain unchanged.

---

### Task 1: Add regression contract for date lock, session teacher, and month calendar

**Files:**
- Modify: `scripts/test-extra-class-attendance.mjs`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Consumes: existing attendance component and SQL migration files.
- Produces: failing assertions for the new database and UI contract.

- [ ] **Step 1: Write failing assertions**

Add assertions that require `attendance_date`, a unique `(class_id, attendance_date)` lock, confirm-RPC parameters `p_attendance_date` and `p_teacher_name`, assigned-teacher validation against `bes_extra_class_teachers`, UI text `Giáo viên dạy hôm nay`, `Đã chốt`, `Lịch tháng`, an `<input type="date">`, an `<input type="month">`, and no website-account teacher RPC.

- [ ] **Step 2: Run RED**

Run through the existing Frontend Build workflow.
Expected: `Verify extra-class attendance contract` fails because the new contract is not implemented.

- [ ] **Step 3: Commit test-only RED**

Commit message: `test: require daily attendance lock and monthly calendar`.

### Task 2: Add Supabase daily-lock migration and server validation

**Files:**
- Create: `supabase/migrations/20260908_attendance_daily_lock_monthly_calendar.sql`
- Modify: `supabase/extra-class-attendance.sql`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Produces session field `attendance_date date` and RPC signature `bes_confirm_extra_class_attendance(uuid,date,text,text[],text)`.

- [ ] **Step 1: Add migration**

Migration must:
1. add nullable `attendance_date` if missing;
2. backfill existing sessions with `(checked_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;
3. set it NOT NULL;
4. create a unique index on `(class_id, attendance_date)`;
5. replace the confirm RPC with date + teacher parameters;
6. reject future dates using Vietnam local date;
7. validate `p_teacher_name` against active class assignment rows in `bes_extra_class_teachers`;
8. store `p_teacher_name` in the session snapshot;
9. map unique violation to a clear duplicate-day exception;
10. grant authenticated execute and revoke anon execute.

- [ ] **Step 2: Mirror durable schema in base SQL**

Update `supabase/extra-class-attendance.sql` so fresh installs receive the same session column, index, RPC signature, validation and grants.

- [ ] **Step 3: Run contract until SQL assertions pass**

Expected: SQL assertions pass; UI assertions remain RED.

- [ ] **Step 4: Commit**

Commit message: `feat: lock extra-class attendance by date`.

### Task 3: Implement date-aware quick attendance and teacher selection

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Consumes: `classTeachers`, new `attendance_date`, confirm RPC with date/teacher.
- Produces: selected date state, selected session teacher, locked-state UI.

- [ ] **Step 1: Add state and helpers**

Add Vietnam-local date helpers, `attendanceDate`, `sessionTeacher`, `selectedDaySession`, and assigned-teacher list for the selected class.

- [ ] **Step 2: Make confirmation date/teacher-aware**

Call `bes_confirm_extra_class_attendance` with `p_attendance_date` and `p_teacher_name`. Disable confirmation for future dates, missing teacher, empty roster, busy state, or an existing session for that class/date.

- [ ] **Step 3: Add locked-state UX**

Add date input, required `Giáo viên dạy hôm nay` select for multi-teacher classes, fixed one-teacher display for single-teacher classes, and a locked panel/button state that says `Đã chốt DD/MM/YYYY`, teacher, and exact confirmation time.

- [ ] **Step 4: Run contract and production build**

Expected: quick-attendance UI assertions pass and build succeeds.

- [ ] **Step 5: Commit**

Commit message: `feat: make quick attendance date and teacher aware`.

### Task 4: Add direct monthly calendar query and UI

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`
- Test: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Produces `Lịch tháng` tab, month-scoped query results and calendar cells.

- [ ] **Step 1: Add month state and query**

Use `calendarMonth` (`YYYY-MM`) and query `bes_extra_attendance_sessions` by selected class plus `[monthStart, nextMonthStart)` on `attendance_date`, independent of the 400-session history list.

- [ ] **Step 2: Build Monday–Sunday calendar grid**

Generate leading/trailing blank cells, mark today, and render confirmed dates with check mark, teacher and `present/total`.

- [ ] **Step 3: Link confirmed calendar dates to history detail**

Clicking a confirmed day must set/open the matching session detail in History.

- [ ] **Step 4: Run contract and build**

Expected: all attendance contract checks and production build pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add monthly attendance calendar`.

### Task 5: Apply production migration, verify, merge and deploy

**Files:**
- No new production code beyond prior tasks.

**Interfaces:**
- Validates production Supabase and Vercel deployment.

- [ ] **Step 1: Run full CI**

Require Frontend Build, Critical E2E, Supabase Egress P0/P1/P2 guards all green.

- [ ] **Step 2: Apply migration to production Supabase**

Use `apply_migration` on project `xpkbgqdlfonsinriggmj` with the checked-in migration SQL.

- [ ] **Step 3: Verify database contract**

Query `information_schema`/`pg_indexes`/`pg_proc` to confirm `attendance_date`, unique class/date index, new RPC signature, and no duplicate class/date rows.

- [ ] **Step 4: Open and merge PR**

Merge only after green CI and production DB verification.

- [ ] **Step 5: Verify Vercel production**

Check the merge commit status until Vercel reports `success`.