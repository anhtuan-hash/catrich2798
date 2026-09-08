import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);

const settings = read('src/pages/Settings.jsx');
const account = read('src/components/UsernameAccountCenter.jsx');
const accountCss = read('src/components/UsernameAccountCenter.css');

assert.match(settings, /settings-google-hero/, 'Settings hero must remain');
assert.match(settings, /settings-notifications/, 'Notification settings must remain');
assert.match(settings, /changeCurrentPassword/, 'Existing password flow must remain');

assert.ok(exists('src/utils/profileSettings.js'), 'profileSettings utility must exist');
assert.ok(exists('supabase/functions/profile-settings/index.ts'), 'profile-settings Edge Function source must exist');

const util = read('src/utils/profileSettings.js');
const edge = read('supabase/functions/profile-settings/index.ts');

assert.match(account, /createPortal/, 'Account center should use a React portal inside Settings');
assert.match(account, /settings-google-profile-fallback/, 'Portal must target the existing Settings account host');
assert.match(account, /bes-settings-profile/, 'Rich profile editor class must exist');
assert.match(account, /jobTitle/, 'Profile editor must expose job title');
assert.match(account, /phone/, 'Profile editor must expose phone');
assert.match(account, /bio/, 'Profile editor must expose bio');
assert.match(account, /school/, 'Profile editor must expose school/unit');
assert.match(account, /contactEmail/, 'Profile editor must expose contact email');
assert.match(account, /uploadProfileAvatar/, 'Profile editor must support avatar upload');
assert.match(account, /removeProfileAvatar/, 'Profile editor must support avatar removal');
assert.match(account, /320/, 'Bio must be limited to 320 characters');

assert.match(util, /profile-avatars/, 'Avatar utility must use the existing profile-avatars bucket');
assert.match(util, /loadProfileSettings/, 'Profile utility must load persisted settings');
assert.match(util, /saveProfileSettings/, 'Profile utility must save persisted settings');
assert.match(util, /uploadProfileAvatar/, 'Profile utility must upload avatars');
assert.match(util, /removeProfileAvatar/, 'Profile utility must remove avatars');

for (const column of ['full_name', 'school', 'contact_email', 'job_title', 'phone', 'bio', 'avatar_url']) {
  assert.ok(edge.includes(column), `Edge Function must explicitly handle safe column ${column}`);
}
assert.doesNotMatch(edge, /permissions\s*:/, 'Self-service profile updates must not mutate permissions');
assert.doesNotMatch(edge, /role\s*:/, 'Self-service profile updates must not mutate role');

assert.match(accountCss, /\.bes-settings-profile/, 'Profile editor styling must exist');
assert.match(accountCss, /grid-template-columns:\s*repeat\(2/, 'Desktop profile form should use two columns');
assert.match(accountCss, /@media \(max-width:\s*680px\)/, 'Profile editor must have a mobile breakpoint');

console.log('Settings account center contract verified.');
