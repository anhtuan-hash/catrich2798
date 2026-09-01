# First Visit Welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the approved proposal-10 lighthouse welcome screen exactly once per browser for the current welcome version, then never interrupt subsequent visits.

**Architecture:** Add a small DOM runtime bootstrapped outside `main.jsx` so the welcome experience is isolated from Brian's large React application state. The runtime waits for the main shell, reads a versioned `localStorage` key, mounts an accessible 16:9 dialog only when unseen, and permanently records dismissal for that version. The visual is native HTML/CSS (no generated-image dependency) and uses a responsive CSS lighthouse scene.

**Tech Stack:** Vite, vanilla DOM runtime, CSS, existing Node source-contract test.

**Spec:** Approved proposal 10 in the current conversation: dusk/blue lighthouse, journey/welcome framing, four feature chips, primary “Bắt đầu ngay”, secondary “Khám phá sau”, 16:9 desktop presentation.

## Global Constraints

- Welcome is shown only when `bes-first-visit-welcome-v1` has not been recorded.
- Any intentional dismissal (primary, secondary, close, Escape) records the current version.
- Direct login/register/setup/recovery routes must not be blocked by onboarding.
- No new package dependency.
- Use `prefers-reduced-motion` and accessible dialog semantics.
- Mobile may abandon strict 16:9 to remain usable.

---

### Task 1: Lock the first-visit contract

**Files:**
- Modify: `scripts/test-editorial-app-heroes.mjs`

**Interfaces:**
- Consumes: repository source files.
- Produces: failing checks for the missing welcome runtime and styling.

- [ ] **Step 1: Write failing source-contract checks** for bootstrap integration, versioned storage, 16:9 styling, lighthouse visual marker, actions, and reduced-motion support.
- [ ] **Step 2: Push the test-only commit and verify the Vercel preview fails specifically on the new welcome checks.**

### Task 2: Implement the welcome runtime

**Files:**
- Create: `src/firstVisitWelcome.js`
- Create: `src/styles/FirstVisitWelcome.css`
- Modify: `src/applicationBootstrap.jsx`

**Interfaces:**
- Produces: `installFirstVisitWelcome()` and the DOM/CSS contract required by Task 1.

- [ ] **Step 1: Create the runtime** with `WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1'`, safe storage helpers, protected-route skip logic, app-shell wait, accessible dialog mounting, focus handling, body scroll lock, cross-tab close behavior, and versioned dismissal persistence.
- [ ] **Step 2: Create proposal-10 styling** with navy dusk gradient, CSS lighthouse and beam, four translucent feature tiles, 16:9 desktop card, responsive mobile layout, and reduced-motion fallback.
- [ ] **Step 3: Bootstrap the runtime** from `applicationBootstrap.jsx` without adding state to `main.jsx`.
- [ ] **Step 4: Verify the preview contract passes and the full Vite production build succeeds.**

### Task 3: Promote the verified commit

**Files:**
- No additional source changes expected.

**Interfaces:**
- Consumes: READY preview commit.
- Produces: production deployment on `main`.

- [ ] **Step 1: Compare the feature branch with `main` and confirm only scoped welcome/test/plan files changed.**
- [ ] **Step 2: Fast-forward `main` to the verified commit.**
- [ ] **Step 3: Verify Vercel production reaches READY and `esl-brian.vercel.app` serves the new welcome runtime/CSS.**
