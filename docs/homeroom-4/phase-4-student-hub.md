# Homeroom 4.0 — Phase 4 Student Hub 360

Scope: GVCN Student tab on `#/homeroom` only. Subject-class UI remains unchanged.

## Features
- Search students by Vietnamese name (accent-insensitive), student code, student phone and parent name/phone.
- Filter active, archived, attention and priority students; sort by name or code.
- Four measured counters (active, attention, priority, archived).
- Responsive list and selected-student panel; actual attendance session counts, late/unexcused events, conduct records and paper verification snapshot.
- Edit/add form on demand, with duplicate code/name validation that prevents the legacy addStudent upsert from silently replacing a different student's record.
- Existing Excel/CSV import component retains its explicit duplicate review and upsert semantics; export all or selected students.
- Transfer, archive and restore via domain functions, with inline reason/confirmation; no permanent deletion and no direct database change.
- Existing student support link preserved.
- Component keyed by signed-in user and workspace ID, so local selections/edit drafts never leak across classes/accounts.
- Scope-limited CSS only. No AI, no new SQL, no changes to attendance, conduct or Sổ điểm logic.

## Data precautions
- Student records and IDs are reused; no copy to new persistence or analytics provider.
- Manual add/edit rejects duplicate code or full name (case/diacritics insensitive); deliberate batch import retains its own preview.
- An archival action preserves history and existing portal credentials according to the shared domain/commit sanitizer.
- 360° snapshots count recorded attendance events and conduct entries only; they never infer grades or incomplete attendance from missing sessions.

## Validation
- Run `node scripts/test-homeroom-4-phase-4.mjs`, phases 1–3 contracts, standard Homeroom safety and migration checks, npm build.
- Visual QA with admin assigned homeroom, subject class, archived student and cloud-only session remains required before closing full UI certification.
