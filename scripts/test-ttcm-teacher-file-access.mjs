import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const main = read('src/main.jsx');
const gate = read('src/components/TeacherFirstLoginPasswordGate.jsx');
const workHub = read('src/components/GlobalTtcmNavigationTab.jsx');
const delivery = read('src/utils/workHubDelivery.js');
const security = read('server/api/_security.js');
const stream = read('serverless-handlers/work-hub-file-stream.js');
const api = read('api/teacher-accounts.js');
const migration = read('supabase/migrations/20261012081000_track_actual_password_rotation.sql');

assert.match(main, /<TeacherFirstLoginPasswordGate currentUser=\{currentUser\}/,
  'The active app must mount the first-login gate for signed-in teachers.');
assert.match(gate, /action: 'get_self'/);
assert.match(gate, /profile\?\.mustChangePassword === true/);
assert.match(gate, /changeCurrentPassword\(/);
assert.match(gate, /currentPassword: form\.current, newPassword: form\.next/);
assert.match(gate, /action: 'password_changed'/);
assert.match(gate, /refreshed\.profile\?\.mustChangePassword === true/);
assert.doesNotMatch(gate, /\.from\('profiles'\)\.update/,
  'The browser must never clear the database password gate.');
assert.match(api, /profile\?\.must_change_password !== false/,
  'The password_changed API must require a verified database rotation.');
assert.match(security, /if \(profile\.must_change_password === true\)/,
  'The backend must keep the download gate enabled.');
assert.match(migration, /OLD\.encrypted_password IS DISTINCT FROM NEW\.encrypted_password/,
  'Only a real password hash update clears the server-side gate.');
assert.match(stream, /await requireApprovedUser\(req/);
assert.match(stream, /await assertAccessAndFile\(context, itemId, fileId\)/,
  'File access must verify user rights and attachment ownership.');
assert.match(delivery, /fetchWorkHubAttachmentBlob\(attachment, \{ itemId, disposition: 'attachment' \} \)/,
  'Single file downloads must continue using the authenticated file stream.');
assert.match(workHub, /await import\('jszip'\)/);
assert.match(workHub, /await fetchWorkHubAttachmentBlob\(\{ \.\.\.attachment, item_id: item\.id \}/,
  'ZIP downloads must fetch each authorized attachment, never public Drive URLs.');
assert.match(workHub, /zip\.file\(fileName, blob\)/);
assert.match(workHub, /Tải ZIP/);
console.log('PASS: TTCM teacher file downloads require real password rotation and create one authenticated ZIP.');
