# BRIAN INSTANT TOOLS · Wave 1 — Technical specification

**Version:** v1.0 • **Scope:** five self-contained, instantly usable tools inside an always-available floating launcher • **AI:** none • **New paid infrastructure:** none • **Backend writes:** none.

## Architecture / deployment boundaries

- React 19 + Vite, lazy-loaded \`BrianInstantTools.jsx\` mounted alongside existing \`BrianFocus\`, \`BrianBoard\`, \`SharedChatbotDrawer\`, \`PermissionApprovalInbox\` in \`src/main.jsx\`. It inherits \`currentUser\` and \`language\`. Never mount on login, register, setup, shared pupil pages or unauthorized routes.
- Its **own launcher** sits to the LEFT of the current AI launcher on the bottom row, not inserted into the already role-adaptive vertical stack. Existing Board / Focus / approval / AI positions and their own handlers remain unchanged.
- Independent, accessible \`createPortal(..., document.body)\` hosts an overlay. The launcher never triggers navigation; open -> Portal in 220–320 ms and close -> back to bubble. Close preserves state, Reset acts only after explicit confirmation when destructive.
- Tool library default: overview with 5 cards. Selecting a card opens its tool with a shared header. Header: back, title, state/sound status, enlarge/restore, minimize. Escape closes; focus moves into modal and returns to launcher; background scroll locks only while open; dialog \`aria-modal\`, \`role=dialog\`, visible focus style, reduced-motion-safe.
- Desktop 1200px+ card layout: 3+2 responsive grid; tool workspace split controls/preview; TV: large controls; tablet narrow; mobile ≤650px vertical layout, minimum 44px touch targets, safe-area insets. Portal is scrollable with \`overscroll-behavior\` protection.
- Palette: ivory + cloud blue panels + colored accent per tool, Material 3 layered depth, controlled motion, no skeuomorphic visual noise. No changes to dashboard hero nor global CSS selectors except a new isolated stylesheet.
- Data persistence: localStorage \`bes:instant-tools:v1:<authenticated-user-id>\`, versioned JSON. Never store for anonymous users. Verify/sanitize schema and bounds on read, prevent switching-user bleed; reset in-memory state synchronously using keyed component by \`currentUser.id\`. Local, on-device only (NOT cross-device Supabase sync). Quota failure should be visible, never claim cloud sync.
- No API, Supabase migrations, cloud database, background job, AI, third-party analytics, microphone, notification permission or new npm package. Reuse **already installed** \`qrcode@1.5.4\`, \`canvas-confetti\`, \`lucide-react\`.
- Audio: reusable Web Audio API oscillator synthesis invoked after a human gesture. Sound master toggle shared across tools. No external audio download. Browsers may suspend audio without user gesture; UI remains functional when sound cannot play.
- Reduced motion via \`prefers-reduced-motion\`, no auto-playing video, no bright rapid flashes. Confetti only on deliberate wins, honoring reduced-motion.

## Tool 01: Dice 3D
- 1–6 independent dice, default 2, fair integer 1–6 using \`crypto.getRandomValues\` rejection-safe source (fallback \`Math.random\` only when browser API unavailable). Each click rolls all dice and shows pip glyph ⚀–⚅ with CSS perspective, 3D tilt, short 650ms rolling animation and synthesized shake/result click.
- Preview: a responsive dice grid, last rolled total, last 8 roll histories. Disable another roll during the spin to prevent race. Save count and roll results, not animation flags.

## Tool 02: Lucky Wheel
- 2–16 options entered as newline list, defaults Team 1–Team 4; trim, deduplicate case-insensitively, cap each name to 32 chars, user clicks Apply. A fully local \`conic-gradient\` wheel plus radial label segments; labels rotate with wheel. Animation: 3.5–5 turns + random winning index offset; winner determined by target angle and surfaced only at stop. Async cancellation on unmount and account change.
- Store options, rotation and winner. Click to spin, no external roster query or person-name request. No automatic winner elimination; optional per-session removal of winner. Celebrate with small confetti (only if user allows motion). Disable spin while spinning.

## Tool 03: Scoreboard
- 2–8 teams (default 4), editable team names and score values bounded to -999..9999; instant +1, +5, -1, Undo (up to 30 snapshots), Reset after confirmation. Highlight leaders and tie leaders. Victory effect on positive score changes to a new single leader; clicking Celebrate deliberately also works.
- Autosave team scores / names. Control conflict prevention: immutable updater, no backend / gradebook writes. Audio cues generated locally.

## Tool 04: Multi-Timer
- Four independent clocks by default, adjustable to 1–8, preset durations 1/3/5/10 minutes; each timer has start/pause/resume/reset, per-timer remaining ms and absolute \`endsAt\` to survive reload/tab-hidden. Global Pause/Reset requires confirmation for destructive reset. Store \`durationSeconds,remainingMs,endsAt,running,label,alerted\`; tick every 200ms while mounted and derive elapsed from \`Date.now\` to avoid drift. Once expiry is observed, set \`running=false,remainingMs=0,alerted=true\`, play a user-gesture-unlocked single buzzer where permitted. No timers/background wakeups when entire browser tab is closed; reopening reconciles elapsed wall-clock time.
- Clearly distinguish paused/active/completed states, numeric MM:SS display and progress bars with aria labels. Cap 1–60 minute custom duration.

## Tool 05: QR Maker
- Paste or type HTTPS/HTTP URL (or educational text of max 900 chars), generate QR **entirely in-browser** using locally bundled \`qrcode\`. Default error correction M, margin 3, 480px white PNG. Clear error on invalid/empty/too-long input. Do not permit script/data protocols; for custom free text, display "text QR".
- Interactive preview, Fullscreen presentation mode and Download PNG using browser anchor + data URL; Copy content with navigator.clipboard only on button click and visible error fallback. Store original input; no URL submission to other sites.

## UX / quality gates

- Toolbox launcher appears on all authenticated routes that already show Board + Focus. Icon has bilingual tooltip, aria-expanded, keyboard activation and Material 3 focus ring. Do **not** change the approval root check; teacher three-slot layout and admin four-slot layout remain untouched.
- Toolbox position uses \`right: calc(var(--bes-floating-edge) + var(--bes-floating-diameter) + var(--bes-floating-gap))\` and \`bottom:var(--bes-floating-bottom)\`. Popup z-index below emergency app-level overlays but high enough for normal dashboard.
- External navigation does not reset state while main App is alive; user ID switch remounts and reloads only that user's on-device data.
- Security: QR does not fetch submitted URLs. Content is rendered as React escaped text, never \`dangerouslySetInnerHTML\`; localStorage JSON is bounded and sanitized; no class roster/student names are fetched or transmitted.
- CI: pure functions test for dice ranges, wheel option normalization, winner position, timer wall-clock persistence, team constraints, QR input bounds, and account-specific localStorage key. Existing Brian Focus, Board, approval, chat and floating-dock tests must still pass. Verify Vercel preview READY then merge to main and check Production commit SHA + READY. No "deployed" claim without these checks.

## Future releases (not in Wave 1)
- Wave 2: Spotlight, Big Text, Teleprompter, Reveal Cards, Sound FX.
- Wave 3: Notes, Text Tools, Calculator, Quick Links, Checklist.
- Wave 4: Group Maker, Noise Meter, Buzzer, Reaction Timer, Class Bell.
