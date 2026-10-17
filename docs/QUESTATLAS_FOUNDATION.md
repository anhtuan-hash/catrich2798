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
- 3D visual in the foundation is CSS-perspective preview, not the final WebGL runtime.
- Puzzle answer checking is solely for authenticated **teacher preview**. No student/public route.
- Department sharing and realtime classroom sessions are intentionally not enabled pending scoped RLS and authoritative server-side scoring.
- If the database migration is not yet applied, the interface offers an explicitly labelled, unsaved demo. It never silently pretends to persist data.

## Suggested later slices
- Knowledge graph editor with version history, assessment item adapter (read-only source and immutable snapshot)
- Three.js 3D runtime behind lazy-loaded route and device fallback
- Per-department sharing with explicit approval/expiry
- Teacher-led realtime sessions with short-lived join tokens, idempotent server grading, reconnect and audit
