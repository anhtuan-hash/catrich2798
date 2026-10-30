# November Teachers’ Day skin

Home-only paper collage skin, enabled by the approved Admin in Settings → Navigation → November / Tháng 11 · Tri ân 20/11. Uses the existing public theme singleton and approved-admin RPC pattern. Both enabling and disabling November clear all Halloween flags; enabling Halloween clears November. OFF restores the unchanged base CSS and published Hero CMS configuration.

The existing weekly lesson source, sorting, opening, statistics and management flows are retained. Footer detail arrays, contact information, credentials, original logos and portfolio action are unchanged. The seasonal portrait is optional, uploaded by Admin through the existing authenticated media bucket, publicly visible only as part of this seasonal Home footer, and removable in the same panel. No placeholder portrait is published.

Assets: original generated hero art and transparent pressed-flower art, optimized WebP. Handwriting fonts are self-hosted with their OFL licenses. Decoration is pointer-inert. Desktop uses three grade columns; <=760px stacks cards. No full-page image replaces interactive content.

## Validation

- `node --test scripts/test-november-theme.mjs`: confirmed saves, rejected saves, stale read race, request/subscription deduplication/cleanup, portrait independence, failed initial load.
- Existing Halloween source regression gates for Home, navigation, footer.
- Full `npm run build` including repository prebuild checks.
- Database transaction (rolled back) verifies unauthorized denial, approved-admin ON/OFF, theme mutual exclusion, invalid avatar rejection. Public SELECT remains allowed; direct client UPDATE remains denied.
- Security advisor notes authenticated SECURITY DEFINER RPC exposure; intentional with explicit approved-admin validation, empty search_path and anon/PUBLIC EXECUTE revoked, matching existing theme RPCs.
- Browser visual QA could not complete: the cloud browser URL policy denied observation. Pixel-level parity and mobile geometry have not been certified.

## Optional browser fixture

For local development only, set `VITE_SUPABASE_URL=https://november-fixture.invalid` and `VITE_SUPABASE_ANON_KEY=november-local-fixture-only`, run the dev server and open `/tests/fixtures/november-home.html`. It renders the actual app with 65 synthetic lessons and mock theme RPCs. Expand “QA · Seasonal controls” for the actual November/Halloween admin panels. This fixture is not a Vite production entry and is not shipped in dist. Do not use fixture environment values for production builds.
