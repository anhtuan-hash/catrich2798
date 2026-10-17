# QuestAtlas Production Release Runbook (draft; DO NOT DEPLOY)

## What is verified
- Feature code lives on `feature/questatlas-foundation-20261017` / PR #1176, not on `main`.
- GitHub CI tests deterministic Atlas, server scoring, 8 concurrent PostgreSQL clients, TTCM RLS/audit, guest quotas, the new Vercel API gateway and retention.
- Vercel Preview can build without configuring the gateway, but Classroom Live **fails closed** (HTTP 503). A READY frontend build does NOT mean student live play works.

## Absolute release blockers
- Supabase isolated staging branch/project with real BRIAN schema/auth; creation can incur hourly costs, so obtain the owner's explicit cost acceptance first.
- Independently verify use of `service_role`: the credential bypasses RLS, must be **server-only**, and must never be added to any `VITE_*` variable or to source control.
- Web security audit of guest gateway, direct RPC revocation and limits for invalid-code/token probing, including attacks distributed across IPs.
- Run real browser/iPad tests on unstable Wi-Fi and TV 16:9 layouts; inspect 3D FPS and fallback; accessibility and load soak.
- Agree on retention policy (the staged cleanup defaults to 180 days, with a minimum 90-day safeguard), school reporting requirements and student privacy.
- Build/validate all workflows; add branch protection and perform rollback rehearsal. No AI functionality in QuestAtlas.

## Staging configuration (never point at production while validating)
1. Create a dedicated Supabase staging branch **only after paid compute cost approval**.
2. Apply migrations in order in staging:
   - `20261017091000_questatlas_foundation.sql`
   - `20261017093000_questatlas_classroom_live.sql`
   - `20261017112000_questatlas_department_hub.sql`
   - `20261017125000_questatlas_guest_gateway.sql`
   - `20261017133000_questatlas_retention.sql`
3. Configure the Vercel branch-specific **Preview** env:
   - `QUESTATLAS_SUPABASE_URL`: staging Supabase HTTPS URL (not production)
   - `QUESTATLAS_SUPABASE_SERVICE_KEY`: staging server-only service role key; Sensitive/Encrypted
   - `QUESTATLAS_IP_SALT`: random 32+ character high-entropy server secret, not logged
4. Ensure all 3 are scoped ONLY to the QuestAtlas preview branch. Do not reuse the existing production BRIAN service role key in staging.
5. Redeploy Preview, then verify gateway returns 503 with secrets absent and works **only** with staging secrets set.
6. With an approved fake teacher and simulated class data: create/publish a Quest; create a room; join 2–8 iPads; submit correctly and incorrectly; verify scores and reconnect; reset one team and confirm token invalidation.
7. Try direct `/rest/v1/rpc/qatl_live_join`, `qatl_live_view`, `qatl_live_submit` using browser publishable key and signed-in token: they must all return permission denied. The gateway is the only permitted guest route.
8. Test invalid codes/invalid tokens from many IPs. A single IP budget and valid-room budget do not defeat distributed attacks; configure provider WAF / upstream IP protections before production.
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

## No AI
QuestAtlas is fully deterministic; only same-origin guest API calls are allowed. The inherited chatbot is suppressed on QuestAtlas and public join routes. Do not add any model, AI analytics, content generation or AI grading.
