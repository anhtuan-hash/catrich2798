# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 94%

This percentage is weighted by release effort, not by screen count. Current weighted implementation is about 94.4%. The remaining work is dominated by executing evidence on the exact deployed build, fixing any discovered regression, owner approval and the final production-bootstrap integration commit.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 98% | 9.8% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 78% | 15.6% |
| Responsive/accessibility/performance/QA | 10% | 97% | 9.7% |
| Release integration, feature flag & rollback gate | 5% | 92% | 4.6% |
| **Total** | **100%** |  | **~94.4% / 94% release estimate** |

## Release-candidate engineering now implemented

- Candidate `rc-2026-08-19-01` plus exact deployment-SHA evidence binding.
- `/api/v2-build-meta` exposes non-secret Vercel/Git build identity and fail-closed release-manifest status.
- Structural/behavior/quality/device/checklist evidence is automatically invalidated when either candidate ID or deployment SHA changes.
- CI sign-off is locked until the browser has resolved a preview/production SHA and the evidence binding matches it.
- All fourteen tested Tool Shell bridges are now included in the non-mutating structural Contract Runner; Level-1 tools are audited without requiring a Level-2 adapter.
- Ten Level-2 tools retain the thirty-item manual behavior matrix.
- Sequential route accessibility/performance runner.
- Six-preset viewport simulation harness.
- Twelve-item real-device/accessibility/performance evidence matrix.
- Portable JSON Evidence Pack now includes candidate binding, exact build identity and prepared production-bootstrap plan.
- A fail-closed production bootstrap adapter is implemented in Shadow UI but deliberately not imported by `applicationBootstrap.jsx` or `main.jsx`.
- First-release write policy remains native V2 read + delegation of production mutations to V1.

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

### Level 1 — Tool Shell bridge

- Top Five Arena
- WordGraph Studio
- Vietnam Tax Studio
- TextCare Fixer

The four Level-1 tools remain deliberately bridged because exact safe styling selectors have not been proven. They are now part of the release structural runner, so route identity, mount state, duplicate chrome cleanup, isolation and overflow are still release evidence.

## Evidence required on the exact deployed build

Automated/simulated evidence:
- fourteen bridged-tool structural contracts;
- permitted-route accessibility/performance audit;
- six simulated viewport reviews.

Manual evidence:
- six real responsive hardware/display checks;
- three accessibility checks;
- three real performance checks;
- thirty behavior checks across the ten Level-2 tools;
- final checklist including build-bound CI confirmation and owner approval.

A sign-off cannot be reused after a new deployment SHA, even when the human-readable candidate ID stays the same.

## Build and bootstrap safety

The preview resolves its current build identity from `/api/v2-build-meta`. Candidate evidence is bound to `candidate@commitSHA`. Server-side release policy is fail-closed and requires all of the following before the prepared adapter can ever report V2 eligibility: explicit release approval, exact approved candidate, exact approved build SHA, release mode `opt-in` or `on`, no rollback latch, and—under `opt-in`—a user-scoped opt-in.

The adapter is **not wired into production bootstrap**. `main` remains the only production boot path until the final, separately reviewed release commit.

See `docs/BRIAN_UI_V2_RELEASE_CANDIDATE.md` and `docs/BRIAN_UI_V2_PRODUCTION_BOOTSTRAP.md`.

## Data, permissions and mutation policy

Metro Next reuses current Brian auth, assigned-class/workspace data, Homeroom Workspace Store, Dashboard Aggregator, Resource Library, History, News feed and Collaboration state. Missing fields are shown as missing rather than fabricated.

With a real user, route/tool visibility uses the existing V1 permission service. The first V2 release does not create a second production mutation layer; production writes continue to delegate to current V1 workflows/engines.

## Major work still required

1. Run all build-bound structural and route-quality runners on the deployed preview and fix every critical failure.
2. Review all six simulated viewport presets on the exact build.
3. Record all twelve real-device/accessibility/performance evidence items on real hardware/browsers.
4. Execute all thirty Level-2 tool behavior checks.
5. Keep the four Level-1 tools bridged unless safe Level-2 selectors are proven.
6. Confirm Vercel CI on the exact final evidence build and mark the build-bound CI sign-off.
7. Obtain explicit owner approval on that exact build.
8. Only then make the separate production-bootstrap integration commit.
9. Start rollout in `opt-in`, verify rollback/data parity, then expand gradually.

## Release rule

V2 must not replace V1 until every gate passes for the exact release candidate **and deployment SHA**, and the owner explicitly approves that private preview.
