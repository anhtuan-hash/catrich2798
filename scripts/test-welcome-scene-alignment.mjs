import fs from 'node:fs';

const read = (path) => {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
};

const welcome = read('src/firstVisitWelcome.js');
const css = read('src/styles/FirstVisitWelcomeStarryNight.css');
const bootstrap = read('src/applicationBootstrap.jsx');
const tabResume = read('src/tabResumeStability.js');
const startExitGuard = read('src/welcomeStartExitGuard.js');

const checks = [
  ['Starry Night welcome is bootstrapped', bootstrap.includes("import { installFirstVisitWelcome } from './firstVisitWelcome.js';") && bootstrap.includes('installFirstVisitWelcome();')],
  ['Welcome uses the approved Starry Night stylesheet', welcome.includes("FirstVisitWelcomeStarryNight.css?inline")],
  ['Welcome retains first-visit persistence and preview mode', welcome.includes("WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1'") && welcome.includes('localStorage.getItem(WELCOME_SEEN_KEY)') && welcome.includes('localStorage.setItem(WELCOME_SEEN_KEY, WELCOME_VERSION)') && welcome.includes("WELCOME_PREVIEW_PARAM = 'welcome'") && (welcome.includes("params().get(WELCOME_PREVIEW_PARAM) === 'preview'") || welcome.includes("params.get(WELCOME_PREVIEW_PARAM) === 'preview'"))],
  ['Welcome renders the approved bilingual artwork hero', welcome.includes('Chạm vào') && welcome.includes('bầu trời sao') && welcome.includes('Xem thêm') && welcome.includes('Learn more')],
  ['Legacy feature cards and carousel dots are removed', !welcome.includes('data-welcome-feature') && !welcome.includes('brian-welcome-progress') && !welcome.includes('Truyền cảm hứng') && !welcome.includes('Dễ sử dụng')],
  ['Artwork panel identifies The Starry Night bilingually', welcome.includes('The Starry Night') && welcome.includes('Đêm đầy sao') && welcome.includes('Vincent van Gogh · 1889')],
  ['Artwork panel includes authoritative artwork metadata', welcome.includes('Saint-Rémy-de-Provence') && welcome.includes('Oil on canvas') && welcome.includes('73.7 × 92.1 cm') && welcome.includes('Museum of Modern Art')],
  ['Artwork panel includes bilingual story sections', welcome.includes('Hoàn cảnh sáng tác') && welcome.includes('Context') && welcome.includes('Bầu trời xoáy') && welcome.includes('Swirling sky') && welcome.includes('Bạn có biết?') && welcome.includes('Did you know?')],
  ['Artwork panel has accessible dialog controls and focus management', welcome.includes('aria-haspopup="dialog"') && welcome.includes('aria-controls="paintingInfoPanel"') && welcome.includes('openPaintingInfo') && welcome.includes('closePaintingInfo') && welcome.includes('trapFocus')],
  ['Escape closes artwork panel before dismissing welcome', welcome.includes("event.key==='Escape'") || welcome.includes("event.key === 'Escape'") ? (welcome.includes('if(infoOpen) closePaintingInfo()') || welcome.includes('if (infoOpen) closePaintingInfo()')) : false],
  ['Start button retains Star Dive, Living Brush, and Galaxy Portal transitions', welcome.includes('star-dive') && welcome.includes('living-brush') && welcome.includes('galaxy-portal') && welcome.includes('startTransitionIndex')],
  ['Start always dismisses welcome after the transition, including preview mode', welcome.includes("function finishTransition(type){dismissWelcome('start:'+type,{persist:!previewMode,immediate:true});}")],
  ['Start has a parent-window exit watchdog independent of sandboxed iframe timers', tabResume.includes("import './welcomeStartExitGuard.js';") && startExitGuard.includes("getElementById('startJourney')") && startExitGuard.includes("getElementById('skipWelcome')") && startExitGuard.includes('window.setTimeout') && startExitGuard.includes('skip.click()') && startExitGuard.includes('hardRemoveWelcome')],
  ['Exit watchdog handles iframe buttons across JavaScript realms', startExitGuard.includes("start?.tagName === 'BUTTON'") && startExitGuard.includes("skip?.tagName === 'BUTTON'") && !startExitGuard.includes('instanceof HTMLButtonElement')],
  ['Start defaults to the Home route', startExitGuard.includes("window.location.hash = '#/home'")],
  ['Start transition has a reduced-motion fallback', welcome.includes('reducedMotion') && welcome.includes('forceFullMotion') && css.includes('@media(prefers-reduced-motion:reduce)')],
  ['Welcome remains isolated in a same-origin sandboxed iframe', welcome.includes("document.createElement('iframe')") && welcome.includes("frame.setAttribute('sandbox', 'allow-same-origin')") && welcome.includes('frame.srcdoc')],
  ['Starry Night composition is full-screen and responsive', css.includes('.welcome-stage') && css.includes('position:fixed') && css.includes('@media(max-width:900px)') && css.includes('@media(max-width:620px)')],
  ['Starry Night uses a public-domain Wikimedia Commons artwork source', css.includes('commons.wikimedia.org/wiki/Special:FilePath/Starry%20Night.webp')],
  ['Old lighthouse/ocean scene is no longer part of the active welcome', !welcome.includes('brian-welcome-lighthouse') && !welcome.includes('brian-welcome-ocean-layer') && !welcome.includes('brian-welcome-beam')],
];

let failures = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}

if (failures) {
  console.error(`Starry Night welcome contract failed: ${failures} check(s).`);
  process.exit(1);
}
console.log('Starry Night welcome contract passed.');
