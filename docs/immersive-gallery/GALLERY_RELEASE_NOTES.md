# Immersive Gallery R1 — feature-branch release notes

## Integration changes
- `src/data/apps.js` — Gallery launcher item, conditional display in main app.
- `src/pages/ToolPage.jsx` — lazy-load GalleryApp only when the Gallery tool route is opened.
- `src/main.jsx` — hook-based feature flag filters app tile while OFF.
- `src/pages/AdminPage.jsx` — admin flag panel.
- `src/features/immersive-gallery/*` — viewer, Studio, WebGL rooms, moderation, validation, local fixture seeder.
- `supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql` — proposed private schema and RLS; NOT APPLIED.
- `scripts/test-immersive-gallery.mjs` + release-build hook — 22 deterministic unit/contract checks, passed in GitHub Actions.

## Rollout: do NOT execute before explicit approval
1. Review branch diff and reconcile school/student identity policy with Brian's canonical auth.
2. Review SQL on a disposable staging database, record RLS and Storage test evidence.
3. Run npm build and Playwright tests in verified Preview environment, capture screenshots.
4. Review actual Hobby usage, transferrable bytes and storage quotas.
5. Approve migrations and production release separately. Feature remains OFF after migration.
6. Enable Gallery from admin only after production migration and acceptance; monitor errors and usage.

## Rollback
- Disable Gallery first via Admin toggle (if the new schema exists) to hide launcher and visitor entry.
- Revert merge/restore last known good Vercel deployment if release fails.
- **Do not drop gallery tables or private Storage bucket automatically**; they may contain school submissions. Make a backup and obtain explicit data-retention decision before any destructive reversal.

## Precise limitations
Release 1 user acceptance is not complete. R3F/Three/Drei and three curated original binary GLBs are integrated, and disposable PostgreSQL RLS has passed. School/student account compatibility, live Supabase staging, authenticated browser QA and actual performance metrics remain unverified. No production migrations or deployment were authorized or performed.

## R1 validation update · 2026-11-12
Browser 12/12 synthetic Playwright checks PASS (desktop, mobile, tablet), original GLB inspection rendered in Chromium, PostgreSQL 16 synthetic RLS checks PASS including canonical school scoping and foreign media ownership. These are not live Supabase staging or authenticated Brian acceptance. Read `GALLERY_QA_REPORT.md` before any merge. The PR remains draft and feature OFF.

## Production database phase 1 verified — 12 November 2026
- User authorized production deployment; the Gallery R1 schema migration has **actually been applied** to Supabase project `xpkbgqdlfonsinriggmj`, followed by the separate least-privilege hardening migration.
- Database verification: five Gallery tables, all with RLS; 13 Gallery table policies; private bucket `brian-gallery-private`; zero exhibitions and exhibits; `gallery_settings.enabled=false`.
- **Important discovered issue:** Supabase's initial table privileges gave `authenticated` unnecessary DELETE/TRUNCATE capabilities even though RLS was ON. An immediate second migration removed these; a post-migration `has_table_privilege` query now verifies DELETE=false and TRUNCATE=false on all five tables and anon SELECT=false. Keep this second migration after the schema migration.
- Frontend production release is **not yet confirmed** by this phase. The 3D feature remains hidden while the feature flag is OFF. Independent browser and PostgreSQL synthetic QA passed; live authenticated user/Storage acceptance is not yet complete.
- The student-submission control is deliberately unavailable in Studio until Brian supports a verified learner login; it must not be presented as a working capability. `learning_learners` has no linked `learner_user_id` in the current production database.

## Original local museum after production release
- Add an always-available, clearly labeled **DEMO** visitor card after Gallery is enabled.
- The demonstration has exactly three thematic rooms, eight original educational exhibits and two curated GLB models; it is generated entirely in the browser.
- No student data, Supabase inserts, Storage uploads or published user submissions are created by visiting the demo.
- Real cloud-backed Studio remains controlled by RLS, with student direct submissions still held until verified learner authentication.
