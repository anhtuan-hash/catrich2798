# BRIAN Immersive Gallery — Architecture (feature branch)

## Verified project integration
The real source uses React 19, Vite, hash routes (`#/tool/:slug`), `src/pages/ToolPage.jsx` lazy components, `src/data/apps.js` launcher metadata, and `src/utils/permissions.js` permission registry. Gallery registers slug `immersive-gallery` in the existing APPS list; the existing router, auth and app-permission guards remain in charge. `src/main.jsx` uses `useGalleryFlag()` to hide the launcher tile until the server-controlled flag is on. `AdminPage.jsx` renders a separate admin toggle.

## Client architecture
`GalleryApp.jsx`: Cloud-backed catalog, visitor, Studio, review queue, localized DOM panels. `GalleryCanvas.jsx`: lazy WebGL scene with colored geometry, first-person movement, touch pad, click interaction, atrium lobby, three room presets. `sceneTemplates.js`: bounded geometry validation and URL allowlist. `galleryData.js`: Supabase REST + private Storage; never a new server or Vercel Function.

**Critical deviation from original spec:** R1 currently uses a compact, native WebGL renderer, not React Three Fiber/Three.js, to avoid an unreviewed change to Brian's npm lockfile and heavyweight CDN/dependency footprint. Procedural curated shapes exist, but general GLB import/inspect is *not* implemented. Do not claim GLB or R3F compliance. A later implementation should add audited, lockfile-pinned R3F/Three and a safe GLB loader with GPU/memory caps. Advanced object gizmos remain R2.

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
