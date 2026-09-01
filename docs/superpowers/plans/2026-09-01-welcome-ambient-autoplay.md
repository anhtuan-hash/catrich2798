# Welcome Ambient Autoplay Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSS-only ambient autoplay motion to the existing Living Twilight welcome so the scene visibly moves even when the pointer is idle.

**Architecture:** Keep all existing markup and runtime behavior. Add one dedicated stylesheet for ambient-only pseudo-elements/keyframes, import it from the welcome bootstrap, and extend the existing UI contract script so the build fails if any approved ambient effect or accessibility override disappears.

**Tech Stack:** Vite, vanilla CSS animations, existing first-visit welcome runtime, Node contract test script, Vercel preview/production deploys.

**Spec:** `docs/superpowers/specs/2026-09-01-welcome-ambient-autoplay.md`

## Global Constraints

- No new dependencies, canvas, WebGL, images, video, or external network assets.
- Preserve first-visit persistence, routes, dialog semantics, pointer beam behavior, Living Twilight layout, mobile behavior, and reduced-motion support.
- New motion is CSS-only and uses existing DOM/pseudo-elements.
- `?welcome=preview&motion=full` must force the new ambient animations on for diagnostics.

---

### Task 1: Contract the ambient autoplay feature

**Files:**
- Modify: `scripts/test-editorial-app-heroes.mjs`

**Interfaces:**
- Consumes: existing `applicationBootstrap` and welcome CSS file reads.
- Produces: failing checks for the ambient stylesheet import and five effect families plus motion accessibility.

- [ ] **Step 1: Write the failing test**

Add `firstVisitWelcomeAmbientCss` to the files map, include it in the combined welcome CSS string, then add checks that require:

```js
['Welcome ambient autoplay stylesheet is bootstrapped', files.applicationBootstrap.includes("import './styles/FirstVisitWelcomeAmbient.css';")],
['Welcome ambient autoplay adds twilight veil drift', files.firstVisitWelcomeAmbientCss.includes('@keyframes brianWelcomeTwilightVeil')],
['Welcome ambient autoplay adds ocean glints', files.firstVisitWelcomeAmbientCss.includes('@keyframes brianWelcomeOceanGlints')],
['Welcome ambient autoplay adds horizon mist', files.firstVisitWelcomeAmbientCss.includes('@keyframes brianWelcomeHorizonMist')],
['Welcome ambient autoplay adds moon orbit halo', files.firstVisitWelcomeAmbientCss.includes('@keyframes brianWelcomeMoonOrbit')],
['Welcome ambient autoplay adds glass card sheen', files.firstVisitWelcomeAmbientCss.includes('@keyframes brianWelcomeCardSheen')],
['Welcome ambient autoplay respects reduced motion and forced diagnostics', files.firstVisitWelcomeAmbientCss.includes('@media(prefers-reduced-motion:reduce)') && files.firstVisitWelcomeAmbientCss.includes('.brian-welcome-root.is-motion-forced')],
```

- [ ] **Step 2: Run test to verify it fails**

Run through the Vercel branch build command: `node scripts/test-editorial-app-heroes.mjs && npm run build`.
Expected: existing checks remain green and the new ambient checks fail because the stylesheet/import does not exist yet.

- [ ] **Step 3: Commit the RED contract**

Commit message: `test: require welcome ambient autoplay motion`.

---

### Task 2: Implement CSS-only ambient autoplay

**Files:**
- Create: `src/styles/FirstVisitWelcomeAmbient.css`
- Modify: `src/applicationBootstrap.jsx`
- Test: `scripts/test-editorial-app-heroes.mjs`

**Interfaces:**
- Consumes: existing `.brian-welcome-vignette`, `.brian-welcome-ocean-layer`, `.brian-welcome-horizon`, `.brian-welcome-moon-halo`, and `.brian-welcome-features article` elements.
- Produces: independent ambient animations using only pseudo-elements/background animation; no new JS listeners.

- [ ] **Step 1: Add the ambient stylesheet import**

Add after the existing first-visit welcome base stylesheet import:

```js
import './styles/FirstVisitWelcomeAmbient.css';
```

- [ ] **Step 2: Implement twilight veil drift**

Use `.brian-welcome-vignette::before` as a blurred, low-opacity elliptical gradient veil and animate it with `brianWelcomeTwilightVeil` over roughly 11 seconds.

- [ ] **Step 3: Implement ocean glints**

Use `.brian-welcome-ocean-layer::before` with several radial-gradient sparkles and animate `background-position`, opacity, and subtle transform via `brianWelcomeOceanGlints` over roughly 5–6 seconds.

- [ ] **Step 4: Implement horizon mist**

Use `.brian-welcome-horizon::before` as a wide blurred mist bank and animate `translate3d`/opacity with `brianWelcomeHorizonMist` over roughly 8 seconds.

- [ ] **Step 5: Implement moon orbit halo**

Use `.brian-welcome-moon-halo::before` as an asymmetric conic/radial ring and animate rotation/scale with `brianWelcomeMoonOrbit` over roughly 9 seconds.

- [ ] **Step 6: Implement glass-card sheen**

Animate background-position on `.brian-welcome-features article` with `brianWelcomeCardSheen` while preserving the existing `brianWelcomeFeatureFloat` animation using a comma-separated multi-animation declaration. Stagger the sheen timing across cards.

- [ ] **Step 7: Add mobile and reduced-motion rules**

On <=600px hide the twilight veil and reduce ocean glint opacity. In `prefers-reduced-motion:reduce`, disable all new ambient animations. Add `.brian-welcome-root.is-motion-forced` rules inside that media query to explicitly restore the five approved ambient animations for diagnostic mode.

- [ ] **Step 8: Run test/build to verify GREEN**

Run the Vercel branch build command and require every contract to pass plus both Vite builds to complete.

- [ ] **Step 9: Commit implementation**

Commit message: `style: add ambient autoplay to welcome scene`.

---

### Task 3: Review, production promotion, and live verification

**Files:**
- Review only the branch diff relative to `main`.

**Interfaces:**
- Consumes: GREEN preview commit.
- Produces: fast-forwarded `main` and verified production CSS bundle.

- [ ] **Step 1: Compare branch to main**

Require the diff to be limited to the spec/plan, contract script, bootstrap import, and ambient stylesheet.

- [ ] **Step 2: Verify preview deployment READY**

Confirm Vercel preview state is `READY` and inspect fresh build logs for `UI contract passed` and successful Vite builds.

- [ ] **Step 3: Fast-forward main**

Move `main` to the verified branch head with `force:false`.

- [ ] **Step 4: Verify production**

Wait for the production deployment to reach `READY`, fetch `https://esl-brian.vercel.app/`, identify the live CSS bundle, and confirm the five ambient keyframe names are present in the served CSS.
