# Homeroom 4.0 — Phase 5: Three-source Records Review

Stage 5 (15%). Scope: Homeroom student records UI, no database migrations.

## Implemented
- Colorful Bento status header for accurate, inspectable totals: **fully reviewed**, **needs review**, **has recorded source conflicts or missing MOET citizen ID**, **teacher marked verified**.
- Explicit counts of mandatory paper documents and presence of vnEdu/MOET sources, grade-aware.
- Five linked filters on existing list. On missing sources, do not manufacture conflicting values.
- Paper checklist percentage in the student ring replaces the old weighted heuristic that treated numbers of populated fields as a "95% complete" threshold.
- Source values normalized for accents, spaces, case, and birth-date ISO/Vietnamese representation; compare mismatches only when at least two sources actually contain a field.
- A manual verified marker alone never makes a record **complete** if documents are missing, digital sources absent or conflicts remain.
- Existing OCR, media privacy, Excel source imports, manual edits and history remain. The comparison warnings now reuse the same normalized mismatch detector as the review dashboard, so absent MOET data is classified as missing rather than falsely "conflicting".

## Data protection
- No student records migrated, no changes to Supabase RLS, no third-party analytics or AI.
- Missing source is differentiated from conflicting source.
- Phase 5 dashboard is read-only; clicks only set the existing local filter.
- Legacy existing comparison screen and history retained, not deleted or rewired.
- Still requires signed-in, role-scoped visual QA for cloud-only users before full production certification.

## Validation
Run `node scripts/test-homeroom-4-phase-5.mjs`, prior stage tests 1–4, safety regression, build, preview.
