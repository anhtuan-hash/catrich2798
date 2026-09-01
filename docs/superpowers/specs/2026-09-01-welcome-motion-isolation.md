# Welcome Motion Isolation Spec

## Goal

Make the first-visit Brian English welcome scene a motion-isolated experience so global application CSS/runtime motion controls cannot suppress, reset, or override its animations.

## Architecture

- Render the welcome visual scene inside a dedicated `iframe` `srcdoc` document.
- Keep first-visit persistence, protected-route gating, dismissal lifecycle, storage sync, and parent-page scroll locking in `src/firstVisitWelcome.js`.
- Import all four welcome stylesheets with Vite `?inline` and inject their CSS into the iframe document instead of the application document.
- The iframe uses `sandbox="allow-same-origin"` without `allow-scripts`; all interaction logic remains in the parent module and binds to `iframe.contentDocument` after load.
- Inline `!important` frame geometry keeps the overlay fixed above the app, while all inner animation CSS lives in the isolated document.

## Motion Requirements

- Existing lighthouse beam, reflection, parallax, particles, waves, clouds, stars, shooting star, moon halo, card motion, ambient twilight veil, ocean glints, horizon mist, moon orbit and card sheen continue to run.
- `?welcome=preview&motion=full` continues to force the welcome open and restore full animation for diagnostics.
- OS `prefers-reduced-motion` remains respected when `motion=full` is not requested.
- Parent application motion classes/selectors must not be able to target elements inside the welcome scene.

## Functional Requirements

- First-visit localStorage key/version behavior is unchanged.
- Login/register/setup/recovery routes remain excluded.
- Escape, backdrop, close, later and start actions remain functional.
- Start keeps the cinematic exit choreography before removal.
- Focus is moved into the iframe dialog and restored to the previous parent-page element on dismissal.
- Storage synchronization between tabs remains functional.

## Verification

- Contract test proves welcome CSS is no longer side-effect imported into the parent application document.
- Contract test proves all welcome CSS files are imported with `?inline`.
- Contract test proves an iframe `srcdoc` document is used and that interaction binds through `contentDocument`.
- Existing welcome motion/design contract checks stay green.
- Vercel preview must complete the UI contract and production Vite builds before `main` is updated.
