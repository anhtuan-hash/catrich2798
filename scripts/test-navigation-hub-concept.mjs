import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('src/components/GlobalFlatNavigation.jsx');
const compact = read('src/components/GlobalCompactNavigation.jsx');
const mobile = read('src/components/mobile/MobileAppShell.jsx');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

// Current navigation architecture: desktop uses GlobalCompactNavigation,
// phone/tablet presentation uses the dedicated MobileAppShell.
check(shell.includes("import Navigation from './GlobalCompactNavigation.jsx'"), 'Desktop compact navigation import must remain active.');
check(shell.includes("import MobileAppShell from './mobile/MobileAppShell.jsx'"), 'MobileAppShell import must remain active.');
check(shell.includes("const mobile = presentation.presentationMode === 'mobile';"), 'Presentation mode must continue to control the mobile shell.');
check(shell.includes("{mobile ? <MobileAppShell {...props} /> : <Navigation {...props} />}"), 'Desktop/mobile navigation split must remain intact.');
check(!shell.includes('GlobalNavigationConceptV2'), 'Retired Navigation Concept V2 must not be remounted.');

// Original bridge tabs remain mounted after the active shell so the mobile app can
// mirror their permissions/actions without duplicating business logic.
const bridgeOrder = [
  '<GlobalDashboardNavigationTab {...props} />',
  '<GlobalHomeroomNavigationTab {...props} />',
  '<GlobalGradebookNavigationTab {...props} />',
  '<GlobalReportsNavigationTab {...props} />',
  '<GlobalTtcmNavigationTab {...props} />',
  '<GlobalAttendanceNavigationTab {...props} />',
];
let previousIndex = -1;
for (const token of bridgeOrder) {
  const index = shell.indexOf(token);
  check(index > previousIndex, `${token} must remain mounted in the approved bridge order.`);
  previousIndex = index;
}

check(mobile.includes("['ttcm', 'brian-nav__ttcm-tab']"), 'Mobile shell must continue to discover the TTCM bridge.');
check(mobile.includes("['attendance', 'brian-nav__attendance-tab']"), 'Mobile shell must continue to discover the Attendance bridge.');
check(mobile.includes("action: 'original-bridge'"), 'Mobile shell must proxy original bridge actions instead of reimplementing them.');
check(mobile.includes('readOriginalBridgeItems'), 'Mobile shell must keep its bridge synchronization path.');

// Core desktop navigation contracts.
check(compact.includes("window.dispatchEvent(new CustomEvent('bes-command-palette-open'))"), 'Command palette launcher must remain available.');
check(compact.includes("hasRouteAccess(currentUser, 'apps')"), 'Apps permission guard must remain active.');
check(compact.includes("import { launchRoute } from '../utils/navigation.js';"), 'Navigation must continue to use the shared route launcher.');

// Keep navigation free of direct polling/streaming/network ownership. Those
// concerns belong to the existing delivery/runtime utilities.
const prohibitedRuntime = /\b(fetch|WebSocket|EventSource|setInterval)\s*\(/i;
check(!prohibitedRuntime.test(compact), 'Compact navigation must not own direct network, streaming, or polling work.');

check(shell.includes('<GlobalHeroGovernance route={props.route} />'), 'Original Homepage Hero governance must remain active.');
check(!shell.includes('GlobalHomeGoogleHeroOverlay'), 'Retired Homepage Hero overlay must remain inactive.');

if (failures.length) {
  console.error('\nCurrent navigation architecture guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Current navigation architecture guard passed.');
console.log('Desktop navigation: GlobalCompactNavigation.');
console.log('Mobile navigation: MobileAppShell with original bridge actions.');
console.log('Retired Navigation Concept V2: not mounted.');
console.log('Homepage Hero: original CMS Hero governance remains active.');
