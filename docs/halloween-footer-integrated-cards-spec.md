# BRIAN Halloween Footer — Integrated Three-Card Art (Approved Mockup)
Version 2.0 · 28 October 2026 · Scope: canonical footer ONLY

## Approved visual intent
The footer must not look like three unrelated white cards pasted over a dark poster. Draw Halloween decorative art **inside each of the three existing cards**, use one cohesive palette, and make the outside panel a subtle frame. Reference: user-approved illustrated footer mockup (orange-peach Brand, lilac Profile, peach-gold Credentials, midnight plum frame).

## A. Structure (do not change markup/geometry)
- Keep existing React `Footer.jsx` content unchanged, except retained seasonal attribute already present. Footer remains three `.signature-footer-v50-main > section` cards and existing branded logos, real profile, list and Portfolio trigger.
- Preserve original responsive breakpoints, footer card dimensions/grid, real logo images and captions, accessibility, the on/off setting, and full app-shell context.
- Scope every rule to `footer[data-app-shell-footer="true"][data-halloween-footer="true"]` with the canonical shell and no global theme mutation.
- For **OFF**, no holiday selector matches. Original footer surface, 3 card colors, landscape and attribution restore exactly.

## B. Color and materials
- Outer frame: gradient `#17162b → #211632 → #171729`, copper outline `#c98d60` at ≤50% opacity, gentle plum / amber light; never a large picture backdrop.
- Brand card: ivory `#fff8ef` / soft apricot `#ffe5ce`; copper rim, warm orange glints.
- Profile card: powder lilac `#f6eafe` / `#e9d7fb`; violet rim, legible plum body copy; green profile header optionally retained.
- Credentials card: peach ivory `#fff6e9` / `#ffe2c6`; apricot rim and warm pumpkin headings.
- Card text minimum WCAG AA (4.5:1 for normal text where possible); no bright decor behind label or portrait/logo content.
- Card borders all harmonized with gentle shadows. Slightly stronger bottom glow is okay; no flashing.

## C. Three local illustrated card skins (new SVG backgrounds)
1. `halloween-brand-card.svg` — corner copper spider web; softly glowing full moon and small bats high right; subtle orange lantern and jack-o’-lantern bottom left, tiny cat / picket fence at bottom right. Decorative only, behind the existing school logos and brand strapline. Logos remain unchanged and never recolored.
2. `halloween-profile-card.svg` — lilac stars and tiny bat silhouettes in upper/right negative space, pale web top right, light ghost tucked far bottom right. The name, badge, school, phone and Cambridge rows keep original readability.
3. `halloween-credentials-card.svg` — warm amber moon/glow top right, top edge bats and copper cobweb, small lantern and jack-o’-lantern tucked near bottom-right margin; star bullets and every credential remain readable.
- Each asset SVG is a transparent decorative layer, sourced from this repository, with **no network dependence**, no rasterization and no animation.
- Layers are sized `100% 100%` in card CSS, beneath an independent color gradient (painting order left-to-right), with no pseudo-elements overlaying live content.

## D. Footer frame and global floating Halloween layer
- Keep fixed global Halloween atmosphere (`z-index:45`) **behind** the footer surface (`z-index:70`), isolation and clipping scoped to seasonal Footer. No motifs may pass in front of the three cards.
- Avoid large scenery, hills or oversized pumpkins on the outside frame; preserve original Portfolio trigger and `Teach Better Together ♡` signoff.
- During ON, hide default pastel landscape only, not the original signoff.
- Under reduced motion, no additional visual animation; no external fonts/animation libraries.

## E. Behavior / admin
- No Supabase migrations. Preserve `bes_navigation_theme_settings.halloween_footer_enabled` and Admin-only RPC `bes_set_halloween_footer_enabled` exactly.
- Admin path: Settings → Navigation → `Nền Halloween cho footer`. Update from existing realtime state for guests and logged-in users.
- Navbar Halloween theme remains completely independent.

## F. Definition of Done
- Desktop Chromium: three distinct illustrated SVG layers and harmonized color fields; logos load; no text occluded; three cards align; Portfolio opens/closes; no new horizontal overflow.
- Mobile Chromium 390px: 3 vertical cards, artwork stays inside each card, all text remains visible; no art spill or page overflow.
- Toggle OFF→ON→OFF: original CSS backgrounds restored pixel-level property match; no geometry differences.
- Unit regression validates three assets (moon, web, pumpkin/lantern, bat/ghost), CSS scoped to footer only and admin toggles unchanged.
- GitHub QA must pass browser, frontend release build and independent footer contract before merging to main and checking Vercel status.
