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

check(shell.includes("import Navigation from './GlobalCompactNavigation.jsx'"), 'Base navigation import must remain active.');
check(shell.includes('<Navigation {...props} />'), 'Base navigation must remain mounted.');
check(shell.includes("lazy(() => import('./GlobalNavigationConceptV2.jsx'))"), 'PR #482 navigation must remain lazy-loaded.');
check(shell.includes('<GlobalNavigationConceptV2 {...props} />'), 'PR #482 navigation must remain mounted for authenticated users.');
check(shell.includes('props.currentUser ? ('), 'Guest navigation must remain outside the authenticated concept bridge.');

check(bridge.includes("window.dispatchEvent(new CustomEvent('bes-command-palette-open'))"), 'Command K launcher contract is missing.');
check(bridge.includes("label: vi ? 'Nhân sự' : 'Personnel'"), 'Personnel navigation label is missing.');
check(bridge.includes("target: '#/tool/brian-team'"), 'Personnel navigation must open the Brian Team app directly.');
check(bridge.includes("selectedTool?.slug === 'brian-team'"), 'Personnel navigation active-state contract is missing.');
check(!bridge.includes('LEARNING_SCROLL_KEY'), 'Retired Learning scroll state must not remain in the navigation bridge.');
check(!bridge.includes('scrollToLearningHub'), 'Retired Learning local-scroll handler must not remain in the navigation bridge.');
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
check(css.includes("grid-template-areas: 'brand destinations command utilities'"), 'Desktop four-zone layout is missing.');
check(css.includes('.brian-concept-search'), 'Command launcher styling is missing.');
check(css.includes('.brian-concept-tab.is-active'), 'Active navigation state is missing.');
check(css.includes('height: 56px !important'), 'Compact briefing height contract is missing.');
check(css.includes('animation: none !important'), 'Aura animation shutdown is missing.');
check(!css.includes('infinite'), 'Approved navigation must not add infinite animations.');
check(!css.includes('backdrop-filter'), 'Approved navigation must avoid costly full-width backdrop blur.');
check(!css.toLowerCase().includes('supabase'), 'Navigation CSS must not reference Supabase.');

check(shell.includes('<GlobalHeroGovernance route={props.route} />'), 'Original Homepage Hero governance must remain active.');
check(!shell.includes("lazy(() => import('./GlobalHomeGoogleHeroOverlay.jsx'))"), 'PR #483 Hero overlay must remain disabled.');
check(!shell.includes('<GlobalHomeGoogleHeroOverlay'), 'PR #483 Hero overlay must not mount.');
check(!shell.includes("import './GlobalNavigationGoogleRefinement.css'"), 'PR #483 navigation refinement must remain unloaded.');
check(!shell.includes("import './GlobalNavigationSearchV3.css'"), 'Post-#483 Search V3 must remain unloaded.');
check(!shell.includes("import './GlobalNavigationOption3.css'"), 'Post-#483 Option 3 must remain unloaded.');
check(!shell.includes("import './GlobalNavigationOption3Stability.css'"), 'Post-#483 stability layer must remain unloaded.');
check(!shell.includes("import './GlobalNavigationUtilityPolish.css'"), 'Post-#483 utility polish must remain unloaded.');

if (failures.length) {
  console.error('\nNavigation and Hero guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation and Hero guard passed.');
console.log('Active navigation: Navigation Concept V2 with Brian Team personnel shortcut.');
console.log('Active Homepage Hero: original CMS Hero.');
console.log('Post-PR #483 navigation layers loaded: 0.');
console.log('New network or background work introduced: 0.');
