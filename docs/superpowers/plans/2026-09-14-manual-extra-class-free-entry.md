# Manual extra-class free-entry implementation plan

**Goal:** Replace the forced predefined assignment selector in manual Phụ đạo/Bồi dưỡng class creation with direct user-entered fields.

**Scope:** Manual creation only. Keep existing permission boundaries and the Excel import behavior unchanged.

## Behavior

1. Keep the class type selector (`Phụ đạo` / `Bồi dưỡng HSG`).
2. Let the user type the class name, subject, grade, school year and teacher names directly.
3. Accept one or more teacher names separated by comma, semicolon or line break; normalize and de-duplicate before saving.
4. Keep using `bes_create_extra_class_with_teachers` so normalized class-teacher rows remain transactional.
5. Generate a unique manual `source_key` internally; do not expose or force an assignment catalog choice.
6. Validate required fields client-side and keep grade restricted to 10/11/12 because the existing backend contract supports those grades.

## TDD

1. Update the existing manual-class persistence contract first so it fails against the assignment-driven UI.
2. Replace the assignment-driven form with free-entry fields.
3. Run the manual persistence contract, report-access creation contract and production build.
4. Verify CI and Vercel before merge.
