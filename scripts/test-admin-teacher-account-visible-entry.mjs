import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry = fs.readFileSync('public/admin-teacher-account-entry.js', 'utf8');

assert.match(entry, /PICKER_ENTRY_ID/, 'account entry script must own a dedicated teacher-picker entry');
assert.match(entry, /#admin-v41-teacher-list/, 'account entry must anchor to the visible teacher picker/list');
assert.match(entry, /Tạo tài khoản giáo viên/, 'teacher picker must expose a visible create-account action');
assert.match(entry, /teacher-picker-create-account/, 'visible picker action must have a stable dedicated class');
assert.match(entry, /requestManagerOpen/, 'picker action must open the existing teacher account manager');
assert.match(entry, /bes-open-teacher-account-manager/, 'picker action must use the existing account-manager command');
assert.match(
  entry,
  /setProperty\(['"]display['"],\s*['"]inline-flex['"],\s*['"]important['"]\)/,
  'visible picker action must resist the legacy selected-teacher hide rule',
);
assert.match(entry, /MutationObserver/, 'entry must be restored if the permission picker rerenders');

console.log('Admin teacher account visible entry contract verified.');
