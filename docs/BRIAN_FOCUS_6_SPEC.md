# Brian Focus 6.0 — Living Space Edition
Approved 24 October 2026. Source of truth for implementation and QA.

## Goals and non-negotiables
- Focus remains a full-screen, immersive `body` portal. Scene image/video/HTML and a persistent YouTube iframe remain under the existing scene CMS and permission checks.
- Do **not** change Supabase tables, user accounts, gradebook, app heroes, Admin privileges, or existing `canEditFocusScene` authorization.
- Never stop or remount an active YouTube iframe on Focus Close/Open, aesthetic changes, session switches, or minimizing controls. Only explicit user Stop stops the video; Pause is distinct.
- All new preferences are user-scoped *per browser* (localStorage with account key), no cross-account sync promises. Scene publication retains existing backend semantics.
- Existing opening/closing Web Animations API effects, i18n, reduced-motion behavior, Escape, route continuity and tab focus restoration must continue working.

## Navigation hierarchy
- Always-visible composition: full-bleed media; centered selected clock and date; one-line weather; small focus intention (optional).
- Revealable top toolbar: Appearance/Presets, Motion Library, Scene (admin), Timer, Immersive Fullscreen, Close.
- Revealable bottom dock: Timer, Notes, Sound, Background, More. Tool panels are **opt-in**; no crowded always-visible card columns.
- YouTube mini player remains near lower left while its iframe is mounted, and only its *controls* hide on inactivity.
- Hide inactive controls after 5 s, but keep visible while a menu/editor/tool panel/keyboard focus is active.

## 01 — Adaptive Cinematic Background
- Provide Natural, Cinema, Dreamy, Dark presets. Local per-user dimming (0–85), saturation, blur, and contrast adjustments; background-media-only controls do not dim the clock/buttons.
- Tone is computed from stored personal settings; never rewrite the global CMS scene or stored media. Favor readable gradients at extreme brightness.
- An appearance change should not remount media. User can reset to shared-scene defaults.

## 02 — Living Clock Studio
- Existing Classic HTC and Minimal preserved; add HTC Glass and Floating Digital styles.
- User-selectable scale (75–125%), seconds toggle, 12/24-hour format; no extra fetches; central compositional stability.
- Use user's existing local clock with system hour and visibility refresh; never simulate time. Respect reduced-motion on flip transitions.
- Allow style switching without triggering Focus entrance animation.

## 03 — Smart Floating Dock
- User chooses favorites/order, stored per-browser/account. Keyboard accessible controls and tooltip text.
- Dock auto-hides except when a utility panel is active; remains re-openable with movement/keyboard.
- No removal of Notes, Timer, Soundscape or Background controls.

## 04 — Focus Session Pro
- Work (25/5), Deep (50/10), Break (5/15), custom 1–180m. Reuse deadline-based timer hook to avoid timer drift and resume on reopen.
- Keep timer hook mounted in the parent Focus coordinator when overlay closes, so it can continue until user explicitly pauses/resets it; basic per-day completed-session count local only.
- Display accurate countdown and circular progress inside tool panel; completion alert/chime after user starts a session, never automatically start audio.
- Do not claim OS-level notifications when browser permission is absent.

## 05 — YouTube / Media Mini Player
- Reuse `usePersistentFocusYoutube` and current iframe; no duplicate player. Combine Play/Pause based on actual session state, mute/unmute, and explicit Stop.
- Optional compact/expanded layout and repeat only where supported. Do not promise skip/seek/list playback if the underlying iframe service cannot guarantee it.
- Do not remove YouTube titles/branding from embedded content.

## 06 — Ambient Sound Mixer
- Multiple independently adjustable locally synthesized sound layers: white, rain, ocean, wind, forest. No external network media.
- Per-layer level, master gain, start/stop; browser audio gesture required. Soundscape yields to unmuted YouTube by default.
- Clean all oscillators/buffers on Stop/unmount. Never autonomously play.

## 07 — Living Weather
- Enhance current expandable weather row with only factual fields available from existing hook. Add “not available” for absent data; optional city preference only if API supports it.
- Keep refresh button, update timestamp, units, bilingual labels. Do not fabricate forecast data.

## 08 — Focus Notes & Tasks
- Reuse existing per-user notes persistence, add simple checklist and pin selected intention under clock (local browser preference).
- Preserve existing private Supabase note autosave and its user-scoped row-level security. The **new** checklist and custom intention remain local to this browser, without new Supabase tables or writes.
- Do not leak one account's notes into another account.

## 09 — True Immersive Mode
- Explicit fullscreen button using Fullscreen API and graceful browser-denied fallback. Escape exits browser fullscreen first, with Focus close still available.
- Optional hide-all tools mode toggled by a dedicated button/shortcut; moving cursor/tapping reveals controls; respect accessibility and reduce motion.
- Fullscreen is not triggered automatically, only by user gesture.

## 10 — Atmosphere Preset Studio
- Curated Morning Energy, Deep Focus, Rainy Study, Evening Calm, Classroom Display, plus a locally named/saved “Custom” preset. One-click applies personal clock/background settings; Dock order remains separately personalized.
- Save local custom preset; applying does not change shared scene or force background video playback/audio.
- Keyboard accessible and bilingual; preview labels explain what each changes.

## Accessibility, responsiveness, and durability
- WCAG-conscious contrast, semantic buttons, aria-pressed/expanded/live status, visible keyboard focus, reduced-motion CSS, touch hit targets ~44px.
- Small phone 320–480px: no horizontal page scroll; panel scrolls independently and Close always visible. Tablet 768–1100px: responsive tool panels; desktop 1440px fluid composition.
- No new secrets, remote AI, backend migrations, or external runtime dependencies.
- Feature flags/prefs fail safely with blocked localStorage. Distinguish local data from published shared scenes.

## Verification gates
1. Vercel production build READY and alias bound to esl-brian.vercel.app.
2. No React syntax/runtime errors in new components and no unused imports detected during build.
3. Enter and Close animations continue; opening/closing same active YouTube iframe preserves playback until Stop.
4. Switching clock modes/atmosphere does not remount background; tools retain state.
5. Session countdown remains accurate across close/reopen and tab inactivity; notes and preferences persist by user.
6. Test light/dark video, no-video scene, narrow mobile, low-power/reduced-motion, English and Vietnamese labels.
7. Report implemented vs. deferred feature limits precisely, not just optimistic READY.

## Implementation constraints (released core scope)
- YouTube mini player controls the existing persistent iframe: Play/Pause, mute, explicit Stop and open-in-YouTube. YouTube's cross-origin embed restrictions prevent guaranteeing unrestricted seek or arbitrary personal playlists; no duplicate player was introduced.
- Smart Dock reordering uses accessible Up/Down actions in Studio (mobile-safe), not drag-and-drop.
- Focus Session Pro supports manual 25/5 or 50/10 session presets and a daily local completion count. Automatic break sequencing is not implied.
- Living Weather uses the current shared TP.HCM Open-Meteo endpoint and its real six-hour hourly forecast. Account-specific city switching has not been added because it would alter the shared Dashboard source.
- Browser Fullscreen requires a supported browser and a direct user gesture; platform restrictions remain in effect.
- Production READY confirms compilation and existing CI checks; an authenticated visual review on the owner's browser remains a separate acceptance gate.
