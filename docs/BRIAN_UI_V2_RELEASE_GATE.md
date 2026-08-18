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

The release module is **not wired into the production bootstrap yet**. This is intentional. Building and testing the gate on `ui-v2-shadow` does not alter `main`, `src/main.jsx`, or the current production entrypoint.

`shouldBootV2()` also requires `releaseApproved=true`; therefore simply setting an environment variable or writing the opt-in preference is insufficient by itself.

## Automated tool behavior contract

`src/ui/v2/toolBehaviorContract.js` runs a non-mutating structural contract after a bridged tool iframe loads. It checks:

1. same-origin runtime access;
2. correct legacy tool route;
3. mounted runtime content;
4. interactive controls present;
5. duplicate Brian global chrome hidden;
6. Level 2 adapter installed when required;
7. no nested Metro Next shell;
8. no severe horizontal overflow.

The contract never clicks a tool control, modifies tool state, imports files, exports files, or writes tool business data. Results are stored in a local QA ledger and displayed in the private Release Gate page.

A structural PASS is not equivalent to complete behavior parity. Persistence, import/export, saved-state, scoring and workflow contracts remain manual release checks.

## Manual release checks

The private Release Gate keeps explicit local acknowledgements for:

- responsive matrix;
- accessibility QA;
- behavior regression against V1;
- final CI/Vercel success;
- owner approval.

These fields default to false and are never auto-passed by code.

## Production release sequence

1. Keep `VITE_BRIAN_UI_V2_MODE=shadow` during development and manual QA.
2. Run all Level 2 tool structural contracts and inspect any warnings/failures.
3. Complete device, accessibility and behavior regression.
4. Obtain a successful final preview build.
5. Owner reviews private preview and marks approval.
6. Wire the already-tested release decision into the production bootstrap in a separate final-release commit.
7. Start with `opt-in`, not `on`.
8. Verify production telemetry and rollback path.
9. Expand rollout only after the opt-in cohort is stable.

## Rollback

The first production V2 bootstrap must preserve an immediate V1 fallback. The local rollback latch in this Shadow implementation proves the decision path, but a production rollout should additionally retain a server/environment kill switch so rollback does not depend on a single browser's storage.
