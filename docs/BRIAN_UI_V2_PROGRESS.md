# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 95%

This percentage is weighted by release effort, not by screen count. Current weighted implementation is about 94.7%, reported conservatively as 95%. The remaining work is dominated by executing evidence on the exact deployed build, correcting any evidence-discovered regression, explicit owner approval and the final production-bootstrap integration commit.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 98% | 9.8% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 78% | 15.6% |
| Responsive/accessibility/performance/QA | 10% | 98% | 9.8% |
| Release integration, feature flag & rollback gate | 5% | 96% | 4.8% |
| **Total** | **100%** |  | **~94.7% / 95% release estimate** |

## Release-candidate engineering implemented

- Candidate `rc-2026-08-19-01` plus exact deployment-SHA evidence binding.
- `/api/v2-build-meta` exposes only non-secret deployment identity and normalized release-policy fields.
- The endpoint is consolidated through existing `api/gateway.js`; it no longer creates an additional public Vercel serverless function.
- Structural/behavior/quality/device/checklist evidence is invalidated when either candidate ID or deployment SHA changes.
- CI sign-off is locked until the browser resolves a preview/production SHA and the evidence binding matches it.
- All fourteen tested Tool Shell bridges are included in the non-mutating structural Contract Runner; Level-1 tools are audited without requiring a Level-2 adapter.
- Ten Level-2 tools retain the thirty-item manual behavior matrix.
- Sequential route accessibility/performance runner.
- Six-preset viewport simulation harness.
- Twelve-item real-device/accessibility/performance evidence matrix.
- Portable JSON Evidence Pack includes candidate binding, exact build identity and prepared production-bootstrap plan.
- A fail-closed production bootstrap adapter is implemented in Shadow UI but deliberately not imported by `applicationBootstrap.jsx` or `main.jsx`.
- Independent GitHub Actions Shadow CI now runs `npm ci` + full `npm run build`, verifies the gateway/source contract and publishes a `brian-v2-shadow-ci` commit status.
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

The four Level-1 tools remain deliberately bridged because exact safe styling selectors have not been proven. They are nevertheless part of structural release evidence: same-origin access, correct route, runtime mount, interactive controls, duplicate chrome cleanup, Metro Next isolation and severe overflow.

## Exact-build evidence required

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

## CI and Vercel hardening

The first build-bound milestone compiled successfully under independent GitHub Actions but failed during Vercel-specific deployment processing. Audit showed the new build-metadata endpoint was the only newly introduced public function, while this repository already uses a consolidated API gateway pattern. The endpoint was moved into `_v2-build-meta.js`, registered in `api/gateway.js`, rewritten from `/api/v2-build-meta`, and the standalone `api/v2-build-meta.js` function was removed.

After consolidation, commit `fdf517d4554e99034d677f174c3bb2e1351c9a14` received both:
- `brian-v2-shadow-ci`: **SUCCESS**;
- Vercel: **SUCCESS**.

This validates the source build and restores Vercel deployment compatibility without changing the client API contract.

## Build and bootstrap safety

The preview resolves its build identity through `/api/v2-build-meta`, which now routes through the existing gateway. Candidate evidence is bound to `candidate@commitSHA`. The prepared server policy requires explicit release approval, exact approved candidate, exact approved build SHA, mode `opt-in` or `on`, no rollback latch and—under `opt-in`—a user-scoped opt-in before it can ever report V2 eligibility.

The decision adapter is **not wired into production bootstrap**. `main` remains the only production boot path until a separate owner-approved integration commit.

See `docs/BRIAN_UI_V2_RELEASE_CANDIDATE.md` and `docs/BRIAN_UI_V2_PRODUCTION_BOOTSTRAP.md`.

## Data, permissions and mutation policy

Metro Next reuses current Brian auth, assigned-class/workspace data, Homeroom Workspace Store, Dashboard Aggregator, Resource Library, History, News feed and Collaboration state. Missing fields are shown as missing rather than fabricated.

With a real user, route/tool visibility uses the existing V1 permission service. The first V2 release does not create a second production mutation layer; production writes continue to delegate to current V1 workflows/engines.

## Major work still required

1. Run all build-bound structural and route-quality runners on the final deployed preview and fix every critical failure.
2. Review all six simulated viewport presets on that exact build.
3. Record all twelve real-device/accessibility/performance evidence items on real hardware/browsers.
4. Execute all thirty Level-2 tool behavior checks.
5. Keep the four Level-1 tools bridged unless safe Level-2 selectors are proven.
6. Confirm both Shadow CI and Vercel on the exact final evidence build, then mark the build-bound CI sign-off.
7. Obtain explicit owner approval on that exact candidate + SHA.
8. Only then make the separate production-bootstrap integration commit.
9. Start rollout in `opt-in`, verify rollback/data parity, then expand gradually.

## Release rule

V2 must not replace V1 until every gate passes for the exact release candidate **and deployment SHA**, both build channels are green, and the owner explicitly approves that private preview.
