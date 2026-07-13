# V10.18 — Exam Studio Compact Summary + 3 Cards Per Row

## Updated
- Reduced the **Live Summary** panel width and density on the left.
- Changed the main selection layout to **3 cards per row** on large screens.
- Applied the 3-card layout to:
  - exam type cards,
  - question format groups.
- Kept source mode as 2 cards because it has only 2 options.
- Preserved selected-state color changes.
- Tightened card typography so text wraps correctly and does not overflow.
- Added responsive fallback:
  - 3 columns on large desktop,
  - 2 columns on medium screens,
  - 1 column on smaller screens.

## Validation
- `npm run build` ✅
- `npm test` ✅ (22/22 pass)
