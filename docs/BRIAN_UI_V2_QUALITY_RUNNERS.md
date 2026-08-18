# Brian Metro Next — Quality Runners

> Scope: `ui-v2-shadow` only.
> Safety rule: diagnostics may read DOM, timing and current V2 read models, but must not mutate Brian business data.

## 1. Route Quality Runner

`src/ui/v2/components/B2RouteQualityRunner.jsx` sequentially opens representative Metro Next workspaces in an off-screen same-origin iframe and records a combined accessibility/performance report for each route.

The runner currently targets Home, Apps, Resources, News, Homeroom, Students, Dashboard, Work Hub, Assessment, Collaboration, Reports, Settings, Admin and Cloud when the current permission source allows those routes.

### Accessibility heuristics

`src/ui/v2/quality/qualityAudit.js` checks:

- duplicate element IDs;
- exactly one `main` landmark;
- visible buttons/links/role-buttons without accessible names;
- visible form controls without accessible labels;
- visible images missing `alt` attributes;
- open dialogs without accessible names;
- missing or multiple visible H1 headings;
- visible interactive targets below 32px.

Critical findings produce a route-level FAIL. Non-critical findings produce WARN.

This is a heuristic auditor, not a replacement for axe, VoiceOver, NVDA, keyboard walkthrough, contrast measurement or WCAG review.

## 2. Performance heuristics

The same route runner records:

- DOM node count;
- number of active iframes;
- JavaScript transfer size when browser resource timing exposes it;
- CSS transfer size;
- available long-task entries;
- longest observed long task;
- DOMContentLoaded timing.

Current fail thresholds are intentionally conservative and exist to catch severe regression rather than certify Core Web Vitals. Browser privacy/cache behavior can make transfer-size data incomplete, so results must be interpreted as diagnostics rather than lab-grade benchmarking.

## 3. Viewport Harness

`src/ui/v2/components/B2ViewportHarness.jsx` renders the actual V2 preview inside an iframe whose internal CSS viewport uses one of six presets:

- 390×844 phone;
- 820×1180 iPad portrait;
- 1180×820 iPad landscape;
- 1366×768 laptop;
- 1600×900 desktop;
- 3840×2160 4K / 65-inch classroom TV simulation.

The iframe is visually scaled to fit the Release Gate surface while preserving its internal viewport dimensions. Review state is stored only in the V2 QA ledger.

A simulated viewport PASS does **not** prove:

- Safari/iPadOS behavior;
- real touch/pointer ergonomics;
- browser chrome/safe-area behavior;
- physical TV scaling, overscan or viewing distance;
- DPR-specific rendering;
- screen-reader or keyboard behavior.

For this reason the Release Gate requires both simulated viewport completion and a separate manual Responsive confirmation.

## 4. Release-gate dependencies

The manual Release Gate intentionally refuses to unlock:

- `Responsive` until all simulated viewport presets have been reviewed;
- `Accessibility` until all permitted quality routes were audited and none has a critical accessibility failure;
- `Performance` until all permitted quality routes were audited and none has a critical performance failure;
- `Behavior` until the per-tool behavior manifest is complete;
- `Owner Approval` until structural, quality, behavior, data, CI and preceding manual checks are satisfied.

These dependencies prevent a reviewer from accidentally marking a high-level gate complete while lower-level evidence is missing.

## 5. Storage and privacy

Quality results are browser-local QA metadata. They do not create or alter production class, student, resource, assessment, collaboration or admin records. The ledger may be reset from Release Gate at any time.

## 6. Final rule

Automated PASS means “no blocking issue was detected by this runner.” It never means “the interface is fully accessible, performant or production-ready.” Final release still requires real-device and real-workflow validation plus owner approval.
