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

const portal = read('src/components/HomeParticleSignaturePortal.jsx');
const css = read('src/components/BrianPulseLogo.css');
const navigation = read('src/components/GlobalFlatNavigation.jsx');

assert.match(portal, /brian-pulse-logo-trigger--static/);
assert.doesNotMatch(portal, /writePresentationOverride/);
assert.doesNotMatch(portal, /onClick\s*=/);
assert.doesNotMatch(portal, /<button/);
assert.doesNotMatch(portal, /Chuyển sang giao diện mobile/);

assert.match(css, /\.brian-pulse-logo-trigger\s*\{[^}]*cursor\s*:\s*default/i);
assert.match(css, /\.brian-pulse-logo-trigger \.brian-pulse-logo__canvas\s*\{\s*cursor\s*:\s*default/i);

// Keep device-driven mobile presentation intact; only the Star entry point is retired.
assert.match(navigation, /MobileAppShell/);
assert.match(navigation, /presentation\.presentationMode === 'mobile'/);

console.log('✓ Star is decorative and cannot switch desktop to mobile mode');
