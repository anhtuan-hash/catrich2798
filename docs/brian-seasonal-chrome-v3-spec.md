# BRIAN Seasonal Chrome 3.0 — Halloween Navigation + Footer
**Status:** User-approved visual refinement from 28 October 2026. Implemented only for the two existing Admin-enabled seasonal surfaces.

## 1. Problem statement / visual quality review
The previous Halloween navbar received **6.3/10**: nine different pastel pill colors competed, despite sufficient text contrast, and the night illustration was visually louder than navigation content. The previous footer received **7.1/10**: three oversized/uneven illustrated cards lacked a shared palette and the deep purple margin below them was unusually tall. At wide desktop sizes, the right floating tools dock could overlap the last credential lines.

**Target:** a quiet, premium Halloween treatment (aim `>=9/10` in subjective visual review, not an automatically guaranteed score). Resolve composition before adding more decoration.

## 2. Non-negotiable scope / behavior
- Preserve **both independent Admin switches** `bes_navigation_theme_settings.halloween_enabled` and `halloween_footer_enabled`. Keep existing auth-only Admin RPCs, Supabase RLS, anonymous reads, realtime and refresh behavior. No migration and no new SaaS fees.
- All seasonal styles must require `data-halloween-nav="true"` or `data-halloween-footer="true"`. OFF = the full original styles, not an approximated alternate theme.
- Keep brand logos, every menu action, notifications/roles, school and professional information, Portfolio iframe button, slideshow and Hero unchanged.
- No new dependencies, audio, scroll tracking, layout-shifting animations, external image requests, or changing original card content. Mobile follows existing stacking rules.
- Global Halloween atmosphere floating icons, if enabled elsewhere, must remain behind the footer instead of covering text.

## 3. Unified design tokens — scoped to seasonal surfaces
| Token | Value | Usage |
| --- | --- | --- |
| Midnight | `#171327` | Navbar/outer footer |
| Deep plum | `#2a1b3c` | Night gradient |
| Warm ivory | `#fff8f0` | Resting navbar pills |
| Deep ink | `#302638` | Pill/caption text |
| Pumpkin | `#f4aa64` | Active route and focused controls |
| Copper line | `rgba(213,155,114,.40)` | Frame/card outline |
| Brand parchment | `#fff1e3` | Card 1 |
| Profile mist | `#f4edfa` | Card 2 |
| Credentials cream | `#fff2e5` | Card 3 |

No glossy gradients or per-route hue lottery in Halloween mode. Use subtle inset lines/shadows, 1px borders and clear focus-visible indication.

## 4. Navbar acceptance specification
1. Full navbar background: dimmed Halloween art (moon/bats remain recognizable, visually secondary), top-to-bottom calm midnight/plum overlay. No additional animated stickers.
2. All **nine** primary destination buttons share **one warm ivory resting color**, one deep ink text color, one border color, same existing shape/height/padding. Hover: light peach. Active route: amber-orange, dark ink, visible copper ring. All normal labels target WCAG AA >= 4.5:1; test AA and stricter 7:1 where feasible.
3. Do **not** recolor unread counters, role/approval badges, time/date status or other function-specific chips. These encode real information.
4. Preserve brand readability, login/account controls and critical utility action buttons. Never recolor icons via filter that removes their meaning.
5. Desktop 1280/1440/1680: no layout-height changes and no new line wrapping. Mobile 390px: original touch target sizes and menu functionality remain.
6. Uses only CSS under the existing navbar attribute; the Admin OFF state skips the entire new stylesheet.

## 5. Footer acceptance specification
1. Footer panel: compact quiet plum frame, soft amber corners. **Remove dead space** below the three cards by decreasing footer bottom padding in Halloween mode only, keeping enough room for the real Portfolio trigger and signoff.
2. Three illustrated backgrounds stay **inside** their own cards, not atop the page. Card 1: warm parchment with small corner web and pumpkin. Card 2: soft violet pearl with tiny bat/ghost. Card 3: apricot cream with restrained edge motif. Reduce illustrations' visual dominance through subtle translucent overlay/mask layer *in the background paint*, never in foreground over text.
3. All three cards share the same radius, border-opacity, shadow style, height behavior and internal breathing room. Keep original institutional logos fully opaque and unaltered.
4. Typography: text `#3c3147` or darker; brand heading, profile name and credential heading remain distinct; divider lines subtle. Contrast against a light cream card target AA.
5. Portfolio badge is a clear centered action under the cards. Signoff `Teach Better Together ♡` stays visible at the lower right, not hidden by clipping or floating tools.
6. Right-side floating utility dock: at wide desktop widths reserve a right **content** safe zone inside the credentials card, without moving the three cards or changing global dock behavior. Leave enough text width for names/credentials. Check 1440/1536.
7. <=1040: preserve existing grid/card sizing and reduce safe-zone inset; <=720: three vertically stacked cards, natural height, safe padding. Never cause horizontal scrolling.
8. Avoid pseudo-elements overlaying logos/labels. Keep seasonal footer stacking context above global decorative motifs (but not modal/nav).

## 6. Source organization and rollout
- Add `HalloweenNavigationRefinement.css` imported **after** `HalloweenNavigationSkin.css` only through `GlobalFlatNavigation.jsx`.
- Add `HalloweenFooterRefinement.css` imported **after** `HalloweenFooterSkin.css` only through `Footer.jsx`.
- Keep existing cards’ original SVG illustration files; tone them down with paint-layer gradients, not editing real school logos or creating fake credentials.
- Neither stylesheet may include unscoped `body`, `:root`, `.app-shell` overrides or any rule targeting Hero/slideshow.
- Build the exact Vercel production-release script before merging. GitHub CI: source scope regression + real Chromium navbar/footer on/off, geometry, colors, three cards, Portfolio, responsiveness and reduced-motion. Verify deployed SHA using GitHub Vercel commit status.
- Accept rollback by switching both Admin toggles OFF; fallback through GitHub revert if post-release QA identifies regressions.

## 7. Definition of done
- Halloween ON: cohesive ivory nav pills with exactly one pumpkin active accent; refined quiet outer footer and three harmonized cards.
- Halloween OFF: computed original background properties restored precisely on desktop and mobile.
- No recorded content/functional losses. No per-device local override of the Admin's site-wide setting.
- Document any remaining fixed-overlay limitations rather than claiming unverified live-browser outcomes.
