# BRIAN FOCUS 8.0 — AMBIENT OS
Approved October 24, 2026. Implementation contract. No AI integration.

## Invariants & rollback
- Preserve the 6.0/7.0 feature state, local user preferences, Supabase private notes, scene publication rights, all app routes, and existing Focus WAAPI enter/exit. Do not mutate unrelated Dashboard, attendance, assessment, gradebook or admin permissions.
- The persistent YouTube iframe belongs to BrianFocus (outside FocusOverlay). No scene filter/layout/fullscreen/toolbar action may remount it. Only user-selected video switch or explicit Stop may replace its media source; Close/Open never pauses or stops it.
- No service_role key in browser. Backend changes require authenticated per-user RLS and verified permissions; never treat an unverified remote pairing token as authentication.
- Screens stay dark, restrained and legible. One header affordance “Ambient OS”, optional panels. Keyboard accessibility, reduced-motion support, mobile safe areas.

## Architecture
- Preserve BrianFocus parent as source of truth for scene, player, timer, flow, session summary. Add a separate useFocus8Data(accountId) with strict input normalization and browser-local persistence; never modify V6/V7 localStorage keys.
- New Focus8Studio is an opt-in ten-tab sheet, mounted within overlay, not 10 floating buttons.
- Focus8 overlays are purely visual, pointer-events none except Edit Layout handles; performance capped for depth effects.
- Existing Focus7 weather/clock, notes/mixer and standalone timer remain connected. UI transitions and YouTube media must not remount when V8 settings change.

## 01 Cinematic Scene Director
- Personal timeline of up to eight atmosphere cue cards, type (dawn/golden/rain/twilight/midnight/off), durations 1–180 min. Start/Stop/Next/Pause. A stage cue changes only local visual mood; never shared CMS source/media URL.
- Reorder cues; show remaining time from absolute deadline; restore after tab pause. No automatic YouTube change.

## 02 Freeform Layout Composer
- Live drag handles for clock, weather, bottom Dock, optional timer display, with normalized x/y (%) positions, snap-to-grid (5%), keyboard arrow nudge, Reset and Undo/Redo. Stored independently for desktop/tablet/mobile; on TV use desktop preset.
- Edit mode alone enables pointer events. Normal Focus stays interaction-friendly and avoids overlay dragging. Avoid preventing Close.
- Resize and orientation clamp layout. Touch dragging via Pointer Events.
 
## 03 Dynamic Depth Engine
- Off/Subtle/Standard intensity; CSS perspective and requestAnimationFrame? Prefer passive pointer-move transform on decorative layers (not media iframe); capped 10px, reduced-motion/low-power disables.
- No synthetic media reload or costly per-frame image processing.

## 04 Focus Automation Recipes
- Deterministic local action graph: triggers (manual focus start, work->break, flow complete) and actions (select atmosphere, enable/disable particles, open journal, change clock). Explicit opt-in per rule, preview “Test”, reversible actions, no arbitrary JS evaluation.
- Never auto-play media/audio, escalate permissions or change shared scene.

## 05 Focus Companion Remote
- Authenticated, expiring remote control requires backend-authorized pairing and distinct-device channels. QR must never encode a login token or permit unauthenticated privileged commands. If existing safe backend schema/Realtime unavailable, feature stays explicitly unavailable with explanation, not simulation. Do not claim remote works based on BroadcastChannel on one device.

## 06 Classroom Stage Director
- Existing classroom privacy mode expanded with editable lesson objective, phases and countdown, QR only for teacher-supplied https learning URL, announcement banner, next-stage command. Current student/private notes, usernames, weather location, journal, admin editor hidden in projector view.
- Stage content persists locally per user, **not** shared without publication.

## 07 Sonic Atmosphere Engine
- Reuse existing spatial mixer (single AudioContext) with named recipes and five layers, fade gain in/out after explicit audio start, dedicated fade-time slider, safe Stop/disconnect. No recording/mic; honor YouTube unmute ducking and browser audio-gesture restrictions.
- No second mixer instance.

## 08 Focus Memory & Insights Pro
- Reuse Focus7 completed session events and journal (no made-up history), filter recent week/month, goals, export CSV + JSON; privacy-safe delete with explicit action. Monthly chart from existing completed sessions.

## 09 Personal Atmosphere Cloud Vault
- Cloud sync of V8 settings and (opt-in) profile/recipes only under authenticated owner RLS. Include export/import JSON fallback. No blind writes or new public tables. Implement only if a secure existing backend mapping is verified. Never overwrite published scene.
- Version field and conflict handling; user explicitly clicks Backup/Restore.

## 10 Universal Focus Command Center
- Ctrl/Cmd+K opens a compact searchable command palette when Focus is open. Keyboard arrows/Enter/Escape, accessible labels, commands for timer, stage, scene mood, clock, Studio tab and Close. No eval/AI; command registry is whitelisted.
- Shortcut should not intercept native input fields unless explicitly invoked with Cmd/Ctrl K.

## QA gates
1. 6.0/7.0 regression scripts and V8 new functional checks pass; vite production build READY with matching SHA and production alias.
2. One YouTube iframe remains mounted after Focus Close/Open and V8 panel/config changes. Nothing automatically stops video.
3. Session ownership and local keys kept separate across account switch.
4. Test flow/cues, drag/clamp/undo, command filtering, CSV/JSON export, projector privacy and media safeguards.
5. Test desktop/mobile breakpoints and reduced motion; explicitly report any device-level verification not performed.
6. Security features are feature-gated until real authorized backend + expiry/revocation is available; avoid fake pairing or sync controls.
