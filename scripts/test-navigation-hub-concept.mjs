import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('src/components/GlobalFlatNavigation.jsx');
const legacyNavigation = read('src/components/GlobalCompactNavigation.jsx');
const archivedBridge = read('src/components/GlobalNavigationConceptV2.jsx');
const archivedCss = read('src/components/GlobalNavigationConceptV2.css');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("import Navigation from './GlobalCompactNavigation.jsx'"), 'Legacy navigation import must remain active.');
check(shell.includes('<Navigation {...props} />'), 'Legacy navigation must remain mounted.');
check(!shell.includes("lazy(() => import('./GlobalNavigationConceptV2.jsx'))"), 'PR 482 navigation bridge must remain disabled after rollback.');
check(!shell.includes('<GlobalNavigationConceptV2'), 'PR 482 navigation component must not be mounted.');
check(shell.includes("lazy(() => import('./GlobalHomeGoogleHeroOverlay.jsx'))"), 'Homepage Hero overlay must remain available.');
check(legacyNavigation.length > 1000, 'Legacy navigation source appears incomplete.');

const prohibitedRuntime = /\b(fetch|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i;
check(!prohibitedRuntime.test(archivedBridge), 'Archived navigation bridge must remain free of network and background runtime work.');
check(!/animation\s*:[^;]*infinite/i.test(archivedCss), 'Archived navigation CSS must not add infinite animations.');

if (failures.length) {
  console.error('\nNavigation rollback guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation rollback guard passed.');
console.log('Active navigation: GlobalCompactNavigation (version before PR 482).');
console.log('PR 482 bridge mounted: no.');
console.log('New network or background work introduced: 0.');
