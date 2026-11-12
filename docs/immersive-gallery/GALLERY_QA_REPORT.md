# BRIAN Immersive Gallery R1 — evidence-based QA (2026-11-12)

## Current verified build and implementation
- GitHub PR [#1402](https://github.com/anhtuan-hash/catrich2798/pull/1402) is **DRAFT**, unmerged, branch `feature/brian-immersive-gallery-r1`.
- Vercel account attached to the repo is **Hobby**, not Pro. Vercel Preview on commit `0e74d031` was **READY**; the production bundle and existing release checks passed. Later commits also need their own Preview status check.
- React 19 + React Three Fiber **9.8.2** + Three.js **0.187.0** + Drei **10.7.9** are version-pinned and committed to package-lock.json.
- Gallery is lazy-loaded, has a lobby and 3 room templates, desktop keyboard & mouse movement, mobile directional pad, teleport, 2D exhibit list, optional WebGL error isolation, private image/audio/PDF handling, 3 original curated GLB models, GLB OrbitControls inspector, and a cloud-based authoring/approval/publish implementation. All cloud capabilities are dormant while SQL is unapplied and feature flag is OFF.

## Executed tests (real evidence, not declarations)
### Unit and source-contract tests
`node scripts/test-immersive-gallery.mjs`: **22 passed**, as recorded by GitHub Actions job logs on 2026-11-12. Tests include schema, curated GLB binary container, URL allowlist, bounded transforms, lazy loading and atomic publication call.

### Browser: real Chromium / synthetic offline exhibit fixture
[GitHub Actions run 43182010980](https://github.com/anhtuan-hash/catrich2798/actions/runs/43182010980): **12/12 Playwright tests passed**, with real Chromium browser rendering in three simulated device sizes:
- Desktop **1440×900**: 4/4
- Mobile **390×844**: 4/4
- Tablet **768×1024**: 4/4
Tests open scenes, visit classic/culture/lab, navigate with keyboard, open/close the GLB inspector, use Lite mode, and check touch controls on mobile. A misleading 3/12 failure was caused by a test waiting for a non-existent diagnostic element; corrected via a non-blocking DOM lookup, and the subsequent 12/12 run passed.

Six **actual screenshots** (scene and GLB inspector per viewport) are available in the successful run's artifact `gallery-synthetic-qa`. They depict a synthetic renderer harness, **not** the logged-in Brian production user journey or real student data.

### Database: real PostgreSQL 16 with synthetic RLS
[GitHub Actions run 43182872719](https://github.com/anhtuan-hash/catrich2798/actions/runs/43182872719), job `Real RLS on disposable PostgreSQL`: **PASS** on a disposable PostgreSQL 16 server. Supabase-compatible `auth.uid()`, schema and Storage tables are bootstrapped only inside the ephemeral job.
- Identity fixtures: approved admin, owning teacher, same-school teacher, different-school teacher, same-school synthetic student, different-school synthetic student
- Allowed: draft/room/exhibit creation, review, atomic admin publication, same-school read and synthetic same-school submission
- Denied by SQL: unauthorized teacher publish, silent post-approval edits, submitter reassignment, cross-owner protected asset referencing, editing asset metadata, forged school scope, owner reassignment, cross-school student submissions, read after feature OFF
- **Important:** The latest synthetic test matches production's restrictive ordinary-user `profiles` read policy (self only) and confirms that immutable `gallery_exhibitions.school_scope` avoids joining hidden owner profile rows.

## Still NOT validated
1. The Gallery migration has **NOT** been applied to Supabase staging or production. Tests on disposable PostgreSQL do not prove Supabase Storage's signed URL enforcement, authentic JWT/auth sessions, client errors, or current quotas.
2. **Real Brian `public.profiles.role` does not allow student** (read-only production inspection). Student submission for real authenticated students remains BLOCKED; the synthetic student fixture does not change that.
3. Browser end-to-end testing of authentic Brian login, Studio cloud persistence, class/student permissions, authoring, uploads and publication is **NOT RUN**.
4. Test screenshots prove 3D renderer output only, not finished visual design acceptance. No performance FPS/data-transfer profiling on representative physical devices.
5. No unrestricted external GLB import by design; only three original curated GLBs are parsed. No paid rendering services.
6. Some pre-existing unrelated repository CI jobs may fail; inspect each workflow's own logs and do not imply all Brian regressions are green.

## Release decision
**CONTINUE / NOT READY TO MERGE OR ENABLE.** Keep PR draft, the global feature flag OFF, and production untouched. Next release gate is a separately approved disposable Supabase staging integration with full RLS/Storage/JWT, a reviewed student identity model, and authenticated Brian Playwright regression.
