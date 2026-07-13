# V10.3 — Standardized Windows 8 Start Screen

## Changes
- Rebuilt Start page tile list so tiles show the real application names instead of Windows sample labels.
- Mixed tile sizes across normal, wide and large tiles to create a Windows 8 Start Screen rhythm.
- Reworked the Metro Tile Open Effect:
  - tile presses down first,
  - overlay starts from the clicked tile's exact screen position,
  - transform-based expansion fills the viewport,
  - route change waits until the launch animation covers the screen.

## Verification
- `npm run build` completed successfully.
- `npm test` completed successfully with all smoke checks passing.
