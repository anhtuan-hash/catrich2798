# Brian Metro Next — Accessibility & Performance QA Gate

> Scope: `ui-v2-shadow` only. This document is a release gate, not a claim that manual QA has already passed.

## Implemented engineering guards

- Route-level lazy loading for every V2 workspace except Home and the Tool Shell runtime.
- Suspense loading state with `role=status`, `aria-live=polite` and `aria-busy=true`.
- V2-only skip link that focuses the main workspace without mutating the hash router.
- `main` landmark has a stable id and programmatic focus target.
- SPA navigation restores focus to the main workspace.
- Current navigation item exposes `aria-current=page`.
- Notification/profile toggles expose `aria-expanded`.
- V2-scoped `:focus-visible` ring restores keyboard focus visibility even though legacy V1 has historical focus suppression.
- `prefers-reduced-motion: reduce` collapses V2 animation/transition duration.
- Forced-colors focus fallback is included.
- Existing responsive QA remains active for phone, tablet, laptop, desktop and large display bands.
- News feed uses AbortController, an in-memory five-minute client cache, and the existing server-side feed cache instead of background polling.

## Manual accessibility matrix still required

1. Keyboard-only navigation from browser chrome through skip link, rail, top bar, page commands, dialogs and Tool Shell.
2. Verify no focus trap or focus loss when Command Palette, Notification Center and Profile Menu open/close.
3. VoiceOver on macOS/iPadOS for page landmarks, current navigation, buttons, tables and form labels.
4. Contrast verification for all text/status combinations, including hover, disabled and focus states.
5. 200% browser zoom and OS text scaling on representative pages.
6. Reduced-motion mode on macOS/iOS and Windows.
7. Forced-colors / Windows High Contrast where available.

## Manual performance matrix still required

1. Compare first Shadow load before/after route splitting using production preview build.
2. Measure route transition latency for Home → Classes → Students → Dashboard → News → Admin.
3. Measure Tool Shell bridge initialization and Level 2 adapter injection cost.
4. Test large classes/student lists and Resource Library with realistic production-sized data.
5. Test News Reader with slow network, partial RSS failures and repeated category switching.
6. Inspect duplicate requests after auth/class/resource/dashboard events.
7. Verify no background timer or ticker is reintroduced by News & Reading.
8. Test memory after repeated open/close of bridged tools and route chunks.

## Release acceptance

The V2 release gate remains closed until manual device/accessibility/performance regression is completed, Vercel accepts a preview build, and the owner explicitly approves the private preview.
