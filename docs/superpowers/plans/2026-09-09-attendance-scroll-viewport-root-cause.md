# Quick Attendance Scroll Viewport Fix

## Root cause
The Quick Attendance parent grid has a fixed viewport height, but its single implicit grid row is `auto`. The redesigned `.attendance-rollcall` therefore grows to content height instead of being constrained to the available viewport. Because `.attendance-quick-layout` clips overflow, the student rows are visually cut off and the right pane never has internal overflow to scroll.

## Fix
- Constrain `.attendance-quick-layout` to one `minmax(0, 1fr)` row.
- Keep `.attendance-rollcall` at `height: 100%` / `max-height: 100%` so its `overflow-y: auto` owns the scroll.
- Preserve the roster as natural-height content with no nested scrollbar.

## Verification
- Add a regression assertion for the constrained parent grid row and bounded right pane.
- Confirm unified-scroll contract, frontend build, and Critical E2E.
