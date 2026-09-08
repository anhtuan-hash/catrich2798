import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalSettingsAdminBridge.jsx', 'utf8');
const adminPage = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');
const panel = fs.readFileSync('src/components/BulkTeacherAccountsPanel.jsx', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert.match(
  bridge,
  /#\/settings\?section=admin/,
  'Admin navigation is intentionally merged into the Settings route; the account creator must work there.',
);
assert.match(
  adminPage,
  /BulkTeacherAccountsPanel/,
  'AdminPage itself must render the teacher-account creator instead of relying on an external DOM shim.',
);
assert.match(
  adminPage,
  /<BulkTeacherAccountsPanel[^>]*adminSurface/,
  'The embedded AdminPage account creator must explicitly opt into the merged Settings admin surface.',
);
assert.match(
  panel,
  /adminSurface\s*=\s*false/,
  'BulkTeacherAccountsPanel must support an explicit embedded admin surface.',
);
assert.match(
  panel,
  /isAdminRole\(currentUser\?\.role\)[\s\S]{0,160}adminSurface/,
  'Account-management authorization must be based on admin role plus the embedded admin surface, not only route === admin.',
);
assert.match(
  indexHtml,
  /admin-teacher-account-entry\.js\?v=2/,
  'The fallback entry script URL must be version-bumped so clients cannot keep the stale v1 script.',
);

console.log('PASS: Settings-merged Admin visibly owns the teacher account creator.');
