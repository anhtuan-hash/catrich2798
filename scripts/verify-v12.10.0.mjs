import fs from 'node:fs';

const required = [
  'src/ui-core/components/UIWorkspaceNavigation.jsx',
  'src/ui-core/components/UIActivityCenter.jsx',
  'src/ui-core/runtime/activityCenter.js',
  'src/ui-core/styles/activity-core.css',
  'src/ui-core/components/UnifiedShellChrome.jsx',
  'src/ui-core/components/UIWorkspaceHub.jsx',
  'src/components/GlobalAutosave.jsx',
  'src/components/SyncQueueIndicator.jsx',
  'src/components/StatusMenuBar.jsx',
  'src/main.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const nav = read(required[0]);
const activity = read(required[1]);
const runtime = read(required[2]);
const css = read(required[3]);
const shell = read(required[4]);
const hub = read(required[5]);
const autosave = read(required[6]);
const sync = read(required[7]);
const status = read(required[8]);
const main = read(required[9]);
const version = read(required[10]);
const pkg = JSON.parse(read(required[11]));
const index = read(required[12]);

const assertions = [
  ['Workspace-first primary navigation', nav.includes('export default function UIWorkspaceNavigation') && nav.includes('getWorkspaceCatalog') && nav.includes('visibleWorkspaces.map')],
  ['Eight-area navigation uses registry targets', nav.includes('getWorkspaceLandingTarget') && nav.includes('resolveWorkspaceId')],
  ['Permission-aware workspace navigation', nav.includes('hasRouteAccess') && nav.includes('hasToolAccess') && nav.includes('isAppHiddenForUser')],
  ['Workspace navigation owns utility actions', nav.includes('brian:workspace-hub-open') && nav.includes('bes-command-palette-open') && nav.includes('<UIActivityCenter')],
  ['Unified Activity Center component', activity.includes('export default function UIActivityCenter') && activity.includes("const TABS = ['overview', 'notifications', 'work', 'sync', 'history', 'ai']")],
  ['Activity Center aggregates work and notifications', activity.includes('listWorkHubNotifications') && activity.includes('markWorkHubNotificationRead') && activity.includes('bes-global-notification')],
  ['Activity Center aggregates sync and history', activity.includes('listSyncQueue') && activity.includes('loadWorkspaceMemory') && activity.includes('listVersions')],
  ['Activity Center records AI activity', activity.includes('bes-ai-operation-start') && activity.includes('bes-ai-operation-end')],
  ['Persistent activity runtime', runtime.includes('localStorage') && runtime.includes('BroadcastChannel') && runtime.includes('recordActivity')],
  ['Activity runtime bounded storage', runtime.includes('MAX_ITEMS = 120') && runtime.includes('.slice(0, MAX_ITEMS)')],
  ['Shell uses workspace navigation', shell.includes("import UIWorkspaceNavigation") && shell.includes('<UIWorkspaceNavigation')],
  ['Workspace Hub can run without duplicate trigger', hub.includes('hideTrigger = false') && shell.includes('hideTrigger')],
  ['Autosave history delegates to Activity Center', autosave.includes('activityCenterOwned') && autosave.includes("tab: 'history'")],
  ['Sync indicator supports headless ownership', sync.includes('activityCenterOwned')],
  ['Status notification launcher delegates to Activity Center', status.includes('activityCenterOwned') && status.includes("tab: 'notifications'")],
  ['Activity Core stylesheet loaded after Workspace Core', main.indexOf('activity-core.css') > main.indexOf('workspace-core.css')],
  ['Activity Core stylesheet loaded before Overlay Core', main.indexOf('activity-core.css') < main.indexOf('overlay-core.css')],
  ['Responsive workspace navigation', css.includes('@media (max-width: 620px)') && css.includes('.bui-workspace-nav-track')],
  ['Design adapter coverage', css.includes("html[data-design-language='material-3']") && css.includes("html[data-design-language='apple']")],
  ['Accessible drawer and activity center', activity.includes('aria-modal="true"') && nav.includes('aria-modal="true"')],
  ['Version registry', version.includes("12.10.0") && version.includes('Workspace Navigation & Unified Activity Center') && pkg.version === '12.10.0' && index.includes('content="12.10.0"')],
  ['V12.10 verification command', Boolean(pkg.scripts?.['verify:v12.10.0']) && Boolean(pkg.scripts?.['test:v12.10.0'])],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.10.0 Workspace Navigation & Unified Activity Center verification PASS (${passed}/${assertions.length})`);
