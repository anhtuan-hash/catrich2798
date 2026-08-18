# Brian Metro Next — Shadow UI Progress Ledger

> Branch: `ui-v2-shadow`
> Production policy: V1 on `main` remains untouched until V2 passes release gate.

## Overall engineering progress: 93%

This percentage is weighted by release effort, not by the number of preview screens. Current weighted implementation is about 93.2%. The remaining work is dominated by running and signing evidence on the current release candidate, final CI acceptance, owner approval and the deliberate production bootstrap integration.

| Area | Weight | Current completion | Weighted contribution |
|---|---:|---:|---:|
| Design foundations & tokens | 8% | 100% | 8.0% |
| App shell & navigation | 10% | 100% | 10.0% |
| Core components & overlays | 10% | 98% | 9.8% |
| Primary teaching pages | 14% | 98% | 13.7% |
| Management & data UI | 13% | 100% | 13.0% |
| Secondary/system pages | 10% | 100% | 10.0% |
| Individual tool migration | 20% | 75% | 15.0% |
| Responsive/accessibility/performance/QA | 10% | 95% | 9.5% |
| Release integration, feature flag & rollback gate | 5% | 85% | 4.25% |
| **Total** | **100%** |  | **~93.2% / 93% release estimate** |

## Release-candidate engineering now implemented

- Candidate-scoped QA evidence with `rc-2026-08-19-01`.
- Old structural/behavior/quality/device/checklist evidence is automatically invalidated when the candidate ID changes.
- Browser-local opt-in and emergency rollback remain separate from candidate evidence.
- Fail-closed release modes: `off`, `shadow`, `opt-in`, `on`.
- Admin-only Release Gate.
- Automated non-mutating structural contract for all ten Level-2 tool bridges.
- Sequential route accessibility/performance runner.
- Six-preset viewport simulation harness.
- Twelve-item real-device/accessibility/performance evidence matrix.
- Per-tool manual behavior manifest for persistence/workflow/import-export parity.
- Stale high-level PASS invalidation when lower evidence is reset or regresses.
- Portable JSON Evidence Pack export.
- First-release write policy: native V2 read surfaces, production mutation delegation to V1.
- Production bootstrap intentionally remains untouched.

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

The four Level-1 tools remain deliberately bridged because the current source audit has not proven safe scoped selectors for Level-2 styling.

## Evidence required on the current candidate

Automated/simulated evidence:
- ten Level-2 structural contracts;
- permitted-route accessibility/performance audit;
- six simulated viewport reviews.

Manual evidence:
- six real responsive hardware/display checks;
- three accessibility checks;
- three real performance checks;
- thirty tool behavior checks across ten Level-2 tools;
- final release checklist including CI and owner approval.

A release sign-off cannot be reused across a future candidate. See `docs/BRIAN_UI_V2_RELEASE_CANDIDATE.md`.

## Data, permissions and mutation policy

Metro Next reuses current Brian auth, assigned-class/workspace data, Homeroom Workspace Store, Dashboard Aggregator, Resource Library, History, News feed and Collaboration state. Missing fields are shown as missing rather than fabricated.

With a real user, route and tool visibility use the existing V1 permission service. UI Lab and Release Gate remain admin-only. The first V2 release does not create a second production mutation layer; production writes continue to delegate to the current V1 workflow/engine.

## Current CI status

The 92% milestone `9d8c9ef9e8993f06bc6321b9c5f1669589ba4345` received Vercel **SUCCESS**. The new 93% release-candidate milestone must be checked separately after its atomic commit and is not considered green until that exact commit succeeds.

## Major work still required

1. Run all candidate-scoped automated contracts/audits in the deployed preview and fix every critical failure.
2. Review all six simulated viewport presets.
3. Record the twelve real-device/accessibility/performance evidence items on actual hardware/browsers.
4. Execute the thirty manual behavior checks for the ten Level-2 tools.
5. Keep the four Level-1 tools bridged until exact safe selectors are proven.
6. Obtain a successful Vercel Preview on the final evidence milestone.
7. Obtain owner approval on the current candidate.
8. Only then wire the tested release decision into production bootstrap in a separate reviewable commit.
9. Start rollout in `opt-in`, verify rollback and data parity.
10. Expand beyond opt-in only after the cohort is stable.

## Release rule

V2 must not replace V1 until every release-candidate gate passes and the owner explicitly approves the private preview.
