import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const presentation = read('src/device/presentationMode.js');
const hook = read('src/hooks/usePresentationMode.js');
const portal = read('src/components/HomeParticleSignaturePortal.jsx');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const css = read('src/components/BrianPulseLogo.css');

assert.match(presentation, /PRESENTATION_OVERRIDE_STORAGE_KEY/);
assert.match(presentation, /PRESENTATION_OVERRIDE_EVENT/);
assert.match(presentation, /readStoredPresentationOverride/);
assert.match(presentation, /writePresentationOverride/);
assert.match(hook, /readStoredPresentationOverride/);
assert.match(hook, /PRESENTATION_OVERRIDE_EVENT/);
assert.match(hook, /window\.addEventListener\(PRESENTATION_OVERRIDE_EVENT/);
assert.match(portal, /writePresentationOverride\('mobile'\)/);
assert.match(portal, /brian-pulse-logo-trigger/);
assert.match(portal, /Chuyển sang giao diện mobile/);
assert.match(navigation, /presentation\.override === 'mobile'/);
assert.match(navigation, /bes-mobile-desktop-return/);
assert.match(navigation, /writePresentationOverride\(null\)/);
assert.match(navigation, /presentationOverride/);
assert.match(css, /brian-pulse-logo-trigger/);
assert.match(css, /data-presentation-override=['"]mobile['"]/);
assert.match(css, /bes-mobile-desktop-return/);

console.log('✓ star → mobile presentation mode contract');
