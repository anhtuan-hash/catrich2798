# Attendance Daily Teacher & History Delete Implementation Plan

> Execution target: `feat/attendance-manual-daily-teacher` → `main`

## Goal

Make the extra-class attendance module use a manually entered teacher name per class per Vietnam-local teaching date, persist it in Supabase, snapshot it into each attendance session, and let Admin delete an attendance session from History atomically.

## Task 1 — Lock behavior with failing contracts

**Files**
- Modify/create the existing attendance contract test under `tests/` or `scripts/` after locating its exact path.
- If no dedicated source-level contract exists, create `tests/extra-class-attendance-daily-teacher-contract.mjs` and wire it into the existing attendance/critical CI command.

**Checks to add**
1. `GlobalAttendanceNavigationTab.jsx` must not call `bes_extra_attendance_list_teachers`.
2. The component must read/write `bes_extra_class_daily_teachers`.
3. Quick Attendance must gate confirmation when today's teacher is missing.
4. History must call `bes_delete_extra_attendance_session` behind a confirmation.
5. `supabase/extra-class-attendance.sql` must define the daily teacher table, unique `(class_id, teaching_date)`, session `teaching_date`, updated confirm RPC, and delete RPC.
6. No direct DELETE policy is added for session/record tables.

Run the relevant CI/test command and verify RED before implementation.

## Task 2 — Make import/class identity independent from teacher accounts

**Files**
- Modify: `src/utils/extraClassAttendance.js`
- Modify relevant utility tests if present.

**Changes**
- Teacher/email columns remain accepted for backwards-compatible spreadsheets but are optional and ignored for class identity.
- Remove teacher-required validation.
- Group by `class_type + class_name + subject` only.
- Keep student parsing/member keys unchanged.

**Verification**
- Existing template rows still parse.
- A file with no teacher column parses successfully.
- Same class with different old teacher cells does not create duplicate class groups.

## Task 3 — Extend Supabase schema and RPCs

**File**
- Modify: `supabase/extra-class-attendance.sql`

**Changes**
1. Create `bes_extra_class_daily_teachers` with Admin-only RLS and unique `(class_id, teaching_date)`.
2. Add/backfill/require `bes_extra_attendance_sessions.teaching_date` using `Asia/Ho_Chi_Minh`.
3. Change active class uniqueness to type/name/subject, after production duplicate check.
4. Update `bes_confirm_extra_class_attendance` so it:
   - derives today's Vietnam-local date on the server,
   - requires a saved daily teacher assignment,
   - snapshots `teaching_date` and `teacher_name`,
   - writes `teacher_id = NULL`, `teacher_email = ''` for new sessions.
5. Add Admin-only `bes_delete_extra_attendance_session(uuid)` security-definer RPC; deleting the session cascades records.
6. Explicitly revoke `public`/`anon` execute and grant authenticated execute only for sensitive RPCs.

**Verification**
- SQL contract passes.
- Production preflight duplicate query is clean or duplicates are resolved deliberately before applying the new unique index.

## Task 4 — Update the attendance workspace UI/data flow

**Files**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.css`

**Data flow changes**
- Remove `teachers` state, teacher-account RPC, `teacherLabel`, `resolveTeacher`, and account dropdown updates.
- Load daily teacher assignments for relevant classes/dates from `bes_extra_class_daily_teachers`.
- Add helpers/state for Vietnam-local date, selected assignment date, manual teacher name, save/upsert operation.
- Import classes with `teacher_id=null`, `teacher_name=''`, `teacher_email=''`; no account resolution or skip warning.

**Manage view**
- Replace account `<select>` with date input + text input + `Lưu giáo viên`.
- Persist with Supabase upsert on `(class_id, teaching_date)`.
- Show persisted value when class/date changes.

**Quick view**
- Show today's saved manual teacher.
- Let Admin edit/save it inline.
- Disable `Xác nhận điểm danh` while today's teacher is missing.
- Use server RPC for final validation/snapshot.

**History view**
- Show teaching date + teacher snapshot + recorded timestamp.
- Add destructive `Xóa điểm danh` action.
- Confirm using `window.confirm` before RPC.
- Refresh sessions/records after successful deletion.

## Task 5 — Regression verification on feature branch

Run/inspect:
- attendance contract
- utility tests
- frontend production build
- Critical E2E / existing production-gate checks
- Vercel preview deployment

Expected: all GREEN, no increase in Serverless Function count.

## Task 6 — Apply production database migration safely

1. Query active class duplicates under the new identity `(class_type, lower(class_name), lower(subject))`.
2. If none, apply migration from the finalized SQL to Supabase project `xpkbgqdlfonsinriggmj`.
3. Verify:
   - daily teacher table exists and has RLS,
   - session teaching_date exists/not-null,
   - RPC execute privileges are authenticated-only,
   - no direct session/record DELETE policy exists,
   - existing classes/members/sessions remain intact.

## Task 7 — Review, merge, and production verification

1. Open PR from `feat/attendance-manual-daily-teacher` to `main`.
2. Review changed files and CI status.
3. Merge only after required checks pass.
4. Verify Vercel production is Ready and alias points to the merged commit.
5. Verify production bundle includes daily teacher table usage and delete-history RPC call.
6. Report exact PR/commit/migration status to the user.