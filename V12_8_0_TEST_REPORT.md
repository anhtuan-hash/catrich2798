# Brian English Studio V12.8.0 Test Report

## Release

**Platform Core & Legacy CSS Retirement**

## Implemented scope

- Added `UIRouteSurface`, `UIPlatformHeader`, `UIStatGrid`, `UIStat`, and `UIDataRegion` to the shared UI Core.
- Added native route-surface contracts for 11 platform/workbench routes:
  - AI Workspace
  - Content Factory
  - Content Ecosystem
  - Assessment Core
  - Learning Intelligence
  - Platform Readiness
  - Automation Center
  - Cloud Operations
  - Collaboration Hub
  - Data Governance
  - Production Hardening
- Added a dedicated `platform-core.css` loaded after the remaining compatibility CSS.
- Centralized all still-required historical styles behind one audited entry point: `src/styles/legacy-active.css`.
- Restored the AI Provider Hub stylesheet to the production CSS graph.
- Removed ten legacy CSS files with no non-CSS references:
  - `v1100.css`
  - `v1110.css`
  - `v1131.css`
  - `v1132.css`
  - `v1133.css`
  - `v1136.css`
  - `v1137.css`
  - `v1154.css`
  - `v1158.css`
  - `v1159.css`
- Reduced source files under `src/styles` from 25 to 16 and removed 119,653 bytes of dead source CSS.
- Expanded route layout mapping for operational, library, launch, and content-ecosystem routes.
- Added horizontal textarea protection, responsive one-column fallbacks, token-based panels, and adapter-aware hero surfaces.

## Verification results

| Check | Result |
|---|---:|
| V12.8 structural verifier | 18/18 PASS |
| Production build | PASS |
| Vite modules transformed | 305 |
| Smoke tests | 179/179 PASS |
| Department runtime — Admin | PASS |
| Department runtime — TTCM | PASS |
| Department runtime — Teacher | PASS |
| Performance budget | PASS |
| Main CSS budget | 1,285,481 bytes |
| Development server | PASS |
| Local HTTP response | 200 |
| Served application version | 12.8.0 |

## Build notes

The full source package deliberately does not include the user's personal font file. Vite therefore reports that these runtime URLs are unresolved during the isolated build:

- `/bes-fonts/brian-personal-font.ttf?v=12.8.0`
- `/fonts/personal-font.ttf?v=12.8.0`

The URLs remain unchanged for runtime resolution. Preserve the existing font files when replacing the production repository.

## Limitations

This release retires dead legacy CSS and places the remaining active historical interiors behind a single compatibility entry point. It does **not** claim that every historical `v109x` or `v1120` class has already been rewritten as a native React UI Core component. The new route surfaces now own page width, spacing, tokens, adapter behavior, form safety, focus states, and responsiveness while the remaining interiors are migrated incrementally.
