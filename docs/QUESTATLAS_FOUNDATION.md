# BRIAN QuestAtlas — Foundation / Phase 02 (feature branch)

**Scope:** Teacher-owned Knowledge Atlas + Quest Builder + teacher-only interactive preview. No AI. No modifications to existing production data.

## Integration
- Entry point: `#/tool/questatlas`, linked in BRIAN Apps.
- Lazy module entry: `src/features/questatlas/QuestAtlas.jsx`.
- Permission ID: `tool:questatlas` (existing permission registry).
- Existing Supabase Auth session and user ID reused.
- Database objects prefixed `qatl_` with owner-scoped RLS.
- Existing tables (`assessment_*`, `classroom_*`, `lesson_check_*`, `resource_*`) are **not changed**.

## Release gating
1. Run `node scripts/test-questatlas-foundation.mjs`.
2. Run existing build and regression workflows.
3. Review schema + RLS on an isolated Supabase development project/branch.
4. Apply migration ONLY once tests and release checks pass. Back up first.
5. Confirm navigation permission for an approved teacher.
6. Confirm server-side game play security before enabling student join.
7. Re-audit unrelated legacy AI components separately; this module has no AI SDK or API use.

## Current limitations
- 3D preview now renders a native dependency-free WebGL room with pointer orbit and CSS fallback; final production-quality environments/assets are still a future milestone.
- Puzzle answer checking is solely for authenticated **teacher preview**. No student/public route.
- Department sharing and realtime classroom sessions are intentionally not enabled pending scoped RLS and authoritative server-side scoring.
- If the database migration is not yet applied, the interface offers an explicitly labelled, unsaved demo. It never silently pretends to persist data.

## Suggested later slices
- Knowledge graph editor with version history, assessment item adapter (read-only source and immutable snapshot)
- Three.js 3D runtime behind lazy-loaded route and device fallback
- Per-department sharing with explicit approval/expiry
- Teacher-led realtime sessions with short-lived join tokens, idempotent server grading, reconnect and audit

## Classroom Live: staged implementation

The feature branch now includes a teacher-led live interface, public join page (one device per team), 2–8 teams, reconnect using a per-room sessionStorage bearer token, scoreboard, and a new **staged** SQL migration (`20261017093000_questatlas_classroom_live.sql`).

### Security design (not yet verified against a deployed database)
- The host must be authenticated and own an approved, published Quest.
- The room contains an immutable question snapshot; public clients cannot select any `qatl_*` table.
- Join codes are 12 random uppercase hex characters (48-bit); team credentials are 256-bit bearer tokens stored only as SHA-256 hashes server-side.
- Exposed guest RPCs check room status, expiry and secret token; public `view` returns only selected fields and **never** the correct answer.
- Guest `submit` locks the session and is unique per team/puzzle position; scoring is executed in PostgreSQL and repeat submits are rejected.
- Each room allows 2–8 teams, one device per team, and expires after four hours. A lost team token currently requires creating a new room (team management comes next).
- Teacher/host uses owner-scoped RLS to read full session info and score attempts.
- Guest RPCs use narrowly scoped SECURITY DEFINER with explicit execution grants; they require independent security review, rate-limit/abuse tests and a disposable development database before production.

### Important release blockers
1. Neither the foundation nor Classroom Live migrations have been applied. The live flow is **not usable on production** yet.
2. The SQL must pass real PostgreSQL execution, RLS role tests (anon vs authenticated, wrong team token, expired session, concurrency/idempotency), load tests and audit.
3. The public join route must be tested on iPad/Chrome/WebKit and under weak/reconnecting networks.
4. Realtime currently uses 3-second polling rather than high-frequency subscriptions; rate and cost budgets need evaluation.
5. Department sharing/approval, advanced 3D art, ability to reset a taken team slot and robust abuse rate limiting remain pending.

This is not an AI-assisted app and does not call generative models. Other unrelated BRIAN AI components are outside this feature, except the route-local suppression already added.
