# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 88%

This percentage is weighted by release effort, not by the number of preview screens. Current weighted implementation is about 88.3%. The remaining work is dominated by manual behavior/device QA, final CI acceptance and the deliberate production bootstrap integration that must happen only after owner approval.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 96% | 9.6% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 75% | 15.0% |
| Responsive/accessibility/performance/QA | 10% | 70% | 7.0% |
| Release integration, feature flag & rollback gate | 5% | 40% | 2.0% |
| **Total** | **100%** |  | **~88.3% / 88% release estimate** |

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
- Cloud & Data
- UI Lab
- Release Gate

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
- Route-level lazy loading for secondary V2 workspaces
- Skip-to-content, route focus restoration, `aria-current`, expanded-state semantics and `:focus-visible` keyboard policy
- Metro Next Tool Shell with focus mode, reload, manual contract recheck, V1 escape hatch and fullscreen
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
- Private Release Gate with fail-closed mode, local opt-in simulator, rollback latch and manual release checklist

## Production data integration

The following V2 views no longer use preview fixture datasets for their primary data:

- Homeroom
- Classes
- Students
- Dashboard
- Resource Library
- Knowledge Hub
- News & Reading
- Work Hub
- Assessment
- Collaboration
- Reports
- Admin diagnostics
- Cloud & Data diagnostics
- Settings connection badges

`BrianV2DataProvider` reuses Brian's existing auth, assigned-class RPC/workspace metadata, Homeroom Workspace Store, Dashboard Aggregator, Resource Library and owner-scoped History data. Work Hub reuses the Dashboard Aggregator; Knowledge Hub reuses Resource Library; Assessment reads current learning records plus assessment resources; Collaboration reads the existing Collaboration Governance cloud/local state. News & Reading calls the existing `/api/news-feed` endpoint and does not restore the retired global ticker.

Missing production fields are displayed as missing/neutral values instead of invented percentages, scores or statuses. Current integration remains deliberately read-first. Mutating workflows continue to open V1 while V2 is private, which protects production data while visual/data parity is tested.

See `docs/BRIAN_UI_V2_DATA_BRIDGE.md`.

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

The Tool Shell now runs a non-mutating structural contract after runtime load. It verifies same-origin access, route identity, runtime mount, interactive controls, duplicate chrome cleanup, adapter installation, V2 isolation and severe horizontal overflow. Results are persisted in a browser-local QA ledger and surfaced in Release Gate.

A structural PASS does not certify persistence, import/export, saved-state or workflow behavior. Those remain manual release checks.

### Level 1 — Tool Shell bridge

- Top Five Arena
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

The current source-index audit did not expose sufficiently stable, confidently scoped DOM/CSS namespaces for these four tools. They remain Level 1 deliberately rather than receiving broad adapters that could regress their existing runtime. They will only move to Level 2 after exact selectors are verified during behavior/manual inspection.

See `docs/BRIAN_UI_V2_TOOL_SHELL.md`, `docs/BRIAN_UI_V2_LEVEL2_QA.md`, `docs/BRIAN_UI_V2_PERMISSION_BRIDGE.md`, `docs/BRIAN_UI_V2_RESPONSIVE_QA.md` and `docs/BRIAN_UI_V2_RELEASE_GATE.md`.

## Permission status

With a real authenticated user:

- Metro Next reads the existing V1 route/tool permission service;
- sidebar, mobile nav, Command Palette and direct hashes use the same read adapter;
- UI Lab and Release Gate are admin-only;
- the role simulator cannot change the real user's role;
- V1 service checks, Supabase/RLS and tool authorization remain authoritative.

Without a real user, the Teacher / TTCM / Admin simulator remains available only for Shadow visual QA.

## Release engineering status

`src/ui/v2/releaseGate.js` now defines a fail-closed release decision with four explicit modes: `off`, `shadow`, `opt-in` and `on`. Missing/invalid configuration resolves to `shadow`. A rollback latch always forces the V2 decision off. `shouldBootV2()` also requires explicit release approval, so an environment switch or local opt-in alone cannot enable V2.

The release decision is intentionally **not wired into production bootstrap yet**. This preserves the promise that `main`/V1 stays unchanged until the final release gate passes. Production bootstrap integration will be a separate, reviewable final-release commit.

## Responsive/accessibility/performance status

A Shadow-only responsive QA layer covers engineering breakpoints for compact phone, large phone/small tablet, tablet, compact laptop, desktop, large desktop and TV/display widths. V2 now has route-level lazy loading, keyboard focus restoration, skip navigation, forced-colors/reduced-motion rules and coarse-pointer touch target protection.

These are engineering protections, not a manual device-matrix PASS. iPad portrait/landscape, laptop, desktop and classroom TV regression still need hands-on validation before release. Performance still needs final real-device interaction latency and bridged-iframe cost validation.

## Current CI status

The latest accepted status before this milestone was `failure` with target reason `upgradeToPro=build-rate-limit`. That was an account build quota/rate-limit response, not a compiler error report. The final status for the new single-commit release-engineering milestone must be rechecked after the commit is created.

## Major work still required

1. Obtain a final successful Vercel Preview build after the account build-rate window allows it; fix any actual compile/runtime errors if reported.
2. Open all ten Level 2 tools in the current milestone so their structural contracts populate the Release Gate ledger; investigate every WARN/FAIL.
3. Run behavior regression for persistence, import/export, saved state, scoring and workflow parity against V1.
4. Keep the four remaining Level 1 tools bridged until exact safe selectors are verified; upgrade only when justified.
5. Decide which production mutations receive native V2 commands and which remain delegated to V1 for the first release.
6. Run manual responsive regression across phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
7. Complete accessibility QA: keyboard order, visible focus policy, aria semantics, contrast and reduced motion on real screens.
8. Complete performance QA: interaction latency, CSS/module budget, iframe bridge cost and large-list behavior.
9. Obtain owner approval on the private preview.
10. Only then wire the tested release decision into production bootstrap, begin with `opt-in`, verify rollback, and expand rollout gradually.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
