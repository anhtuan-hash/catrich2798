# Gifted Classes 2026–2027 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the supplied 2026–2027 grade 10–12 gifted classes with complete rosters/teacher assignments and add safe deletion of classes and approved attendance sessions.

**Architecture:** Extend the existing `bes_extra_*` schema additively: retain legacy primary-teacher columns, add normalized class-teacher assignments and schedule metadata, and expose two admin-only transactional deletion RPCs. Seed the source data idempotently. Update the existing attendance admin UI to display all teachers and call the new RPCs.

**Tech Stack:** React, Supabase/PostgreSQL, Node contract tests, GitHub Actions, Vite.

**Spec:** `docs/superpowers/specs/2026-09-08-gifted-classes-2026-delete-attendance.md`

## Global Constraints

- Only grades 10, 11, 12 may be seeded.
- Source student membership wins over conflicting expected headcounts.
- Geography 11/12 are created without fabricated students.
- Existing remedial classes and historical attendance must remain untouched.
- Destructive actions remain admin-only and require confirmation.

---

### Task 1: Regression contract

**Files:**
- Modify: `scripts/test-extra-class-attendance.mjs`

**Interfaces:**
- Consumes existing attendance component and SQL.
- Produces failing assertions for deletion RPC/UI wiring and seed invariants.

- [ ] Write assertions for `bes_delete_extra_class`, `bes_delete_extra_attendance_session`, UI labels/calls, multi-teacher support, and seed counts 23/154/52.
- [ ] Run `node scripts/test-extra-class-attendance.mjs`; verify it fails because the new behavior is absent.
- [ ] Commit the red test.

### Task 2: Schema + deletion RPCs

**Files:**
- Modify: `supabase/extra-class-attendance.sql`
- Create: `supabase/migrations/20260908_gifted_classes_2026_delete_attendance.sql`

**Interfaces:**
- Produces `bes_extra_class_teachers`, schedule metadata columns, `bes_delete_extra_class(uuid)`, and `bes_delete_extra_attendance_session(uuid)`.

- [ ] Add the normalized teacher table and indexes/RLS read policy.
- [ ] Add source/schedule columns to `bes_extra_classes`.
- [ ] Add admin-only security-definer deletion RPCs that delete dependent rows transactionally.
- [ ] Grant only required execute/select permissions.
- [ ] Run contract test; deletion/schema assertions should turn green while UI/seed assertions remain red.

### Task 3: Idempotent 2026–2027 source seed

**Files:**
- Create/extend: `supabase/migrations/20260908_gifted_classes_2026_delete_attendance.sql`

**Interfaces:**
- Inserts 23 classes, 154 memberships and 52 class-teacher assignments using stable source keys and the existing approved admin actor.

- [ ] Seed 23 `gifted` classes with source schedule metadata.
- [ ] Seed every roster membership from the supplied student file; generate deterministic member keys from student name + school class.
- [ ] Seed all teacher-class assignments, retaining the first teacher in legacy primary fields.
- [ ] Add SQL guard clauses that fail the migration if class/teacher/member counts or grade scope are wrong.
- [ ] Run contract test and verify seed assertions pass.

### Task 4: Admin UI controls and multi-teacher display

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify if needed: `src/components/GlobalAttendanceNavigationTab.css`

**Interfaces:**
- Calls `bes_delete_extra_class` and `bes_delete_extra_attendance_session`.
- Reads `bes_extra_class_teachers` and renders teacher names.

- [ ] Load class-teacher assignments alongside classes/members/sessions.
- [ ] Render all teacher names for selected/imported seeded classes while preserving legacy fallback.
- [ ] Add confirmed “Xóa lớp” action in class management; clear stale selections and reload after success.
- [ ] Add confirmed “Xóa buổi điểm danh” action in history detail; clear stale record/session state and reload after success.
- [ ] Run contract test and verify all assertions pass.

### Task 5: Live migration, verification and release

**Files:**
- No additional production files unless verification finds a defect.

**Interfaces:**
- Applies the checked-in migration to Supabase and deploys merged frontend through existing Vercel integration.

- [ ] Execute the migration on Supabase.
- [ ] Verify exactly 23 seeded grade-10/11/12 gifted classes, 154 active seeded membership rows and 52 teacher assignments.
- [ ] Verify deletion RPC signatures and permissions without deleting seeded production data.
- [ ] Run `node scripts/test-extra-class-attendance.mjs` and the repository production build through GitHub Actions.
- [ ] Open PR, inspect diff, merge only after checks pass.
- [ ] Verify production deployment status and query Supabase again after merge.
