# BRIAN FOCUS 7.0 — LIVING ATELIER
Date: 2026-10-24 · Approved scope: 10 requested upgrades · Implementation specification

## Core invariants / protection
1. No database migration, no alteration to homeroom, gradebook, Dashboard or shared Focus scene schema. `canEditFocusScene` must continue to govern shared background publication.
2. Existing personal V6 appearance, timers, local task list and protected Supabase notes remain readable, with new V7 settings in independent per-user browser keys.
3. Persistent YouTube iframe is owned by `BrianFocus` through `usePersistentFocusYoutube`. Overlay close/reopen must **not unmount or pause** it. Only explicit Stop or an explicit change of video may replace it; stop/playlist selection are never automatic on Focus close.
4. Existing WAAPI opening/closing transitions, Escape/keyboard controls, bilingual content, fullscreen and reduced-motion pathways stay operational.
5. Visual hierarchy: edge-to-edge existing photo/video/YouTube; unobtrusive clock/weather center; invisible dock and opt-in panels; classroom mode hides private data.

## 01 Cinematic Atmosphere Director
- V7 account-scoped palette: dawn, golden, rain, twilight, midnight and auto, with editable tint strength 0–40%.
- Auto uses device *local time* (with morning/afternoon/evening windows). It never fabricates or forces live meteorology.
- Display effect is a non-interactive gradient layer inside Focus **above the media and below the clock**; no write to shared Supabase scene, no replacement of YouTube iframe.
- User can turn it off. Supports video, image, HTML, default and persistent YouTube scenes.

## 02 Signature Clock Atelier
- Extend existing V6 styles without breaking Sense/Glass/Minimal/Floating.
- New styles: Kyoto, Swiss, Aurora and Liquid; adjustable font weight/color/letter spacing; built-in CSS/system fonts only.
- Use existing system time and clock hook, not hard-coded time. Retain 12/24h and seconds toggles.
- Style/scale switch must not remount media or trigger Focus opening animation.

## 03 Focus Flow Designer
- Reuse deadline-based V6 `useFocusTimer` running in parent even when Focus overlay closed.
- Sequence presets: 25/5×4, 50/10×2, Custom Work/Rest/Repeats (work/rest minutes 1–180).
- **Only start a flow after user clicks Start**. On completing a phase, advance to next planned phase from the parent coordinator. No auto audio unless user initiated.
- Persist active flow state and deadlines by account/browser. Pausing/Resetting timer must not silently run a new phase; phase transitions produce a bounded visual announcement.
- Existing standalone timer remains accessible.

## 04 Invisible Smart Dock
- Existing four favorite tools + More preserved. Add optional dock compact mode with expand-on-hover/keyboard focus, tooltips, and DnD reorder on desktop (Up/Down buttons on touch/keyboard).
- Auto-hide uses V6 5-second controls policy. Floating controls never obstruct Close and pointer focus.

## 05 Living Particle Engine
- Opt-in fixed canvas/CSS scene overlay for 6 modes: off, dust, fireflies, rain-on-glass, snow, leaves, fog.
- Animation uses requestAnimationFrame with capped density (low/medium/high), ResizeObserver or resize handler, visibility pause, devicePixelRatio cap 2, canvas pointer-events none.
- No audio, no remote image loads. Respect prefers-reduced-motion and low performance by disabling active particle animation.

## 06 Spatial Soundscape 2.0
- Preserve V6 five-layer mixer and master gain. Per-layer stereo pan (-1..1) via StereoPannerNode when browser supports it; safe fallback to centered mono.
- Save user-defined mix names and settings locally. Start only on a user gesture. Stop always releases Web Audio resources, and unmuted YouTube continues to duck/mute soundscape.
- No additional network, AI, or licensed external tracks.

## 07 Cinema Media Studio
- No second YouTube iframe. Mini player gains local favorites list (validated YouTube video links/IDs, capped 15), explicit previous/next selection and Stop-after timer.
- A user's *explicitly selected* personal video may replace current scene's YouTube source only within their session. Admin scene remains unchanged; restore admin shared scene when personal override removed.
- Playback across Focus Close/Open remains mounted. Explicit Stop is the only automatic teardown outside deliberate video switch.
- YouTube autoplay / native overlay and restricted seek remain platform-limited, never claimed otherwise.

## 08 Focus Journal & Rituals
- Before focus: optional intention field; after a manually completed work phase: one-click journal entry, mood tag, reflection. Use local account-scoped entries (max 365), no new Supabase writes.
- Continue existing Supabase private notes and V6 local checklist unchanged. Prevent cross-account leakage and support deletion.

## 09 Focus Insights & Personal Trends
- Append only completed *work* sessions, using accurate minutes and date to V7 local event log, max 1000. Reuse existing V6 count for continuity, avoid double count for breaks.
- 7-day minutes histogram, sessions completed, streak, total minutes. Do not fabricate historical V6 durations; older aggregate counts remain separate.
- Insights available in opted-in panel, not as intrusive permanent dashboard.

## 10 Classroom & Presentation Mode
- One button toggles classroom privacy mode: clock/date/timer may remain, but personal tasks, Journal/Insights, intention, weather location, active media overlays, and admin scene edit tools are hidden.
- Large legible clock scale for screen/TV; teacher controls return when leaving this mode. Password/admin privileges unaffected.
- Do NOT expose student records in Focus or write classroom presentation state globally; local session only, reverts on next open.

## Interaction contract & acceptance
- Add Focus7 Studio as nested tabs in the existing appearance flyout or a Focus Tools sheet, not a new permanent toolbar.
- On mobile (<640px): safe-area controls, scrollable tool sheet, Close always reachable, no horizontal body overflow.
- New text VI/EN, tab/focus states, accessible aria labels, reduced motion and performance limits.
- Tests: preference normalization; clock variants, media URL validation; active flow deadlines across Close, journal and stats isolation, particle cleanup; playlist explicit source switch; YouTube continuity; WAAPI enter/exit.
- Vercel build must finish READY and alias esl-brian.vercel.app; do not claim browser-session QA if not run.
