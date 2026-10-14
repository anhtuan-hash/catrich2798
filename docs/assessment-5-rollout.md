# BRIAN Assessment 5.0 — technical implementation & release plan

**Approved scope:** All 8 capability groups; Colorful Bento UI × Material Design 3; no AI.
**Target:** `src/pages/LessonCheckStudio.jsx` and scoped Assessment components. All other applications remain unchanged.

## Five-stage rollout and acceptance gates
| Phase | Target | Deliverable | Verification |
| --- | ---: | --- | --- |
| 1 — Design foundation | 20% | Isolated colorful command header, responsive grid, accessible controls; separate components instead of replacing hero/navigation | Layout and baseline Lesson Check regression |
| 2 — Library 2.0 | 45% | Grid/List, title search preserved, advanced facets with existing `lesson_check_activity_attributes`, static-thumbnail Quick Preview, favorites-first sorting, recent view | No iframe in card/preview; permission-safe viewing; title-search regression |
| 3 — Classroom | 70% | Teacher-owned persisted teaching queue, reordering, class/time options, sequenced viewer, countdown and completion journal | Queue RLS, uniqueness/20-item limit, access check on read/open, classroom-mode privacy |
| 4 — Governance / insights | 90% | Bulk metadata editing (max 20 per batch), hand-off to existing bulk permissions; usage counts from secure journal; per-account session-only filter preferences | Leader-only edits (RLS), no fabricated usage data, no student info in browser storage |
| 5 — QA & production | 100% | CI, smoke tests, migration and data preservation verification, PR review, controlled production deployment | Run dedicated tests, frontend build, critical cross-app E2E, Vercel success |

## Data contract and migration
- Add only `lesson_check_teaching_queue` (user_id, ordered activity IDs, class, minutes). Each user has one row; RLS requires authenticated approved teacher and own ID.
- Guard writes to max 20 distinct activities. Reject IDs absent from library or without actual teacher access.
- Add `lesson_check_mark_recent` RPC that atomically edits **recent_ids only**. Preserve existing favorites, collections, interventions and scores.
- No schema drop, data migration, AI calls or synthetic learning evidence.

## Security + safe behavior
- Existing lesson-check content RPC and grant checks remain the sole source of authorization. Quick Preview shows only catalog metadata and static thumbnails; protected iframe content is fetched exclusively on authorized open.
- Keep the existing attendance, Dashboard, homeroom and gradebook modules untouched. Classroom presentation continues masking report and administration controls.
- Usage insights use activity journal events from Supabase with teacher/leader RLS; they must not claim learning progress without score data.
- Persist only harmless filter/view preferences in sessionStorage, keyed by account. Never store student names, scores, embedded activity code or bearer tokens there.

## Performance
- Lazy load thumbnails via existing component and preserve React.lazy Assessment Workspace.
- Limit the library to 12 cards/page as before. Avoid fetching protected iframe source for search, preview or queue.
- Render Quick Preview and Queue only when opened; debounce/autosave not needed for every keystroke (queue preferences save when closing/starting).
- Respect reduced-motion user preference.

## Release & rollback
1. Merge prohibited until all tests and build are green. Note pre-existing failures rather than masking.
2. Apply the additive migration only after its security contract is checked; verify counts of 120 library activities and pre-existing grants/assessment sessions remain unchanged relative to live baseline.
3. Deploy via squash PR checked against the current `main` SHA, verify the production deployment status.
4. In case of a production issue: revert the UI commit safely; keep the additive table/RPC untouched (no destructive rollback). Database data may remain private and idle.
