# Homeroom 4.0 Phase 7 — Operations, reports and safety (10%)

## Delivered
- Tasks-first GVCN workspace on Overview (no extra crowded main navigation tab): add/edit existing `workspace.schedule` tasks, view open/completed/today/overdue counts, complete/reopen tasks in place.
- Uses existing commit pipeline, account/workspace-scoped persistence, and optimistic sync feedback; editor stays open on cloud errors, retries keep the same task ID.
- Reports use a selected inclusive date range: attendance from **saved sessions only**, conduct from confirmed entries only, and the student-record checklist/status **as of report generation**.
- CSV/Excel export uses the established local download utility with CSV formula neutralization. Print/Save PDF opens a local browser print layout with escaped HTML; neither option includes student portal PIN, account secrets or raw backup payload.
- Safety footer shows counts of existing backups/audit entries and honest last-sync state, then opens the existing role-scoped Safety tab; avoids duplicating or weakening security workflows.
- Only GVCN Overview receives the center, subject classes retain current layout. No SQL schema/RLS changes, AI or new external requests.

## Acceptance
`node scripts/test-homeroom-4-phase-7.mjs`, previous 1–6 tests and Homeroom safety/build via GitHub CI.
Test with a real account, browser print dialog, tab switching, cloud-only and subject mode before claiming visual or permissions completion.
