# V10.21 — Exam Studio Direct Interactive Scroll Fix

## Updated
- Rebuilt the **Direct Interactive / Student workspace** for Exam Studio.
- Fixed the issue where questions were difficult or impossible to scroll through in fullscreen mode.
- Added a clearer scrollable layout:
  - fixed topbar,
  - compact control toolbar,
  - progress strip,
  - left question navigation panel,
  - right scrollable question/content area.
- Added a quick **“Xem câu hỏi”** button to jump directly to the question list.
- Improved question palette and answer option states:
  - answered,
  - active,
  - correct,
  - wrong,
  - selected.
- Improved readability and text wrapping so long questions and answer choices stay inside cards.

## Validation
- `npm run build` ✅
- `npm test` ✅ (22/22 pass)
