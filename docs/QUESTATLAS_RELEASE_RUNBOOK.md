# QuestAtlas Production Release Runbook (staged; LIVE RELEASE BLOCKED)

## Safe production UI-only rollout (no database cutover)

- Explicitly authorized UI-only deployment can be shipped to the existing Vercel production project after 17/17 repository CI passes, with `QUESTATLAS_PRODUCTION_LIVE_ENABLED` absent. The guest gateway returns HTTP 503, even when other environment variables are accidentally present.
- **Do not apply QuestAtlas SQL migrations during this UI-only release.** Teachers see the labelled, browser-memory-only demonstration. Persistent Atlas creation, Department Hub, real student joins and scoring are unavailable until a separately approved data rollout.
- Record the last known good production deployment ID and commit before Vercel deploy; verify branch SHA, DNS alias, route load and fail-closed status. If critical regressions appear, rollback Vercel immediately and leave the production database untouched.
- The `QUESTATLAS_PRODUCTION_LIVE_ENABLED=enabled` toggle and production-only `QUESTATLAS_SUPABASE_*` server keys are **not permitted** until isolated managed Auth/PostgREST validation, physical eight-iPad tests, security and retention signoff, plus migration backup/restore have passed.
- No new paid services, AI or automatic cleanup. This is a production *demonstration-only* release, never a certification of Classroom Live.

## What is verified
- Feature code lives on `feature/questatlas-foundation-20261017` / PR #1176, not on `main`.
- GitHub CI tests deterministic Atlas, server scoring, 8 concurrent PostgreSQL clients, TTCM RLS/audit, guest quotas, the new Vercel API gateway and retention. The database trigger also enforces the two-team start rule and expiry for direct authenticated table UPDATE, not merely the host RPC.
- Vercel Preview can build without configuring the gateway, but Classroom Live **fails closed** (HTTP 503). A READY frontend build does NOT mean student live play works.
- On the existing BRIAN Vercel Hobby deployment, `/api/questatlas-live` is a rewrite to the **existing** `api/gateway.js` shared Function, dispatched to `serverless-handlers/_questatlas-live.js`. This avoids exceeding the 12-Function build cap; do not restore a standalone `api/questatlas-live.js`.

## Absolute release blockers
- **No paid Supabase preview branches or new paid resources are permitted.** Use existing GitHub Actions/PostgreSQL disposable fixtures first, plus a local Docker/Supabase-CLI environment if available. These tests are not equivalent to a real Supabase Auth + PostgREST staging verification.
- Independently verify use of `service_role`: the credential bypasses RLS, must be **server-only**, and must never be added to any `VITE_*` variable or to source control.
- Web security audit of guest gateway, direct RPC revocation and limits for invalid-code/token probing, including attacks distributed across IPs.
- Run real browser/iPad tests on unstable Wi-Fi and TV 16:9 layouts; inspect 3D FPS and fallback; accessibility and load soak.
- Agree on retention policy (the staged cleanup defaults to 180 days, with a minimum 90-day safeguard), school reporting requirements and student privacy.
- Build/validate all workflows; add branch protection and perform rollback rehearsal. No AI functionality in QuestAtlas.

## Staging configuration (never point at production while validating)
1. Run the existing **free-within-current-quota** GitHub Quality Gate: deterministic tests, production Vite build and disposable PostgreSQL 17 RLS/RPC/8-team tests. Optionally repeat migrations with local PostgreSQL/Supabase CLI + Docker without creating any hosted database. **Do not create a paid Supabase branch**.
2. On an **isolated local test database only**, apply migrations in order (never to BRIAN production as a staging substitute):
   - `20261017091000_questatlas_foundation.sql`
   - `20261017093000_questatlas_classroom_live.sql`
   - `20261017112000_questatlas_department_hub.sql`
   - `20261017125000_questatlas_guest_gateway.sql`
   - `20261017133000_questatlas_retention.sql`
3. To test the guest gateway with real remote multi-device networking, an isolated publicly reachable Supabase-compatible environment would still be needed. **Do not substitute production credentials or create a paid environment.** If an existing no-cost isolated instance with remaining quota is independently available, configure the Vercel branch-specific **Preview** env:
   - `QUESTATLAS_SUPABASE_URL`: staging Supabase HTTPS URL (not production)
   - `QUESTATLAS_SUPABASE_SERVICE_KEY`: staging server-only service role key; Sensitive/Encrypted
   - `QUESTATLAS_IP_SALT`: random 32+ character high-entropy server secret, not logged
   - `QUESTATLAS_ALLOW_PREVIEW_LIVE`: set to the literal `isolated` **only** after confirming the Preview database is independent of BRIAN production. Without this opt-in, the gateway rejects all Preview Live requests.
4. If such a separate free environment exists, scope all **four** values ONLY to the QuestAtlas preview branch. The gateway rejects a Preview target equal to `VITE_SUPABASE_URL` or `SUPABASE_URL`, and never falls back to either shared variable. Never reuse BRIAN production service-role credentials in staging.
5. Without a safely isolated remote environment, keep secrets absent; the guest gateway intentionally returns HTTP 503. Validate its behavior with `node scripts/test-questatlas-gateway.mjs` and the PostgreSQL fixture instead. Do not claim real multi-device testing.
6. For zero-cost functional review, open QuestAtlas → Classroom Live → **Phòng thi mô phỏng miễn phí**. Create 2–8 teams, simulate answering/pausing/advancing/resetting and observe scoring; everything stays in browser memory. For server behavior, run the eight-client CI test. Both are simulations, not physical multi-iPad acceptance.
7. CI verifies that direct `qatl_live_join/view/submit` privileges are revoked after gateway migration in a disposable PostgreSQL database. This must be reverified in a genuine isolated auth/PostgREST environment **before real classroom launch**.
8. Use mocked gateway tests for invalid codes/tokens and per-IP budgets. Real many-IP adversarial load and upstream protection verification remain blocked until an appropriate test environment is available at no additional cost.
9. Review logs for secret leakage, raw IP storage, request size limits, cross-department data and answer-key exposure. Ensure only opaque hashes are stored for quota keys.

## Production release prerequisites and order
1. Review the draft PR and merge only when all checks pass, branch protection is active and all safety reviews are signed off.
2. Back up existing BRIAN Supabase data, record production Git SHA / deployment ID, verify rollback access.
3. Configure production server-side secrets for the separate guest gateway. Never commit the values.
4. Deploy a release with student guest mode disabled until the database cutover is validated.
5. Apply only reviewed migrations in the prescribed order. The guest-gateway migration intentionally revokes direct anonymous RPC access; applying it before the gateway is configured breaks existing public play.
6. Enable Guest mode via controlled rollout after smoke and re-check RLS, quotas and room ownership.
7. Observe errors, score integrity, latency, upstream budgets and browser performance; prepare an immediate toggle-off for the guest route.

## Safe rollback
- **First disable student public room access** while keeping teacher content readable. Do not temporarily re-grant public EXECUTE on guest RPCs; that reopens the bypass.
- Roll back the Vercel deployment/UI to last-known-good BRIAN, leaving QuestAtlas tables untouched pending data review.
- Do not automatically drop migrations/tables or delete any student scores during rollback.
- Investigate error/cost logs, retain the reviewed staging snapshot and replay the affected CI scenarios.

## Operations
- `qatl_maintenance_cleanup(180,true)` is a **dry-run** and does not delete any data.
- `qatl_maintenance_cleanup(180,false)` deletes only expired QuestAtlas live sessions older than 180 days and quota buckets older than 3 days. Requires a server-only role; no automatic schedule is deployed.
- Department approval audit events are not modified by this operation.
- Cleanup should be invoked only after data-retention policy approval and backup, then reviewed via returned counts.

## Free rehearsal & cost guardrails

- There is a **teacher-only in-browser rehearsal** available in the Classroom Live tab. It uses `localLiveSimulator.mjs`; it never calls Supabase, stores no browser-persistent data and shows its simulated status visibly.
- The local rehearsal is deliberately independent of live multi-device rooms and the backend SQL. Passing it does not certify school Wi-Fi latency, real Auth integration or release readiness.
- Automated regression: `node scripts/test-questatlas-rehearsal.mjs` checks eight-team behavior, correct/wrong attempts, pause/resume/next, reset, idempotent scoring and offline isolation.
- Use existing GitHub Actions and Vercel Preview only within current included quotas. No additional paid app plan, branch, database or premium graphics dependency is required for development.
- If CI or hosting quotas run out, **stop and report the limit** rather than purchasing more usage automatically.
- Production rollout remains gated on verified security and functional acceptance; a no-cost plan does not justify testing directly on production BRIAN or student data.

## No AI
QuestAtlas is fully deterministic; only same-origin guest API calls are allowed. The inherited chatbot is suppressed on QuestAtlas and public join routes. Do not add any model, AI analytics, content generation or AI grading.

## 3D/iPad acceptance added on feature branch

- Three dependency-free WebGL rooms now contain differentiated architectural geometry (Temple pillars/steps, Cyber terminals, Library bookshelves).
- Teacher-only preview supports on-demand pointer orbit, two-finger pinch zoom, wheel zoom, focusable keyboard controls, a reset-camera button and Escape-to-close. Rendering is on-demand rather than a continuous animation loop; device pixel ratio is capped at 1.5.
- Camera positions are constrained to the room interior to prevent opaque outer walls from hiding the scene during a full 360-degree orbit.
- Each solved puzzle advances the 3D door frame state and progress bar. The modal restores focus/scroll when dismissed and keyboard Tab focus stays inside while open.
- `scripts/test-questatlas-webgl.mjs` validates distinct geometry, safe world bounds, mock WebGL rendering/teardown and multi-touch gestures. This is not a substitute for physical iPad testing or realistic production art assets.

## Shared school Wi-Fi NAT allowance

Eight iPads on one campus Wi-Fi can share one public NAT IP. Each team polls roughly every 3 seconds, yielding approximately `8 × 20 = 160` room-view requests/minute per shared IP. The earlier 75/min IP ceiling would throttle normal classrooms even while team-token limits were respected.

- Staged IP budget now allows **480 views/minute per shared IP**, **40 joins/minute** and **96 submissions/minute**, with independent stricter 50-views/minute/token, 12-submissions/minute/token and 16-joins/minute/room quotas.
- Disposable PostgreSQL regression verifies 200 same-IP view calls work and an excessive burst beyond 480 is blocked. Actual school-network use and distributed traffic security testing remain mandatory before production.
- These limits are operational defaults, not guarantees of safety against distributed attacks or multiple simultaneous classes behind one address. Reassess with provider WAF and measured traffic before launch.

## Free Classroom Live acceptance — teacher pilot

The QuestAtlas backend remains unconfigured on Preview. To test without a paid Supabase branch:

1. Open the Vercel Preview, sign in using an authorized test account (not a student).
2. Navigate to QuestAtlas. If you see "chưa được cấu hình", click **Chạy phòng mô phỏng miễn phí** directly.
3. In Classroom Live select **Mở phòng mô phỏng miễn phí**; choose the built-in Grammar Vault demo (or a teacher-authored local Quest).
4. Set teams to eight and create the local room. Try **Bắt đầu** before two teams join: the action must be denied.
5. Add all eight teams; start. On stage 1 submit a mix of right/wrong answers. Verify duplicate submissions are unavailable and each team's score is correct.
6. Pause, resume and advance. Reset a team; the UI must request confirmation and the previous points must disappear. Rejoin the same slot while still active.
7. Complete all stages and press **Xuất CSV bảng điểm mô phỏng**. Confirm the file starts with a teacher-simulation marker; columns include team, points, scale (10), answered and correct; it must contain **no** puzzle prompts, answer keys or student identities.
8. Spot-check `70/80 → 8.75` for the deterministic grade conversion. Spreadsheet formula-like team labels must be neutralized.
9. Reload the page: all simulated teams and points must disappear (ephemeral behavior). Live BRIAN gradebook and database must remain untouched.
10. Repeat the same rehearsal UI on iPad portrait and landscape and a classroom TV. This verifies layout only, **not** networked real-time play.

These steps require no new paid resources but consume existing hosting/CI quotas. If a browser or device is inaccessible, mark physical acceptance **NOT VERIFIED** instead of claiming it passed.
