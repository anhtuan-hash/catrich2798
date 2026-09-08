# Gifted classes 2026–2027 + deletion controls

## Scope

Create only grade 10, 11 and 12 gifted/enrichment classes from the supplied 2026–2027 teacher schedule and student roster. Do not create grades 6–9, generic KHTN rows, or ungraded sport/art rows.

## Data behavior

- Create 23 gifted classes: Mathematics 10/11/12/12 Casio; Literature 10/11/12; Physics 10/11/12; Chemistry 10/11/12; Biology 10/12; English 10/11/12; History 10/11/12; Geography 11/12.
- Preserve every student membership listed in the student source even when the teacher schedule's expected headcount differs.
- Do not fabricate Geography students because the student source contains no Geography rows.
- Preserve every teacher listed for each class, including name-only teachers who do not currently have a profile account.
- Keep the existing primary teacher fields for backwards compatibility while adding a normalized multi-teacher relation.
- Store source schedule metadata (school year, grade, expected count, periods/week, room, weekdays, time) on each imported class.
- Seed idempotently using a stable source key so rerunning the migration does not duplicate classes or memberships.

## Delete behavior

- Admins may permanently delete an extra class after explicit UI confirmation.
- Deleting a class removes its attendance records, attendance sessions, roster memberships and class-teacher assignments in one server-side transaction, then removes the class.
- Admins may permanently delete an already-approved attendance session after explicit UI confirmation; its per-student records are deleted in the same transaction.
- No direct client DELETE policies are added for immutable attendance snapshots; deletion goes through security-definer RPCs guarded by the existing admin predicate.

## UI

- Management view shows all teachers for the selected class and a destructive “Xóa lớp” control.
- History detail shows a destructive “Xóa buổi điểm danh” control.
- On successful deletion, refresh data and clear stale class/session selection.

## Verification

- Contract test must prove the two deletion RPCs are wired in SQL and UI.
- Seed contract must prove exactly 23 grade-10/11/12 classes, 154 memberships and 52 teacher-class assignments, with no forbidden grade.
- Run the frontend contract suite and production build.
- Verify live Supabase row counts and deletion RPC signatures before final completion claim.