# Star mobile-mode toggle — retired

## Status
Retired on 2026-09-22.

## Current behavior
- The particle Star remains in the desktop navigation as a decorative Brian English visual.
- Clicking or tapping the Star no longer changes presentation mode.
- Real phones and portrait tablets still use the automatic mobile shell.
- Desktop browsers stay on the desktop layout.
- Any legacy `bes-presentation-override` value left by the old Star toggle is ignored and cleared by the presentation-mode hook.

## Removed behavior
- Star click → persistent `mobile` override.
- Desktop phone-width preview stage.
- Floating “Máy tính / Desktop” return control.

## Regression coverage
- `scripts/test-star-mobile-mode-toggle.mjs` now asserts the Star is non-interactive and cannot write a presentation override.
- `tests/e2e/mobile-shell.spec.js` verifies a stale desktop mobile-preview override is ignored and cleared.
- Automatic mobile behavior for actual phones/tablets remains covered by the existing mobile-shell tests.
