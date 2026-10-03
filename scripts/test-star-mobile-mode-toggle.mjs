import fs from 'node:fs';
import assert from 'node:assert/strict';
import { resolvePresentationMode } from '../src/device/presentationMode.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const desktopEnvironment = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  platform: 'MacIntel',
  maxTouchPoints: 0,
  screenWidth: 1440,
  screenHeight: 900,
  orientationType: 'landscape-primary',
};
const phoneEnvironment = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)',
  platform: 'iPhone',
  maxTouchPoints: 5,
  userAgentDataMobile: true,
  screenWidth: 393,
  screenHeight: 852,
  orientationType: 'portrait-primary',
};

assert.equal(resolvePresentationMode(desktopEnvironment, null).presentationMode, 'desktop');
assert.equal(resolvePresentationMode(phoneEnvironment, null).presentationMode, 'mobile');

const navigation = read('src/components/GlobalFlatNavigation.jsx');

// The user-facing Star has been removed from desktop navigation completely.
assert.doesNotMatch(navigation, /HomeParticleSignaturePortal/);
assert.doesNotMatch(navigation, /brian-pulse-logo-trigger/);

// Keep device-driven mobile presentation intact.
assert.match(navigation, /MobileAppShell/);
assert.match(navigation, /presentation\.presentationMode === 'mobile'/);

console.log('✓ Star is removed from navigation while device-driven mobile mode remains intact');
