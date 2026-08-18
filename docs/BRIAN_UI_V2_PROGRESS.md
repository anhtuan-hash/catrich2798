# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 68%

This percentage is weighted by release effort, not by the number of preview screens. Tool migration, integration QA and release hardening deliberately carry a large share of the remaining work.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 96% | 9.6% |
| Core components & overlays | 10% | 90% | 9.0% |
| Primary teaching pages | 14% | 86% | 12.0% |
| Management & data UI | 13% | 90% | 11.7% |
| Secondary/system pages | 10% | 62% | 6.2% |
| Individual tool migration | 20% | 52% | 10.4% |
| Responsive/accessibility/performance/QA | 10% | 26% | 2.6% |
| Release integration, feature flag & rollback gate | 5% | 0% | 0.0% |
| **Total** | **100%** |  | **~69.5% raw / 68% conservative release estimate** |

## Preview coverage

Ready views:

- Home
- Apps
- Teaching Tool Hub
- Games
- Resource Library
- Homeroom
- Classes
- Students
- Dashboard
- Reports
- Settings
- Admin
- UI Lab

## Shell capabilities ready

- Desktop sidebar and mobile bottom navigation
- Command palette (`Cmd/Ctrl + K`)
- Command palette can open registered bridged tools directly
- Notification center
- Profile menu
- Shared page headers, surfaces, buttons, tabs, search and badges
- Shared form system
- Shared drawer, dialog and toast system
- Shared Data UI with filters, bulk selection, row actions, pagination, loading skeleton, error and empty states
- Metro Next Tool Shell with focus mode, reload, V1 escape hatch and fullscreen
- Same-origin Legacy Runtime Bridge that keeps existing V1 tool logic isolated from V2 shell styling
- Scoped Level 2 Chrome Adapter system applied inside selected same-origin tool runtimes
- UI Lab migration diagnostics for Level 1/Level 2 coverage

## Tool migration coverage

### Level 2 — V2 chrome adapter + V1 engine preserved

- Brian Classroom Stage
- Knowledge Train
- Crossword Trial
- Flying Words
- Exam Studio

These tools receive slug-scoped V2 styling inside their bridged runtime for duplicate chrome, action bars, form controls, cards/panels and selected modal/workflow surfaces. Their existing engines, persistence, import/export and game/workflow logic remain owned by V1.

### Level 1 — Tool Shell bridge

- Top Five Arena
- Brian TextLab Activities
- Lesson Architect
- THPT Interactive Practice Hub
- Seating Chart Studio
- Reading Studio
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

See `docs/BRIAN_UI_V2_TOOL_SHELL.md` and `docs/BRIAN_UI_V2_LEVEL2_QA.md`.

## Major work still required

1. Connect V2 pages to production data/services rather than preview fixtures where not yet wired.
2. Run the Level 2 behavior contract for the five priority adapters and fix only V2 adapter regressions.
3. Move the next priority authoring/assessment tools from Level 1 to Level 2.
4. Complete News/Reading, Work Hub, Knowledge Hub, Assessment, Collaboration, Cloud/Admin submodules and remaining system routes.
5. Build permission-aware states for teacher/TTCM/admin roles.
6. Run responsive QA across phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
7. Accessibility pass: keyboard order, visible focus policy, aria semantics, contrast and reduced motion.
8. Performance pass: lazy boundaries, CSS/module budget, interaction latency, iframe bridge cost and large-list behavior.
9. Visual regression and functional regression against V1 behavior, including tool import/export and saved-state parity.
10. Add private feature flag / account opt-in, rollback gate and final release checklist.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
