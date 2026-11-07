import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isGuestPreviewRoute, isGuestLockedRoute } from '../src/utils/guestPreviewPolicy.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('src/pages/HomeApproved.jsx');
const explorer = read('src/features/world-explorer/WorldExplorer.jsx');
const learning = read('src/features/world-explorer/WorldExplorerLearning.jsx');
const hero = read('src/components/HomeHeroExperience2026.jsx');
const mobile = read('src/components/mobile/MobileHomeView.jsx');
const app = read('src/main.jsx');
const guest = read('src/pages/GuestFullPages.jsx');

for (const route of ['apps','dashboard','attendance']) {
  assert.equal(isGuestPreviewRoute(route), true, `${route} must remain a public preview`);
  assert.ok(home.includes(`'#/${route}'`), `${route} must be navigable from public home`);
}
assert.equal(isGuestPreviewRoute('tool',{slug:'lesson-check-studio'}),true);
assert.ok(home.includes("'#/tool/lesson-check-studio'"));
assert.equal(isGuestLockedRoute('homeroom'),true);
assert.equal(isGuestLockedRoute('tool',{slug:'gradebook-studio'}),true);

assert.match(app, /if \(!action \|\| action\.closest\('\[data-guest-allow\]'\)\) return;/,
  'Only explicit public interactions must pass the Home guest event guard');
assert.match(explorer, /<section className="we-wrap"[^>]*data-guest-allow="published-world-explorer"/,
  'Published World Explorer reader and its archive must be usable without login');
assert.match(explorer, /\{isAdmin \? <button[^>]*we-admin-btn/,
  'World Explorer admin controls must still be gated by role');
assert.match(explorer, /\.from\('world_explorer_publications'\)/,
  'World Explorer must load published public content, not private task data');
assert.match(learning, /if\(!uid\)\{setMessage\(/,
  'Cloud bookmark changes must remain forbidden for anonymous readers');
assert.match(learning, /if\(uid&&isSupabaseConfigured\)/,
  'Remote learning-progress writes must require an authenticated identity');
assert.match(hero, /className="hero-cms__actions" data-guest-allow="public-home-navigation"/);
assert.match(home, /className="bha-tool" data-guest-allow="public-home-navigation"/);
assert.match(home, /className="bha-practice bha-practice--editorial-v3" data-guest-allow="public-weekly-practice"/);
assert.match(mobile, /data-guest-allow="public-home-navigation"/);
assert.match(mobile, /data-guest-allow="public-weekly-practice"/);
assert.match(app, /guestPreviewAllowed && currentRoute !== 'home' && <GuestPreview/,
  'Public previews must remain separate from authenticated workspaces');
assert.match(app, /canAccessRoute && currentRoute === 'dashboard' && currentUser && <WorkDashboard/,
  'A guest cannot mount the private work dashboard');
assert.match(app, /canAccessRoute && currentRoute === 'attendance' && currentUser && <AttendanceWorkspace/,
  'A guest cannot mount private attendance records');
assert.match(guest, /\.from\('bes_guest_preview_entries'\)/);
assert.doesNotMatch(guest, /\.from\('work_hub_items'\)|\.from\('bes_extra_attendance_sessions'\)/);

console.log('Guest home: published reading, preview routes, weekly practice and protected data boundaries — PASS');
