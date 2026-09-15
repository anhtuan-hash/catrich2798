import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  PRESENTATION_OVERRIDE_EVENT,
  PRESENTATION_OVERRIDE_STORAGE_KEY,
  readStoredPresentationOverride,
  resolvePresentationMode,
  writePresentationOverride,
} from '../src/device/presentationMode.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
const events = [];
class MockCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}
const windowLike = {
  localStorage: storage,
  CustomEvent: MockCustomEvent,
  dispatchEvent(event) { events.push(event); return true; },
};

assert.equal(readStoredPresentationOverride(storage), null);
assert.equal(writePresentationOverride('mobile', windowLike), 'mobile');
assert.equal(storage.getItem(PRESENTATION_OVERRIDE_STORAGE_KEY), 'mobile');
assert.equal(readStoredPresentationOverride(storage), 'mobile');
assert.equal(events.at(-1)?.type, PRESENTATION_OVERRIDE_EVENT);
assert.deepEqual(events.at(-1)?.detail, { value: 'mobile' });

const desktopEnvironment = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  platform: 'MacIntel',
  maxTouchPoints: 0,
  screenWidth: 1440,
  screenHeight: 900,
  orientationType: 'landscape-primary',
};
assert.equal(resolvePresentationMode(desktopEnvironment, 'mobile').presentationMode, 'mobile');
assert.equal(resolvePresentationMode(desktopEnvironment, null).presentationMode, 'desktop');

writePresentationOverride(null, windowLike);
assert.equal(storage.getItem(PRESENTATION_OVERRIDE_STORAGE_KEY), null);
assert.equal(readStoredPresentationOverride(storage), null);
assert.deepEqual(events.at(-1)?.detail, { value: null });

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
