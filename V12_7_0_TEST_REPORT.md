# V12.7.0 Test Report

## Release

- Version: `12.7.0`
- Name: **Native Design Adapters & Appearance Sync**
- Baseline: V12.6.0 full source
- SQL migration: not required
- New environment variables: none

## Implemented contracts

1. Unified UI preference object and compatibility migration from legacy localStorage keys.
2. Pre-render preference bootstrap to reduce theme/design-language flashing.
3. Native Brian Unified, Material 3 and Apple adapters.
4. Shared accent token and 11 accent choices.
5. Relaxed, medium and compact density tokens.
6. Local persistence and cross-tab synchronization.
7. Supabase Auth user-metadata synchronization without a new database table.
8. Timestamp-based local/cloud conflict resolution.
9. Appearance synchronization status shown in Settings.
10. Legacy V11.6.2/V11.6.3 Appearance Engine removed.
11. Persistent font bridge with local names and two deployed URL paths.

## Verification results

```text
V12.7 contract verifier: 22/22 PASS
Production build: PASS
Vite modules transformed: 320
Smoke tests: 179/179 PASS
Department Admin runtime: PASS
Department TTCM runtime: PASS
Department Teacher runtime: PASS
Performance budget: PASS
Development server: PASS
Local HTTP response: 200
Served version meta: 12.7.0
```

## Build notes

Vite reports unresolved font URLs at build time because the personal font binary is intentionally excluded from the source package. The URLs remain unchanged and are resolved at runtime from the user's existing project.

## Visual browser automation

A Chromium screenshot run was attempted with the system browser, but the container policy blocked navigation to localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`. Visual verification must therefore be performed once on the user's local browser after installation. Build, HTTP serving, static contracts and application smoke tests passed.

## Required manual checks after deployment

1. Open **Settings → Appearance**.
2. Switch among Brian Unified, Android Material 3 and Apple.
3. Confirm shell, workspace tabs, cards, controls and overlays all change together.
4. Change accent color and confirm active controls use the new accent.
5. Change density and confirm spacing/control height changes site-wide.
6. Sign in on another browser and confirm appearance settings are restored from the account.
7. Confirm the personal font loads from the deployed static path.
