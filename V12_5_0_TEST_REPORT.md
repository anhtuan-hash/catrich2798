# Brian English Studio V12.5.0 — Test Report

## Release
Unified Launch Experience Migration

## Migrated areas

- Home and animated app constellation
- Apps directory
- Radial and water launcher surfaces
- Search, recent apps, groups, density, and pinned apps
- Game Hub selection board and live preview
- Special Tools launch collection

These areas now use the shared Launch UI Core anatomy:

`Launch Page → Hero → Stage/Toolbar → Navigation → Grid/Tiles → Pinned/Preview`

## Architectural changes

- Added reusable `UILaunchPage`, `UILaunchHero`, `UILaunchStage`, `UILaunchToolbar`, `UILaunchNavigation`, `UILaunchGrid`, and `UILaunchPinned` primitives.
- Removed the page-specific Apps navigation from the rendered tree; the global Unified Shell is now the single navigation owner.
- Added Brian Unified, Material 3, and Apple presentation mappings for the same launch components.
- Added responsive contracts at 1080 px and 720 px.
- Preserved horizontal writing mode for inputs and textareas.

## Verification performed

- `npm ci`: PASS
- V12.5 contract assertions: 25/25 PASS
- Production build: PASS
- Vite modules transformed: 317
- Smoke tests: 179/179 PASS
- Department runtime — Admin: PASS
- Department runtime — TTCM: PASS
- Department runtime — Teacher: PASS
- Development server startup: PASS
- Local HTTP response: 200 OK

## Compatibility

No launcher state, drag/drop, pinning, grouping, app visibility, permissions, custom game approval, iframe behavior, Supabase schema, AI provider, or route logic was changed.

## Known build notice

The test environment did not contain `/fonts/personal-font.ttf`; Vite therefore leaves the URL for runtime resolution. Preserve the existing personal font files when copying this source into the production repository.

## Visual verification boundary

Build, runtime contracts, smoke tests, and local server startup were verified. Authenticated production screenshots were not generated in the packaging environment, so Home, Apps, and Game Hub should receive a final visual check after local login before deployment.
