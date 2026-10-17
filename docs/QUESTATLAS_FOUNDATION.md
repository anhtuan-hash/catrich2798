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
- Each room allows 2–8 teams, one device per team, and expires after four hours. Teachers can reset a team slot and invalidate its prior bearer token/score, with a confirmation prompt.
- Teacher/host uses owner-scoped RLS to read full session info and score attempts.
- Guest RPCs use narrowly scoped SECURITY DEFINER with explicit execution grants; they require independent security review, rate-limit/abuse tests and a disposable development database before production.

### Important release blockers
1. Neither the foundation nor Classroom Live migrations have been applied. The live flow is **not usable on production** yet.
2. The SQL must pass real PostgreSQL execution, RLS role tests (anon vs authenticated, wrong team token, expired session, concurrency/idempotency), load tests and audit.
3. The public join route must be tested on iPad/Chrome/WebKit and under weak/reconnecting networks.
4. Realtime currently uses 3-second polling rather than high-frequency subscriptions; rate and cost budgets need evaluation.
5. Department sharing/approval, advanced 3D art, ability to reset a taken team slot and robust abuse rate limiting remain pending.

This is not an AI-assisted app and does not call generative models. Other unrelated BRIAN AI components are outside this feature, except the route-local suppression already added.

## Department Hub: staged integration

A Department Hub module has been added to the existing `#/tool/questatlas` workspace with:
- Department membership inferred **only** from BRIAN `department_members` / `departments` (active membership).
- Teacher submission of self-owned knowledge nodes or published Quests for TTCM approval.
- Department-head review with approve/reject and optional note. Status transitions and asset identity are guarded by PostgreSQL RLS + triggers, not by UI alone.
- Approved resources visible to **active members of the same department**. Members can fork an approved node or published Quest into private drafts. Cloning keeps question options and teacher answer keys within authenticated RLS, never in public/student endpoints.
- Teacher can revoke their own share. An append-only event ledger records submission, TTCM approval/rejection and revocation without allowing clients to alter or erase the logged events.
- Source content is snapshotted at submission by a database trigger. Approved forks use the reviewed snapshot, not a potentially modified original.

### Verified only on disposable PostgreSQL 17 in GitHub Actions

`scripts/questatlas-department-postgres-smoke.sql` is executed after the Classroom Live fixture and verifies:
- Migration can be applied to disposable schema.
- Teacher submission, blocked self-approval, authorized head review.
- Cross-department visibility blocked for pending and approved submissions.
- Approved node and Quest can be forked, including cloned puzzle data.
- Changes do not touch the live BRIAN Supabase database.

### Department Hub release blockers

- A Supabase isolated branch or disposable project must run full auth/RLS tests under actual BRIAN policies and verify no performance regression before **any** production migration.
- Validate with real department membership and TTCM roles **without** using student personal data.
- Strengthen governance with approval notifications, paginated historical views, dedicated access audit, and anti-abuse limits before school-wide rollout.
- Existing Query/Atlas cache is capped at 500 rows per type; paginate large libraries before general launch.
- Do not merge this draft PR to production until full BRIAN Critical E2E is green.

## October 17 hardening increment (staged)

- Submission snapshots now retain immutable node or Quest + puzzle data, so modifications to the owner's original content cannot silently change an approved resource. Snapshot is populated server-side; clients cannot replace it.
- Approval audit events are append-only and survive the withdrawal/deletion of a share. TTCM sees its department timeline; owners see events on their own submissions, and unrelated departments have no access.
- A teacher may release an occupied Classroom Live team slot in the teacher panel after explicit warning. Reset revokes the old bearer token and deletes that team's scores; teams rejoin with a new token.
- Hosts are limited to five newly created rooms per hour. This is **not** sufficient as a full request rate limiter for public guest endpoints, so production remains gated on perimeter throttling and attack simulation.
- RLS, audit, immutable-copy and token rotation behavior are exercised on disposable PostgreSQL via GitHub Actions. These tests do not mean Supabase production has been modified.
