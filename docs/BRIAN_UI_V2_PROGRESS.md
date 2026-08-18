# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 85%

This percentage is weighted by release effort, not by the number of preview screens. Current weighted implementation is about 85.3%, while the conservative release estimate remains 85% because the latest Vercel preview is still CI-pending behind the account build-rate limit and the manual release matrix has not yet passed.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 97% | 9.7% |
| Primary teaching pages | 14% | 100% | 14.0% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 72% | 14.4% |
| Responsive/accessibility/performance/QA | 10% | 62% | 6.2% |
| Release integration, feature flag & rollback gate | 5% | 0% | 0.0% |
| **Total** | **100%** |  | **~85.3% raw / 85% conservative release estimate** |

## Preview coverage

Ready views:

- Home
- Apps
- Teaching Tool Hub
- Games
- Resource Library
- Knowledge Hub
- News & Reading
- Homeroom
- Classes
- Students
- Dashboard
- Work Hub
- Assessment
- Collaboration
- Reports
- Settings
- Admin
- Cloud & Data Operations
- UI Lab

## Shell capabilities ready

- Desktop sidebar and mobile bottom navigation
- Command palette (`Cmd/Ctrl + K`)
- Permission-filtered command palette with direct bridged-tool launch
- Live notification center backed by the current Dashboard snapshot
- Profile menu using the current authenticated user when available
- Shared page headers, surfaces, buttons, tabs, search and badges
- Shared form system
- Shared drawer, dialog and toast system
- Shared Data UI with filters, bulk selection, row actions, pagination, loading skeleton, error and empty states
- Metro Next Tool Shell with focus mode, reload, V1 escape hatch and fullscreen
- Same-origin Legacy Runtime Bridge that keeps existing V1 tool logic isolated from V2 shell styling
- Scoped Level 2 Chrome Adapter system applied inside selected same-origin tool runtimes
- Nested same-origin adapter support for TextLab's embedded runtime
- Read-first production Data/Service Bridge mounted once above the Shadow router
- Real permission read adapter over existing V1 `hasRouteAccess()` / `hasToolAccess()`
- Locked sidebar, mobile nav, Command Palette and direct-route guard from the same permission source
- Shadow role simulator only when no authenticated session is available
- Shadow-only responsive QA layer for phone/tablet/desktop/TV bands
- Coarse-pointer 44px touch target protection and `prefers-reduced-motion` handling
- UI Lab diagnostics for data source, permission source, viewport tier and tool migration level
- Route-level lazy loading for all V2 workspaces except Home/Tool Shell
- V2-only skip link, SPA main-focus restoration, `aria-current`, `aria-expanded` and visible keyboard focus policy
- Forced-colors focus fallback and reduced-motion quality gate

## Production data integration

The following V2 views no longer use preview fixture datasets for their primary data:

- Homeroom
- Classes
- Students
- Dashboard
- Resource Library
- Knowledge Hub
- Work Hub
- Assessment
- Collaboration
- Reports
- Admin overview
- Cloud & Data Operations

`BrianV2DataProvider` reuses Brian's existing auth, assigned-class RPC/workspace metadata, Homeroom Workspace Store, Dashboard Aggregator, Resource Library and owner-scoped History data. Work Hub reuses the Dashboard Aggregator; Knowledge Hub reuses Resource Library; Assessment reads current learning records plus assessment resources; Collaboration reads the existing cloud/local governance state. Admin and Cloud no longer display fabricated user/session/audit/health metrics: they only expose the current user, real source map, visible data counts, Data Bridge timestamp and source errors.

News & Reading uses the existing `/api/news-feed` RSS aggregator, with manual refresh, request cancellation and a five-minute client memory cache. It is a dedicated workspace and does not restore the retired global ticker/weather/clock strip.

Settings connectivity badges now reflect current Data Bridge/Resource Store state instead of hard-coded Connected values.

Missing production fields are displayed as missing/neutral values instead of invented percentages, scores or statuses. Current integration remains deliberately read-first. Mutating workflows continue to open V1 while V2 is private, which protects production data while visual/data parity is tested.

See `docs/BRIAN_UI_V2_DATA_BRIDGE.md` and `docs/BRIAN_UI_V2_A11Y_PERFORMANCE_QA.md`.

## Tool migration coverage

### Level 2 — V2 chrome adapter + V1 engine preserved

- Brian Classroom Stage
- Knowledge Train
- Crossword Trial
- Flying Words
- Brian TextLab Activities
- Exam Studio
- Lesson Architect
- THPT Interactive Practice Hub
- Seating Chart Studio
- Reading Studio

These tools receive slug-scoped V2 styling inside their bridged runtime for duplicate chrome, action bars, form controls, cards/panels and selected modal/workflow surfaces. Their existing engines, persistence, import/export and game/workflow logic remain owned by V1.

### Level 1 — Tool Shell bridge

- Top Five Arena
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

The current source-index audit did not expose sufficiently stable, confidently scoped DOM/CSS namespaces for these four tools. They remain Level 1 deliberately rather than receiving broad adapters that could regress their existing runtime. They will only move to Level 2 after exact selectors are verified during behavior/manual inspection.

See `docs/BRIAN_UI_V2_TOOL_SHELL.md`, `docs/BRIAN_UI_V2_LEVEL2_QA.md`, `docs/BRIAN_UI_V2_PERMISSION_BRIDGE.md`, `docs/BRIAN_UI_V2_RESPONSIVE_QA.md` and `docs/BRIAN_UI_V2_A11Y_PERFORMANCE_QA.md`.

## Permission status

With a real authenticated user:

- Metro Next reads the existing V1 route/tool permission service;
- sidebar, mobile nav, Command Palette and direct hashes use the same read adapter;
- News maps to the existing V1 News permission;
- Cloud & Data maps to the existing admin-only Cloud Operations permission;
- UI Lab remains admin-only;
- the role simulator cannot change the real user's role;
- V1 service checks, Supabase/RLS and tool authorization remain authoritative.

Without a real user, the Teacher / TTCM / Admin simulator remains available only for Shadow visual QA; Cloud/Admin/UI Lab remain admin-only in that simulator.

## Responsive, accessibility and performance engineering status

A Shadow-only responsive QA layer covers engineering breakpoints for compact phone, large phone/small tablet, tablet, compact laptop, desktop, large desktop and TV/display widths. UI Lab reports the actual viewport tier. Touch targets and reduced-motion preference are handled at the V2 layer.

The router now code-splits non-Home workspaces with React lazy/Suspense. The shell has a hash-safe skip link, stable main landmark, SPA focus restoration and scoped `:focus-visible` policy. News requests use AbortController and cache rather than background polling.

This is not considered a passed manual device/accessibility/performance matrix. iPad portrait/landscape, laptop, desktop, classroom TV, keyboard-only, VoiceOver, contrast, 200% zoom and runtime performance regression still need hands-on validation before release.

## Current CI status

The previous Vercel check returned `failure` with target reason `upgradeToPro=build-rate-limit`. This was an account build quota/rate-limit response, not a compiler error report. The current milestone remains CI-pending until Vercel accepts another preview build. The final status for this milestone must be rechecked after this ledger commit.

## Major work still required

1. Re-run Vercel Preview after the build-rate window allows another build and fix any real compile/runtime errors if reported.
2. Run the Level 2 behavior contract for all ten adapters and fix V2-only regressions.
3. Keep the four remaining Level 1 tools bridged until exact safe selectors are verified; upgrade only when justified.
4. Decide which production mutations receive native V2 commands and which remain delegated to V1 for the first release.
5. Run manual responsive regression across phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
6. Complete manual accessibility QA: keyboard order, overlays/focus lifecycle, screen reader landmarks, contrast, zoom and reduced motion.
7. Complete performance QA: initial bundle/chunk measurements, interaction latency, iframe bridge cost, repeated route memory and large-list behavior.
8. Run visual and functional regression against V1, including auth/permission parity, persistence, import/export and saved-state parity.
9. Add private feature flag/account opt-in and verify account-scoped V1/V2 switching without data divergence.
10. Add rollback gate, release checklist and final owner approval before any change to `main`.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
