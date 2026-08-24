# Brian Reports 1.0 — production setup

The application code for monthly teacher reporting is already integrated into Brian Team. Database activation follows the same manual Supabase SQL Editor deployment convention already used by this repository.

## Required order

Open Supabase → SQL Editor and run each file in a separate query:

1. `supabase/brian-monthly-reports-preflight.sql`
   - Read-only dependency check.
   - Expected final message: `READY: monthly reports migration dependencies are present`.

2. `supabase/brian-monthly-reports.sql`
   - Creates `department_monthly_reports`.
   - Creates the trusted Brian Team membership/context functions.
   - Enables RLS and teacher/TTCM policies.
   - Safe to rerun.

3. `supabase/brian-monthly-reports-verify.sql`
   - Read-only installation check.
   - Expected final message: `READY: Brian monthly reports database objects are installed`.

## Acceptance test after migration

1. Sign out and sign back in to one teacher account already assigned to a department in Brian Team.
2. Open **Brian Team → Báo cáo tháng**.
3. Confirm teacher name, department, teaching classes and homeroom class (when applicable) are resolved automatically.
4. Complete the seven required report groups, save a draft, then submit it.
5. Confirm the submitted report becomes locked for the teacher.
6. Sign in as the TTCM account that owns the department.
7. Open **Brian Team → Báo cáo tháng** and confirm the teacher appears as **Đã gửi**.
8. Test **Yêu cầu chỉnh sửa**; confirm the teacher sees the TTCM comment and can edit/resubmit.
9. Test **Duyệt báo cáo**.
10. Click **Tạo báo cáo tổ**, then test **Xuất Word** and **In / PDF**.
11. Confirm a recommendation marked **Chỉ TTCM xem** is visible in the TTCM detail view but is not included in the generated department report.

## Data flow

`Teacher account → structured monthly report → department_monthly_reports → TTCM dashboard → review/revision/approval → generated department report`

Draft reports are saved to the teacher account/device but are hidden from a normal TTCM until submitted. Report routing is derived from the teacher's existing Brian Team membership rather than a free-text TTCM selector.

## Rollback

The UI fails soft if the migration is not installed: teachers can still open the form but cloud submission is blocked with a warning. Do not delete existing Brian Team data. If the feature needs to be disabled temporarily, leave the database objects in place and revert only the Brian Team portal route/UI commit.
