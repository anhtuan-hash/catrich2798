# Attendance UI and PDF Polish Spec

## Goal
Fix three regressions in the extra-class attendance workspace without changing attendance data or business logic.

## Requirements

1. Quick attendance class discovery
- The class search input must be visibly rendered under the active-class header.
- Subject filter chips must remain visible directly under the search input.
- The left class list must reserve distinct rows for header, discovery controls, and scrollable class results.
- The discovery surface must remain opted out of the global search-bar removal runtime.

2. Calendar, class management, and history surfaces
- Calendar month cells must be visually separated cards rather than touching bordered cells.
- Calendar toolbar, weekday row, and calendar body should retain a coherent Material 3 surface with breathing room.
- Class management and history two-column workspaces must use separated surfaces/cards with visible gaps rather than fused panels.
- Existing functionality and responsive behavior must remain intact.

3. PDF export
- Export remains A4 portrait.
- School logo/header must not collide with the browser print header area.
- The report content must have safe top spacing and a bounded logo block.
- Tables must remain within the portrait page width.
- Print styling must keep the existing school identity and report data.

## Verification
- Add regression contracts to existing attendance test scripts so the frontend-build workflow executes them.
- Verify the new tests fail before production changes.
- Verify the same tests pass after implementation.
- Verify the full Frontend Build workflow passes before merging to main.
