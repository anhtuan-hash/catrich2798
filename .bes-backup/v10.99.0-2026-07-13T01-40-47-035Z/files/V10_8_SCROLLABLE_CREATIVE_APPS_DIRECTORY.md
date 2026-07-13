# V10.8 — Scrollable Creative Apps Directory

## Changes

- Rebuilt `/apps` so the page scrolls normally and no app cards are clipped by the viewport.
- Replaced the previous mauve/pink backdrop with a lighter cream + mint + warm orange creative background.
- Converted the app directory into a responsive dense collage grid instead of a fixed-height viewport grid.
- Reduced hero height and stats block size so more app cards appear earlier on screen.
- Hid bottom quick pins on `/apps` to keep the page cleaner and avoid competing with the full app list.
- Preserved VI/EN system copy and Flat Window Launch Transition.

## Verification

- `npm run build` passed.
- `npm test` passed.
