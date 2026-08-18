# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 92%

This percentage is weighted by release effort, not by the number of preview screens. Current weighted implementation is about 92.0%. The remaining work is now dominated by evidence-based manual QA, final CI acceptance and the deliberate production bootstrap integration that must happen only after owner approval.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 98% | 9.8% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 75% | 15.0% |
| Responsive/accessibility/performance/QA | 10% | 90% | 9.0% |
| Release integration, feature flag & rollback gate | 5% | 70% | 3.5% |
| **Total** | **100%** |  | **~92.0% / 92% release estimate** |

## Release engineering implemented

- Fail-closed release modes: `off`, `shadow`, `opt-in`, `on`
- Browser-local private opt-in simulator
- Emergency rollback latch
- Admin-only Release Gate
- Automated non-mutating structural contract for bridged tools
- Sequential Level 2 Contract Runner for all ten Level 2 tools
- Shared runtime preparation path between visible Tool Shell and Contract Runner
- Per-tool manual behavior manifest for persistence/workflow/import-export parity
- Global Behavior release check locked until the per-tool matrix is complete
- First-release write policy: native V2 read surfaces, production mutation delegation to V1
- Automated route-quality runner covering representative V2 workspaces
- Accessibility heuristics for main landmark, duplicate IDs, accessible names, form labels, dialog names, heading hierarchy and undersized interaction targets
- Performance heuristics for DOM size, JS/CSS transfer, iframe count, long tasks and DOMContentLoaded timing
- Simulated viewport harness for phone, iPad portrait, iPad landscape, laptop, desktop and 4K 65-inch TV dimensions
- Accessibility, Performance and Responsive manual release checks locked until their automated/simulated prerequisites are complete
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

The Release Gate can run structural contracts for all ten Level 2 tools without requiring the user to open each one manually. The runner does not click controls or mutate business state. It verifies runtime access, route identity, mount state, interactive nodes, duplicate chrome cleanup, adapter installation, isolation and severe horizontal overflow.

A structural PASS does not certify persistence or workflow parity. The per-tool behavior matrix remains mandatory and must be checked after real interaction with each tool.

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

## Quality engineering status

`src/ui/v2/quality/qualityAudit.js` provides a browser-local QA ledger. The Route Quality Runner sequentially loads representative workspaces in a same-origin off-screen iframe and records accessibility/performance findings without changing business data.

The Viewport Harness renders one V2 route at a time in a real iframe viewport and scales the result visually so phone/tablet/desktop/4K layouts can be inspected without changing the host browser size. A simulated viewport review is only a prerequisite: it never substitutes for Safari/iPadOS, real touch hardware, TV scaling, contrast/zoom or classroom viewing-distance validation.

See `docs/BRIAN_UI_V2_QUALITY_RUNNERS.md`.

## Current CI status

The release-engineering milestone `2d5ed7202d52c1fdd0ad5e60eeb9e2b458d7b8b2` received Vercel **SUCCESS**. Later rapid commits were rate-limited by the account before compilation. The newest 92% milestone must be checked separately after its single atomic commit and is not considered green until that check succeeds.

## Major work still required

1. Run the Level 2 Contract Runner in the deployed preview and investigate every WARN/FAIL.
2. Run the Route Quality Runner and inspect accessibility/performance warnings or failures route by route.
3. Review all six simulated viewport presets, then repeat the responsive matrix on real phone/iPad/laptop/desktop/65-inch TV hardware.
4. Execute the manual behavior matrix for all ten Level 2 tools: persistence, import/export, saved state and workflow parity.
5. Complete screen-reader/keyboard/contrast/zoom accessibility validation on real browsers.
6. Complete real-device performance validation for interaction latency, iframe bridge cost, repeated-route memory and large-list behavior.
7. Keep the four Level 1 tools bridged until exact selectors are proven safe.
8. Obtain final successful Vercel Preview for the last QA milestone.
9. Obtain owner approval on the private preview.
10. Only then wire the tested release decision into production bootstrap, begin rollout in `opt-in`, verify rollback and expand gradually.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
