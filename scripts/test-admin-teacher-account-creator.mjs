import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const entry = await readFile(new URL('../public/admin-teacher-account-entry.js', import.meta.url), 'utf8');
const panel = await readFile(new URL('../src/components/BulkTeacherAccountsPanel.jsx', import.meta.url), 'utf8');

assert.ok(
  index.includes('/admin-teacher-account-entry.js'),
  'Admin teacher-account entry runtime must be loaded by index.html.',
);
assert.ok(
  entry.includes('#admin-v41-accounts'),
  'Teacher-account entry must attach to the Admin system-accounts section.',
);
assert.ok(
  entry.includes('Tạo tài khoản giáo viên'),
  'Admin must have an explicit Vietnamese teacher-account creation action.',
);
assert.ok(
  entry.includes('.bes-bulk-accounts__launcher'),
  'Admin entry must open the existing secured teacher-account manager.',
);
assert.ok(
  panel.includes("action: 'bulk_create'"),
  'Existing teacher-account manager must retain the bulk-create backend flow.',
);
assert.ok(
  panel.includes("isAdminRole(currentUser?.role)"),
  'Teacher-account manager must remain restricted to admins.',
);

console.log('PASS: Admin has a secured teacher-account creation entry point.');
