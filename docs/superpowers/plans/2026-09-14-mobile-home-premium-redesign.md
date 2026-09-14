# Premium Mobile Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current text-heavy mobile Home with the approved lightweight visual composition while preserving desktop Home and all weekly-practice behavior.

**Architecture:** Keep `HomeApproved` as the shared data/behavior owner and redesign only `MobileHomeView`. The approved hero mock is treated as a fixed art asset so the boy illustration is pixel-stable; transparent semantic CTA buttons are overlaid on the art. Grade data remains live React content so practice counts and lesson lists continue to work.

**Tech Stack:** React, CSS, lucide-react, Playwright, existing hash navigation and weekly-practice runtime.

**Spec:** Conversation-approved mobile mock: Brian topbar remains global; hero with the approved boy artwork; four compact quick actions; three side-by-side Grade 10/11/12 cards; minimal motivational banner.

## Global Constraints

- Mobile-only redesign; desktop Home must remain unchanged.
- Preserve existing global mobile topbar, TTCM shortcut, attendance/notification permission behavior, and avatar menu.
- Preserve current weekly-practice data source and open-practice behavior.
- Touch targets are at least 44px.
- No horizontal overflow at phone widths.
- Portrait iPad keeps mobile presentation; landscape iPad keeps desktop presentation.
- Hero illustration must use the approved visual asset, not a CSS recreation.

---

### Task 1: Lock the premium mobile Home regression contract

**Files:**
- Modify: `tests/e2e/mobile-home-practice.spec.js`

**Interfaces:**
- Consumes: existing `/#/home`, `[data-bes-mobile-home="true"]`, practice callbacks.
- Produces: required selectors `[data-mobile-home-premium]`, `[data-mobile-home-hero-art]`, `[data-mobile-home-quick-actions]`, `[data-mobile-grade-card]`.

- [ ] **Step 1: Replace old desktop-Hero mobile assertions with premium-home assertions**

Require the premium root and hero art, concise mobile copy, four quick actions, three grade cards, and no old mobile dateline / `.hero-cms` dependency.

- [ ] **Step 2: Preserve behavior assertions**

Keep tests for desktop unchanged, portrait/landscape mode, grade expansion, 44px touch targets, viewport containment, brand identity, and long-list expansion.

- [ ] **Step 3: Run the mobile Home suite to verify RED**

Run: `npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium`

Expected: FAIL because the premium selectors/artwork do not exist yet.

- [ ] **Step 4: Commit the RED contract**

Commit: `test: define premium mobile home contract`

---

### Task 2: Add the approved hero artwork as a deterministic asset

**Files:**
- Create: `public/mobile-home-premium-hero.svg`

**Interfaces:**
- Produces: `/mobile-home-premium-hero.svg`, a fixed-aspect hero artboard containing the approved illustration pixels.

- [ ] **Step 1: Crop the approved mock to the hero artboard only**

Use the exact approved mock region, excluding the global topbar and lower quick-action area.

- [ ] **Step 2: Encode the crop in an SVG image wrapper**

Use a fixed `viewBox` and embedded image data so the repository can carry the asset as UTF-8 text while preserving the approved raster artwork.

- [ ] **Step 3: Commit the asset**

Commit: `feat: add approved mobile home hero artwork`

---

### Task 3: Rebuild `MobileHomeView` around the approved composition

**Files:**
- Modify: `src/components/mobile/MobileHomeView.jsx`
- Create: `src/styles/mobile/mobile-home-premium.css`

**Interfaces:**
- Consumes: existing props `t`, `language`, `currentUser`, `practiceItems`, `practicesByGrade`, `practiceLoading`, `practiceError`, `canManagePractice`, `onStart`, `onGuide`, `onOpenPractice`, `onRetryPractice`, `onOpenStatistics`, `onOpenManager`.
- Produces: premium hero, quick actions, grade grid, expandable live lesson panel.

- [ ] **Step 1: Replace the mobile dateline and reused desktop Hero with a premium hero figure**

Render `<img src="/mobile-home-premium-hero.svg" data-mobile-home-hero-art alt="" />` inside `[data-mobile-home-hero]`. Add accessible hidden heading text and two positioned CTA buttons: `Bắt đầu` -> `onStart`, `Xem ngay` -> `onGuide`.

- [ ] **Step 2: Add four compact quick actions**

Render Học, Thống kê, Lịch học, Thành tích in `[data-mobile-home-quick-actions]`. Học calls `onStart`; Thống kê uses `onOpenStatistics` when available; Lịch học scrolls the weekly section into view; Thành tích opens the practice entry path via `onStart` rather than introducing a new route.

- [ ] **Step 3: Convert grade summaries to a three-column visual grid**

Keep `[data-mobile-grade-card="10|11|12"]` and `[data-mobile-grade-toggle]`. Show large grade numbers, one icon, one circular arrow action, and lesson count only. Clicking a grade expands the existing `MobilePracticeList` underneath the grid.

- [ ] **Step 4: Simplify the weekly-practice header**

Use only `Luyện tập tuần này` / `This week` plus `Xem tất cả`; remove the verbose published-total and explanatory paragraph from the mobile composition. Keep loading/error/list behavior intact.

- [ ] **Step 5: Add the compact motivational banner**

Create a low-text gradient/mountain banner below the practice section with `A brighter tomorrow` and no additional navigation dependency.

- [ ] **Step 6: Implement responsive styling**

Use scoped `.bes-mobile-home.is-premium` rules, rounded white surfaces, pastel grade themes, 44px+ controls, and `overflow-x: clip`. Keep the 3-card row at standard phone widths and degrade gracefully below 360px without page overflow.

- [ ] **Step 7: Run the mobile suite to verify GREEN**

Run: `npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium`

Expected: PASS.

- [ ] **Step 8: Commit implementation**

Commit: `feat: redesign premium mobile home`

---

### Task 4: Cross-device verification and integration

**Files:**
- Test: `tests/e2e/mobile-home-practice.spec.js`
- Test: existing mobile shell / critical E2E workflows.

- [ ] **Step 1: Verify desktop isolation**

Run: `npx playwright test tests/e2e/mobile-home-practice.spec.js --project=chromium-desktop`

Expected: desktop Home remains the existing editorial layout.

- [ ] **Step 2: Verify phone and iPad presentation**

Run the mobile Home suite for `mobile-chromium`, `mobile-webkit`, `ipad-portrait`, and `ipad-landscape` where applicable.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 4: Review diff and CI before merge**

Require Mobile Home Practice, Mobile App Shell Foundation, Frontend Build, and Critical E2E to be green for the final head commit.

- [ ] **Step 5: Merge to `main` only after verification**

Use squash/merge according to repository convention, then verify `main` points at the merge result and production deployment is healthy before claiming completion.
