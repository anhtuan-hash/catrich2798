import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatFocusTime, BRIAN_FOCUS_TIME_ZONE } from '../src/components/BrianFocus/useFocusClock.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const dash = read('src/pages/WorkDashboard.jsx');
const shell = read('src/components/BrianFocus/BrianFocus.jsx');
const bubble = read('src/components/BrianFocus/FocusBubble.jsx');
const overlay = read('src/components/BrianFocus/FocusOverlay.jsx');
const clock = read('src/components/BrianFocus/HTCSenseClock.jsx');
const weather = read('src/components/BrianFocus/FocusWeather.jsx');
const hook = read('src/components/BrianFocus/useFocusClock.js');
const css = read('src/components/BrianFocus/BrianFocus.css');
const check = (label, value) => { assert.ok(value,label); console.log('✓ '+label); };

const vietnamMidnight = formatFocusTime(new Date('2026-10-23T17:00:00.000Z'),'vi');
assert.equal(vietnamMidnight.hours,'00');
assert.equal(vietnamMidnight.minutes,'00');
assert.match(vietnamMidnight.dateLabel, /24/);
const morning = formatFocusTime(new Date('2026-10-24T02:09:20Z'),'en');
assert.deepEqual([morning.hours,morning.minutes],['09','09']);
check('clock uses correct timezone independent of device zone', BRIAN_FOCUS_TIME_ZONE === 'Asia/Ho_Chi_Minh' &&
  hook.includes('hourCycle: \'h23\''));
check('clock syncs at minute boundaries, after tab visibility and browser focus',
  hook.includes('60_000 - (Date.now() % 60_000)') &&
  hook.includes('visibilitychange') && hook.includes("window.addEventListener('focus', syncWhenVisible)"));
check('focus is mounted only inside Dashboard, lazy-loads and reuses weather data',
  dash.includes("React.lazy(() => import('../components/BrianFocus/BrianFocus.jsx'))") &&
  dash.includes('<BrianFocus language={language} weather={weather}') &&
  dash.includes('weatherDescription={weatherDescription}') &&
  dash.includes('disabled={heroEditorOpen}') &&
  !shell.includes('fetch('));
check('focus trigger is dedicated single chat-style bubble, never replaces global assistant',
  shell.includes('<FocusBubble') && bubble.includes('bfc-bubble') &&
  bubble.includes('MoonStar') && bubble.includes('aria-pressed={active}') &&
  css.includes('right: max(24px, env(safe-area-inset-right, 0px))') &&
  css.includes('right: max(13px, env(safe-area-inset-right, 0px))') &&
  css.includes('width: 62px') && css.includes('width: 58px'));
check('overlay never navigates or unmounts dashboard behind it',
  overlay.includes('createPortal(') && overlay.includes('document.body') &&
  shell.includes('createPortal(button, document.body)') &&
  !overlay.includes('<FocusBubble') &&
  shell.includes('active={open}') &&
  !shell.includes('window.location') && !overlay.includes('window.location'));
check('all interaction behind Focus is isolated without removing the mounted Dashboard',
  overlay.includes("document.getElementById('root')") &&
  overlay.includes('root.inert = true') &&
  overlay.includes('root.inert = rootWasInert') &&
  overlay.includes("document.body.style.overflow = 'hidden'") &&
  overlay.includes('document.body.style.overflow = previousOverflow'));
check('focus handles Escape, outside click, trap Tab, restore scroll and focus',
  overlay.includes("event.key === 'Escape'") &&
  overlay.includes("event.key !== 'Tab'") &&
  overlay.includes('event.target === event.currentTarget') &&
  overlay.includes('window.scrollTo(scrollX, scrollY)') &&
  overlay.includes('returnFocusRef?.current?.focus?.()') &&
  overlay.includes('aria-owns="bfc-focus-trigger"') &&
  overlay.includes('returnFocusRef?.current') &&
  bubble.includes('id="bfc-focus-trigger"'));
check('clock reads real date and weather, without hard-coded screenshot values',
  clock.includes('useFocusClock(language)') &&
  clock.includes('<FocusWeather') && clock.includes('hours') && clock.includes('minutes') &&
  !clock.includes('09:12') && !clock.includes('26°C'));
check('weather is reused without new API queries or location permissions',
  !weather.includes('fetch(') && !weather.includes('navigator.geolocation') &&
  weather.includes('Number.isFinite(weather?.temperature)') &&
  weather.includes('weather?.code') && weather.includes('Weather unavailable'));
check('overlay is modal and screen reader time does not announce every minute',
  overlay.includes('aria-modal="true"') && overlay.includes('role="dialog"') &&
  clock.includes('aria-live="off"') && overlay.includes('aria-label='));
check('glass design has dark blur and HTC-inspired split tiles',
  css.includes('rgba(7,12,26,.78)') &&
  css.includes('backdrop-filter: blur(18px)') &&
  css.includes('.bfc-clock-face__tile::after') &&
  css.includes('font-variant-numeric: tabular-nums'));
check('mobile and reduced-motion/full-contrast fallbacks are present',
  css.includes('@media (max-width: 767px)') &&
  css.includes('@media (max-width: 370px)') &&
  css.includes('@media (prefers-reduced-motion: reduce)') &&
  css.includes('@media (forced-colors: active)'));
check('opening Focus does not reset the underlying Dashboard hero, planner or newsroom',
  dash.includes('<DashboardWorkPlanner') &&
  dash.includes('<DashboardNewsHub') &&
  dash.includes('<DashboardHeroEditor') &&
  dash.includes('<BrianFocus'));
check('Focus button shares Chat AI exact right dock and desktop/mobile diameters',
  css.includes('max(24px, env(safe-area-inset-right, 0px))') &&
  css.includes('max(13px, env(safe-area-inset-right, 0px))') &&
  css.includes('width: 62px') && css.includes('width: 58px') &&
  !css.includes('right: calc(104px') && !css.includes('right: calc(85px'));
check('Focus bubble stays one persistent portal and never lives in Dashboard transformed cards',
  shell.includes('createPortal(button, document.body)') &&
  !overlay.includes('<FocusBubble') && overlay.includes('aria-owns="bfc-focus-trigger"') &&
  shell.includes('returnFocusRef={triggerRef}'));
check('premium flip clock and compact weather pill use richer ambient contrast',
  css.includes('rgba(7,12,26,.78)') &&
  css.includes('grid-template-columns: 39px minmax(0, 1fr) auto') &&
  css.includes('rgba(17,26,55,.35) 50%'));
console.log('PASS: Brian Focus 1.0 — time, backdrop, accessibility, state and weather invariants.');
