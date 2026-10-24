# BRIAN FOCUS 9.0 — SILK FLOW
Approved 2026-10-24. Implement before releasing. No AI integration.

## Invariants (release blockers)
- Keep React Focus root, WAAPI open/close transitions and their persistence unchanged.
- Keep a single persistent background YouTube iframe in BrianFocus, NEVER stop/reload it when Focus overlay closes, when snapshots change, when presenter connects or when the app goes offline. YouTube Stop only from explicit user action, except an already-authorized media shutoff timer.
- Retain V6/V7/V8 browser-stored state keys, private Supabase notes, scene publication authorization and RLS; never migrate, delete or overwrite existing user data.
- Only the signed-in owner can access extra cloud/screen data; no service-role secret, no public anonymous device pairing; projector mode shows sanitized stage-only content, not journal or private notes.
- Responsive desktop/Android/iOS; bilingual VI/EN; reduced-motion and background-tab safe. One uncluttered Silk Flow panel accessible from existing header.

## 01 Smart Performance Autopilot
- Offer Auto/Beautiful/Ultra Smooth. Measure foreground requestAnimationFrame cadence using a rolling window, display observed FPS (measurement—not promised FPS).
- Reduce only decorative canvas density, parallax and translucent glass on consecutive slow windows. Never cap/pause timers, media, or WAAPI Close/Enter. Automatically restore when stable, with hysteresis to avoid oscillation.
- Honor prefers-reduced-motion, device memory and previous V8 manual performance setting.

## 02 Instant Resume & Recovery
- Timestamp and persist lightweight V9 Focus session metadata (scene cue, working intent, relevant timer reference, last-open state) per account locally; never persist auth tokens.
- After unintentional reload show a resume offer; default DOES NOT auto-open Focus or start blocked YouTube audio. Deadline-based timer and V8 scene data are recovered through existing hooks.
- Explicit discard, expire recovery after 24h, detect owner account changes.

## 03 One-Touch Workspace Snapshots
- Save ≤12 named snapshots combining existing V6 appearance, V7 sound recipe/clock/particles/intention and V8 local layout/depth, not admin's published media.
- Preview fields, apply selected snapshot with Undo; do not reset active YouTube iframe or restart the timer. Persistence user-scoped browser.

## 04 Multi-Timer Orbit
- 1–6 independent countdowns with monotonic-ish epoch deadline accounting, start/pause/reset independently and all-at-once, label, optional one selected for projector. Local user-scoped storage.
- Expired timers remain finished and are not auto-restarted; no timers fire audio without user gesture. Original V6/V7 Pomodoro unaffected.

## 05 Dual-Screen Presenter Bridge
- Same-account signed-in presenter/TV using a new RLS-restricted Supabase table `brian_focus_v9_presenter`. Host publishes a sanitized {objective, stage, timer, link} snapshot; viewing requires the SAME authenticated owner, even if link is shared.
- Expiring session max 2h, explicit host Start/End, read-only viewer (no privileged remote commands), bounded polling while visible. Mirror includes countdown using absolute deadline; never private tasks, usernames, media URLs, note content, class data, admin controls.
- Dedicated viewer route handled inside BrianFocus so other routes remain untouched. No silent self-start; show expired/offline state.

## 06 Distraction Shield
- Within Focus hide decorative global floating overlays + suppress nonessential Focus controls; keep Close accessible and role-authorized urgent actions reachable. This does NOT turn off global notification delivery or delete announcements.
- Restore previous state when shield disabled, app route changes or Focus closes.

## 07 Media Continuity Guardian
- Reflect actual persistent YouTube session (mounted/playing/paused/explicitly stopped) and browser online state. Pause/Play/Stop controls reuse current iframe APIs.
- Show actionable warning for offline, missing media, not-mounted player, autoplay restriction when detectable. No periodic iframe reloads, no invented exact buffering signal. Support explicit retry, never automatic destructive reload.

## 08 Focus Quick Capture
- One-input capture for ideas/tasks, keyboard accessible, ≤100 items, user-scoped localStorage; optional classification and mark done; no accidental cross-account writes.
- Works offline, does not replace Supabase notes; optional batch export and delete after confirmation.

## 09 Session Timeline & Rewind
- Append bounded event log (max 500): Focus open/close, timer, stage, snapshot applied, capture, network change. Store only times and type/short safe label, no protected student data.
- Provide filter + JSON/CSV export. Rewind means inspecting historical steps, NOT altering YouTube/current session silently.

## 10 Offline-Ready & Reconnect Shield
- Use localStorage for V9 operations and timers (already local). Detect online/offline and show precise status. Static app cached by browser/PWA only when installed/service worker available; do NOT claim uncached network videos work offline.
- On reconnection refresh actual weather through existing API and allow retry for failed presenter/cloud actions. Never automatically replace cloud data with stale local snapshots.

## QA
- Create new v9 regression script integrated into npm build after V6–V8 suites; assert normalization and per-user isolation, 6 timers, stable snapshot restore, allowed events, expiry, sanitized presenter payload, offline behavior, preservation of old timers & iframe and WAAPI functions.
- Vercel production must READY with current exact commit and esl-brian.vercel.app alias. The status alone doesn't constitute signed-in browser E2E on Mac/Android/iOS.
- Desktop Chrome 1440, Android 360, iPhone 390 and reduced-motion test checklists with known untested dimensions disclosed.
