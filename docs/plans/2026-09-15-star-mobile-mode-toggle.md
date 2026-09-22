# Star mobile-mode toggle — retired

## Status
Retired on 2026-09-22.

## Current behavior
- The particle Star remains in the desktop navigation as a decorative Brian English visual.
- Clicking or tapping the Star no longer changes presentation mode.
- The Star is no longer rendered as a button and no longer shows a pointer cursor.
- Real phones and portrait tablets continue to use the existing automatic mobile shell.
- Desktop browsers remain on the desktop layout unless presentation mode is changed through internal/development mechanisms outside the Star control.

## Scope
This retirement intentionally removes only the user-facing **Star → mobile** action. The underlying presentation-mode infrastructure is left intact to avoid changing real mobile-device behavior or unrelated development/test tooling.

## Regression coverage
- `scripts/test-star-mobile-mode-toggle.mjs` asserts that the Star has no click handler and no presentation-override write.
- The existing presentation-mode unit tests continue to protect phone/tablet/desktop detection.
- Production build validation remains required.
