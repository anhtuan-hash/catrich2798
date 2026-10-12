# Homeroom 4.0 — Phase 3: Command Center

2026-10-12. Scope: the existing `overview` tab only, no database or student-schema changes.

## Implemented
- Deterministic `buildHomeroomDashboard()` derived exclusively from the currently selected (already authorized) workspace.
- Four source-grounded KPIs: active student count, today's present attendance **events**, pending conduct confirmations, paper checklist completion.
- Tasks only for real recorded pending attendance correction requests, conduct confirmations, missing required paper checklist entries, and missing class setup/roster.
- Chart shows the count of saved attendance sessions for the past 7 days; no values or chart bars when no sessions exist.
- Colorful Bento quick actions route to existing permitted tabs. No reintroduction of retired `parents`, `support`, `records` or `search` routes.
- No fabricated completion percentages from counts, no AI, and no new PII exposure.

## Data semantics
- Attendance measure is explicitly **lượt có mặt**, not unique students: multiple saved sessions may count the same student more than once.
- `—` means no attendance rows for today, distinct from zero observed present events.
- Paper documents require completionCertificate, birthCertificate, transcript; grade10Admission also required for grades 11 and 12 (same checklist rules as StudentRecords).
- Tasks are recorded workflow items, not assumptions about whether a school day ought to have attendance.
- The chart counts actual saved session keys only, not planned or inferred lessons.

## Acceptance
- `scripts/test-homeroom-4-phase-3.mjs` asserts row counts, inactive filters, required paper docs, pending statuses, zero-data cases, task destinations, and absence of fabricated progress.
- Run phases 1–2 and Homeroom safety/migration regressions; build and Vercel preview.
- Manually verify real authorized 12.6 and subject 10.5 route switch without editing data and compare totals against existing tabs.
