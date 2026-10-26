# Brian Instant Tools — Wave 4 (final) Technical Specification

**Target:** final 5 instant utilities added to the authenticated ESL Brian floating Toolbox: Group Maker, Noise Meter, Buzzer, Reaction Timer and Class Bell. One existing launcher, 20 tools total. No AI, no paid services, no cloud backend writes, no additional packages or role changes.

## 16 Group Maker
- Input 2–120 names manually, one per line (trim, case-insensitive deduplicate, max 60 chars/name); default 16 neutral participant labels for instant demo.
- Choose 2–8 groups and tap Mix. Fisher–Yates uniform shuffle using rejection-sampling Web Crypto with a Math.random fallback only when secure randomness unavailable; round-robin dealing gives group size difference at most one. Preserve last grouping locally per browser account, reset when changing names.
- Animated entrance (respect reduced motion), copy grouping to clipboard. **No student roster is fetched** or transmitted. Can work completely offline.

## 17 Noise Meter
- Button **Start microphone** explicitly calls `navigator.mediaDevices.getUserMedia({audio:true})`, only in secure contexts with permission. Use Web Audio `AnalyserNode` to compute relative microphone RMS and show 0–100 relative level, not fabricated dB SPL. Threshold adjustable from 15 to 85, progress colored green/amber/red and optional local visual warning. No audio capture/upload/recording.
- **Stop** tears down all `MediaStreamTrack` tracks, disconnects nodes, cancels animation frames. Cleanup on Portal close/minimize, switch to another tool, route/user unmount and tab visibility change. Refuse when denied/unavailable with bilingual notice; no persistent micro permission prompts. Never claim calibrated physical noise or fixed accurate dB.

## 18 Buzzer
- Immediate **single-screen** 2–8 team game: team buttons are visible on shared smartboard/TV; first tap wins and locks all others. "Arm next round" unlocks, round index increments; short local audio cue (respect global sound and user's gesture); optional answer/correct feedback, no cross-device network claims.
- Persist team labels and scores plus historical winner. Never persist an armed/locked state across refresh; teacher explicitly arms. Fairness applies to event order on one browser; **not a multi-device buzzer room**. This choice keeps Wave4 zero cost and avoids falsely promising synchronized latency on remote phones.

## 19 Reaction Timer
- One-screen reaction challenge: button starts a randomly delayed (1.5–4 seconds) green target; taps while waiting are false starts with clear feedback and no score. When ready, measure `performance.now()` delta in milliseconds; retain last 10 results, show best and most recent.
- Timer and listeners cleanup when tool unmounts or Portal closes. No results produced automatically when tab hidden; visibility change cancels current round. Accessible status text, reduced-motion safe. Synthetic test-only randomness can verify window without real waits.

## 20 Class Bell
- Four instant sounds (Attention / Start / Transition / Finish) via Web Audio synthesis, no files or external services. Buttons use global Toolbox sound setting; user-adjustable duration and volume stored browser-local. Auto-stop each cue at bounded length; no auto-alarm, no background scheduling, no notifications. Provides visual acknowledgement even on muted browsers.

## Shared Architecture
- Create `src/components/BrianInstantTools/BrianInstantToolsWave4.jsx` and isolated CSS and pure core modules. Register in existing Toolbox `LIBRARY`; count 20, Wave 4 footer. Do not edit Brian Focus, Teaching Board, chatbot or permission control CSS/handlers.
- Extend `initialState` and `sanitizeState` compatibly under current version-1 localStorage envelope. Bound all restored values. No `dangerouslySetInnerHTML`, eval, network fetch, new Supabase resources or AI.
- Visible UI fully VI/EN; responsive 3/2/1 tool library grid, mobile min touch 44px, no horizontal overflow, TV-friendly outputs. Respect preferred reduced motion, permission-denied handling.
- Automated pure-function tests for group balance/randomness, input sanitization, Buzzer locking, reaction windows and state defaults. Browser acceptance on Chrome Desktop, Android Chromium emulation and iPhone WebKit emulation; fake getUserMedia only in fixture, assert cleanup. Existing 15-tool tests retained and updated to expect 20 cards.
- Vercel Preview READY, 3-browser UAT pass and Production READY matching merge SHA required before claiming release. Check no-cost guarantees; self-hosted GitHub Actions use current available minutes only.
