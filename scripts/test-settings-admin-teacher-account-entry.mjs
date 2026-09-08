import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalSettingsAdminBridge.jsx', 'utf8');
const creator = fs.readFileSync('src/components/SettingsTeacherAccountCreator.jsx', 'utf8');
const css = fs.readFileSync('src/components/SettingsTeacherAccountCreator.css', 'utf8');

assert.match(
  bridge,
  /#\/settings\?section=admin/,
  'Admin navigation is intentionally merged into the Settings route; the account creator must work there.',
);
assert.match(
  bridge,
  /SettingsTeacherAccountCreator/,
  'The Settings admin bridge must import the account creator directly.',
);
assert.match(
  bridge,
  /<SettingsTeacherAccountCreator\s+language=\{props\.language\}\s*\/>/,
  'The merged Settings admin surface must render the account creator directly in its React tree.',
);
assert.match(creator, /Tạo tài khoản giáo viên/, 'The creator must expose an unmistakable Vietnamese create-account heading.');
assert.match(creator, /invokeTeacherAccounts/, 'The visible creator must call the existing secured teacher-account service.');
assert.match(creator, /action:\s*['"]bulk_create['"]/, 'The visible creator must use the existing bulk_create action.');
assert.match(creator, /bes-auth-users-updated/, 'Successful creation must refresh Admin user data.');
assert.match(css, /\.settings-teacher-account-creator\{/, 'The visible creator must have dedicated styling.');
assert.match(css, /background:#f4f8ff/, 'The creator must be visually distinct on the Settings admin surface.');
assert.match(css, /\.settings-teacher-account-creator__open/, 'The create action must have explicit prominent button styling.');

console.log('PASS: Settings-merged Admin visibly owns the teacher account creator.');
