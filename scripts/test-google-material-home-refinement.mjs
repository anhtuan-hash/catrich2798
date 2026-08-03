import fs from 'node:fs';

const files = {
  shell: 'src/components/GlobalFlatNavigation.jsx',
  dormantOverlay: 'src/components/GlobalHomeGoogleHeroOverlay.jsx',
  dormantHeroCss: 'src/components/GlobalHomeGoogleHeroOverlay.css',
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, 'utf8')]),
);

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(source.shell.includes("import Navigation from './GlobalCompactNavigation.jsx'"), 'The established navigation shell must remain intact.');
assert(source.shell.includes('<Navigation {...props} />'), 'The established navigation must still render.');
assert(source.shell.includes('<GlobalHeroGovernance route={props.route} />'), 'Original Hero CMS governance must remain active.');
assert(!source.shell.includes("lazy(() => import('./GlobalHomeGoogleHeroOverlay.jsx'))"), 'The PR #483 Hero overlay must not be lazy-loaded.');
assert(!source.shell.includes('<GlobalHomeGoogleHeroOverlay'), 'The PR #483 Hero overlay must not mount.');
assert(!source.shell.includes("const homeActive = props.route === 'home'"), 'The obsolete overlay route gate must be removed.');

const prohibitedNetwork = /\b(fetch|supabase|rpc|WebSocket|EventSource|subscribeTo|channel\s*\()\b/i;
assert(!prohibitedNetwork.test(source.shell), 'Hero restoration must not add network, data or realtime work to the shell.');

assert(source.dormantOverlay.includes('createPortal'), 'The dormant overlay source should remain recoverable.');
assert(!source.dormantOverlay.includes('MutationObserver'), 'The dormant overlay source must remain free of full-page observers.');
assert(!source.dormantOverlay.includes('setInterval'), 'The dormant overlay source must remain free of polling.');
assert(!prohibitedNetwork.test(source.dormantOverlay), 'The dormant overlay source must remain network-free.');
assert(!/url\s*\(/i.test(source.dormantHeroCss), 'The dormant overlay CSS must not download external assets.');
assert(!/animation\s*:[^;]*infinite/i.test(source.dormantHeroCss), 'The dormant overlay CSS must not contain infinite animations.');

if (failures.length) {
  console.error('Homepage Hero restoration guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Homepage Hero restoration guard passed.');
console.log('Verified: original CMS Hero is active; PR #483 overlay is dormant; added network/data work: 0.');
