# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 74%

This percentage is weighted by release effort, not by the number of preview screens. Data/service integration, regression QA and release hardening deliberately carry a large share of the remaining work.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 98% | 9.8% |
| Core components & overlays | 10% | 92% | 9.2% |
| Primary teaching pages | 14% | 88% | 12.3% |
| Management & data UI | 13% | 90% | 11.7% |
| Secondary/system pages | 10% | 70% | 7.0% |
| Individual tool migration | 20% | 72% | 14.4% |
| Responsive/accessibility/performance/QA | 10% | 32% | 3.2% |
| Release integration, feature flag & rollback gate | 5% | 0% | 0.0% |
| **Total** | **100%** |  | **~75.6% raw / 74% conservative release estimate** |

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
- Nested same-origin adapter support for TextLab's embedded runtime
- UI Lab migration diagnostics for Level 1/Level 2 coverage
- Preview-only permission-aware UI states for Teacher/TTCM/Admin
- Locked navigation, permission-filtered Command Palette and Access Denied route state

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

See `docs/BRIAN_UI_V2_TOOL_SHELL.md`, `docs/BRIAN_UI_V2_LEVEL2_QA.md` and `docs/BRIAN_UI_V2_PERMISSION_QA.md`.

## Permission-aware preview status

- Role simulator: Teacher / TTCM / Admin
- Simulator value persists only in `brian-v2-preview-role`
- Admin and UI Lab are locked for non-admin preview roles
- Command Palette filters inaccessible preview routes
- Direct restricted hashes render Access Denied
- Tool runtime authorization is still enforced by the existing V1 tool/service layer
- The simulator is explicitly not a security system and must not ship to ordinary users

## Major work still required

1. Connect V2 pages to production data/services rather than preview fixtures where not yet wired.
2. Run the Level 2 behavior contract for all ten adapters and fix only V2 adapter regressions.
3. Move the remaining registered tools from Level 1 to Level 2 where useful.
4. Complete News/Reading feed, Work Hub, Knowledge Hub, Assessment, Collaboration, Cloud/Admin submodules and remaining system routes.
5. Replace the permission simulator with a read-only adapter over the existing real permission service.
6. Run responsive QA across phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
7. Accessibility pass: keyboard order, visible focus policy, aria semantics, contrast and reduced motion.
8. Performance pass: lazy boundaries, CSS/module budget, interaction latency, iframe bridge cost and large-list behavior.
9. Visual regression and functional regression against V1 behavior, including tool import/export and saved-state parity.
10. Add private feature flag / account opt-in, rollback gate and final release checklist.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
