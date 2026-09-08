import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../public/admin-teacher-account-entry.js', import.meta.url), 'utf8');
const panel = await readFile(new URL('../src/components/BulkTeacherAccountsPanel.jsx', import.meta.url), 'utf8');

assert.match(
  entry,
  /new CustomEvent\(['"]bes-open-teacher-account-manager['"]\)/,
  'System accounts entry must dispatch a direct open command instead of depending on the floating launcher DOM node.',
);
assert.doesNotMatch(
  entry,
  /if \(!accounts \|\| !launcher \|\| existing\) return;/,
  'System accounts entry must render even while the secured manager launcher has not mounted yet.',
);
assert.match(
  panel,
  /addEventListener\(['"]bes-open-teacher-account-manager['"]\s*,/,
  'BulkTeacherAccountsPanel must listen for the direct open command.',
);
assert.match(
  panel,
  /setOpen\(true\)/,
  'Direct open command must open the teacher-account manager.',
);

console.log('PASS: Admin teacher-account entry opens independently of launcher mount timing.');
