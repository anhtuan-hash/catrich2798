import fs from 'node:fs';
import {
  isCustomAppRecord,
  normalizeCustomApp,
  normalizeCustomAppUrl,
} from '../src/utils/customApps.js';
import { canPublishDepartment } from '../src/utils/permissions.js';

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const appsPage = read('src/pages/WebApps.jsx');
const hub = read('src/components/LauncherAppHub.jsx');
const store = read('src/utils/customApps.js');
const games = read('src/utils/customGames.js');
const css = read('src/styles/launcher-app-hub-v1167.css');

add('Launcher hub component exists', Boolean(hub));
add('WebApps mounts launcher hub', appsPage.includes('<LauncherAppHub') && appsPage.includes('currentUser={currentUser}'));
add('Role-aware TTCM approval', hub.includes('canPublishDepartment(currentUser)') && store.includes('reviewCustomApp'));
add('Teacher submission defaults pending', store.includes("const status = leader ? 'approved' : 'pending'"));
add('TTCM creation defaults approved', canPublishDepartment({ role: 'ttcm' }) && canPublishDepartment({ role: 'department_head' }));
add('Normal teacher cannot review', !canPublishDepartment({ role: 'teacher' }));
add('HTTP URL normalization', normalizeCustomAppUrl('example.com').startsWith('https://example.com'));
add('Unsafe protocols rejected', normalizeCustomAppUrl('javascript:alert(1)') === '');
add('Cloud records are separated from games', games.includes('isLauncherAppRecord') && games.includes('!isLauncherAppRecord(item)'));
add('Custom app marker works', isCustomAppRecord({ color: 'app-link:#3478d4' }));
add('Custom app normalization works', normalizeCustomApp({ label: 'Quiz', home: 'https://example.com', color: 'app-link:#123456', status: 'approved' }).accent === '#123456');
add('Inline iframe is sandboxed', hub.includes('<iframe') && hub.includes('sandbox=') && !hub.includes('target="_blank"'));
add('Browser fullscreen API is wired', hub.includes('requestFullscreen') && hub.includes('exitFullscreen') && hub.includes('fullscreenchange'));
add('Fullscreen toolbar control exists', hub.includes('toggleFullscreen') && hub.includes('aria-pressed={isFullscreen}'));
add('Escape exits fullscreen before closing app', hub.includes('if (fullscreenElement()) return;'));
add('Fullscreen CSS state exists', css.includes(':fullscreen') && css.includes('.launcher-link-frame-actions'));
add('No new-tab embed mode is created', store.includes("embed_mode: 'iframe'") && !store.includes("embed_mode: 'newtab'"));
add('Responsive UI CSS exists', css.includes('.launcher-link-hub') && css.includes('.launcher-link-frame-shell') && css.includes('@media(max-width:720px)'));
add('Polished form header exists', hub.includes('launcher-link-form-heading') && hub.includes('formSubtitleLeader'));
add('Live app-card preview exists', hub.includes('launcher-link-preview-card') && hub.includes('previewHost'));
add('Form uses responsive two-zone layout', css.includes('grid-template-columns:minmax(0,1fr) 235px') && css.includes('.launcher-link-form-preview'));
add('Form footer is visually separated', css.includes('.launcher-link-form-footer') && css.includes('border-top:1px solid #d8e0ea'));
add('Large text and mobile modal stay usable', css.includes('@media(max-width:860px)') && css.includes('grid-template-columns:1fr'));
add('Existing custom_game_platforms table reused', store.includes("CUSTOM_APPS_TABLE = 'custom_game_platforms'"));

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Linked app launcher audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Linked app launcher audit PASS (${checks.length}/${checks.length})`);
