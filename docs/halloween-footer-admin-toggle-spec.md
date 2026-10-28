# BRIAN Halloween Footer — Admin-controlled site-wide seasonal appearance

Date: 2026-10-28. Scope: main app footer only.

## Goals
- Match the seasonal Halloween navigation while retaining the existing Footer content and interactions.
- Keep all 3 existing cards (original school logos, profile, credentials), affiliation badges, portfolio trigger and Framer dialog unchanged in structure, navigation and accessible semantics.
- Add a richly illustrated dark indigo/violet footer background with moon, stars, bats, haunted castle and pumpkins. Apply warm orange accent and parchment/lilac/pumpkin card surfaces for readable text, preserve student/school logos unchanged.
- Mobile/footer responsiveness and exact card geometry must remain unchanged. Avoid decorative overlays over text, no audio/autoplay, honor reduced motion.
- This is completely independent from the **navbar** Halloween toggle. Guest/teacher/TTCM may see the footer theme but cannot update the setting.

## Admin UX
Cài đặt → Điều hướng → Nền Halloween cho footer. Separate checkbox-like role=switch (approved Admin only).
- ON: Halloween footer visible for all visitors, seeded ON at install.
- OFF: footer `data-halloween-footer="false"`; seasonal CSS selectors no longer match, restoring exact source CSS without changes to branding or layout.
- Show server-confirmed state and errors, disabled until Supabase load resolves. No optimistic writes.
- No impact on HTML body, Hero, slideshow or navbar controls.
- No expiry timer; user controls it at any time.

## Data and authorization
- Reuse singleton `public.bes_navigation_theme_settings` (already anon-readable with RLS): new boolean column `halloween_footer_enabled DEFAULT TRUE`.
- New function `bes_set_halloween_footer_enabled(p_enabled boolean)`: SECURITY DEFINER fixed search path, auth.uid() and approved Admin role from `public.profiles`, execute grant only to authenticated; no client-side direct writes.
- Public hook reads footer value only; independent caching, timestamp reconciliation, Realtime, focus, visibility events and 30s reconciliation.
- Existing `bes_set_halloween_navbar_enabled` RPC and `halloween_enabled` column unchanged.
- SVG served as an original local asset, no external services/dependencies or paid functions.

## Tests
- SQL permissions and admin-only function guard.
- Footer attr controls only Footer; viewer functionality and roles intact.
- Browser ON→OFF→ON computed style, no layout size shift, logos/Portfolio clickable, original Hero untouched, mobile arrangement stable.
- Vercel production release build and independent GitHub QA; verify Vercel deployment of merged main.
