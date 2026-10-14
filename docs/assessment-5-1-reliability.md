# Assessment 5.1 — Teaching Reliability

This is an incremental, scoped hardening release of Assessment 5.0. It does **not** introduce AI or new database tables, and it does not modify attendance, Dashboard, homeroom, gradebooks, permissions, or existing grade records.

## Improvements
- **Consistent history:** the atomic `lesson_check_mark_recent` RPC owns `recent_ids`. Saving Assessment Workspace collections/runner never overwrites it.
- **Accurate event count:** the same authorized Lesson Check launch path records each successful activity open once, whether launched from the library or Workspace. No duplicated event from Workbench.
- **Safe teaching queue:** wait for an account-specific queue to load; synchronous mutation lock prevents rapid double-submission; errors retain the last known-good queue. Close the drawer only after preferences are saved.
- **Reliable classroom clock:** countdown uses a wall-clock deadline so background tab throttling does not add extra classroom time; pause and reset remain available.
- **Explicit completion:** disable repeated completion clicks after the journal confirms a save; network failures remain retryable.
- **Accessible dialogs:** Escape to close, keyboard focus trap, and return focus to the trigger on closing.
- **Account isolation:** clear prior account's recent list and journal while the new account loads.

## Release gates
Run Assessment 5.0 contracts, 5.1 reliability contracts, legacy Lesson Check safety tests, frontend build, Chromium smoke, Critical E2E and Vercel preview. Preserve all existing activity/grant/session counts and verify RLS. No database migration required.

## Rollback
Revert only the 5.1 UI/client commits if a regression occurs. The existing atomic recent RPC and queue table are unaffected.
