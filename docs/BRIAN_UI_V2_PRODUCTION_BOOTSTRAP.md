# Brian Metro Next — Prepared Production Bootstrap

> Status: implemented for Shadow validation, **not wired into production**.
> Branch: `ui-v2-shadow`.

## Goal

Prepare the final V2 boot decision before touching `applicationBootstrap.jsx` or `main.jsx`, so release logic can be reviewed and tested independently from the current V1 startup path.

## Build metadata

`/api/v2-build-meta` returns non-secret deployment identity and release-policy fields. The prepared adapter reads that resolved metadata and remains fail-closed when it is absent or incomplete.

## Eligibility contract

`src/ui/v2/productionBootstrapAdapter.js` reports V2 eligible only when every relevant condition is true:

1. current page is bound to a preview/production deployment SHA;
2. server policy explicitly marks the release approved;
3. server policy's approved candidate equals the current V2 release candidate;
4. server policy's approved build SHA exactly equals the running deployment SHA;
5. release mode is `on`, or mode is `opt-in` and the current user/browser has a private opt-in;
6. the emergency rollback latch is not active.

Missing values resolve to V1.

## Intended future server environment

The final rollout may set these non-secret control values in Vercel:

- `BRIAN_UI_V2_MODE=shadow|opt-in|on|off`
- `BRIAN_UI_V2_RELEASE_APPROVED=true|false`
- `BRIAN_UI_V2_APPROVED_CANDIDATE=rc-...`
- `BRIAN_UI_V2_APPROVED_BUILD_SHA=<exact commit sha>`

They are intentionally server-side values exposed only as normalized booleans/identifiers by the build metadata endpoint.

## Important limitation

The current rollback latch proves client decision precedence but is browser-local. The first real production bootstrap integration should retain a server/environment kill switch so global rollback does not depend on one browser's localStorage.

## Not wired yet

No import of `productionBootstrapAdapter.js` has been added to:

- `src/applicationBootstrap.jsx`;
- `src/main.jsx`;
- the production `index.html` startup contract.

This is intentional. The final integration must be a separate reviewable commit made only after the exact release-candidate build passes all evidence gates and receives owner approval.

## Rollout sequence

1. Keep production V1 unchanged while candidate evidence is collected.
2. Approve one exact candidate + build SHA.
3. Make the dedicated bootstrap integration commit.
4. Start in `opt-in` mode.
5. Verify V1 fallback, rollback and data parity.
6. Expand only after the private cohort is stable.
