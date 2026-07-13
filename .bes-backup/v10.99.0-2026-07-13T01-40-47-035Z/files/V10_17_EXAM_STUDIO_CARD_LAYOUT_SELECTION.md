# V10.17 — Exam Studio Card Layout + Selection States

## Updated
- Rearranged the main selectable card areas in **Exam Studio** into a cleaner **2-cards-per-row** layout where appropriate.
- Applied stronger visual selection states so selected items are easier to recognize:
  - exam type cards,
  - source mode cards,
  - skill chips,
  - question format selections.
- Fixed text overflow inside cards and chips:
  - labels now wrap properly,
  - long text no longer spills outside card boundaries.

## Validation
- `npm run build` ✅
- `npm test` ✅ (22/22 pass)
