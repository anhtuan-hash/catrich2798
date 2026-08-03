import fs from 'node:fs';

const files = {
  shell: 'src/components/GlobalFlatNavigation.jsx',
  overlay: 'src/components/GlobalHomeGoogleHeroOverlay.jsx',
  heroCss: 'src/components/GlobalHomeGoogleHeroOverlay.css',
  navCss: 'src/components/GlobalNavigationGoogleRefinement.css',
  navConcept: 'src/components/GlobalNavigationConceptV2.css',
};

const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, 'utf8')]));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(source.shell.includes("lazy(() => import('./GlobalHomeGoogleHeroOverlay.jsx'))"), 'Homepage overlay must remain lazy-loaded.');
assert(source.shell.includes("import './GlobalNavigationGoogleRefinement.css'"), 'Stable navigation refinement import must remain in the shell.');
assert(source.shell.includes("props.route === 'home'"), 'Homepage overlay must only mount on the home route.');

assert(source.overlay.includes('createPortal'), 'Hero illustration must portal into the existing CMS hero.');
assert(source.overlay.includes("document.querySelector('.bha-home .hero-cms')"), 'Hero overlay must target the existing CMS hero.');
assert(source.overlay.includes("classList.add('hero-cms--google-refined')"), 'Hero overlay must enable the scoped refinement class.');
assert(source.overlay.includes('requestAnimationFrame'), 'Hero overlay must connect after render without a global observer.');
assert(!source.overlay.includes('MutationObserver'), 'Hero overlay must not observe the whole DOM.');
assert(!source.overlay.includes('setInterval'), 'Hero overlay must not poll.');
assert(!source.overlay.includes('<main'), 'Decorative illustration must not introduce a nested main landmark.');

const prohibitedNetwork = /\b(fetch|supabase|rpc|WebSocket|EventSource|subscribeTo|channel\s*\()\b/i;
assert(!prohibitedNetwork.test(source.overlay), 'Hero overlay must not create network, Supabase, RPC or realtime work.');
assert(!prohibitedNetwork.test(source.navCss), 'Navigation rollback marker must remain presentation-only.');

assert(source.heroCss.includes('.hero-cms--google-refined'), 'Hero CSS must stay scoped to the refined homepage hero.');
assert(source.heroCss.includes('.google-home-monitor'), 'Hero CSS must retain the Material dashboard illustration.');
assert(source.heroCss.includes('@media (max-width: 820px)'), 'Hero CSS must retain tablet responsiveness.');
assert(source.heroCss.includes('@media (max-width: 560px)'), 'Hero CSS must retain mobile responsiveness.');
assert(!/url\s*\(/i.test(source.heroCss), 'Hero refinement must not download external CSS assets.');
assert(!/animation\s*:[^;]*infinite/i.test(source.heroCss), 'Hero refinement must not add infinite animations.');

assert(source.navCss.includes('restored to the approved PR #482 concept'), 'Navigation must stay intentionally restored to PR #482.');
assert(!source.navCss.includes('.brian-concept-tab'), 'The later PR #483 navigation override must remain disabled.');
assert(source.navConcept.includes('.brian-concept-tab__label'), 'The PR #482 navigation concept must remain available.');
assert(source.navConcept.includes('.brian-concept-search'), 'The PR #482 Command K search surface must remain available.');
assert(!/animation\s*:[^;]*infinite/i.test(source.navConcept), 'The restored navigation must not add infinite animations.');

if (failures.length) {
  console.error('Google Material home refinement guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Google Material home refinement guard passed.');
console.log('Verified: Hero refinement stays active; navigation is restored to PR #482; no network, Supabase or polling work was added.');
