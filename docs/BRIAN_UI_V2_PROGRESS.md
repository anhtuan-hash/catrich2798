# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 99%

This percentage measures engineering completeness, not permission to release. The first Metro Next implementation, release tooling and deployable Shadow QA surfaces are essentially complete. The final 1% is deliberately reserved for evidence execution on the exact deployed build, correction of any evidence-discovered regression, explicit owner approval and the separate opt-in production-bootstrap integration/rollout.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 99% | 9.9% |
| Primary teaching pages | 14% | 99% | 13.9% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 99% | 19.8% |
| Responsive/accessibility/performance/QA | 10% | 99% | 9.9% |
| Release integration, feature flag & rollback gate | 5% | 99% | 5.0% |
| **Total** | **100%** |  | **~99.4% / 99% engineering estimate** |

## Release-candidate engineering implemented

- Candidate `rc-2026-08-19-01` plus exact deployment-SHA evidence binding.
- `/api/v2-build-meta` uses the existing consolidated API gateway and exposes only normalized non-secret build/release metadata.
- Candidate/build changes invalidate structural, behavior, detailed-behavior, route-quality, viewport, real-device, bootstrap-rehearsal and checklist evidence.
- CI sign-off is locked until the browser resolves a preview/production SHA and local evidence is bound to that exact SHA.
- All fourteen Tool Shell bridges now have Level-2 Metro Next chrome adapters while preserving the existing V1 engines/business logic.
- All fourteen Level-2 tools participate in non-mutating structural contracts.
- Structural contract detection supports Phase 1, Phase 2 and Phase 3 adapters; a 12-second per-tool watchdog prevents one broken iframe from hanging the whole runner.
- Manual behavior evidence covers **42 checks across 14 tools** and now has a dedicated `PASS / FAIL / PENDING + note + timestamp` QA surface. A FAIL clears the corresponding core Release Gate PASS.
- Sequential route accessibility/performance runner and six-preset viewport simulation harness.
- Twelve-item real-device/accessibility/performance evidence matrix.
- Standalone `/preview-ui-v2-rehearsal.html` runs a fail-closed production-boot decision matrix against the exact deployment SHA without wiring production bootstrap.
- Standalone `/preview-ui-v2-behavior.html` guides and records the 42 detailed manual behavior checks against the exact build.
- The Release Gate requires current-build bootstrap-rehearsal PASS before `releaseApproved` can ever become true; stale Owner Approval is persisted back to `false` and cannot resurrect when rehearsal later passes.
- Evidence Pack schema 3 includes bootstrap rehearsal, detailed tool-behavior evidence and a SHA-256 integrity digest. The pack self-verifies before download and can be re-imported to verify digest + candidate + exact build SHA.
- A fail-closed production bootstrap adapter is implemented for Shadow validation but remains deliberately absent from `applicationBootstrap.jsx` and `main.jsx`.
- Independent GitHub Actions Shadow CI executes release decision/integrity/behavior regression contracts, builds the production bundle, builds deployable Shadow HTML entries and publishes `brian-v2-shadow-ci`.
- `vite.v2-shadow.config.js` emits `preview-ui-v2.html`, `preview-ui-v2-rehearsal.html` and `preview-ui-v2-behavior.html` into `dist/` with `emptyOutDir:false`; CI verifies those built artifacts exist.
- Vercel's Shadow branch build command also runs the dedicated V2 Shadow build after the normal production build, while `main` remains untouched.
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

The adapters only alter presentation/chrome. Original localStorage, calculation, editor, game, import/export and service logic remains V1-owned.

## Executable CI contract

`scripts/verify-v2-release-engineering.mjs` executes rather than merely greps the critical release logic. It currently asserts:
- nine fail-closed boot-decision scenarios;
- SHA-256 Evidence Pack verification and tamper detection;
- candidate-scope mismatch behavior;
- exactly fourteen tested Level-2 bridge tools;
- exactly three behavior checks per tool / forty-two total;
- detailed behavior PASS propagates to the core behavior ledger;
- detailed behavior FAIL clears the core PASS;
- stale Owner Approval is persisted false and does not resurrect after rehearsal becomes PASS.

The GitHub Actions job additionally builds the normal product bundle, builds all three Shadow HTML entries and checks their emitted `dist/` artifacts plus the consolidated API gateway contract.

## Exact-build evidence still required

Automated/simulated on the final deployment:
- 14/14 structural contracts;
- permitted-route accessibility/performance audit;
- six simulated viewport reviews;
- production boot rehearsal for the exact candidate + SHA.

Manual on actual hardware/workflows:
- six real responsive hardware/display checks;
- three accessibility checks;
- three real performance checks;
- **42 behavior checks across all fourteen Level-2 tools**, recorded through the detailed Behavior QA page;
- final build-bound CI sign-off and owner approval.

A sign-off cannot be reused after a new deployment SHA, even when the human-readable candidate ID stays the same.

## Build and bootstrap safety

The preview resolves build identity through `/api/v2-build-meta`. Release evidence and boot rehearsal are bound to `candidate@commitSHA`. The prepared server policy requires explicit release approval, exact approved candidate, exact approved build SHA, mode `opt-in` or `on`, no rollback latch and—under `opt-in`—a user-scoped opt-in before V2 can ever be eligible.

The decision adapter is **not wired into production bootstrap**. `main` remains the only production boot path until a separate owner-approved integration commit.

## Major work still required — final 1%

1. Wait for/obtain a Vercel build slot for the exact final Shadow commit; Vercel quota failure is not treated as a code PASS.
2. Open the deployable Shadow preview and run all build-bound structural, route-quality, viewport and bootstrap-rehearsal checks; fix any critical finding.
3. Record all twelve real-device/accessibility/performance evidence items on actual hardware/browsers.
4. Execute all forty-two tool behavior checks through the detailed Behavior QA surface, including notes for important import/export/persistence workflows.
5. Confirm both `brian-v2-shadow-ci` and Vercel are green on that exact evidence build, then mark CI sign-off.
6. Export and re-verify the SHA-256 Evidence Pack, then obtain explicit owner approval for that candidate + SHA.
7. Make the separate production-bootstrap integration commit only after approval.
8. Start rollout in `opt-in`, verify global/client rollback and data parity, then expand gradually.

## Release rule

**99% engineering completeness is not release approval.** V2 must not replace V1 until every gate passes for the exact release candidate **and deployment SHA**, both CI channels are green, bootstrap rehearsal is PASS and the owner explicitly approves that private preview.
