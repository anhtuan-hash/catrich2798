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
assert.doesNotMatch(center, /<AdminMfaSecurity/, 'Legacy account center must not mount a duplicate MFA panel.');
assert.match(settings, /id="bes-admin-mfa-settings-target"/, 'Settings must expose an MFA portal target.');
assert.match(settings, /id="settings-mfa"/, 'Admin MFA section must have a navigable anchor.');
assert.match(settings, /'settings-mfa'[\s\S]*?'MFA \/ 2FA'/, 'Admin Settings navigation must advertise MFA/2FA as a discoverable security option.');
assert.match(mfa, /document\.getElementById\('bes-admin-mfa-settings-target'\)/, 'MFA must target the active Settings page, not legacy account center.');
assert.doesNotMatch(mfa, /route === 'settings' && profileHost/, 'Legacy portal host silently hides MFA.');
assert.ok(mfaCss.includes('.bes-mfa-shield'));
assert.match(mfa, /state\.factors\.find\(\(item\) => item\.id === selectedFactorId\)/, 'Login must use the selected factor, not the first one.');
assert.match(mfa, /state\.factors\.map\(\(factor, index\) =>/, 'Backup authenticators must be selectable.');
assert.match(mfa, /Mac - Apple Passwords/, 'User must be able to enroll a named macOS Passwords factor.');
assert.match(mfa, /'apple'\)/, 'Mac enrollment action must be present.');
assert.match(mfa, /id="bes-mfa-login-factor"/, 'An accessible authenticator selector must exist.');
assert.match(mfa, /VITE_WEB_AUTHN_MFA_ENABLED === 'true'/, 'Experimental biometric MFA must remain disabled until Supabase enables backend support.');
assert.match(mfa, /disabled=\{!webauthnMfaEnabled \|\| busy/, 'Biometric enrollment must not appear functional while Supabase rejects it.');
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


const practiceGuard = read('supabase/migrations/20261012095000_public_practice_rpc_abuse_guard.sql');
// Anonymous shared-link RPCs retain their established signature/response paths,
// but now use the existing DB-backed limiter rather than in-memory server quotas.
assert.match(practiceGuard, /CREATE OR REPLACE FUNCTION public\.qb_public_practice_get\(p_token text\)/);
assert.match(practiceGuard, /CREATE OR REPLACE FUNCTION public\.qb_public_practice_submit\(p_token text, p_session_id uuid, p_learner_label text, p_responses jsonb\)/);
assert.equal((practiceGuard.match(/app_public_rate_limit_allow\(/g) || []).length, 2);
assert.match(practiceGuard, /'qb_public_practice_get'/);
assert.match(practiceGuard, /'qb_public_practice_submit'/);
assert.equal((practiceGuard.match(/'error','rate_limited'/g) || []).length, 2);
assert.match(practiceGuard, /pg_column_size\(p_responses\) > 524288/);
assert.match(practiceGuard, /jsonb_array_length\(p_responses\) > 500/);
assert.match(practiceGuard, /jsonb_typeof\(p_responses\) <> 'array'/);
assert.match(practiceGuard, /assessment_practice_attempts/);
assert.match(practiceGuard, /correctAnswer/);
assert.equal((practiceGuard.match(/\$function\$;/g) || []).length, 2);


const adminMfaDb = read('supabase/migrations/20261012102000_admin_profile_mfa_verified_email.sql');
// A verified Supabase aal2 claim is required for ADMIN profile updates only if
// the actor has deliberately enrolled a verified second factor.
assert.match(adminMfaDb, /CREATE OR REPLACE FUNCTION private\.bes_admin_mfa_session_allowed\(\)/);
assert.match(adminMfaDb, /coalesce\(auth\.jwt\(\)->>'aal', 'aal1'\) = 'aal2'/);
assert.match(adminMfaDb, /FROM auth\.mfa_factors AS f/);
assert.match(adminMfaDb, /f\.status = 'verified'/);
assert.match(adminMfaDb, /REVOKE ALL ON FUNCTION private\.bes_admin_mfa_session_allowed\(\) FROM PUBLIC, anon/);
assert.match(adminMfaDb, /ALTER POLICY "Admins can update all profiles"/);
assert.match(adminMfaDb, /USING \(public\.is_admin\(\) AND private\.bes_admin_mfa_session_allowed\(\)\)/);
assert.match(adminMfaDb, /WITH CHECK \(public\.is_admin\(\) AND private\.bes_admin_mfa_session_allowed\(\)\)/);
assert.match(adminMfaDb, /CREATE OR REPLACE FUNCTION public\.bes_admin_update_profile\(target_id uuid, patch jsonb\)/);
assert.match(adminMfaDb, /if not private\.bes_admin_mfa_session_allowed\(\) then/);
assert.match(adminMfaDb, /'admin_profile_update'/);
assert.match(adminMfaDb, /CREATE OR REPLACE FUNCTION public\.bes_admin_claim_configured_admin\(allowed_emails text\[\]\)/);
assert.match(adminMfaDb, /from auth\.users u/);
assert.match(adminMfaDb, /u\.email_confirmed_at is not null/);
assert.match(adminMfaDb, /where a\.email=current_email/);
assert.equal((adminMfaDb.match(/\$function\$;/g) || []).length, 3);


const lessonRosterGuard = read('supabase/migrations/20261012104500_lesson_check_roster_owner_guard.sql');
// SECURITY DEFINER classroom roster join must reapply base-table owner-aware
// RLS before accepting students from the shared classroom register.
assert.match(lessonRosterGuard, /CREATE OR REPLACE FUNCTION public\.lesson_check_list_assigned_class_rosters\(\)/);
assert.match(lessonRosterGuard, /public\.bes_can_access_class_roster_v3\(/);
assert.match(lessonRosterGuard, /br\.roster_key, br\.created_by, br\.class_name, br\.school_year/);
assert.match(lessonRosterGuard, /where lower\(trim\(br\.class_name\)\) = lower\(trim\(a\.class_name\)\)\s+--/);
assert.match(lessonRosterGuard, /coalesce\(r\.students, a\.class_payload->'students', '\[\]'::jsonb\)/);
assert.match(lessonRosterGuard, /from public\.get_my_assigned_school_classes\(\)/);
assert.equal((lessonRosterGuard.match(/\$function\$;/g) || []).length, 1);


const automationGuard = read('supabase/migrations/20261012111000_automation_worker_diagnostic_redaction.sql');
// Normal teachers need only a boolean cloud-availability probe, never raw worker
// stack/error diagnostics. Admin/TTCM may still inspect troubleshooting data.
assert.match(automationGuard, /CREATE OR REPLACE FUNCTION public\.bes_v1097_cloud_status\(\)/);
assert.match(automationGuard, /public\.bes_v1097_is_leader\(auth\.uid\(\)\)/);
assert.match(automationGuard, /IF NOT leader AND heartbeat IS NOT NULL THEN/);
assert.match(automationGuard, /heartbeat := heartbeat - 'last_error' - 'metadata'/);
assert.match(automationGuard, /'warning',CASE WHEN leader THEN sqlerrm ELSE 'Cloud worker status unavailable' END/);
assert.match(automationGuard, /'available',true/);

console.log('PASS: BRIAN account authorization, password rotation, audit, and staged Admin MFA contracts are hardened.');
