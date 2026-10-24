# Brian Focus v5 — HTC Sense Reimagined × Cinema Zen

Status: Approved for direct implementation · 2026-10-24  
Scope: Brian Focus full-screen overlay only. Dashboard, Gradebook, Homeroom, Assessment and global navigation must remain untouched.

## 1. Design intent

Replace the control-heavy, neon/blue-glass dashboard feeling with a quiet cinema canvas:
- The user's existing image, video, HTML, or YouTube Focus background remains full-bleed, unaffected by global Hero CMS changes.
- Content feels intentionally composed, not like administrative dashboard cards.
- Legibility is ensured with only restrained text shadows, light shadow beneath clock, and a local/readability veil; never an opaque page-size card.
- Typography: use fonts already bundled by the application or system UI; do not download fonts.
- Two visual choices selected inside Focus **Appearance**, independent of app language or globally published backgrounds.

## 2. Core spatial layout — desktop (≥ 900 px)

1. Background: full viewport, existing rendering/playback state preserved.
2. Top-left: modest wordmark “BRIAN FOCUS”; no long subheading in idle state.
3. Center area (roughly center-height minus 2vh):
   - **Classic HTC** (default): compact split-flap clock (hours/minutes) with smoky satin translucent material. Target tiles: ~118–144px tall and ~116–142px wide, 35–40% smaller than current 240px tiles. Colon discreet.
   - **Minimal**: elegant high-contrast text time with subtle shadow, no digit cards, no animated neon.
   - Localized date below (Vietnamese / English).
   - Inline, small live weather row directly below date, with icon, temperature, location, condition. Tap/click to expand further details and refresh; collapse again on click.
4. Top-right: a small and soft toolbar with Close, Appearance, Scene (authorized accounts only), Effects, Timer and default motion pause when the stock animated scene is used; no bulky pill cards.
5. Lower center: one compact translucent utility dock (Timer / Notes / Sound / Dim / More). **Remove** the right-side icon column in resting state.
6. The Quick Focus panel is opt-in via More, hidden by default; quiet / Pomodoro / white noise remain available.
7. Existing YouTube playback controls remain operable and separate from the application clock; do not re-create / re-mount iframe when only Appearance preference changes.
8. Optional timer/notes/soundscape/brightness utility panels remain accessible and are visually quieter.

## 3. Idle / activity behavior

- Toolbar, utility dock, Quick Focus launcher, YouTube playback controls and ornaments are initially visible.
- After 5 seconds without pointer/keyboard/touch activity, UI fades out except for central clock/date/weather (and background).
- Mouse move, pointer down/touch, Tab, other meaningful keyboard input reveals controls, restarting the idle timer.
- Keep controls visible when an editor, Motion Library, Appearance picker, timer/notes/etc panel or Quick Focus panel is open; otherwise they may auto-hide.
- Restore controls when Focus is reopened; no persisting hidden state across sessions.
- Do not steal focus from actively used inputs. Preserve keyboard operation with visible focus rings.
- When an overlay is exiting, freeze UI activity and preserve existing WAAPI enter/exit transitions.

## 4. Appearance picker / preferences

- Header “Appearance” button opens small self-contained picker with two choices:
  - **Classic HTC** — default
  - **Minimal** — digit-free typographic clock
- “Auto-hide tools after 5 seconds” toggle (on by default).
- Persist per authenticated account **on this browser only** using a prefixed localStorage key. Inaccessible storage falls back safely.
- The picker only changes display mode and auto-hide; it never modifies the shared scene (Supabase) or another person's account.
- English and Vietnamese translations for all new labels; bilingual buttons, aria-labels and hints.

## 5. Motion and data compatibility

- Keep existing Web Animations API launch/dismiss engine, nine motion choices, Motion Library and keyboard Esc flows untouched.
- The clock remains live, time from existing useFocusClock; weather comes from existing useFocusWeather. Never fabricate temperature/conditions.
- The in-page user-scoped personal brightness and soundscape are retained.
- Shared image/video/YouTube/HTML scene editor remains available only when existing canEditFocusScene permission passes.
- Do not reload or reset background simply because the toolbar hides or clock mode switches.
- YouTube autoplay restrictions still apply. Never claim to remove YouTube native overlay titles or controls from cross-origin iframe.

## 6. Responsive behavior

- Tablet: central clock tiles ~100–116px; toolbar fits or horizontally scrolls without overlap; weather one line.
- Mobile (≤ 640px): tiny HTC cards (~78–100px) or typographic digital clock, weather can wrap; bottom dock is safe-area aware, tool panels never exceed viewport.
- Short screen: reduce clock height and surrounding whitespace; allow panels to scroll independently.
- 44px minimum touch hit area for main toolbar & dock controls (clock itself noninteractive except weather).
- No sideways overflow, clipping of close action, or overlay covering video control permanently.

## 7. Accessibility & motion

- Foreground contrast against arbitrary background, keyboard focus visibility.
- Respect prefers-reduced-motion for decorative entrance and clock-flip effects; background media behavior retains existing policies.
- No automatic audio. Timer and soundscape only play after user action.
- Preserve adequate labeling for toggles, mode controls and tooltip actions.

## 8. Engineering / release acceptance

- Implement as isolated React components and **one final-authority CSS file imported after old Focus styles** to avoid cascade regressions.
- No database migrations, no secrets, no changes to other app Heroes.
- Stable navigation from any route; closing Focus restores previous route and focus; YouTube/scene remains mounted while Focus is open.
- Add verification checks for two modes, auto-hide, keyboard visibility, weather expand, picker persistence and retained controls.
- Build must succeed on Vercel production; report deployment state honestly and identify limitations of live signed-in UI verification.

## 9. Out of scope

- YouTube native branding removal, media rights workarounds, new audio sources, site-wide font changes, global hero media synchronization, changing authority or roles.
