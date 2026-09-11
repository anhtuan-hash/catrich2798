# Attendance History Display Fixes Spec

## Scope
Fix the display defects confirmed from the 11/09/2026 Admin screenshots of the extra-class attendance History view. Do not alter attendance authorization, deletion rules, attendance calculations, or date-filter semantics.

## Confirmed defects

1. The audit panel renders the raw `checked_by` UUID instead of the stored human-readable actor snapshot. The database already persists `checked_by_name`; the frontend session projection omits it and the panel renders the wrong field.
2. A session with tardy students can show the tardy section header while the student rows are visually clipped/collapsed. The V3 surface must explicitly own the tardy section/list layout instead of relying on generic Material 3 list rules.
3. The absent-student card has an unconditional `min-height: 222px`, so sessions with zero absences leave a large empty block. Empty state must shrink to content height while non-empty lists remain bounded and scrollable.

## Non-defects / preserve

- Admin delete authorization and the `Chọn nhiều` control are correct and must remain unchanged.
- Blank date inputs mean no date filter; sessions from multiple dates are expected in that state.
- The detail pane remains independently scrollable.
- Tardy students still count as present in attendance totals/rate.
- Existing proof-image layout and non-empty absence scrolling remain intact.

## Acceptance criteria

- `SESSION_COLUMNS` includes `checked_by_name`.
- Audit UI displays `checked_by_name`, falling back to `checked_by`, then `Không ghi nhận`.
- Tardy section/list has isolated V3 layout with visible rows, no parent clipping, and a bounded internal scrollbar for long lists.
- Empty absent section uses an explicit `is-empty` state and no forced 222px minimum height.
- Non-empty absent section keeps the approved bounded roster behavior.
- Existing History authorization, filter, functional guard, visual contract and production build continue to pass.
