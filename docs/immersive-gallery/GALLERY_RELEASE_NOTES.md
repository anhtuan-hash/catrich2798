# Immersive Gallery R1 — feature-branch release notes

## Integration changes
- `src/data/apps.js` — Gallery launcher item, conditional display in main app.
- `src/pages/ToolPage.jsx` — lazy-load GalleryApp only when the Gallery tool route is opened.
- `src/main.jsx` — hook-based feature flag filters app tile while OFF.
- `src/pages/AdminPage.jsx` — admin flag panel.
- `src/features/immersive-gallery/*` — viewer, Studio, WebGL rooms, moderation, validation, local fixture seeder.
- `supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql` — proposed private schema and RLS; NOT APPLIED.
- `scripts/test-immersive-gallery.mjs` + release-build hook — 16 deterministic unit/contract checks.

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
Release 1 user acceptance is not complete. Native WebGL used in place of R3F, no binary GLB importer, school/student role change blocked, staging DB and browser QA not run. No production modifications were authorized or performed.
