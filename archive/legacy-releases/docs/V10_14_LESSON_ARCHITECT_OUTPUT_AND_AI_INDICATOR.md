# V10.14 — Lesson Architect Output & AI Indicator Fix

## Fixed
- Digital competence chips now change clearly when selected:
  - filled teal gradient,
  - visible check marker,
  - slight lifted state.
- AI-generated lesson output is constrained inside its own scrollable frame:
  - no text overflow outside the card,
  - max-height scroll area,
  - long lines wrap safely.
- Added full-screen AI working indicator for:
  - AI source analysis,
  - AI PDF/source cleaning,
  - AI lesson generation.

## Validation
- `npm run build` ✅
- `npm test` ✅ (22/22 pass)
