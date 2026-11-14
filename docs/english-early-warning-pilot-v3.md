# English Early Warning & Intervention — V3 pilot specification

Status: **feature branch; privacy-first teacher review pilot**. Scope: THPT Grade 11, adaptable to Grades 10/12. This is NOT a production cohort database, independently validated instrument or proof of improved English attainment.

## Entry
Log in to BRIAN ENGLISH with access to Student Support Center, then choose the **English Early Warning** tab at `#/student-support?tab=english`.

## CSV import (UTF-8)
Required headers: `student_id,listening,speaking,reading,writing`. Other supported columns: `recent1,recent2,missing14d,post_listening,post_speaking,post_reading,post_writing`. A header-only CSV template downloads inside the app.

Use **study-only pseudonyms** P001, P002, etc. Never upload names, emails, original student codes, class names, birthdates or contact information. Use a separately controlled mapping held by the authorized institution, outside this feature. Scores are 0–100; `missing14d` is a nonnegative integer. Absences of scores are `null`, never zero. Maximum 120 rows and 250 KB. Input remains in React memory, not Supabase, browser storage, analytics or an AI service.

## Frozen rule version 0.1 (same as Excel THAM_SO)
- D: `mean(listening,speaking,reading,writing) < 60` or weakest skill `< 50`.
- F: **both** recent grades `< 60`.
- T: missed tasks in 14 days `>= 2`.
- 2+ flags = **Priority review**; 1 = **Review suggested**; 0 = **No current signal**.
- Any missing signal input = **Insufficient data** (never imputed as a negative or a zero).
- Post rubric provisional target: complete post 4-skills mean >=60 and weakest skill >=50. Form A/B comparability must be piloted.
- No model predicted probabilities, no automatic intervention assignment. Teacher explicitly confirms or does not confirm with a coded review note.

## Export
- Coded evidence CSV: screening signals, teacher decision, baseline and post aggregate metrics; pseudonyms only.
- Aggregate CSV: no row IDs. Teacher reviews and imported data are erased on navigation or reload; save exports in a school-approved, access-controlled location.
- Protect any crosswalk mapping IDs to learners separately; do not publish individual student files as contest evidence.

## Acceptance checks
Run: `node scripts/test-english-early-warning.mjs`.
Manually verify: authorized route only; filter; keyboard focus; import validation; 0 is valid; blanks are incomplete; D/F/T match Excel; export spreadsheet injection escaping; session cleanup; 320/768/1440px layouts; no uploads/network on CSV import.

## Production readiness blockers
1. Approval/notice for personal data processing and an educational risk-impact review.
2. School-specific teacher-to-class authorization model.
3. Supabase RLS and security review for persisted records (not implemented in this V3).
4. A/B test-form equivalence check, assessor reliability where feasible, and pilot validation of thresholds.
5. Accessible oral/audio assets and score provenance before interpreting longitudinal outcomes.
6. No student data should be loaded into this feature without institutional approval. Do not present trial outcomes as achieved results.

Compatible with V2 workbook: `Sang_kien_Bo_cong_cu_Thu_thap_va_Canh_bao_Som.xlsx`, `BANG_CHAM_DIEM_CANH_BAO_TU_DONG_V2.xlsx`.
