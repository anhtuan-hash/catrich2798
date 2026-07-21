# V12.6.0 Test Report

## Release

- Version: 12.6.0
- Name: Overlay, Dialog & AI Dock Core Migration
- Baseline: V12.5.0 Unified Launch Experience full source
- Node.js: 22.16.0

## Automated results

### V12.6 contract verifier

- Result: PASS
- Assertions: 19/19

Validated:

- Shared overlay portal and surface primitives
- Focus trap and focus restoration
- Escape dismissal and scroll lock
- Shared close/header anatomy
- Global toast center
- Command Palette migration
- Content Transfer drawer migration
- Autosave Version History dialog migration
- Notification Center drawer migration
- React AI Dock ownership
- Horizontal AI composer contract
- Mobile and reduced-motion contracts
- Material 3 and Apple adapters
- Removal of the injected V11.6.7 AI Dock asset
- Version registry and package scripts

### Production build

- Result: PASS
- Vite modules transformed: 319
- Build time observed: approximately 5.3 seconds

The build emitted the existing warning that `/fonts/personal-font.ttf` was not present in the packaging environment. Font binaries are intentionally excluded and must remain in the user's main project.

### Smoke suite

- Result: PASS
- Checks: 179/179

### Department runtime suite

- Admin: PASS
- TTCM: PASS
- Teacher: PASS

### Development server

- Result: PASS
- Local HTTP response: 200
- Served version meta: 12.6.0

## Source safety

- No `node_modules` in the release ZIP
- No `dist` in the release ZIP
- No `.env` files in the release ZIP
- No personal font binary in the release ZIP
- No `public/bes-ai-dock-v2/` directory
- No V11.6.7 injected AI Dock script tag in `index.html`

## Manual validation still required

An authenticated production session was not available in the packaging environment. After deployment, visually confirm the Notification Center, Command Palette, Content Transfer drawer, Version History dialog, and Brian AI Dock in the real account context.
