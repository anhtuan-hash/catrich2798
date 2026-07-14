import fs from 'node:fs';

const required = [
  'src/ui-core/components/UICommandCenter.jsx',
  'src/ui-core/runtime/commandCenter.js',
  'src/ui-core/styles/command-center.css',
  'src/ui-core/components/UIWorkspaceNavigation.jsx',
  'src/ui-core/runtime/activityCenter.js',
  'src/ui-core/runtime/workspaceMemory.js',
  'src/main.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const component = read(required[0]);
const runtime = read(required[1]);
const css = read(required[2]);
const nav = read(required[3]);
const activity = read(required[4]);
const workspaceMemory = read(required[5]);
const main = read(required[6]);
const version = read(required[7]);
const pkg = JSON.parse(read(required[8]));
const index = read(required[9]);

const assertions = [
  ['Native UI Command Center component', component.includes('export default function UICommandCenter') && component.includes('bui-command-center')],
  ['Five search scopes', component.includes("['all', 'Tất cả'") && component.includes("['apps', 'Ứng dụng'") && component.includes("['pages', 'Trang'") && component.includes("['workspaces', 'Không gian'") && component.includes("['actions', 'Lệnh'")],
  ['Instant query prefixes', runtime.includes("'>': 'actions'") && runtime.includes("'@': 'workspaces'") && runtime.includes("'/': 'pages'") && runtime.includes("'#': 'apps'")],
  ['Permission-aware app and route search', component.includes('hasRouteAccess') && component.includes('hasToolAccess') && component.includes('isAppHiddenForUser')],
  ['Workspace-aware results and resume', component.includes('getWorkspaceResumeVisit') && component.includes('getWorkspaceLandingTarget') && workspaceMemory.includes('getWorkspaceResumeVisit')],
  ['Activity Center quick actions', component.includes("openActivityCenter('notifications')") && component.includes("openActivityCenter('work')") && component.includes("openActivityCenter('sync')") && activity.includes('openActivityCenter')],
  ['AI and current-page actions', component.includes("new CustomEvent('bes-ai-open')") && component.includes('Hỏi AI về trang hiện tại')],
  ['Appearance and accessibility actions', component.includes('setTheme') && component.includes('setLanguage') && component.includes('setFontScale')],
  ['Per-user search history', runtime.includes('recordCommandQuery') && runtime.includes('clearCommandHistory') && runtime.includes('MAX_HISTORY = 10')],
  ['Pinned commands', runtime.includes('toggleCommandPinned') && component.includes('isCommandPinned')],
  ['Cross-tab command preferences', runtime.includes('BroadcastChannel') && runtime.includes('COMMAND_CENTER_UPDATED_EVENT')],
  ['Bounded persistent state', runtime.includes('MAX_PINNED = 24') && runtime.includes('.slice(0, MAX_HISTORY)')],
  ['Keyboard contract', component.includes("event.key.toLowerCase() === 'k'") && component.includes("event.key === 'ArrowDown'") && component.includes("event.key === 'Enter'")],
  ['Legacy open-event compatibility', component.includes('LEGACY_COMMAND_PALETTE_OPEN_EVENT') && runtime.includes("'bes-command-palette-open'")],
  ['Workspace navigation opens native center', nav.includes("new CustomEvent('brian:command-center-open')")],
  ['Main uses UICommandCenter', main.includes("import('./ui-core/components/UICommandCenter.jsx')") && main.includes('<UICommandCenter')],
  ['Old React command palette removed', !fs.existsSync('src/components/GlobalCommandPalette.jsx') && !main.includes('GlobalCommandPalette')],
  ['Command stylesheet loaded after Overlay Core', main.indexOf('command-center.css') > main.indexOf('overlay-core.css')],
  ['Responsive two-pane command layout', css.includes('grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr)') && css.includes('@media (max-width: 880px)')],
  ['Design adapter coverage', css.includes("html[data-design-language='material-3']") && css.includes("html[data-design-language='apple']")],
  ['Horizontal search input protection', css.includes('writing-mode: horizontal-tb !important') && css.includes('min-width: 0 !important')],
  ['Accessible dialog and listbox', component.includes('aria-modal="true"') && component.includes('role="listbox"') && component.includes('role="option"')],
  ['Version registry', version.includes("12.11.0") && version.includes('Universal Command Center') && pkg.version === '12.11.0' && index.includes('content="12.11.0"')],
  ['V12.11 verification commands', Boolean(pkg.scripts?.['verify:v12.11.0']) && Boolean(pkg.scripts?.['test:v12.11.0'])],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.11.0 Universal Command Center verification PASS (${passed}/${assertions.length})`);
