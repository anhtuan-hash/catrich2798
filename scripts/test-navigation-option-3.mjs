import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const compact = fs.readFileSync('src/components/GlobalCompactNavigation.jsx', 'utf8');
const mobile = fs.readFileSync('src/components/mobile/MobileAppShell.jsx', 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

// Guard the navigation that is actually mounted on main today.
check(shell.includes("import Navigation from './GlobalCompactNavigation.jsx'"), 'GlobalCompactNavigation must remain the desktop navigation.');
check(shell.includes("import MobileAppShell from './mobile/MobileAppShell.jsx'"), 'MobileAppShell must remain the mobile navigation.');
check(shell.includes("{mobile ? <MobileAppShell {...props} /> : <Navigation {...props} />}"), 'Desktop/mobile navigation selection must remain presentation-driven.');
check(shell.includes('<GlobalHeroGovernance route={props.route} />'), 'Original Homepage Hero governance must remain active.');

// These layers belonged to retired navigation experiments. Reintroducing them
// on top of the compact/mobile shells causes duplicate navigation and CSS authority.
const retiredLayers = [
  'GlobalNavigationConceptV2',
  'GlobalHomeGoogleHeroOverlay',
  "import './GlobalNavigationGoogleRefinement.css'",
  "import './GlobalNavigationSearchV3.css'",
  "import './GlobalNavigationOption3.css'",
  "import './GlobalNavigationOption3Stability.css'",
  "import './GlobalNavigationUtilityPolish.css'",
  "import './GlobalNavigationGoogleM3Polish.css'",
];
retiredLayers.forEach((layer) => check(!shell.includes(layer), `${layer} must remain retired from GlobalFlatNavigation.`));

// Current shells must retain their own scoped CSS and permission-aware routing.
check(compact.includes("import './GlobalCompactNavigation.css';"), 'Desktop compact navigation CSS must remain scoped through its component.');
check(compact.includes("import { hasRouteAccess } from '../utils/permissions.js';"), 'Desktop navigation permission checks must remain active.');
check(mobile.includes("import '../../styles/mobile/mobile-shell.css';"), 'Mobile shell CSS must remain scoped through MobileAppShell.');
check(mobile.includes('buildMobileNavigationModel'), 'Mobile navigation must continue to use the shared navigation model.');
check(mobile.includes('canAccessRoute'), 'Mobile navigation must continue to apply route permissions.');
check(mobile.includes("['ttcm', 'brian-nav__ttcm-tab']"), 'TTCM must remain available through the original bridge on mobile.');

// Keep direct navigation code free of continuous polling or streaming ownership.
const prohibitedBackgroundWork = /\b(WebSocket|EventSource|setInterval)\s*\(/i;
check(!prohibitedBackgroundWork.test(compact), 'Desktop navigation must not add streaming or polling loops.');
check(!prohibitedBackgroundWork.test(mobile), 'Mobile navigation must not add streaming or polling loops.');

if (failures.length) {
  console.error('Current compact/mobile navigation guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Current compact/mobile navigation guard passed.');
console.log('Desktop: GlobalCompactNavigation.');
console.log('Mobile: MobileAppShell.');
console.log('Retired navigation experiment layers: unloaded.');
console.log('Homepage Hero: original CMS Hero governance remains active.');
