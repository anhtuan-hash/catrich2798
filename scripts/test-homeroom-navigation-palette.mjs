import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  clampHomeroomNavigationLauncherBottom,
  createHomeroomNavigationScrollTracker,
  homeroomGradeNavigationKey,
  homeroomNavigationPaletteKey,
  normalizeHomeroomGradeNavigationPreference,
  normalizeHomeroomNavigationPreference,
  readHomeroomGradeNavigationPreference,
  readHomeroomNavigationPreference,
  updateHomeroomNavigationScrollTracker,
  writeHomeroomGradeNavigationPreference,
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
  launcherBottom: null,
});
assert.equal(writeHomeroomNavigationPreference(teacher, { pinned: false, collapsed: true, launcherBottom: 184 }, storage), true);
assert.deepEqual(readHomeroomNavigationPreference(teacher, storage), {
  pinned: false,
  collapsed: true,
  corner: 'bottom-right',
  launcherBottom: 184,
});
assert.equal(clampHomeroomNavigationLauncherBottom(20, 800, 58), 92);
assert.equal(clampHomeroomNavigationLauncherBottom(900, 800, 58), 726);
assert.notEqual(homeroomGradeNavigationKey(teacher), homeroomNavigationPaletteKey(teacher));
assert.deepEqual(normalizeHomeroomGradeNavigationPreference({ pinned: true, collapsed: true }), {
  pinned: true,
  collapsed: false,
});
assert.equal(writeHomeroomGradeNavigationPreference(teacher, { pinned: false, collapsed: true }, storage), true);
assert.deepEqual(readHomeroomGradeNavigationPreference(teacher, storage), {
  pinned: false,
  collapsed: true,
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
const gradebook = fs.readFileSync(new URL('../src/components/homeroom/HomeroomLearningGradebook.jsx', import.meta.url), 'utf8');
const gradeCss = fs.readFileSync(new URL('../src/components/homeroom/HomeroomLearningGradebook.css', import.meta.url), 'utf8');
assert.match(component, /HOMEROOM_NAV_PALETTE_IDLE_MS/);
assert.match(component, /EDITABLE_SELECTOR/);
assert.match(component, /OPEN_DIALOG_SELECTOR/);
assert.match(component, /aria-pressed=\{palette\.pinned\}/);
assert.match(component, /handleLauncherPointerMove/);
assert.match(component, /launcherPeeked/);
assert.match(component, /--hr-tabs-launcher-bottom/);
assert.match(css, /\.hr-tabs-dock\.is-collapsed/);
assert.match(css, /\.hr-tabs-dock\.is-collapsed\.is-peeked/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(gradebook, /function GradebookNavigationPalette/);
assert.match(gradebook, /dirty \|\| blocked/);
assert.match(gradebook, /readHomeroomGradeNavigationPreference/);
assert.match(gradeCss, /\.hr-grade-navigation-dock\.is-collapsed/);
assert.match(gradeCss, /\.hr-grade-navigation-launcher/);
assert.match(gradeCss, /prefers-reduced-motion: reduce/);

console.log('✓ Hai thanh điều hướng palette: hai bước, kéo dọc, tự thu an toàn và lưu trạng thái hợp lệ.');
