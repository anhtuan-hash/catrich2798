# TESOL Hero Redesign Implementation Plan

**Goal:** Add an approved React hero above the existing TESOL HTML application while preserving its Search / List / Graph behavior and approved content.

## Scope

- Keep the approved TESOL app inside `ExternalWebAppViewer` unchanged.
- Add a dedicated `TesolMethodHero` React component for the `#/tool/tesol-method` route.
- Make the embedded viewer support optional introductory content above the iframe without changing behavior for other external apps.
- `Explore Terms` scrolls to the embedded TESOL explorer.
- `View Dashboard` navigates to the verified Brian route `#/dashboard`.
- Responsive desktop/tablet/mobile layout; no new dependency.

## Files

1. `src/components/TesolMethodHero.jsx` — new hero component and real React preview cards.
2. `src/components/TesolMethodHero.css` — scoped navy/glass responsive styling.
3. `src/components/ExternalAppsIntegration.jsx` — render the hero only for the TESOL route and pass it into the viewer.
4. `src/components/ExternalWebAppViewer.jsx` — accept optional intro content and an explorer anchor id.
5. `src/components/ExternalWebAppViewerCrop.css` — allow the TESOL viewer layer to scroll when intro content is present while preserving fullscreen behavior.
6. `scripts/test-tesol-method-hero.mjs` — source contract checks for the route, CTAs, explorer anchor and scoped integration.
7. `package.json` — expose `test:tesol-hero`.

## Verification

- Run `npm run test:tesol-hero`.
- Run existing smoke tests where available.
- Run production `npm run build` through the connected deployment/CI path.
- Verify the branch diff only touches the scoped files above.
- Merge to `main`, then verify the Vercel production deployment becomes READY and serves the production alias.
