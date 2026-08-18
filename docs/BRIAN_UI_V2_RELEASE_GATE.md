# Brian Metro Next — Release Gate

> Branch: `ui-v2-shadow`
> Default policy: fail closed. Production V1 remains the boot target until the owner explicitly approves release and every required gate is green.

## Release modes

`src/ui/v2/releaseGate.js` reads `VITE_BRIAN_UI_V2_MODE` and accepts only four values:

- `off`: V2 cannot boot.
- `shadow`: V2 preview can exist, but production boot is impossible. This is the safe default when the env value is missing or invalid.
- `opt-in`: V2 may boot only after release approval **and** a user-scoped private opt-in exists.
- `on`: V2 may boot only after release approval. This mode is reserved for the final rollout stage.

A browser-local emergency rollback latch always overrides the mode and forces the V2 boot decision to false.

## Important safety property

The release module is **not wired into the production bootstrap yet**. Building and testing the gate on `ui-v2-shadow` does not alter `main`, `src/main.jsx`, or the current production entrypoint.

`shouldBootV2()` also requires `releaseApproved=true`; therefore simply setting an environment variable or writing the opt-in preference is insufficient by itself.

## Automated Level 2 Contract Runner

`B2ToolContractRunner` opens the ten Level 2 tools sequentially inside an off-screen, same-origin iframe. It uses the same `prepareToolRuntimeFrame()` path as the visible Tool Shell so the QA runner and the real V2 runtime receive identical duplicate-chrome cleanup and Level 2 adapter preparation.

The runner waits for each runtime to mount, applies the bridge/adapter, executes `runToolBehaviorContract()`, stores the result in the browser-local QA ledger, then advances to the next tool.

The structural contract checks:

1. same-origin runtime access;
2. correct legacy tool route;
3. mounted runtime content;
4. interactive controls present;
5. duplicate Brian global chrome hidden;
6. Level 2 adapter installed when required;
7. no nested Metro Next shell;
8. no severe horizontal overflow.

The runner never clicks a tool control, changes tool state, imports files, exports files, or writes tool business data.

## Manual per-tool behavior matrix

Structural PASS is necessary but not sufficient. `toolBehaviorManifest.js` defines manual evidence for all ten Level 2 tools. The matrix covers the behaviors that DOM inspection cannot prove, such as:

- edit/play or authoring workflow parity;
- persistence and saved-state parity;
- import/export round trips where applicable;
- scoring/timer/modal behavior;
- Resource Library/postMessage bridges;
- PDF/DOCX recognition workflows;
- fullscreen or student-view behavior.

Each check defaults to false. The global `Behavior regression` release checkbox stays locked until every per-tool behavior check is complete.

## Manual release checks

The private Release Gate keeps explicit local acknowledgements for:

- responsive matrix;
- accessibility QA;
- behavior regression against V1;
- final CI/Vercel success;
- owner approval.

`Owner approval` remains locked until structural contracts, the per-tool behavior matrix, data diagnostics and all preceding manual checks are green. These fields are never auto-passed by code.

## First-release write policy

The first Metro Next release remains read-first. V2 native pages may read and summarize current Brian data, but production mutations continue to be delegated to existing V1 services/workflows. Tool-specific writes remain owned by the existing V1 tool engine inside Tool Shell. Only Shadow QA preferences are written locally by V2.

This prevents a second mutation layer from diverging from current permission, persistence, import/export and audit behavior. See `docs/BRIAN_UI_V2_WRITE_POLICY.md`.

## Production release sequence

1. Keep `VITE_BRIAN_UI_V2_MODE=shadow` during development and manual QA.
2. Run the automated Level 2 contract runner and investigate every WARN/FAIL.
3. Complete the ten-tool manual behavior matrix.
4. Complete device and accessibility regression.
5. Obtain a successful final preview build.
6. Owner reviews private preview and marks approval.
7. Wire the already-tested release decision into production bootstrap in a separate final-release commit.
8. Start with `opt-in`, not `on`.
9. Verify production telemetry and rollback path.
10. Expand rollout only after the opt-in cohort is stable.

## Rollback

The first production V2 bootstrap must preserve an immediate V1 fallback. The local rollback latch in this Shadow implementation proves the decision path, but a production rollout should additionally retain a server/environment kill switch so rollback does not depend on a single browser's storage.
