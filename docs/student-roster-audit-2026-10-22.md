# ESL Brian — school-wide student roster integrity audit

Date: 2026-10-22 (Asia/Ho_Chi_Minh). Scope: school year 2026–2027.

## Authoritative records

- **27/27 classes** have a canonical roster `bes_class_rosters` with `roster_key=class:<school-year>||<class>`.
- **715 active unique student identities**, plus **3 inactive identities** (718 total records). Previous count 718 active was inflated by three duplicate JSON entries.
- Lesson Check reads the canonical list through assignment-checked RPCs. Teacher-specific gradebook/homeroom snapshots remain separate for their historic grades, comments and attendance data.

## Repair performed

| School class | Active rows before | Active identities after | Duplicate type |
| --- | ---: | ---: | --- |
| 10.5 | 29 | 28 | Exact identical student snapshot and same stable ID repeated |
| 10.10 | 28 | 27 | Exact identical student snapshot and same stable ID repeated |
| 12.8 | 27 | 26 | Exact identical student snapshot and same stable ID repeated |

Only exact, byte-equivalent duplicate JSON objects were collapsed. Other student records were unchanged. Updated canonical rosters, affected homeroom snapshots and affected gradebook snapshots as a transaction.

Before any changes, **15 original source rows** were copied into `bes_internal.student_roster_exact_duplicate_backups`, a private, non-API schema with all anonymous/authenticated grants revoked and RLS enabled. Restore only after reconciling intervening edits. Existing learning/attendance/assessment records were not erased.

The database now uses `bes_validate_canonical_student_identity` to reject repeated canonical `rosterStudentId` or class-local student codes. An explicit duplicate-write test confirmed the constraint works.

## Regression prevention

- School Excel parsing drops only fully identical repeated rows and rejects mismatched rows using the same code/identity.
- Existing browser snapshots are cleaned of fully identical legacy entries before a canonical roster update, without automatically collapsing conflicting statuses.
- Assigned-class editing updates only changed student fields with concurrent-write safeguards, offline retry, and identity-based reconciliation.
- Grades, conduct, extra-class enrollment, and assessments remain attached to their original student identities.
- CI workflow: `.github/workflows/student-roster-interoperability.yml`.

## Items deliberately not auto-reconciled

1. **11.4:** An older subject gradebook has 28 active rows while the canonical class list has 27; one no-code gradebook-only row needs human identity verification.
2. **12.6:** An older gradebook has 29 active rows while canonical is 28; one student's active/archive status differs. Confirm official enrollment status before changing it.
3. **Official headcount:** The original school blueprint totals 718, but the cleaned data contains 715 active unique identities. Do not fabricate three students to match a target count. Confirm the official school registry/source document.

## Verification summary

- Canonical 27 classes, 715 active unique identities, no duplicate IDs/codes after repair.
- 12.3 canonical active roster: 31 students.
- Admin Lesson Check query: 27 classes, 715 active students.
- Production website: `https://esl-brian.vercel.app`.
- Automated regression tests and production build should be consulted on GitHub Actions for the latest commit; CI may be queued at the time of this audit.

**Privacy:** This report intentionally excludes student names, birthdates, codes and teacher IDs.
