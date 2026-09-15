# Star → Mobile presentation mode

## Goal
Turn the animated particle-star logo in the desktop navigation into a presentation-mode switch that opens Brian English's real mobile shell inside a desktop browser, with a clear way back to desktop.

## Design
- Keep automatic device detection as the default.
- Clicking the desktop star writes a persistent `mobile` presentation override to `localStorage` and emits a same-tab change event.
- `usePresentationMode` listens for the override event and `storage`, so the shell swaps without reload.
- The existing `MobileAppShell` remains the source of truth for mobile navigation; no duplicate mobile UI is introduced.
- When mobile is forced from desktop, constrain the app to a phone-width stage and expose a small Desktop return button.
- Clearing the override returns to normal automatic device detection.

## Files
- `src/device/presentationMode.js`: persistent override read/write helpers and event constant.
- `src/hooks/usePresentationMode.js`: resolve query/stored override and react to changes.
- `src/components/HomeParticleSignaturePortal.jsx`: make the nav star an accessible button and activate mobile mode.
- `src/components/GlobalFlatNavigation.jsx`: mark forced mode on the root and render the Desktop return control.
- `src/components/BrianPulseLogo.css`: interactive star/forced-phone-stage styles.
- `scripts/test-star-mobile-mode-toggle.mjs`: contract checks for storage, event wiring, star action, mobile shell reuse, and return action.

## Verification
1. Run `node scripts/test-star-mobile-mode-toggle.mjs`.
2. Run `npm run build`.
3. Run `npm test`.
4. Verify CI/deployment after merge.
