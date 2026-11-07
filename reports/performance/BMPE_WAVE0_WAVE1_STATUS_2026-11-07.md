# BMPE WAVE 0 SOURCE BASELINE + WAVE 1 CHANGE REPORT
Date: 2026-11-07 (Asia/Ho_Chi_Minh)
Specification: BRIAN_MOTION_PERFORMANCE_ENGINE_SPEC_V1_0_2026-11-07.md
Base GitHub main SHA at branch creation: `497da8086e1503de9097eefa4d0c26147ca0bd2e`
PR: https://github.com/anhtuan-hash/catrich2798/pull/1399 (DRAFT)
Production: https://esl-brian.vercel.app/ (NOT modified by this PR)

## Wave 0: source audit performed
- GitHub repository tree at baseline: 3,540 entries; 624 CSS files (includes source, public, archives/other paths).
- `src/styles/` directly contained 206 entries. These are counts of files, NOT counts of loaded stylesheets.
- `src/main.jsx` imports `v1159.css` before `GlobalMotionSystem.css` and registers the existing global motion system.
- `src/utils/globalMotionSystem.js` provides ten motion slots, server/local settings and accessible `no-motion` preset.
- `src/styles/v1159.css` originally contained an unconditional CSS rule forcing `animation:none!important` and `transition:none!important` across most components, as well as a global view-transition kill and a broad hover transform kill.
- `GlobalPageLaunchEffect` has Metro Sweep ownership. `GlobalWindowsPhone8Loading` and `GlobalWindows8Experience` have separate existing animation/loading responsibilities.
- `SmartBubbleDock` currently observes DOM mutations and has independent close timer/polling; not changed in this wave.
- `webVitals.js` already records a local set of metrics, but lacks certified Core Web Vitals INP calculation; not changed in this wave.
- \`GlobalFlatNavigation.jsx\` imports \`GlobalCriticalJankGuard.css\`; the pre-existing balanced/low CSS had broad \`filter:none\` / \`backdrop-filter:none\` overrides. The import path was verified from source.\n- Baseline runtime FPS, production feature parity and screenshots: **NOT VERIFIED**. GitHub source audit is not a performance benchmark.

## Wave 1: change implemented on feature branch
- Removed the top-level global motion retirement kill-switch and generic hover disable from `src/styles/v1159.css`.
- Kept all TTCM layout and appearance rules following `/* TTCM CHANNEL` byte-for-byte unchanged.
- Kept existing component-specific legacy `transform:none` overrides, to avoid unverified large-scale visual changes. These need a scoped visual review.
- Did not change role logic, data/schema, auth, API endpoints, router, bundle settings or Admin presets.
- Added static Node source contract and Chromium/WebKit computed-style tests using actual source CSS.
- Added cross-platform GitHub Actions QA for Ubuntu (Chromium/WebKit), macOS runner (WebKit), Windows runner (Edge/Firefox); CI WebKit is **not** a real Safari test.
- Added a static CSS/route-inventory script. It labels regex candidates as candidates rather than confirmed runtime problems.

## Actual browser feedback and fixes
- First Chromium/WebKit matrix exposed a mistaken test assumption: the final, original TTCM CSS override uses `24px` border radius, not the earlier `28px` declaration. Corrected the test to verify that original computed value.
- The same matrix exposed a real accessibility problem: higher-specificity page animation overrode the OS reduced-motion rule. Implemented a scoped reduced-motion page override and queued revalidation.
- **Neither fix is certified until the new matrix finishes successfully.**

## Known baseline blocker
Existing test `tests/performance-smoothing-contract.test.mjs`, line 49, asserts a literal JSX substring `<ActivityFrame embed={embed}` in `LessonCheckStudio.jsx`. CI on this PR observed that the current source does not contain that exact substring, making that legacy source contract fail. This is separate from the motion CSS patch and **is not silently treated as a pass**. The BMPE dedicated source check runs independently; the legacy failure is recorded as a non-blocking diagnostic within the new workflow, while the overall PR remains Draft/NO-GO pending review.

## Outstanding gates (required before production)
- [ ] Dedicated CI source tests green on current PR head.
- [ ] Browser computed-style tests green across the matrix.
- [ ] Existing full critical browser/build suites green or individual pre-existing failures triaged and repaired separately.
- [ ] Before/after screenshots and feature parity for Home, Apps, TTCM, Attendance, Gradebook, Work Hub, Settings, external apps and all critical roles.
- [ ] Real macOS Safari and Windows Edge smoke tests, keyboard/reduced-motion checks.
- [ ] Matched-device baseline/candidate FPS, INP/LCP/CLS with valid sample and trace.
- [ ] Vercel preview approval, release rollback SHA and GO/NO-GO.

**Release decision: NO-GO — preview/PR review only.**
