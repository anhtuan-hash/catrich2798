# Brian Design System — Stage 6: Polish, QA & Legacy Cleanup

Stage 6 closes the initial Brian Editorial Material rollout by tightening runtime authority, accessibility, responsive behavior and legacy-debt governance.

## What changed

### 1. Final visual authority is cheaper

`GlobalEditorialAuthorityRuntime.jsx` previously used a promotion burst at 80, 260, 720 and 1400 ms after route events in addition to a `MutationObserver`.

Stage 6 removes the timeout burst. Final authority now uses:

- one `MutationObserver` for lazy stylesheet insertion;
- one requestAnimationFrame debounce for promotion;
- route/editorial events only as immediate scheduling signals.

This keeps the final cascade contract while avoiding repeated timer work on every route change.

### 2. Stage 6 polish layer

`BrianStage6Polish.css` is intentionally small. It is not another theme or skin.

It provides only cross-route QA fixes for migrated production surfaces:

- long-copy wrapping;
- min-width overflow protection;
- touch-action behavior;
- consistent focus-visible treatment;
- small-screen action sizing;
- TTCM viewport containment;
- forced-colors support;
- reduced-motion safety.

It uses semantic Brian tokens and contains no hard-coded hex palette or animation/transition declarations.

### 3. Legacy CSS debt baseline

Brian still contains historical structural styles that cannot safely be deleted yet. Home and Dashboard in particular still rely on older files for layout geometry even though Stage 5 owns their final visual treatment.

Stage 6 therefore adopts a prove-before-delete policy:

- do not remove structural legacy styles until selector/behavior coverage is proven;
- do not add more global `src/styles/v####.css` imports;
- current global versioned-CSS baseline in `main.jsx` is capped at 13;
- new visual work belongs in tokens/components/shared workflow contracts, not another versioned global stylesheet.

### 4. Retired practice-route contract

The historical standalone `practice` route still exists in the legacy registry but has no renderer. Stage 6 keeps the guard introduced in Stage 5: the route must not regain a renderer without a fresh migration audit. Active practice/exam tools should be migrated by their real tool slug/component.

## CI contract

`Stage 6 Polish QA` fails if:

- final authority order changes unexpectedly;
- the timer promotion burst returns;
- design-system migration CSS is imported through the navigation component;
- global versioned CSS imports grow beyond the baseline;
- the standalone practice renderer returns;
- Stage 6 introduces hard-coded hex colors or presentation motion;
- required responsive/accessibility contracts disappear.

## Final authority order

1. Global Editorial Authority 2026
2. Global Navigation Final 2026
3. Stage 5 app migration
4. Stage 5 workflow migration
5. Stage 6 polish

## Cleanup principle

Stage 6 does not delete a CSS file merely because a later layer visually overrides it. A file is removable only after its structural selectors and responsive behavior are no longer required by production DOM.
