# BRIAN Immersive Gallery — Architecture (feature branch)

## Verified project integration
The real source uses React 19, Vite, hash routes (`#/tool/:slug`), `src/pages/ToolPage.jsx` lazy components, `src/data/apps.js` launcher metadata, and `src/utils/permissions.js` permission registry. Gallery registers slug `immersive-gallery` in the existing APPS list; the existing router, auth and app-permission guards remain in charge. `src/main.jsx` uses `useGalleryFlag()` to hide the launcher tile until the server-controlled flag is on. `AdminPage.jsx` renders a separate admin toggle.

## Client architecture
`GalleryApp.jsx`: Cloud-backed catalog, visitor, Studio, review queue, localized DOM panels. `GalleryCanvas.jsx`: lazy WebGL scene with colored geometry, first-person movement, touch pad, click interaction, atrium lobby, three room presets. `sceneTemplates.js`: bounded geometry validation and URL allowlist. `galleryData.js`: Supabase REST + private Storage; never a new server or Vercel Function.

**Architecture upgrade in progress:** The viewer imports React Three Fiber 9.8.2, Three.js 0.187.0 and Drei 10.7.9 lazily. It parses only three original curated GLB 2.0 models, generated locally without network access; unrestricted user GLB uploads remain disabled. The previous native WebGL module is retained in the branch as a fallback reference. Dependency lockfile and real browser QA are required before declaring the upgrade accepted. Advanced transform gizmos remain R2.

## Data
Draft SQL `supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql` creates gallery_settings, gallery_exhibitions, gallery_rooms, gallery_exhibits, gallery_assets and a private storage bucket with RLS. The draft migration has **not** been executed. The Gallery fails closed and remains hidden by default until database approval, migration, staged role tests and admin enablement.

## Routes / lifecycle
`#/tool/immersive-gallery` is the real Brian-compatible page. `?gallery=slug` is supported for viewing a gallery; visitors never bypass Brian login. Gallery is lazy behind ToolPage; GalleryCanvas is separately lazy and only mounted for viewer/editor previews. Listener and GPU resource cleanup run on unmount. Entering other Brian modules does not load the WebGL engine.

## Resource plan (Vercel Hobby)
All rendering takes place client-side. No GPU server, transcode worker, cron or paid API. The image cap is 2MB, audio 12MB, PDF 5MB; the private Storage bucket enforces 12MB maximum overall. Direct video upload disabled; only sanitized YouTube embeds accepted. Quality profiles Auto/High/Balanced/Lite adapt DPR and frame ceiling. The gallery initial payload and FPS targets still need browser measurement.

## Existing auth blocker
Read-only schema inspection on 2026-11-12 confirmed `public.profiles.role` check permits teacher/admin/department-head aliases but **does not permit student**. Therefore R1 student account submission cannot function end-to-end until separately approved changes to the existing auth policy or a reviewed student guest gateway are designed. This branch deliberately leaves existing auth unchanged.

## API safety
The SQL must be reviewed on staging; RLS assertions against admin, teacher owner, unrelated teacher, school member, student and anonymous are NOT complete. Direct API mutations must fail closed. No production merge, production migration or public feature activation is authorized by this branch.

## Actual production profile RLS reconciliation
The real Brian `profiles` SELECT policy for ordinary users is self-only. An earlier draft compared a visitor's school to the owner's inaccessible profile row and was unsafe for correctness. The revised migration adds `gallery_exhibitions.school_scope` populated on INSERT by a SECURITY INVOKER trigger reading only the creator's approved canonical profile. It prevents subsequent mutations to `school_scope` and `owner_id`, and all school-view, media and student-submission policies compare against this immutable scope. The disposable PostgreSQL RLS harness now reproduces the restrictive `profiles` rule and passed. No changes were applied to Brian's existing profile table.
