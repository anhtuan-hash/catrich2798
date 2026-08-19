# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 98%

This percentage is weighted by release effort, not screen count. The implementation surface is now essentially complete for the first Metro Next release. The remaining work is dominated by executing evidence on the exact deployed build, correcting any evidence-discovered regression, explicit owner approval and the final opt-in production-bootstrap integration.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 99% | 9.9% |
| Primary teaching pages | 14% | 99% | 13.9% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 96% | 19.2% |
| Responsive/accessibility/performance/QA | 10% | 99% | 9.9% |
| Release integration, feature flag & rollback gate | 5% | 98% | 4.9% |
| **Total** | **100%** |  | **~98% release estimate** |

## Release-candidate engineering implemented

- Candidate `rc-2026-08-19-01` plus exact deployment-SHA evidence binding.
- `/api/v2-build-meta` uses the existing consolidated API gateway and exposes only normalized non-secret build/release metadata.
- Candidate/build changes invalidate structural, behavior, route-quality, viewport, real-device, bootstrap-rehearsal and checklist evidence.
- CI sign-off is locked until the browser resolves a preview/production SHA and local evidence is bound to that exact SHA.
- All fourteen Tool Shell bridges now have Level-2 Metro Next chrome adapters while preserving the existing V1 engines/business logic.
- All fourteen Level-2 tools participate in non-mutating structural contracts.
- Manual behavior evidence expands to **42 checks across 14 tools**.
- Sequential route accessibility/performance runner and six-preset viewport simulation harness.
- Twelve-item real-device/accessibility/performance evidence matrix.
- Standalone `/preview-ui-v2-rehearsal.html` runs a fail-closed production-boot decision matrix against the exact deployment SHA without wiring production bootstrap.
- The Release Gate requires current-build bootstrap-rehearsal PASS before `releaseApproved` can ever become true.
- Evidence Pack schema 3 includes bootstrap rehearsal and a SHA-256 integrity digest; the rehearsal page can re-import and verify digest + candidate + exact build SHA.
- A fail-closed production bootstrap adapter is implemented for Shadow validation but remains deliberately absent from `applicationBootstrap.jsx` and `main.jsx`.
- Independent GitHub Actions Shadow CI runs `npm ci` + full `npm run build`, verifies V2/rehearsal/gateway source contracts and publishes `brian-v2-shadow-ci`.
- First-release write policy remains native V2 read + delegation of production mutations to V1.

## Tool migration coverage — 14/14 Level 2

Phase 1 / original Level-2 adapters:
- Brian Classroom Stage
- Knowledge Train
- Crossword Trial
- Flying Words
- Exam Studio

Phase 2 adapters:
- Brian TextLab Activities
- Lesson Architect
- THPT Interactive Practice Hub
- Seating Chart Studio
- Reading Studio

Phase 3 adapters, promoted after exact source selector audit:
- Top Five Arena (`t5a-*`)
- WordGraph Studio (`wordgraph-v821-*`)
- Vietnam Tax Studio (`tax-studio-*`)
- TextCare Fixer (`[data-tool="textcare"]` + `tcg-*`)

The Phase 3 adapters only alter presentation/chrome. Their original localStorage, calculation, editor, game, import/export and service logic remains V1-owned.

## Exact-build evidence still required

Automated/simulated:
- 14/14 structural contracts on the final deployed build;
- permitted-route accessibility/performance audit;
- six simulated viewport reviews;
- production boot rehearsal for the exact candidate + SHA.

Manual:
- six real responsive hardware/display checks;
- three accessibility checks;
- three real performance checks;
- **42 behavior checks across all fourteen Level-2 tools**;
- final build-bound CI sign-off and owner approval.

A sign-off cannot be reused after a new deployment SHA, even when the human-readable candidate ID stays the same.

## Build and bootstrap safety

The preview resolves build identity through `/api/v2-build-meta`. Release evidence and boot rehearsal are bound to `candidate@commitSHA`. The prepared server policy requires explicit release approval, exact approved candidate, exact approved build SHA, mode `opt-in` or `on`, no rollback latch and—under `opt-in`—a user-scoped opt-in before V2 can ever be eligible.

The decision adapter is **not wired into production bootstrap**. `main` remains the only production boot path until a separate owner-approved integration commit.

## Major work still required

1. Run all build-bound structural, route-quality, viewport and bootstrap-rehearsal checks on the final deployed preview and fix any critical finding.
2. Record all twelve real-device/accessibility/performance evidence items on actual hardware/browsers.
3. Execute all forty-two manual tool behavior checks.
4. Confirm both `brian-v2-shadow-ci` and Vercel are green on the exact final evidence build.
5. Obtain explicit owner approval for that candidate + SHA and export/verify the signed Evidence Pack.
6. Make the separate production-bootstrap integration commit only after approval.
7. Start rollout in `opt-in`, verify global/client rollback and data parity, then expand gradually.

## Release rule

V2 must not replace V1 until every gate passes for the exact release candidate **and deployment SHA**, both CI channels are green, bootstrap rehearsal is PASS and the owner explicitly approves that private preview.
