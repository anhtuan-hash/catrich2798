# TTCM Teacher History Pastel Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the TTCM teacher history workspace to match the approved pastel activity-journal/file-library mockup without changing business logic.

**Architecture:** Keep the current React markup, data pipeline, and responsive structure intact. Implement the visual change primarily in the dedicated `GlobalTtcmTeacherHistory.css`, scoped to the history workspace; use `:has(.ttcm-history-view)` only for the enclosing TTCM header/toolbar treatment so other TTCM views remain unchanged. Add a lightweight source contract that protects the approved visual primitives and run it together with the existing TTCM history contracts and production build.

**Tech Stack:** React, Vite, plain CSS, Node.js source-contract tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-17-ttcm-history-pastel-refresh.md`

## Global Constraints

- Preserve all TTCM data/API/permission behavior.
- Add no dependency.
- Preserve Personnel, Trao đổi, Lịch làm việc, and Lịch sử & File GV workspaces.
- Keep existing history search/filter/preview/download interactions intact.
- Keep desktop, <=1180px, and <=720px layouts usable.

---

### Task 1: Add a visual contract for the approved history treatment

**Files:**
- Create: `scripts/test-ttcm-history-visual-refresh.mjs`
- Modify: `.github/workflows/ttcm-teacher-history.yml`

**Interfaces:**
- Consumes: `src/components/GlobalTtcmTeacherHistory.css`
- Produces: a zero-dependency Node contract that exits non-zero until the approved visual primitives exist.

- [ ] **Step 1: Write the failing contract**

The contract reads the dedicated history stylesheet and checks for the history-only shell scope, pastel KPI surface variables, event mini-card surface, softened table row treatment, and explicit focus-visible support.

- [ ] **Step 2: Run the contract and verify RED**

Run: `node scripts/test-ttcm-history-visual-refresh.mjs`

Expected: FAIL because the current stylesheet does not yet contain the new history-only shell scope and approved visual tokens.

- [ ] **Step 3: Wire the contract into TTCM Teacher History CI**

Add the script path to the workflow path filter and run it after the existing usability contract.

- [ ] **Step 4: Commit the red contract**

Commit message: `test(ttcm): define pastel history visual contract`

---

### Task 2: Implement the pastel history refresh

**Files:**
- Modify: `src/components/GlobalTtcmTeacherHistory.css`

**Interfaces:**
- Consumes: existing TTCM history DOM classes in `GlobalTtcmNavigationTab.jsx`
- Produces: styling only; no changed JavaScript interface or data shape.

- [ ] **Step 1: Run the new contract and confirm it is red**

Run: `node scripts/test-ttcm-history-visual-refresh.mjs`

Expected: FAIL on the newly required visual primitives.

- [ ] **Step 2: Implement history-only hero and profile styling**

Use a light blue/lilac shell treatment scoped with `.ttcm-m3-shell:has(.ttcm-history-view)` and upgrade `.ttcm-history-toolbar`, controls, teacher card, and avatar without altering other TTCM workspaces.

- [ ] **Step 3: Implement four pastel KPI surfaces**

Give activity/content/files/latest cards distinct blue/lavender/mint/peach backgrounds, larger icon blocks, softer borders/shadows, and restrained hover lift.

- [ ] **Step 4: Implement activity-journal mini-cards**

Strengthen timeline nodes/line, render `.ttcm-history-event-card` as a bordered soft card, and preserve status/type pills and text expansion behavior.

- [ ] **Step 5: Implement softened file-library styling**

Refine panel headers, filter pills, table header/rows, file badges, round/status pills, and round action controls while preserving horizontal/independent scrolling.

- [ ] **Step 6: Preserve responsive and accessibility states**

Keep the existing 1180px and 720px breakpoints, add `:focus-visible` treatment, and limit transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 7: Run the visual contract and verify GREEN**

Run: `node scripts/test-ttcm-history-visual-refresh.mjs`

Expected: PASS.

- [ ] **Step 8: Run existing TTCM contracts**

Run:
- `node scripts/test-ttcm-teacher-history.mjs`
- `node scripts/test-ttcm-history-usability.mjs`

Expected: all PASS.

- [ ] **Step 9: Run production build**

Run: `npm run build`

Expected: exit 0 with both Vite builds completed.

- [ ] **Step 10: Commit implementation**

Commit message: `style(ttcm): refresh teacher history with pastel journal UI`

---

### Task 3: PR verification

**Files:**
- No production changes unless verification reveals a regression.

**Interfaces:**
- Consumes: branch CI and build results.
- Produces: reviewable PR against `main`.

- [ ] **Step 1: Open a PR against `main`**

Include scope, visual changes, functional non-changes, and test commands.

- [ ] **Step 2: Verify GitHub Actions**

Confirm `TTCM Teacher History` passes the two existing contracts, the new visual contract, and production build.

- [ ] **Step 3: Review diff for scope**

Confirm production behavior changes are limited to `GlobalTtcmTeacherHistory.css` and no API/data/permission code changed.

- [ ] **Step 4: Merge only after verification**

Use squash merge once CI is green and the head SHA is unchanged.
