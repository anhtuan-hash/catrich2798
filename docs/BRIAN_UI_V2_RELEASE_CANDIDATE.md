# Brian Metro Next — Release Candidate Evidence

> Branch: `ui-v2-shadow`
> Candidate: `rc-2026-08-19-01`
> Production policy: V1 remains the only production boot target until the release candidate passes every gate and receives explicit owner approval.

## Candidate-scoped evidence

Release Gate evidence is now tied to a release-candidate identifier. When the identifier changes, Brian V2 automatically clears browser-local structural-contract results, tool-behavior evidence, route-quality results, viewport reviews, real-device evidence and the release checklist before the new candidate is reviewed.

Private opt-in preference and the emergency rollback latch are deliberately not cleared by a candidate change. Opt-in still cannot boot V2 while release mode is `shadow`, and the rollback latch always wins over the boot decision.

## Real-device evidence matrix

The release candidate requires twelve explicit evidence items rather than one generic device checkbox.

Responsive hardware:
- phone portrait;
- iPad portrait;
- iPad landscape;
- laptop;
- desktop;
- 65-inch classroom TV.

Accessibility:
- keyboard-only desktop walkthrough;
- VoiceOver/iPadOS walkthrough;
- 200% zoom, contrast and reduced-motion review.

Performance:
- real interaction latency;
- Tool Shell bridge cost;
- repeated-route memory/listener behavior.

Each evidence item is `PENDING`, `PASS` or `FAIL`, may include a note, and receives a timestamp. A high-level Responsive, Accessibility or Performance release sign-off remains locked until both its automated/simulated prerequisite and its real evidence group are complete.

## Stale PASS protection

If lower-level evidence becomes incomplete, the related high-level checklist item is invalidated. Owner Approval is also cleared when any required evidence or prerequisite is withdrawn. This prevents a release decision from remaining green after a regression, reset or new candidate.

## Evidence Pack

Release Gate can export a JSON evidence pack containing:
- release candidate ID;
- current gate snapshot;
- release checklist;
- Level-2 structural contract ledger;
- per-tool behavior matrix;
- route accessibility/performance reports;
- simulated viewport reviews;
- real-device evidence;
- current Data Bridge errors;
- minimal runtime context such as browser user agent and viewport.

The pack is generated locally in the browser and does not write Brian production data.

## Release rule

A release candidate is not production-ready merely because the automated runners pass. Real-device/workflow evidence, successful CI, owner approval and a verified rollback path remain mandatory before production bootstrap integration.
