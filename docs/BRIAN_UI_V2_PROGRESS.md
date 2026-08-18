# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 55%

This percentage is weighted by release effort, not by the number of preview screens. Tool migration, integration QA and release hardening deliberately carry a large share of the remaining work.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 92% | 9.2% |
| Core components & overlays | 10% | 82% | 8.2% |
| Primary teaching pages | 14% | 82% | 11.5% |
| Management & data UI | 13% | 90% | 11.7% |
| Secondary/system pages | 10% | 60% | 6.0% |
| Individual tool migration | 20% | 8% | 1.6% |
| Responsive/accessibility/performance/QA | 10% | 18% | 1.8% |
| Release integration, feature flag & rollback gate | 5% | 0% | 0.0% |
| **Total** | **100%** |  | **~58% raw / 55% conservative release estimate** |

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
- Notification center
- Profile menu
- Shared page headers, surfaces, buttons, tabs, search and badges
- Shared form system
- Shared drawer, dialog and toast system
- Shared Data UI with filters, bulk selection, row actions, pagination, loading skeleton, error and empty states

## Major work still required

1. Connect V2 pages to production data/services rather than preview fixtures where not yet wired.
2. Migrate the individual teaching tools to the V2 Tool Shell without rewriting business logic.
3. Complete News/Reading, Work Hub, Knowledge Hub, Assessment, Collaboration, Cloud/Admin submodules and remaining system routes.
4. Build permission-aware states for teacher/TTCM/admin roles.
5. Run responsive QA across phone, iPad portrait/landscape, laptop, desktop and 65-inch TV.
6. Accessibility pass: keyboard order, visible focus policy, aria semantics, contrast and reduced motion.
7. Performance pass: lazy boundaries, CSS/module budget, interaction latency and large-list behavior.
8. Visual regression and functional regression against V1 behavior.
9. Add private feature flag / account opt-in, rollback gate and final release checklist.

## Release rule

V2 must not replace V1 until all release-gate checks pass and the owner explicitly approves the final private preview.
