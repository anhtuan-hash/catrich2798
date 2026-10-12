import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const api = read('api/teacher-accounts.js');
const edge = read('supabase/functions/teacher-accounts/index.ts');
const shared = read('server/api/_security.js');
const auth = read('src/utils/auth.js');
const insert = read('supabase/migrations/20261012080000_profiles_self_insert_hardening.sql');
const rotation = read('supabase/migrations/20261012081000_track_actual_password_rotation.sql');

// Verified tokens alone must not confer authorization without approved DB profiles.
assert.match(api, /!baseQuery\.data \|\| baseQuery\.data\.approved !== true/);
assert.match(api, /profile\.approved === true && String\(profile\.role/);
assert.doesNotMatch(api, /user\.user_metadata\?\.role \|\| 'teacher'/);
assert.match(edge, /!callerProfile \|\| callerProfile\.approved !== true/);
assert.match(shared, /if \(!profile \|\| typeof profile !== 'object'\) return false/);
assert.match(shared, /const role = assignedRole \|\| normalizeRole\(profile\?\.role \|\| 'teacher'\)/);
assert.doesNotMatch(shared, /metadataRole = user\.app_metadata/);
assert.match(auth, /const role = normalizeSystemRole\(profile\?\.role \|\| 'teacher'\)/);
assert.doesNotMatch(auth, /normalizeSystemRole\(isConfiguredAdmin\(email\)/);

// A self-created account must start pending and unprivileged.
assert.match(insert, /ALTER POLICY "Users can insert their own profile"/);
assert.match(insert, /role = 'teacher'/);
assert.match(insert, /approved = false/);

// The first-login gate is cleared only after an actual Auth password-hash change.
assert.match(rotation, /OLD\.encrypted_password/);
assert.match(rotation, /must_change_password = false/);
assert.match(api, /profile\?\.must_change_password !== false/);
assert.match(edge, /freshProfile\?\.must_change_password !== false/);
assert.doesNotMatch(api, /update\(\{ must_change_password: false/);
assert.doesNotMatch(edge, /update\(\{ must_change_password: false/);
assert.match(shared, /profile\.must_change_password === true/);

// Sensitive account operations must be auditable without exposing credentials.
assert.match(api, /async function recordAccountAudit\(session, action, status/);
assert.match(api, /recordAccountAudit\(session, 'admin_action_denied'/);
assert.match(api, /recordAccountAudit\(session, action, result\.status/);
assert.match(edge, /const audit = async \(eventAction: string, status: string/);
assert.match(edge, /await audit\('reset_password', 'ok'\)/);
assert.match(edge, /await audit\('bulk_create'/);
console.log('PASS: BRIAN account authorization, password rotation, and account audit contracts are hardened.');
