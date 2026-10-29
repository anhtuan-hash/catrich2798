# BRIAN English — Halloween V8 implementation and acceptance report

**Status: PREVIEW ONLY — NOT VISUALLY ACCEPTED, NOT PRODUCTION.**

## Source/production verified

- GitHub repository: `anhtuan-hash/catrich2798` (Vite/React).
- Existing Production branch: `main`, baseline `dd883510b040efcf9158f80daaf6aa10bfd7412b`.
- Vercel integration: same existing project `catrich2798`, used by `https://esl-brian.vercel.app`.
- Implementation branch: `feat/halloween-v8-illustrated-artwork-20261029`, built on V7 unreleased architecture for gallery/permission improvements.
- No new Supabase migration; reuse `bes_set_halloween_home_enabled` and original CMS.

## Real functional presentation, never a screenshot of UI

- Keep all React actions, navigation links, Hero CMS data, Supabase gallery photos, grade weekly lesson records, teacher name, school logos and credentials unchanged.
- Admin Home master controls every visual zone when ON, and visually returns to original Home on OFF.
- Hero background and decorative illustration are separate layers; text/buttons are HTML.
- Gallery uses real published-photo sources, object-fit contain, gallery thumbnails and fade motion to eliminate half-reveal.
- Grade 10/11/12 actual lessons and buttons remain interactive and scrollable.
- Real published lesson count is not hardcoded in product code.

## Reference-derived, lightweight illustration assets

Only art-only fragments from the user-supplied target illustration; no mock UI pixels are deliberately presented as functional site UI:

1. `public/assets/home/halloween-v8-castle-art.avif` — illustrated castle, moon, ghost, cat, pumpkins and signage.
2. `public/assets/home/halloween-v8-left-decor.avif` — hero left hanging lanterns and foliage.
3. `public/assets/home/halloween-v8-gallery-ghost.avif` — smiling witch ghost.
4. `public/assets/home/halloween-v8-footer-pumpkins.avif` — pumpkin/candle crop; mask to prevent any leftover screenshot card.
5. `public/assets/home/halloween-v8-practice-scenery.avif` — graveyard/tree/pumpkin illustration for practice area.

Layers use alpha-like CSS masks, limited animation and reduced-motion fallbacks.

## QA

Dedicated workflow: `.github/workflows/halloween-home-v8.yml`.

- `node scripts/test-halloween-home-v8.mjs` checks AVIF files, CMS preservation, master gating, gallery controls.
- `node scripts/test-halloween-home-v4.mjs` checks previous Admin/RLS guard.
- `npx vite build` builds all application code.
- `node scripts/test-halloween-home-v8-browser.mjs` checks UI ON/OFF and original-style restoration at 1440x900, 1280x800, 1024x768, 768x1024, 390x844 and 360x800; no horizontal overflow, image contain, clickability, zero page errors.
- Workflow screenshot artifacts contain a **fixture** representation with source-realistic components, not authenticated live Production screenshots.
- External browser access to Vercel Preview is protected by Vercel login. Live Supabase and authentication end-to-end visual QA on that Preview is therefore unverified.

## Remaining blockers / visual quality gate

1. This is still materially below the source mockup's high-resolution environmental illustration and 2.5D layered richness. Do not rate as ≥90/100 or claim pixel-perfect fidelity.
2. Screenshot dimensions and vertical proportions differ from the exact 1024×1536 visual reference; content is not truncated to fake a match.
3. Real Preview page is behind Vercel Authentication. The owner can review with their authenticated Vercel account, but no unauthenticated automated screenshot of the real site was possible.
4. Actual grade data/gallery network behavior and Admin toggling across multiple logged-in sessions have not been proven on the protected Preview.
5. Production merge should be gated on new live screenshots and owner visual approval. Keep current Production baseline unchanged until then.

**Do not interpret green CI as aesthetic acceptance.** This file records the unresolved quality gap rather than promising 100%.
