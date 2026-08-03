import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('src/components/GlobalFlatNavigation.jsx');
const bridge = read('src/components/GlobalNavigationConceptV2.jsx');
const css = read('src/components/GlobalNavigationConceptV2.css');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("lazy(() => import('./GlobalNavigationConceptV2.jsx'))"), 'Approved navigation must remain lazy-loaded.');
check(shell.includes('props.currentUser ? ('), 'Guest navigation must remain outside the authenticated concept bridge.');
check(bridge.includes("window.dispatchEvent(new CustomEvent('bes-command-palette-open'))"), 'Visible Command K launcher is missing.');
check(bridge.includes("document.getElementById('bes-weekly-practice-root')"), 'Learning navigation must target the existing weekly practice hub.');
check(bridge.includes("scrollIntoView({ behavior: 'smooth', block: 'start' })"), 'Learning navigation must remain local scroll behavior.');
check(bridge.includes("hasRouteAccess(currentUser, 'work-hub')"), 'Work Hub permission guard is missing.');
check(bridge.includes("hasRouteAccess(currentUser, 'homeroom')"), 'Homeroom permission guard is missing.');
check(bridge.includes("hasRouteAccess(currentUser, 'dashboard')"), 'Dashboard permission guard is missing.');
check(bridge.includes("hasRouteAccess(currentUser, 'apps')"), 'Apps permission guard is missing.');
check(bridge.includes('brian-concept-more__menu'), 'Compact More menu is missing.');

check(!bridge.includes('fetch('), 'Navigation bridge must not make network requests.');
check(!bridge.toLowerCase().includes('supabase'), 'Navigation bridge must not reference Supabase.');
check(!bridge.includes('setInterval('), 'Navigation bridge must not poll.');
check(!bridge.includes('MutationObserver'), 'Navigation bridge must not observe the full document.');
check(!bridge.includes('WebSocket'), 'Navigation bridge must not open realtime connections.');
check(!bridge.includes('EventSource'), 'Navigation bridge must not open streaming connections.');

check(css.includes('.brian-nav--concept-v2'), 'Approved navigation CSS scope is missing.');
check(css.includes('grid-template-areas: \'brand destinations command utilities\''), 'Desktop four-zone layout is missing.');
check(css.includes('.brian-concept-search'), 'Command launcher styling is missing.');
check(css.includes('.brian-concept-tab.is-active'), 'Active navigation state is missing.');
check(css.includes('height: 56px !important'), 'Compact briefing height contract is missing.');
check(css.includes('animation: none !important'), 'Aura animation shutdown is missing.');
check(!css.includes('infinite'), 'Approved navigation must not add infinite animations.');
check(!css.includes('backdrop-filter'), 'Approved navigation must avoid costly full-width backdrop blur.');
check(!css.toLowerCase().includes('supabase'), 'Navigation CSS must not reference Supabase.');

if (failures.length) {
  console.error('\nNavigation Hub concept guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation Hub approved concept guard passed.');
console.log('Network/Supabase requests introduced: 0');
console.log('Background polling/observers introduced: 0');
console.log('Loading model: authenticated lazy chunk, click-only Command K');
console.log('Learning action: local scroll to existing weekly practice hub');
