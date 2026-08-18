# Brian Metro Next — Release Candidate Evidence

> Branch: `ui-v2-shadow`
> Candidate: `rc-2026-08-19-01`
> Production policy: V1 remains the only production boot target until the exact candidate + deployment SHA passes every gate and receives explicit owner approval.

## Candidate + build scoped evidence

Release Gate evidence is bound to both a human-readable candidate ID and the exact deployment SHA resolved from `/api/v2-build-meta`.

When either value changes, Brian V2 clears browser-local structural-contract results, tool-behavior evidence, route-quality results, viewport reviews, real-device evidence and the release checklist before review continues. This closes the stale-PASS gap where a new commit could otherwise inherit QA from an older build that shared the same candidate name.

Private opt-in preference and the emergency rollback latch are deliberately not part of the evidence reset. Opt-in still cannot boot V2 while policy remains fail-closed, and rollback always wins.

## Build identity endpoint

`api/v2-build-meta.js` exposes only non-secret deployment metadata:

- Vercel/Git commit SHA;
- short SHA;
- git ref;
- deployment environment and URL;
- release mode;
- boolean release approval;
- approved candidate ID;
- approved build SHA.

No token, credential or private environment value is returned.

The Release Gate blocks CI sign-off until a preview/production SHA has been resolved and the local evidence binding matches that exact SHA.

## Structural contracts

The sequential Tool Contract Runner now covers all fourteen tested bridges.

Level 2 tools must prove the V2 chrome adapter is installed. Level 1 tools do not require an adapter, but must still pass route identity, same-origin access, runtime mount, interactive-controls presence, duplicate global chrome cleanup, Metro Next isolation and severe-overflow checks.

This does not replace manual persistence/import/export/workflow validation for the ten Level-2 tools.

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

Each evidence item is `PENDING`, `PASS` or `FAIL`, may include a note, and receives a timestamp. High-level Responsive, Accessibility and Performance sign-offs stay locked until both automated/simulated prerequisites and the matching real evidence group are complete.

## Stale PASS protection

If lower-level evidence becomes incomplete, the related high-level checklist item is invalidated. Owner Approval is also cleared whenever required evidence, CI binding or a prerequisite is withdrawn.

A new deployment SHA also invalidates the release checklist, even when `rc-2026-08-19-01` itself has not changed.

## Evidence Pack

Release Gate exports a JSON evidence pack containing:
- release candidate ID and candidate/build binding;
- exact build SHA/ref/environment;
- current gate snapshot and checklist;
- all bridged-tool structural results;
- per-tool Level-2 behavior matrix;
- route accessibility/performance reports;
- simulated viewport reviews;
- real-device evidence;
- current Data Bridge errors;
- prepared production-bootstrap decision summary;
- minimal runtime context such as browser user agent and viewport.

The pack is generated locally and does not write Brian production data.

## Release rule

Automated PASS means only that the runners detected no blocker. Production readiness still requires real-device/workflow evidence, exact-build CI confirmation, owner approval and a verified rollback path before production bootstrap integration.
