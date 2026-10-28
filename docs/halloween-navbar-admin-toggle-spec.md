# BRIAN Halloween Navigation — system-wide, Admin-toggleable

## Objective
Give BRIAN's existing navigation bar a Halloween background with a single Admin-only switch for restoring the exact unmodified original appearance. Do not change the Hero, slideshow, content areas, app cards, routes, access control, or site layout.

## UX acceptance criteria
- When **on**, desktop main navigation uses a midnight-navy/purple background illustration with a moon, bats, pumpkin and cobwebs; warm pumpkin border/glow. All text and pills stay readable, clickable and the same size/order as before.
- Mobile topbar uses the same visual language without changing its menu/reports/TTCM/attendance/account affordances or touch sizes.
- When **off**, seasonal attribute is set to `false`; no seasonal CSS selector matches, so the existing full navigation appearance is restored with no duplicated/replacement theme code.
- Admin route: `Cài đặt → Điều hướng → Nền Halloween cho thanh điều hướng`. Switch is accessible, displays save progress and errors, and updates only after a server-confirmed write.
- Visitors (including guests), teachers, TTCM and Admin all read the same setting; only a verified/approved Admin with a Supabase account can change it. Changes propagate via an RLS-secured singleton table, Realtime, focus refresh and 30-second reconciliation.
- Default state on first installation: **enabled**; Admin can disable any time. No scheduled expiration or local user preference overrides.

## Technical design
- Table `public.bes_navigation_theme_settings`: exactly one row (`id=true`), `halloween_enabled`, `updated_by`, `updated_at`; public read for anon/authenticated via RLS, no direct public writes.
- RPC `bes_set_halloween_navbar_enabled(boolean)`: SECURITY DEFINER, fixed empty search_path, validate `auth.uid()`, approved `public.profiles` with role admin/administrator; only authenticated execute. TTCM/teacher/anon cannot modify.
- Utility `halloweenNavbarTheme.js`: cache and timestamp reconciliation; read on all clients independently of login, subscribe to table change, revalidate on focus and every 30 seconds; event to sync active views; client fails safely to cached/standard display when network unavailable.
- `GlobalFlatNavigation` owns the single hook and passes `halloweenNavEnabled` to `GlobalCompactNavigation` and `MobileAppShell`. Only those navigation elements receive `data-halloween-nav="true"`.
- Styles are in a new `HalloweenNavigationSkin.css`; every selector requires explicit navigation data attribute. No `:root`, `body` background, Hero, slideshow or unrelated component selectors.
- Decorative SVG file `public/assets/navbar/halloween-navbar.svg` is original local/vector; no external image/font library or new paid service.
- Existing independent slideshow's Halloween theme remains unchanged.

## Regression gates
1. Public-only select; anonymous and signed-in role cannot perform direct update; Admin RPC role gate verified.
2. Toggle UI only for Admin, plus server-confirmed value change. User-facing errors preserve current appearance.
3. Desktop + mobile computed styles show Halloween only when enabled; disable returns to original CSS, without changing geometry.
4. Existing navigation click targets, permission badges, route tabs and keyboard focus remain functional.
5. Vercel release build, i18n audits and browser test PASS before Production merge; verify Vercel status on merge SHA.
