# BRIAN Photo Story — Halloween Showcase Skin (v1.0)
Date: 2026-10-28
Status: Approved mockup; implementation scoped to published slideshow on BRIAN homepage.

## 1. Scope and activation
- Apply only to `HomePublishedSlideshow` and only when the currently selected published album slug or title contains the word `Halloween` (case-insensitive).
- Put `data-halloween-theme="true"` on the slideshow root. All theme selectors must include `.app-shell[data-route="home"] .bhs-home[data-halloween-theme="true"]`.
- Preserve base style for all other slideshow albums, and preserve the independent full-gallery route's existing cinema design.
- Do not style the site header, menus, hero, floating dock, dashboard, attendance, other cards, or global `body`. Do not use global CSS variables or body background changes.
- If the Halloween album is unpublished, render no slideshow at all, using the existing Supabase published-only query.

## 2. Approved visual system
- Palette: `#080d21` midnight, `#160d32` indigo, `#2d1349` violet, `#ff8c38` pumpkin, `#ffb863` amber, `#cbb8ff` moonlight lilac, `#f6efff` text.
- Atmospheric decoration: one original lightweight local vector scene of stars, moon, bats, gothic towers, fog and pumpkins, all decorative and non-interactive.
- Top heading: BRIAN PHOTO STORY · ĐANG TRÌNH CHIẾU, orange glowing album name, readable introduction and clickable QRvote hyperlink; outlined pumpkin orange gallery CTA.
- Desktop exhibition: information panel on LEFT (roughly 30%) and painting on RIGHT (70%). Left: slide count, previous/next, group name and full original caption. Right: original artwork perfectly contained (`object-fit:contain`), cinematic borders, progress, play/pause, fullscreen and previous/next controls.
- Do NOT reintroduce removed fields (Collection, Interval, Transition) or Read introduction button. Keep album descriptions at 2 lines on homepage and retain clickable external links.
- Mobile (<= 860 px): artwork first, caption card beneath. At <=520 px use compact font sizing, keep links keyboard accessible and no horizontal overflow. Fullscreen keeps safe art inset and controls.
- Decorative fog/pumpkin/webs do not block the painting, buttons or links.

## 3. Motion, accessibility and performance
- CSS-only subtle ambient background and slow hovering decorations; not animated paint distortion, no flashes and no audio.
- Honor `prefers-reduced-motion: reduce`; decorative motion disabled.
- Keep existing decoded two-layer slide transitions and existing image-safe viewport unaffected.
- Decorative SVG bundled locally under public/assets/slideshow; no external requests, font downloads, animation libraries or new dependencies.
- Visible contrast for captions and links; :focus-visible outline; `pointer-events:none` on all decoration.
- Do not hide guest playback and QRvote link functionality.

## 4. Safety, data and production
- Read published albums/slides through existing RLS unchanged. No Supabase migration.
- No changes to `main.jsx`, global navigation, Hero, homepage cards, or user permissions.
- Tests: scoped selectors only; Halloween and normal album activation; retained no-crop, intro link, playback, public access, non-Halloween styles; Vite production build + Chromium responsive/animation regression.
- Deploy through GitHub feature PR and confirm Vercel Production commit status.