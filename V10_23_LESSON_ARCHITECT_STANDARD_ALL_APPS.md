# V10.23 — Lesson Architect Standard Applied Across Apps

## Updated
- Restored the **Tổ chuyên môn** card in the app drawer.
- Restored the **Thư viện** card in the app drawer by adding the library route card back to the app directory.
- Applied the **Lesson Architect / Flat Creative Teaching OS** standard more broadly across the major app workspaces:
  - cream / paper-like backgrounds,
  - app-specific accent colors,
  - large rounded cards,
  - clear borders with lighter shadows,
  - stronger hero sections,
  - bold poster-style typography,
  - clearer workflow/action cards,
  - two-column workspace balance,
  - stronger active/selected states,
  - scrollable output panels for long AI/export content.

## Standardized design pattern
- Back button as a rounded pill.
- Large app hero with visual identity, title, short description and status cards.
- Workflow/action cards presented in balanced rows.
- Main workspace split into wider content area and supportive sidebar where markup allows.
- Selected cards/chips use filled color states, not just subtle borders.
- Long outputs are contained in scrollable panels to prevent page/footer overflow.

## Validation
- `npm run build` ✅
- `npm test` ✅ (22/22 pass)
