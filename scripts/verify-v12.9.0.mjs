import fs from 'node:fs';

const required = [
  'src/ui-core/runtime/workspaceRegistry.js',
  'src/ui-core/runtime/workspaceMemory.js',
  'src/ui-core/components/UIWorkspaceHub.jsx',
  'src/ui-core/styles/workspace-core.css',
  'src/ui-core/components/UnifiedShellChrome.jsx',
  'src/components/GlobalCommandPalette.jsx',
  'src/pages/WebApps.jsx',
  'src/main.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const registry = read(required[0]);
const memory = read(required[1]);
const hub = read(required[2]);
const css = read(required[3]);
const shell = read(required[4]);
const palette = read(required[5]);
const apps = read(required[6]);
const main = read(required[7]);
const version = read(required[8]);
const pkg = JSON.parse(read(required[9]));
const index = read(required[10]);
const workspaceIds = ['teaching','assessment','content','management','resources','ai','games','system'];
const assertions = [
  ['Eight workspace taxonomy', workspaceIds.every((id) => registry.includes(`id: '${id}'`))],
  ['Workspace resolver contracts', registry.includes('resolveWorkspaceId') && registry.includes('resolveToolWorkspaceId') && registry.includes('workspaceMatchesItem')],
  ['Workspace landing contracts', registry.includes("#/apps?workspace=teaching") && registry.includes("#/assessment-core") && registry.includes("#/settings")],
  ['Persistent session memory', memory.includes('rememberWorkspaceVisit') && memory.includes('getWorkspaceResumeVisit') && memory.includes('localStorage')],
  ['Cross-tab workspace memory', memory.includes('BroadcastChannel') && memory.includes('WORKSPACE_MEMORY_EVENT')],
  ['Native Workspace Hub', hub.includes('export default function UIWorkspaceHub') && hub.includes('brian:workspace-hub-open')],
  ['Workspace Hub accessibility', hub.includes('aria-modal="true"') && hub.includes('UIOverlayClose')],
  ['Workspace Hub permission filtering', hub.includes('hasRouteAccess') && hub.includes('hasToolAccess') && hub.includes('isAppHiddenForUser')],
  ['Shell owns Workspace Hub', shell.includes('<UIWorkspaceHub') && shell.includes('bui-shell-workspace-row')],
  ['Workspace Core stylesheet', css.includes('.bui-workspace-hub-trigger') && css.includes('.bui-workspace-hub__grid') && css.includes('.bui-workspace-card')],
  ['Responsive workspace layout', css.includes('@media (max-width: 760px)') && css.includes('grid-template-columns: 1fr')],
  ['Design adapter coverage', css.includes("html[data-design-language='material-3']") && css.includes("html[data-design-language='apple']")],
  ['Command palette workspace search', palette.includes('workspaceEntries') && palette.includes("entry.kind === 'workspace'")],
  ['App catalog workspace filter', apps.includes('getWorkspaceFilterFromHash') && apps.includes('workspaceVisibleItems') && apps.includes('bui-app-workspace-filter')],
  ['Main records workspace visits', main.includes('rememberWorkspaceVisit') && main.includes('activeWorkspaceId')],
  ['App shell workspace attribute', main.includes('data-workspace={activeWorkspaceId}')],
  ['Workspace stylesheet load order', main.indexOf('workspace-core.css') > main.indexOf('platform-core.css') && main.indexOf('workspace-core.css') < main.indexOf('overlay-core.css')],
  ['Version registry', version.includes("12.9.0") && version.includes('Workspace OS Core & Session Continuity') && pkg.version === '12.9.0' && index.includes('content="12.9.0"')],
  ['V12.9 verification command', Boolean(pkg.scripts?.['verify:v12.9.0'])],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.9.0 Workspace OS Core & Session Continuity verification PASS (${passed}/${assertions.length})`);
