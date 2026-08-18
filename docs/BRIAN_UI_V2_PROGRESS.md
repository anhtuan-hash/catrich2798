# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 90%

This percentage is weighted by release effort, not by the number of preview screens. Current weighted implementation is about 90.2%. The remaining work is now dominated by real behavior/device QA, final CI acceptance and the deliberate production bootstrap integration that must happen only after owner approval.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 97% | 9.7% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 75% | 15.0% |
| Responsive/accessibility/performance/QA | 10% | 78% | 7.8% |
| Release integration, feature flag & rollback gate | 5% | 60% | 3.0% |
| **Total** | **100%** |  | **~90.2% / 90% release estimate** |

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

## Release engineering now implemented

- Fail-closed release modes: `off`, `shadow`, `opt-in`, `on`
- Browser-local private opt-in simulator
- Emergency rollback latch
- Admin-only Release Gate
- Automated non-mutating structural contract for bridged tools
- Sequential Level 2 Contract Runner for all ten Level 2 tools
- Shared runtime preparation path between visible Tool Shell and Contract Runner
- Per-tool manual behavior manifest for persistence/workflow/import-export parity
- Global Behavior release check locked until the per-tool matrix is complete
- Owner Approval locked until structural, behavior, data and preceding manual gates pass
- First-release write policy: native V2 read surfaces, production mutation delegation to V1
- Production bootstrap intentionally remains untouched

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

The Release Gate can now run structural contracts for all ten tools without requiring the user to open each one manually. The runner does not click controls or mutate business state. It verifies runtime access, route identity, mount state, interactive nodes, duplicate chrome cleanup, adapter installation, isolation and severe horizontal overflow.

A structural PASS does not certify persistence or workflow parity. The per-tool behavior matrix therefore remains mandatory and must be checked after real interaction with each tool.

### Level 1 — Tool Shell bridge

- Top Five Arena
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

These remain Level 1 intentionally because the current code audit has not proven sufficiently safe scoped selectors for a Level 2 adapter.

## Data and permission status

Metro Next reuses current Brian auth, assigned-class/workspace data, Homeroom Workspace Store, Dashboard Aggregator, Resource Library, History, News feed and Collaboration state. Missing fields are shown as missing rather than fabricated.

With a real user, route and tool visibility use the existing V1 permission service. UI Lab and Release Gate remain admin-only. Shadow role simulation exists only when there is no real authenticated session.

## First-release mutation policy

The first V2 release will not create a parallel production write layer. Homeroom, roster, Resource Library, Work Hub, Assessment, Collaboration, Admin and Cloud mutations continue to delegate to current V1 workflows. Tool-specific writes remain inside the existing V1 engine running in Tool Shell. Only V2 QA/preferences use browser-local writes.

See `docs/BRIAN_UI_V2_WRITE_POLICY.md`.

## Responsive/accessibility/performance status

Engineering protections already cover route-level lazy loading, skip navigation, route focus restoration, visible keyboard focus, forced-colors, reduced motion, coarse-pointer touch targets and phone/tablet/desktop/TV breakpoint behavior.

These protections are not the same as a passed manual matrix. Real iPad portrait/landscape, laptop, desktop, 65-inch TV, keyboard-only, zoom/contrast and interaction-latency checks remain release blockers.

## Current CI status

The previous release-engineering milestone `2d5ed7202d52c1fdd0ad5e60eeb9e2b458d7b8b2` received Vercel **SUCCESS**. The newest 90% milestone must be checked separately after its final commit and is not considered green until that check succeeds.

## Major work still required

1. Run the Level 2 Contract Runner in the deployed preview and investigate any WARN/FAIL.
2. Execute the manual behavior matrix for all ten Level 2 tools: persistence, import/export, saved state and workflow parity.
3. Run manual responsive regression on phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
4. Complete accessibility checks on real screens: keyboard order, overlays/focus lifecycle, contrast, zoom and reduced motion.
5. Complete performance checks: interaction latency, iframe bridge cost, repeated-route memory and large-list behavior.
6. Keep the four Level 1 tools bridged until exact selectors are proven safe.
7. Obtain final successful Vercel Preview for the last QA milestone.
8. Obtain owner approval on the private preview.
9. Only then wire the tested release decision into production bootstrap in a separate final-release commit.
10. Start production rollout in `opt-in`, verify rollback and only expand after stability is confirmed.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
