# Dedicated External App Pages

## Goal
Every approved user-added HTML/website app gets a dedicated Brian page experience with its own deep link and automatically generated hero, while the embedded app remains sandboxed and unchanged.

## Design
- Keep the Apps directory at `#/apps`.
- Open non-TESOL approved apps at a stable deep link: `#/apps?app=<approved-app-id>` so the existing Brian router still resolves the base `apps` route.
- TESOL keeps its existing dedicated `#/tool/tesol-method` route and custom hero.
- Add a reusable `ExternalAppHero` that derives title, description, icon, group, source type, accent, and a deterministic visual variant from app metadata. New apps therefore receive a hero automatically without source edits.
- Primary hero CTA scrolls to the app runtime; secondary CTA returns to the Apps directory; Dashboard remains available as a quick destination.
- Preserve `ExternalWebAppViewer` sandbox/fullscreen behavior and approved HTML/URL content exactly as-is.

## Verification
- Add a source-contract test covering route generation/parsing, dedicated app selection, auto hero mounting, and TESOL preservation.
- Verify the Vercel preview production build succeeds.
- Fast-forward `main` only after the preview is READY, then verify production READY and live bundle contains the dedicated route/hero markers.
