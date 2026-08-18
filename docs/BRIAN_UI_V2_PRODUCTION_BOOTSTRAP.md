# Brian Metro Next — Prepared Production Bootstrap

> Status: implemented for Shadow validation, **not wired into production**.
> Branch: `ui-v2-shadow`.

## Goal

Prepare and validate the final V2 boot decision before touching `applicationBootstrap.jsx` or `main.jsx`, so release logic can be reviewed independently from the current V1 startup path.

## Build metadata transport

The browser reads `/api/v2-build-meta`, but this public route does **not** create a standalone Vercel function. `vercel.json` rewrites it to the repository's existing `api/gateway.js`, which dispatches to `_v2-build-meta.js`.

The handler returns only non-secret deployment identity and normalized release-policy fields:
- commit SHA / short SHA;
- git ref;
- deployment environment and URL;
- release mode;
- release-approved boolean;
- approved candidate ID;
- approved build SHA.

No credentials or raw secret values are returned.

## Eligibility contract

`src/ui/v2/productionBootstrapAdapter.js` reports V2 eligible only when every relevant condition is true:

1. current page is bound to a preview/production deployment SHA;
2. server policy explicitly marks the release approved;
3. approved candidate equals the current V2 release candidate;
4. approved build SHA exactly equals the running deployment SHA;
5. release mode is `on`, or mode is `opt-in` and the current user/browser has a private opt-in;
6. the emergency rollback latch is not active.

Missing or mismatched values resolve to V1.

## Independent build verification

`.github/workflows/ui-v2-shadow-ci.yml` performs:
- Node 22 setup;
- `npm ci`;
- full `npm run build`;
- Shadow preview source checks;
- gateway/rewrite contract checks;
- publication of commit status `brian-v2-shadow-ci`.

Vercel remains a separate required deployment check. This separation makes it possible to distinguish source/Vite compilation failures from Vercel-specific packaging or platform failures.

A Vercel-specific failure encountered after introducing a standalone build-meta function was resolved by consolidating the handler through the existing API gateway. The corrected commit `fdf517d4554e99034d677f174c3bb2e1351c9a14` passed both GitHub Shadow CI and Vercel.

## Intended future server environment

The final rollout may set these control values in Vercel:

- `BRIAN_UI_V2_MODE=shadow|opt-in|on|off`
- `BRIAN_UI_V2_RELEASE_APPROVED=true|false`
- `BRIAN_UI_V2_APPROVED_CANDIDATE=rc-...`
- `BRIAN_UI_V2_APPROVED_BUILD_SHA=<exact commit sha>`

They remain server-side and are exposed to the browser only as normalized release decision metadata.

## Important limitation

The current rollback latch proves client decision precedence but is browser-local. The first real production integration must also retain a server/environment kill switch so a global rollback does not depend on one browser's localStorage.

## Not wired yet

No import of `productionBootstrapAdapter.js` has been added to:

- `src/applicationBootstrap.jsx`;
- `src/main.jsx`;
- the production `index.html` startup contract.

This is intentional. The final integration must be a separate reviewable commit made only after the exact candidate + deployment SHA passes all evidence gates and receives owner approval.

## Rollout sequence

1. Keep production V1 unchanged while exact-build evidence is collected.
2. Require both `brian-v2-shadow-ci` and Vercel to be green on the final evidence build.
3. Approve one exact candidate + build SHA.
4. Make the dedicated bootstrap integration commit.
5. Start in `opt-in` mode.
6. Verify V1 fallback, server kill switch, browser rollback and data parity.
7. Expand only after the private cohort is stable.
