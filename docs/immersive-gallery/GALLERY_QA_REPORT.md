# Gallery QA report — Release 1 preview, not production acceptance

## Evidence
- Feature branch: `feature/brian-immersive-gallery-r1`.
- Vercel project `catrich2798` belongs to a **Hobby** team (verified via connected project context).
- First working Preview for commit `f6238f0`: READY, HTTP 200 from deployment host, Vite bundling passed. This confirms the **SPA build**, not the logged-in Gallery UI.
- `scripts/build-brian-vercel-release.mjs` invokes `scripts/test-immersive-gallery.mjs`, a suite containing **16 static/logic tests** (validation, URLs, three templates, feature hiding, schema contract and module lazy loading). The READY preview passed its release-build gate.
- Full-site i18n audit is included in that release build; initial failing snapshots were corrected on the branch.

## Tests not yet executed
- Supabase migration application and SQL parser execution: NOT RUN (explicit production restriction).
- Authenticated database CRUD and true persistence: NOT RUN.
- RLS positive/negative access matrix and private signed URL: NOT RUN.
- Playwright desktop/tablet/mobile E2E and screenshot capture: NOT RUN.
- Browser WebGL context-loss, pointer/touch/focus management, FPS and transferred-byte measurements: NOT RUN.
- Main site regression across five existing modules in a logged-in browser: NOT RUN.
- Class/student submission: BLOCKED by actual public.profiles role check excluding student.

## Verified implementation scope by source review
- Gallery app/Studio, feature flag, default-off SQL, three room geometry presets, lobby, numeric placement, private upload and moderation methods are present on the feature branch.
- The first-person WebGL renderer is dependency-free and has a 2D fallback list; browser visual accuracy is not certified.
- Basic YouTube embed sanitization and short-lived signed URL fetches are present.
- No R3F or arbitrary GLB loader. Procedural geometric model placeholders exist.
- No automatic video transcoding or paid API. No schema changes have been made to production.

## High-priority issues before Release 1 approval
1. Apply reviewed migration to a disposable staging project, run full RLS negative/positive test matrix, correct SQL/RLS problems.
2. Decide and implement a secure student identity/submission mechanism consistent with Brian's role restrictions.
3. Add lockfile-pinned React Three Fiber/Three.js and curated GLB loading or explicitly approve an architecture deviation.
4. Perform real browser walkthrough and Playwright automation; capture 1440x900, 768px and 390px screenshots and measure GPU/transfer performance.
5. Validate direct exhibition/deep links, out-of-scope school visibility, asset revocation and moderation workflow.
6. Review Vercel Hobby use case/terms and available Supabase quotas before enabling.

**Status:** IN PROGRESS / PREVIEW BUILD READY. Do not describe this as a fully accepted Release 1.
