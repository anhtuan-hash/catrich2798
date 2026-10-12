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
const mfa = read('src/components/AdminMfaSecurity.jsx');
const mfaCss = read('src/components/AdminMfaSecurity.css');
const center = read('src/components/UsernameAccountCenter.jsx');

// Enrollment is voluntary: no MFA factor is provisioned for existing users.
assert.match(mfa, /supabase\.auth\.mfa\.enroll/);
assert.match(mfa, /supabase\.auth\.mfa\.challengeAndVerify/);
assert.match(mfa, /supabase\.auth\.mfa\.getAuthenticatorAssuranceLevel/);
assert.match(mfa, /status === 'verified'/);
assert.match(mfa, /supabase\.auth\.mfa\.unenroll/);
const main = read('src/main.jsx');
const settings = read('src/pages/Settings.jsx');
assert.match(main, /const AdminMfaSecurity = lazy\(/, 'MFA must be imported in the actual BRIAN app entrypoint.');
assert.match(main, /<AdminMfaSecurity user=\{currentUser\}/, 'Global MFA challenge must mount for an authenticated Admin.');
assert.match(settings, /id="bes-admin-mfa-settings-target"/, 'Settings must expose an MFA portal target.');
assert.match(settings, /id="settings-mfa"/, 'Admin MFA section must have a navigable anchor.');
assert.match(settings, /'mfa', '2fa'/, 'Settings search must find MFA.');
assert.match(mfa, /document\.getElementById\('bes-admin-mfa-settings-target'\)/, 'MFA must target the active Settings page, not legacy account center.');
assert.doesNotMatch(mfa, /route === 'settings' && profileHost/, 'Legacy portal host silently hides MFA.');
assert.ok(mfaCss.includes('.bes-mfa-shield'));
assert.match(mfa, /state\.factors\.find\(\(item\) => item\.id === selectedFactorId\)/, 'Login must use the selected factor, not the first one.');
assert.match(mfa, /state\.factors\.map\(\(factor, index\) =>/, 'Backup authenticators must be selectable.');
assert.match(mfa, /Mac - Apple Passwords/, 'User must be able to enroll a named macOS Passwords factor.');
assert.match(mfa, /'apple'\)/, 'Mac enrollment action must be present.');
assert.match(mfa, /id="bes-mfa-login-factor"/, 'An accessible authenticator selector must exist.');
assert.match(mfa, /webauthnApi\.register/, 'Touch ID must use a real WebAuthn enrollment ceremony.');
assert.match(mfa, /webauthnApi\.authenticate/, 'Touch ID must verify a real MFA WebAuthn factor.');
assert.match(mfa, /factor\.factor_type === 'webauthn'/, 'Verified biometric factors must be read from Supabase Auth.');
assert.match(mfa, /result\.data\?\.currentLevel !== 'aal2'/, 'Biometric verification must promote a valid Supabase JWT to AAL2.');
assert.match(mfa, /mfa_web_authn_\(enroll\|verify\)_not_enabled/, 'Show the service-configuration error instead of pretending Touch ID succeeded.');
assert.match(mfa, /state\.factors\.length \?/, 'TOTP must remain available as an MFA backup.');
assert.match(mfa, /esl-brian\.vercel\.app/, 'Biometric credentials must be bound to the production relying-party origin.');



// Once an Admin has enrolled a verified factor, both account mutation servers
// must require a token already upgraded to aal2.
assert.match(api, /session\.db\.auth\.admin\.mfa\.listFactors/);
assert.match(api, /jwtAssuranceLevel\(session\.token\) !== 'aal2'/);
assert.match(edge, /adminClient\.auth\.admin\.mfa\.listFactors/);
assert.match(edge, /hasVerifiedFactor && assuranceLevel !== 'aal2'/);

console.log('PASS: BRIAN account authorization, password rotation, audit, and staged Admin MFA contracts are hardened.');
