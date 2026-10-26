# BRIAN INSTANT TOOLS — Wave 2 technical design

## Scope
Five ready-to-use Portal utilities added to the existing Toolbox: Spotlight, Big Text, Teleprompter, Reveal Cards and Sound FX. Existing wave-1 tools stay intact; the launcher, access control and role-adaptive Focus/Board/Approvals/AI stack must not change. No AI, paid APIs, new npm dependencies, Supabase tables, storage buckets or network calls.

## Integration
- Register five cards in `BrianInstantTools.jsx`, reuse current Portal, Material 3 typography, VI/EN translations, sound toggle and the user-keyed localStorage state.
- Implement Wave 2 as a separate `BrianInstantToolsWave2.jsx` and separately scoped `BrianInstantToolsWave2.css` for low regression risk. Only inject it in the existing Portal for five new tool IDs.
- Extend `initialState` and `sanitizeState` in `instantToolsCore.mjs` to accept the five new state sections while keeping the `version:1` envelope and backwards-compatibility with previously saved wave-1 sessions. Bound all text, names, count, sizes and numbers on input **and on restore**.
- State writes remain on the current browser only; no cross-device sync promise. The component is keyed by authenticated user ID; logout unmounts it.
- No unsafe HTML rendering, no iframe/third-party embeds, no microphone/permissions, no backend gradebook or academic data mutations. No AI.

## 06 Spotlight
- First tap opens configuration with circle radius 90–260px and adjustable dim strength. `Activate Spotlight` minimizes the Toolbox Portal and creates a separate browser-viewport spotlight layer above the current Brian page.
- The layer masks the page outside a movable clear circular region using CSS radial-gradient. Pointer/mouse/touch move the circle; Escape or `Exit Spotlight` exits. Stop propagation and clean up listeners on unmount; do not leave a blocking overlay after route/user changes.
- Preserve radius/opacity, but do not persist `active` after refresh or sign out. Never capture the screen or request screen-sharing permission.

## 07 Big Text
- Ready default phrase, user-entered text up to 400 characters, font size 52–220px, dark/light/neon stages, centered multiline wrapping.
- Presentation canvas takes the large half of the Portal; `Present` opens a fullscreen-style in-page overlay with tap-to-close affordance and Escape dismissal. Accessible `role=dialog`, no native fullscreen permission required. Store text/theme/size but not open overlay.

## 08 Teleprompter
- Editable script up to 12,000 characters with a default English classroom script. Adjustable 12–80 px font, scrolling speed 12–160 px/sec, mirror mode and light/dark display.
- Start/pause/reset controlled by `requestAnimationFrame` timestamp delta; cancel on pause/unmount/hidden browser tab. Keep scroll offset in component when switching between play and pause, but persistence guarantees text/settings only; reopening starts paused. Press `R` for reset while tool visible when not typing.
- Prevent accessibility motion violation: never auto-scroll on opening; default is paused and respects reduced-motion preference.

## 09 Reveal Cards
- One entry per line, default six demo cards, up to 24 cards with 120 chars per item. Teacher enters data and clicks Apply; cards start face down. Tap to reveal/hide one card, `Reveal all` and `Hide all`; keyboard activation via actual `<button>` elements.
- Save card contents and revealed indices in user-specific localStorage; applying a new list clears reveals, with a consistent 1-based display.

## 10 Sound FX
- 12 clearly labelled synthesised audio cues: Bell, Applause, Drum, Correct, Incorrect, Whistle, Pop, Countdown, Victory, Attention, Magic, Halloween.
- Synthesise sound locally with the Web Audio API after a direct user click. No external audio files, imports, fetches, third-party analytics or subscriptions. Master sound toggle from wave-1 applies to wave-2 sounds. Volume adjustable 0–100%, stored per user. Sound off means no playback. Browser AudioContext restrictions are handled without blocking the interface.
- No looping that continues after Portal closes, tab deactivation or logout. Any long cue is time-bounded and optional.

## UX and testing
- Portal 10-card library remains responsive at 3/2/1 columns; PWA and mobile scrolling retain safe-area support. Controls >=44px when practical. A single Toolbox launcher remains in same location.
- Full-screen suboverlays must close independently, then return to their tool; Escape dismisses active suboverlay before dismissing the Portal.
- Add pure helper validation tests, browser checks on Chrome Desktop, Pixel Chromium and iPhone WebKit emulation; smoke prior five cards. Test storing and restoring wave-1 state, role switching, bilingual text, spotlight exit and sound-off behavior.
- Report GitHub PR and build checks, verify exact Vercel Production SHA and READY before claiming deployment.