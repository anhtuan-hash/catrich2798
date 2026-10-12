# Homeroom 4.0 — Phase 6: Attendance and Conduct Insights

Stage 6 (15%). No schema or scoring policy changes.

## Delivered
- Read-only attendance insights panel: stored session count, today recorded-present events, past-week late events, open correction requests, locked session count, and 7-day recorded-status chart.
- Read-only conduct insights panel: confirmed/pending conduct entries, verified rewards and violations, locked-week count and latest weekly lock statuses.
- Existing attendance editing, session locks, correction approval, conduct score computation, week auto-lock, password hashes and audit trails are preserved without changes.
- Scope only to `HomeroomWorkspace` current workspace and tabs. No new data sources, outbound services or AI.
- Never infer unsaved attendance, unrecorded violations, or completion percentages; when zero sessions exist show an explicit empty state.

## QA
- Domain regression test `scripts/test-homeroom-4-phase-6.mjs` uses small explicitly labeled synthetic test fixtures **only in CI**.
- Run Homeroom safety checks and stages 1–5, `npm run build`, Vercel preview and production.
- Manual role-authenticated visual checks required for full UI sign-off.
