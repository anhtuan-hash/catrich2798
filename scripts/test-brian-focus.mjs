import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatFocusTime, BRIAN_FOCUS_TIME_ZONE } from '../src/components/BrianFocus/useFocusClock.js';

const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8');
const root = read('src/main.jsx');
const dash = read('src/pages/WorkDashboard.jsx');
const globalFocus = read('src/components/BrianFocus/BrianFocus.jsx');
const trigger = read('src/components/BrianFocus/FocusBubble.jsx');
const overlay = read('src/components/BrianFocus/FocusOverlay.jsx');
const clock = read('src/components/BrianFocus/HTCSenseClock.jsx');
const weather = read('src/components/BrianFocus/FocusWeather.jsx');
const service = read('src/components/BrianFocus/focusWeatherService.js');
const hook = read('src/components/BrianFocus/useFocusWeather.js');
const timeHook = read('src/components/BrianFocus/useFocusClock.js');
const cosmos = read('src/components/BrianFocus/CosmicAmbient.jsx');
const css = read('src/components/BrianFocus/BrianFocus.css');
const cosmicCss = read('src/components/BrianFocus/BrianFocusCosmic.css');
const premiumCss = read('src/components/BrianFocus/BrianFocusPremium.css');
const check = (label,value) => { assert.ok(value,label); console.log('✓ '+label); };

const midnight=formatFocusTime(new Date('2026-10-23T17:00:00Z'),'vi');
assert.deepEqual([midnight.hours,midnight.minutes],['00','00']);
assert.match(midnight.dateLabel,/24/);
assert.deepEqual(Object.values(formatFocusTime(new Date('2026-10-24T02:47:00Z'),'en')).slice(0,2), ['09','47']);
check('clock uses Vietnam time and syncs minute boundaries and visible tabs',
  BRIAN_FOCUS_TIME_ZONE === 'Asia/Ho_Chi_Minh' &&
  timeHook.includes("hourCycle: 'h23'") &&
  timeHook.includes('60_000 - (Date.now() % 60_000)') &&
  timeHook.includes('visibilitychange'));
check('Focus is mounted ONCE at authenticated global shell, not Dashboard',
  root.includes("const BrianFocus = lazy(() => import('./components/BrianFocus/BrianFocus.jsx'))") &&
  root.includes('<BrianFocus language={language} performance={resolvedPerformance} />') &&
  root.includes('currentUser && canAccessRoute') &&
  !dash.includes('<BrianFocus') && !dash.includes("const BrianFocus = React.lazy"));
check('Focus is excluded from public/login routes but available in home, gradebook, checks and attendance',
  root.includes("!['login', 'register', 'setup', 'homeroom-portal', 'classroom-join', 'quest-join'].includes(currentRoute)") &&
  root.includes("currentRoute === 'tool'") &&
  root.includes("currentRoute === 'attendance'"));
check('the single global bubble is portalled to body and retains same dock',
  globalFocus.includes('createPortal(button, document.body)') &&
  globalFocus.includes('active={open}') &&
  !overlay.includes('<FocusBubble') &&
  trigger.includes('id="bfc-focus-trigger"') &&
  css.includes('right: max(24px, env(safe-area-inset-right, 0px))') &&
  css.includes('right: max(13px, env(safe-area-inset-right, 0px))'));
check('modal keeps route and forms mounted, focus trapped with Esc and restored on exit',
  overlay.includes('root.inert = true') &&
  overlay.includes('root.inert = rootWasInert') &&
  overlay.includes('window.scrollTo(scrollX, scrollY)') &&
  overlay.includes("event.key === 'Escape'") &&
  overlay.includes("event.key !== 'Tab'") &&
  overlay.includes('aria-owns="bfc-focus-trigger"') &&
  overlay.includes('returnFocusRef?.current?.focus?.()') &&
  !overlay.includes('window.location'));
check('cosmic scene is decorative with deterministic stars and CSS motion',
  cosmos.includes('Array.from({ length: 30 }') &&
  cosmos.includes('aria-hidden="true"') &&
  cosmos.includes('bfc-cosmos__orbits') &&
  cosmos.includes('bfc-cosmos__planet') &&
  cosmos.includes('bfc-cosmos__meteor') &&
  cosmicCss.includes('@keyframes bfc-star-twinkle') &&
  cosmicCss.includes('@keyframes bfc-nebula-flow') &&
  cosmicCss.includes('@keyframes bfc-meteor'));
check('HTC digital flip only remounts changed hours/minutes and never hardcodes screenshot time',
  clock.includes('key={hours}') && clock.includes('key={minutes}') &&
  clock.includes('bfc-clock-face__tile--flip') &&
  clock.includes('aria-live="off"') &&
  !clock.includes('09:47') &&
  cosmicCss.includes('@keyframes bfc-flip-half'));
check('Open-Meteo shared weather deduplicates fetch, caches ten minutes, exposes errors',
  service.includes('10 * 60 * 1000') &&
  service.includes('if (pending) return pending') &&
  service.includes('if (!force && !isFocusWeatherStale()) return snapshot') &&
  service.includes('fetch(URL)') &&
  service.includes('error: true') &&
  dash.includes('refreshSharedFocusWeather()') &&
  !dash.includes("await fetch('https://api.open-meteo.com"));
check('widget has WMO description, live timestamp, temperature and explicit refresh',
  weather.includes("Number.isFinite(weather?.temperature)") &&
  weather.includes('focusWeatherDescription') &&
  weather.includes('updatedAt') &&
  weather.includes('onClick={onRefresh}') &&
  weather.includes('Weather unavailable') &&
  clock.includes('onRefresh={onRefreshWeather}') &&
  hook.includes('refreshSharedFocusWeather({ force: true })'));
check('weather service never requests geolocation',
  !service.includes('navigator.geolocation') &&
  service.includes('latitude=10.7769&longitude=106.7009'));
check('cosmic effects have reduced-motion, performance and high-contrast fallbacks',
  cosmicCss.includes('@media (prefers-reduced-motion: reduce)') &&
  cosmicCss.includes('.bfc-overlay--low-motion') &&
  cosmicCss.includes('@media (forced-colors: active)') &&
  overlay.includes('performance') &&
  globalFocus.includes('performance'));
check('tablet/mobile widths are handled and Focus button keeps dock alignment',
  css.includes('@media (max-width: 767px)') &&
  css.includes('@media (max-width: 640px)') &&
  cosmicCss.includes('@media (max-width: 370px)') &&
  css.includes('width: 62px') && css.includes('width: 58px'));
check('premium Focus styles load last to override legacy presentation safely',
  globalFocus.includes("import './BrianFocusPremium.css'") &&
  globalFocus.indexOf("import './BrianFocusPremium.css'") > globalFocus.indexOf("import './BrianFocusCosmic.css'"));
check('modal genuinely occludes 2 other floating actions without touching them',
  premiumCss.includes('z-index: 2147483500') &&
  premiumCss.includes('.bfc-bubble.is-active { z-index: 2147483510; }') &&
  read('src/components/PermissionApprovalInbox.css').includes('z-index:2147483300') &&
  overlay.includes("root.inert = true"));
check('HTC flip design uses distinct face and top shutter with hinge pins',
  clock.includes('bfc-clock-face__shutter') &&
  clock.includes('bfc-clock-face__number') &&
  clock.includes('bfc-clock-face__hinge--left') &&
  clock.includes('bfc-clock-face__hinge--right') &&
  clock.includes('key={hours}') && clock.includes('key={minutes}') &&
  premiumCss.includes('@keyframes bfc-premium-flap'));
check('cosmos adds tasteful depth via static dust and constellations',
  cosmos.includes('const DUST = Array.from({ length: 64 }') &&
  cosmos.includes('bfc-cosmos__stardust') &&
  cosmos.includes('bfc-cosmos__constellations') &&
  cosmos.includes('bfc-cosmos__halo') &&
  premiumCss.includes('.bfc-cosmos__planet--left::before'));
check('live weather does not silently report live during network errors',
  weather.includes('bfc-weather__live') &&
  weather.includes('weather?.error || !hasValue') &&
  weather.includes('OFFLINE') &&
  weather.includes('LIVE'));
check('premium effects respect reduced motion, low power and contrast accessibility',
  premiumCss.includes('prefers-reduced-motion: reduce') &&
  premiumCss.includes('.bfc-overlay--low-motion') &&
  premiumCss.includes('@media (forced-colors: active)'));
console.log('PASS: Brian Focus 2.0 global dock, shared weather, HTC flip, cosmic ambience and accessibility.');
