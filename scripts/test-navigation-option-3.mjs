import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const bridge = fs.readFileSync('src/components/GlobalNavigationConceptV2.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalNavigationConceptV2.css', 'utf8');
const polish = fs.readFileSync('src/components/GlobalNavigationGoogleM3Polish.css', 'utf8');
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

check(shell.includes("import './GlobalNavigationGoogleM3Polish.css'"), 'Scoped Google Material 3 polish must be loaded.');
check(shell.indexOf("import './GlobalNavigationGoogleM3Polish.css'") > shell.indexOf("import './GlobalWorkHubModalCenter.css'"), 'Material 3 polish must load after established global geometry layers.');
check(css.includes('.brian-nav--concept-v2'), 'PR #482 navigation CSS scope is missing.');
check(css.includes('.brian-concept-search'), 'PR #482 Command K launcher styling is missing.');
check(css.includes('.brian-concept-tab.is-active'), 'PR #482 active-tab styling is missing.');
check(polish.includes('--gm3-blue: #0b57d0'), 'Google blue Material token is missing.');
check(polish.includes('--gm3-blue-container: #d3e3fd'), 'Material active-container token is missing.');
check(polish.includes('.brian-nav.brian-nav--concept-v2'), 'Material polish must remain scoped to Navigation Concept V2.');
check(polish.includes(".app-shell[data-route='home'] .burs-hero-governed[data-brian-hero-route='home']"), 'Material Hero framing must remain scoped to the original Homepage CMS Hero.');
check(polish.includes('border-radius: 28px'), 'Material large-shape contract is missing.');
check(polish.includes('.brian-nav__account > span'), 'Persistent avatar styling is missing.');
check(polish.includes('visibility: visible !important'), 'Avatar must remain visible.');

check(!/animation\s*:[^;]*infinite/i.test(css), 'PR #482 navigation must not add infinite animations.');
check(!/animation\s*:[^;]*infinite/i.test(polish), 'Material polish must not add infinite animations.');
check(!/backdrop-filter/i.test(css), 'PR #482 navigation must not add expensive full-width blur.');
check(!/backdrop-filter/i.test(polish), 'Material polish must not add expensive blur.');

const prohibitedRuntime = /\b(fetch|supabase|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i;
check(!prohibitedRuntime.test(bridge), 'PR #482 navigation must remain free of network, realtime, polling, or observer work.');
check(!prohibitedRuntime.test(polish), 'Material polish must remain free of network, realtime, polling, or observer work.');
check(!/https?:\/\//i.test(css), 'PR #482 navigation CSS must not download external assets.');
check(!/https?:\/\//i.test(polish), 'Material polish must not download external assets.');
check(!/url\s*\(/i.test(polish), 'Material polish must not load image assets.');

if (failures.length) {
  console.error('Pre-PR #483 Material 3 polish guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Pre-PR #483 Material 3 polish guard passed.');
console.log('Navigation: PR #482 Concept V2 with visual-only Material 3 polish.');
console.log('Homepage Hero: original CMS Hero with visual-only Material 3 framing.');
console.log('PR #483 overlay/refinement layers: unloaded.');
console.log('New network/background work: 0.');
