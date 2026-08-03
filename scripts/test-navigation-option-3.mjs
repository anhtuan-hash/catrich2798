import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const bridge = fs.readFileSync('src/components/GlobalNavigationConceptV2.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalNavigationConceptV2.css', 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("lazy(() => import('./GlobalNavigationConceptV2.jsx'))"), 'PR #482 Navigation Concept V2 must be lazy-loaded.');
check(shell.includes('<GlobalNavigationConceptV2 {...props} />'), 'PR #482 Navigation Concept V2 must be mounted.');
check(shell.includes('<GlobalHeroGovernance route={props.route} />'), 'Original Homepage Hero governance must remain active.');
check(!shell.includes('GlobalHomeGoogleHeroOverlay'), 'PR #483 Homepage Hero overlay must remain inactive.');

const prohibitedLayers = [
  "import './GlobalNavigationGoogleRefinement.css'",
  "import './GlobalNavigationSearchV3.css'",
  "import './GlobalNavigationOption3.css'",
  "import './GlobalNavigationOption3Stability.css'",
  "import './GlobalNavigationUtilityPolish.css'",
];
prohibitedLayers.forEach((layer) => check(!shell.includes(layer), `${layer} must remain unloaded.`));

check(css.includes('.brian-nav--concept-v2'), 'PR #482 navigation CSS scope is missing.');
check(css.includes('.brian-concept-search'), 'PR #482 Command K launcher styling is missing.');
check(css.includes('.brian-concept-tab.is-active'), 'PR #482 active-tab styling is missing.');
check(!/animation\s*:[^;]*infinite/i.test(css), 'PR #482 navigation must not add infinite animations.');
check(!/backdrop-filter/i.test(css), 'PR #482 navigation must not add expensive full-width blur.');

const prohibitedRuntime = /\b(fetch|supabase|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i;
check(!prohibitedRuntime.test(bridge), 'PR #482 navigation must remain free of network, realtime, polling, or observer work.');
check(!/https?:\/\//i.test(css), 'PR #482 navigation CSS must not download external assets.');

if (failures.length) {
  console.error('Pre-PR #483 restoration guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Pre-PR #483 restoration guard passed.');
console.log('Navigation: PR #482 Concept V2.');
console.log('Homepage Hero: original CMS Hero.');
console.log('Post-PR #483 CSS layers: unloaded.');
console.log('New network/background work: 0.');
