# November Teachers’ Day skin

Home-only paper collage skin, enabled by the approved Admin in Settings → Navigation → November / Tháng 11 · Tri ân 20/11. Uses the existing public theme singleton and approved-admin RPC pattern. Both enabling and disabling November clear all Halloween flags; enabling Halloween clears November. OFF restores the unchanged base CSS and published Hero CMS configuration.

The existing weekly lesson source, sorting, opening, statistics and management flows are retained. Footer detail arrays, contact information, credentials, original logos and portfolio action are unchanged. The seasonal portrait is optional, uploaded by Admin through the existing authenticated media bucket, publicly visible only as part of this seasonal Home footer, and removable in the same panel. The revised mockup uses a decorative generic profile silhouette when no portrait is set.

Assets: original generated hero art and transparent pressed-flower art, optimized WebP. Handwriting fonts are self-hosted with their OFL licenses. Decoration is pointer-inert. Desktop uses three grade columns; <=760px stacks cards. No full-page image replaces interactive content.

## Revised mockup — October 31, 2026

Built on main `19b1ecb` to preserve the latest World Explorer inline reader, archive and admin drawer. November adds the travel postcard at left and the actual published article image at right. Article dates, titles, previews and reading actions remain live. No World Explorer publishing, admin settings, or database permissions are changed. The theme switch and existing portrait upload remain authoritative.

Hero copy now reads “Tri ân / Thầy cô / 20/11”, with the supplied poem and dedication rendered as selectable HTML. The floral classroom background has no embedded controls or headline. Practice cards sit together on lined paper with horizontal blue/gold/mint tabs and a decorative book stack. Footer panels use cream, mint and pale yellow paper, the existing logos and original text. Narrow screens stack the discovery and practice content and retain 44px touch targets.

New assets in `public/assets/home/november/`, generated with the built-in Imagegen tool using the attached mockup as reference and converted to WebP:

- `teachers-day-hero-v2.webp`: wide 2.1:1 warm classroom collage; blank ruled paper on the left 37%, sunflower and pink rose bouquet, chalkboard reading “Happy Vietnamese Teachers’ Day 20/11”, globe, pencils, books and open notebook on the right; torn paper and washi tape edges. No UI or headline on the left.
- `discover-world-postcard.webp`: torn ivory travel postcard, Eiffel Tower and Big Ben, globe/map stamp, teal and coral washi tape, green leaves and pink flowers, “DISCOVER THE WORLD” and “Explore · Learn · Grow”.
- `practice-books.webp`: transparent cutout of four blue, teal, coral and cream vintage books labelled “Practice”, “Progress”, “Fluency”, “A Brighter You”, with sunflowers and pink daisies at the left corner.

## Validation

- `node --test scripts/test-november-theme.mjs`: confirmed saves, rejected saves, stale read race, request/subscription deduplication/cleanup, portrait independence, failed initial load.
- Existing Halloween source regression gates for Home, navigation, footer.
- Full `npm run build` including repository prebuild checks.
- Database transaction (rolled back) verifies unauthorized denial, approved-admin ON/OFF, theme mutual exclusion, invalid avatar rejection. Public SELECT remains allowed; direct client UPDATE remains denied.
- Security advisor notes authenticated SECURITY DEFINER RPC exposure; intentional with explicit approved-admin validation, empty search_path and anon/PUBLIC EXECUTE revoked, matching existing theme RPCs.
- Browser visual QA could not complete: the cloud browser URL policy denied observation. Pixel-level parity and mobile geometry have not been certified.

## Optional browser fixture

For local development only, set `VITE_SUPABASE_URL=https://november-fixture.invalid` and `VITE_SUPABASE_ANON_KEY=november-local-fixture-only`, run the dev server and open `/tests/fixtures/november-home.html`. It renders the actual app with 65 synthetic lessons and mock theme RPCs. Expand “QA · Seasonal controls” for the actual November/Halloween admin panels. This fixture is not a Vite production entry and is not shipped in dist. Do not use fixture environment values for production builds.
