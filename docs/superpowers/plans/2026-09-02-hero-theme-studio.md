# Hero Theme Studio V1 Implementation Plan

> Execute inline with TDD on `feature/hero-theme-studio-v1`; merge only after contract tests, production build, review, and Vercel preview verification pass.

## Task 1 — Lock the contract with a RED test

**Files**
- Create: `scripts/test-hero-theme-studio.mjs`
- Modify: `.github/workflows/frontend-build.yml`

The contract test must assert the approved architecture exists: registry uniqueness/no fallback inheritance, runtime fail-open semantics, anonymous published manifest, admin-only mutations, Drive media validation, atomic publish/restore SQL, Admin Studio wiring, and build integration. Run it before implementation and confirm it fails for missing production files.

## Task 2 — Database model and atomic revision RPCs

**Files**
- Create: `supabase/brian_hero_theme_studio.sql`

Create five tables with RLS. Public clients can read only the active published snapshot through a security-definer public-manifest function. Admin policies use `auth.uid()` + approved admin profile checks. Implement transactional `hero_theme_publish_draft` and `hero_theme_restore_revision`; restore clones to a new immutable revision.

## Task 3 — Shared model + registry

**Files**
- Create: `src/heroTheme/heroThemeModel.js`
- Create: `src/heroTheme/heroRegistry.js`

Implement pure normalization, explicit `original/custom` modes, selected/all copy helpers, media URL builder, unique hero-key validation, route matching and conservative selectors. No global fallback theme is allowed.

## Task 4 — Public runtime

**Files**
- Create: `src/heroTheme/heroThemeClient.js`
- Create: `src/components/HeroThemeRuntime.jsx`
- Create: `src/styles/HeroThemeRuntime.css`
- Modify: `src/main.jsx`

Fetch the anonymous active manifest after render, resolve only the current Hero, attach `data-hero-key`, insert a non-interactive background layer behind content, and remove it on route/config/image failure. Do not block the Hero's first render.

## Task 5 — Secure APIs + Drive media

**Files**
- Create: `server/api/_heroTheme.js`
- Create: `api/hero-theme-manifest.js`
- Create: `api/hero-theme-admin.js`
- Create: `api/hero-theme-upload.js`
- Create: `api/hero-theme-media.js`

Reuse `requireApprovedUser(... roles:['admin'])` and the existing Google Drive connection helpers. Upload validates image signatures/dimensions/pixel ceiling and stores under `Hero Themes/Uploads`. Public media proxy only serves Drive files referenced by the current active revision and adds cache/nosniff headers.

## Task 6 — Admin Theme Studio

**Files**
- Create: `src/components/admin/HeroThemeStudio.jsx`
- Create: `src/styles/HeroThemeStudio.css`
- Modify: `src/pages/AdminPage.jsx`

Build theme library, per-Hero controls, preview, upload/optimization, selected/all apply, save draft, publish, history, restore, and original reset. All controls remain inaccessible to non-admin accounts both in UI and API.

## Task 7 — GREEN, review, and delivery

Run:

```bash
node scripts/test-hero-theme-studio.mjs
npm run build
```

Then inspect the PR diff, run the repository's frontend CI, verify Vercel preview is READY, test public manifest/media fail-open behavior, and only then squash-merge to `main`. Verify the production deployment is READY and matches the merge SHA.
