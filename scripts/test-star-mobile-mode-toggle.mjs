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

const hook = read('src/hooks/usePresentationMode.js');
const portal = read('src/components/HomeParticleSignaturePortal.jsx');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const css = read('src/components/BrianPulseLogo.css');

assert.match(portal, /brian-pulse-logo-trigger--static/);
assert.doesNotMatch(portal, /writePresentationOverride/);
assert.doesNotMatch(portal, /onClick\s*=/);
assert.doesNotMatch(portal, /<button/);
assert.doesNotMatch(portal, /Chuyển sang giao diện mobile/);

assert.doesNotMatch(hook, /readStoredPresentationOverride/);
assert.doesNotMatch(hook, /PRESENTATION_OVERRIDE_EVENT/);
assert.match(hook, /removeItem\(PRESENTATION_OVERRIDE_STORAGE_KEY\)/);

assert.doesNotMatch(navigation, /writePresentationOverride/);
assert.doesNotMatch(navigation, /forcedMobile/);
assert.doesNotMatch(navigation, /bes-mobile-desktop-return/);

assert.match(css, /\.brian-pulse-logo-trigger\s*\{[^}]*cursor\s*:\s*default/i);
assert.match(css, /\.brian-pulse-logo-trigger \.brian-pulse-logo__canvas\s*\{\s*cursor\s*:\s*default/i);
assert.doesNotMatch(css, /data-presentation-override=['"]mobile['"]/);
assert.doesNotMatch(css, /bes-mobile-desktop-return/);

console.log('✓ Star is decorative; desktop → mobile toggle retired');
