# Brian English Studio V12.9.0 Test Report

**Release:** Workspace OS Core & Session Continuity  
**Baseline:** V12.8.0 Platform Core & Legacy CSS Retirement

## Implemented contracts

- Eight-workspace registry: Teaching, Assessment, Content, Management, Resources, AI, Games and System.
- Workspace resolver for routes and tools.
- Native Workspace Hub owned by the unified shell.
- Permission-aware and visibility-aware workspace app counts.
- Per-account workspace session memory in local storage.
- Cross-tab updates through custom events, `storage` and `BroadcastChannel`.
- Workspace search entries in the global Command Palette.
- Workspace-aware filtering on the Apps page.
- `data-workspace` on the app shell for design adapters and future workspace layouts.
- Brian Unified, Material 3 and Apple styles for the new workspace components.

## Automated results

| Check | Result |
|---|---:|
| V12.9 structural verifier | 19/19 PASS |
| Workspace runtime contracts | 12/12 PASS |
| Production build | PASS |
| Vite modules transformed | 309 |
| Smoke tests | 179/179 PASS |
| Department runtime — Admin | PASS |
| Department runtime — TTCM | PASS |
| Department runtime — Teacher | PASS |
| Performance budget | PASS |
| Development server | PASS |
| Local HTTP response | 200 OK |
| Served application version | 12.9.0 |

## Build note

The build intentionally leaves these personal-font URLs for runtime resolution:

- `/bes-fonts/brian-personal-font.ttf?v=12.9.0`
- `/fonts/personal-font.ttf?v=12.9.0`

Font binaries are not included in the release. Preserve the production font files during `rsync`.

## Scope boundary

V12.9.0 creates the workspace operating layer but does not merge the underlying app routes into a single monolithic page. Existing routes and feature logic remain intact to prevent data or permission regressions. Visual browser regression was not automated because a local Chromium binary was not available in the packaging environment; the production build and local HTTP server were verified successfully.
