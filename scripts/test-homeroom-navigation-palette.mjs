import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createHomeroomNavigationScrollTracker,
  homeroomNavigationPaletteKey,
  normalizeHomeroomNavigationPreference,
  readHomeroomNavigationPreference,
  updateHomeroomNavigationScrollTracker,
  writeHomeroomNavigationPreference,
} from '../src/utils/homeroomNavigationPalette.js';

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
};
const teacher = { id: 'Teacher 01', email: 'teacher@example.test' };

assert.match(homeroomNavigationPaletteKey(teacher), /teacher-01$/);
assert.deepEqual(normalizeHomeroomNavigationPreference({ pinned: true, collapsed: true }), {
  pinned: true,
  collapsed: false,
  corner: 'bottom-right',
});
assert.equal(writeHomeroomNavigationPreference(teacher, { pinned: false, collapsed: true }, storage), true);
assert.deepEqual(readHomeroomNavigationPreference(teacher, storage), {
  pinned: false,
  collapsed: true,
  corner: 'bottom-right',
});

let tracker = createHomeroomNavigationScrollTracker(100);
let update = updateHomeroomNavigationScrollTracker(tracker, 130);
assert.equal(update.intent, '');
tracker = update.tracker;
update = updateHomeroomNavigationScrollTracker(tracker, 170);
assert.equal(update.intent, 'collapse');
tracker = update.tracker;
update = updateHomeroomNavigationScrollTracker(tracker, 150);
assert.equal(update.intent, '');
tracker = update.tracker;
update = updateHomeroomNavigationScrollTracker(tracker, 140);
assert.equal(update.intent, 'expand');

const component = fs.readFileSync(new URL('../src/components/homeroom/HomeroomNavigationPalette.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/homeroom/HomeroomNavigationPalette.css', import.meta.url), 'utf8');
assert.match(component, /HOMEROOM_NAV_PALETTE_IDLE_MS/);
assert.match(component, /EDITABLE_SELECTOR/);
assert.match(component, /OPEN_DIALOG_SELECTOR/);
assert.match(component, /aria-pressed=\{palette\.pinned\}/);
assert.match(css, /\.hr-tabs-dock\.is-collapsed/);
assert.match(css, /prefers-reduced-motion:reduce/);

console.log('✓ Thanh điều hướng palette: lưu trạng thái, ngưỡng cuộn và hợp đồng giao diện hợp lệ.');
