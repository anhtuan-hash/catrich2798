# BRIAN INSTANT TOOLS — WAVE 4 / FINAL — Technical Specification

## Scope and compatibility
Extend the **same** authenticated Toolbox bubble / Brian Instant Tools Portal from 15 to 20 utilities. New modules: Group Maker, Noise Meter, Buzzer, Reaction Timer, Class Bell. Preserve the first 15 tools, Focus, Board, AI Chat, approvals/role guards, Supabase and shared dock. No additional bubble, AI, Supabase schema/network calls, third-party NPM dependencies or paid platform services. Save strictly local browser state under existing per-user key `bes:instant-tools:v1:<user_id>` using the existing version=1 envelope; previous Wave 1–3 payloads must roundtrip unchanged.

## Components and behavior
- `instantToolsWave4Core.mjs`: pure data validation, bounded storage, Fisher–Yates fair group shuffling, microphone dBFS transform, buzzer/team and reaction result sanitization, local phase timer catch-up. All sanitization is allowlisted.
- `BrianInstantToolsWave4.jsx/.css`: module-local utilities mounted only when selected; no changes to Focus, Board and other widgets. Inherit shared VI/EN language, audio switch, browser-local persistence, Portal frame and responsive design. Browser audio is only activated from interaction when possible.
- Portal records exact library size of **20** and `04 / 04` status. Group Maker names and answer lists are user-entered and never transmitted.

### 16. Group Maker
- Enter names, one per line, at most 80 unique, each capped to 55 chars, case-insensitive dedupe.
- Teacher chooses 2–8 groups and runs a Fisher–Yates shuffle using Web Crypto rejection sampling when available.
- Assign each input exactly once to groups by balanced round-robin; group sizes differ by at most one.
- Reshuffle, view colorful numbered group cards, copy results using browser clipboard (graceful permission failure). Changes to roster/count clear obsolete groups. Groups and input restored per teacher/browser.

### 17. Noise Meter
- Obtain audio solely after user clicks Enable Microphone. Uses `getUserMedia`, `AudioContext`, `AnalyserNode` and RMS-to-dBFS, with visible bar, numerical dBFS, adjustable warning threshold. No MediaRecorder, recording, backend post, data retention of samples, or remote audio playback.
- Clearly disclose **dBFS relative level**, not calibrated environmental decibels/dB SPL. A quiet room is not objectively 0 dB SPL.
- Fully stop media tracks and cancel animation on manual Stop, changing tools, closing Portal, loss of page visibility or component unmount. Handle denied/unavailable/unsupported microphone and insecure context.
- On mobile WebKit/iOS audio requires permissions and a secure context; physical-device QA is required and cannot be inferred from emulators.

### 18. Buzzer
- 2–8 locally editable teams. Tap any large team button or keys 1–8 (excluding input focus); only the first team wins until a new round.
- The winner is displayed prominently, remaining buttons lock, win sound plays when enabled and permitted, and New Round clears the lock. Per-browser team names and winner are persisted.
- Explicitly **single-screen only**; no false claim of fair multi-phone distributed synchronization.

### 19. Reaction Timer
- Explicit Start -> randomized 1.3–4 seconds red "Wait" -> green "Tap now" -> milliseconds from `performance.now()`.
- Early input is a false start and not scored. Green tap records the last score and personal best, preserving up to 12 results. Keyboard Space/Enter works while input fields are not focused.
- Closing/unmount/hidden-page cancels the pending timeout; no timers run after leave.

### 20. Class Bell
- Up to eight phases with local editable labels and durations from 10 to 3600 seconds each.
- Live mm:ss count using absolute `endsAt`, with pause/resume, jump to next, reset, manual Ring Bell, progress indicator and auto-advance/ring (while visible with permitted Web Audio).
- Catch up deterministically if tab slept without stacking overdue alarms. No background timers/push notifications, server sync or false promise of bells while the page is closed.
- Settings and current phase persist locally. Only when browser keeps page active and audio is enabled should bell sound be expected.

## Security, usability and test requirements
- UTF-8/Unicode names rendered as plain JSX text. No `eval`, arbitrary JavaScript execution, `dangerouslySetInnerHTML`, fetching external URLs or new services.
- Caps on user-entered text and arrays to prevent localStorage runaway. Per-account segregation and no student/master database writes.
- Accessible labels/status, large targets, mobile 520/800px breakpoints and reduced-motion safe styles.
- Add pure regressions to npm build and GitHub browser UAT; update Wave 1–3 fixed 15-card assertions to 20. Include desktop Chromium, emulated Pixel Chromium, emulated iPhone WebKit. Re-verify preview build then Production only after checks pass.
- Genuine iOS/iPad Safari microphone permission, speaker volume, latency and gesture audio must be tested on physical devices separately.

## Ship criteria
20 tool cards available from the original global Toolbox bubble, all older tools preserved, build/test passes, preview READY, merged PR and Production READY verified against the intended commit. If any check is unavailable, report as unverified rather than implying success.
