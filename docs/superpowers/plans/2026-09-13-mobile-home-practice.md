# Mobile Home + Weekly Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a genuinely mobile-first `#/home` and Weekly English Practice experience while preserving the current desktop Home exactly.

**Architecture:** Keep `HomeApproved.jsx` as the controller for data fetching, permissions and legacy practice actions. Use the Phase 1 `usePresentationMode` classifier to choose a dedicated `MobileHomeView` only in mobile presentation mode. The new view consumes the existing tool/practice models and callbacks; desktop markup remains the current branch.

**Tech Stack:** React 18, Vite, Lucide React, existing hash navigation/weekly practice bridge, CSS, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-mobile-home-practice-design.md`

## Global Constraints

- Phones and portrait tablets use Mobile UI; landscape tablets and desktops use Desktop UI.
- A narrow desktop browser must remain Desktop UI.
- Do not create `/mobile` routes or user-agent redirects.
- Reuse current routes, permissions, weekly-practice fetching and legacy runner/manager actions.
- All primary touch targets are at least 44px.
- Do not introduce horizontal document overflow.
- Do not redesign existing desktop Home markup or CSS.

---

### Task 1: Mobile Home presentation branch

**Files:**
- Create: `src/components/mobile/MobileHomeView.jsx`
- Modify: `src/pages/HomeApproved.jsx`
- Test: `tests/e2e/mobile-home-practice.spec.js`

**Interfaces:**
- Consumes: `usePresentationMode()` from `src/hooks/usePresentationMode.js`; Home models `t`, `tools`, `practiceItems`, `practicesByGrade`; callbacks supplied by `HomeApproved`.
- Produces: `<MobileHomeView ... />` identified by `[data-bes-mobile-home="true"]`.

- [ ] **Step 1: Write the failing route-body contract**

Add Playwright assertions:

```js
import { test, expect } from '@playwright/test';

test('phone uses mobile Home body instead of desktop editorial body', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.locator('[data-bes-mobile-home="true"]')).toBeVisible();
  await expect(page.locator('.bha-editorial-dateline')).toHaveCount(0);
  await expect(page.locator('[data-bes-mobile-home="true"] [data-mobile-home-hero]')).toBeVisible();
});

test('desktop preserves existing Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/#/home');
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
});
```

Run phone first:

```bash
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium
```

Expected: FAIL because the dedicated mobile Home body does not exist.

- [ ] **Step 2: Implement the minimal mobile branch**

In `HomeApproved.jsx`, import `usePresentationMode` and `MobileHomeView`, derive:

```js
const presentation = usePresentationMode();
const isMobilePresentation = presentation.presentationMode === 'mobile';
```

After existing data models/callbacks are ready and before desktop JSX, return `MobileHomeView` when `isMobilePresentation` is true. Pass data/callbacks; do not move fetching or permission logic into the view.

Create `MobileHomeView.jsx` with semantic sections for hero, Featured Tools and Weekly Practice, and stable data attributes for tests.

- [ ] **Step 3: Verify phone and desktop contract**

```bash
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium --project=chromium-desktop
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/MobileHomeView.jsx src/pages/HomeApproved.jsx tests/e2e/mobile-home-practice.spec.js
git commit -m "feat: add mobile-first home presentation"
```

---

### Task 2: Mobile Weekly Practice grade browser

**Files:**
- Modify: `src/components/mobile/MobileHomeView.jsx`
- Test: `tests/e2e/mobile-home-practice.spec.js`

**Interfaces:**
- Consumes: `practicesByGrade`, `practiceLoading`, `practiceError`, `onRetryPractice`, `onOpenPractice`, `canManagePractice`, `onOpenStatistics`, `onOpenManager`.
- Produces: grade selector `[data-mobile-grade]`, selected panel `[data-mobile-practice-grade]`, practice cards `[data-mobile-practice-card]`.

- [ ] **Step 1: Add failing grade-selector tests**

```js
test('mobile Weekly Practice switches grades with accessible chips', async ({ page }) => {
  await page.goto('/#/home');
  const grade10 = page.locator('[data-mobile-grade="10"]');
  const grade11 = page.locator('[data-mobile-grade="11"]');
  await expect(grade10).toHaveAttribute('aria-pressed', 'true');
  await grade11.click();
  await expect(grade11).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-mobile-practice-grade="11"]')).toBeVisible();
});

test('mobile grade chips meet touch target minimum', async ({ page }) => {
  await page.goto('/#/home');
  const box = await page.locator('[data-mobile-grade="10"]').boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
});
```

Run:

```bash
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium
```

Expected: FAIL until selectors/interactions exist.

- [ ] **Step 2: Implement selected-grade state and stacked cards**

Inside `MobileHomeView`, add:

```js
const [selectedGrade, setSelectedGrade] = useState(10);
const visiblePractices = [...(practicesByGrade[selectedGrade] || [])].sort(
  (a, b) => practiceTimestamp(b) - practiceTimestamp(a),
);
```

Use buttons with `aria-pressed={selectedGrade === grade}` and render every visible practice as a vertical card. Each card invokes `onOpenPractice(item)`. Use existing data only; do not refetch.

- [ ] **Step 3: Keep management actions role-aware**

Render Statistics/Manage only when `canManagePractice` is true, and bind the supplied callbacks. Anonymous/ordinary users must not receive these buttons from the mobile view.

- [ ] **Step 4: Run mobile tests**

```bash
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/MobileHomeView.jsx tests/e2e/mobile-home-practice.spec.js
git commit -m "feat: add mobile weekly practice browser"
```

---

### Task 3: Mobile visual system, touch density and overflow safety

**Files:**
- Create: `src/styles/mobile/mobile-home.css`
- Modify: `src/components/mobile/MobileHomeView.jsx`
- Test: `tests/e2e/mobile-home-practice.spec.js`

**Interfaces:**
- Consumes: Phase 1 mobile tokens from `src/styles/mobile/mobile-tokens.css`.
- Produces: mobile Home card/grid/grade/practice styles scoped below `.bes-mobile-home`.

- [ ] **Step 1: Add failing overflow and tool-grid assertions**

```js
test('mobile Home stays inside viewport and tools are touch friendly', async ({ page }) => {
  await page.goto('/#/home');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const cards = page.locator('[data-mobile-tool]');
  expect(await cards.count()).toBeGreaterThan(0);
  const first = await cards.first().boundingBox();
  expect(first?.height || 0).toBeGreaterThanOrEqual(44);
});
```

Run and confirm RED if the new layout still overflows or lacks the stable selectors.

- [ ] **Step 2: Add scoped mobile styling**

Import `../../styles/mobile/mobile-home.css` from `MobileHomeView.jsx`. Style only `.bes-mobile-home` descendants: 16px page gutter, 14–18px section gaps, 18–22px radii, two-column tool grid, vertically stacked practice cards, 44px controls, and bottom padding that clears the fixed Mobile App Shell navigation plus `env(safe-area-inset-bottom)`.

Do not use viewport-only media queries to choose Mobile vs Desktop; the component branch is already authoritative. Optional internal media queries may adjust spacing only inside `.bes-mobile-home`.

- [ ] **Step 3: Verify all device modes**

```bash
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=ipad-portrait
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=ipad-landscape
npx playwright test tests/e2e/mobile-home-practice.spec.js --project=chromium-desktop
```

Expected: phone + portrait iPad show mobile Home; landscape iPad + desktop show desktop Home; all pass overflow/touch contracts where applicable.

- [ ] **Step 4: Commit**

```bash
git add src/styles/mobile/mobile-home.css src/components/mobile/MobileHomeView.jsx tests/e2e/mobile-home-practice.spec.js
git commit -m "style: polish mobile home and practice"
```

---

### Task 4: Regression verification and stacked PR

**Files:**
- Modify only if required by discovered regression; no speculative production changes.

**Interfaces:**
- Consumes: Phase 1 Foundation test suite and this Phase 2 suite.
- Produces: a reviewable stacked PR based on `feat/mobile-app-shell-foundation`.

- [ ] **Step 1: Run deterministic unit contracts**

```bash
node --test tests/unit/presentation-mode.test.mjs tests/unit/mobile-navigation.test.mjs
```

Expected: all pass.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 3: Run Foundation regression and Phase 2 E2E**

```bash
npx playwright test tests/e2e/mobile-shell.spec.js tests/e2e/mobile-home-practice.spec.js --project=chromium-desktop
npx playwright test tests/e2e/mobile-shell.spec.js tests/e2e/mobile-home-practice.spec.js --project=mobile-chromium
npx playwright test tests/e2e/mobile-shell.spec.js tests/e2e/mobile-home-practice.spec.js --project=ipad-portrait
npx playwright test tests/e2e/mobile-shell.spec.js tests/e2e/mobile-home-practice.spec.js --project=ipad-landscape
```

Expected: all applicable contracts pass.

- [ ] **Step 4: Open stacked PR**

Create a PR with base `feat/mobile-app-shell-foundation` and head `feat/mobile-home-practice`. Document that Foundation PR #798 must land first and that this PR changes Home route-body presentation only.

- [ ] **Step 5: Verify CI on the PR HEAD**

Do not claim completion until the latest Phase 2 HEAD has a successful build and all Phase 1/Phase 2 device contracts are green.