import fs from 'node:fs';
import assert from 'node:assert/strict';

const manager = fs.readFileSync('public/admin-teacher-permission-manager.js', 'utf8');
const viewportCss = fs.readFileSync('public/admin-teacher-permission-viewport-v3.css', 'utf8');

assert.match(manager, /Tạo tài khoản giáo viên/, 'teacher picker must expose a visible create-account action');
assert.match(manager, /data-action=["']create-account["']/, 'teacher picker create-account action must have a stable action id');
assert.match(manager, /teacher-picker-create-account/, 'teacher picker create-account button must have a dedicated class');
assert.match(manager, /bes-open-teacher-account-manager/, 'teacher picker create-account action must open the account manager');
assert.match(manager, /mode:\s*["']create["']/, 'teacher picker create-account action must request create mode');

assert.doesNotMatch(
  viewportCss,
  /admin-v41-has-teacher-selection\s+\.teacher-picker-floating-create-account\s*,?[\s\S]{0,140}?display:\s*none\s*!important/i,
  'selecting a teacher must not hide the create-account entry point',
);
assert.match(viewportCss, /\.teacher-picker-create-account/, 'create-account entry must have explicit viewport styling');

console.log('Admin teacher account visible entry contract verified.');
