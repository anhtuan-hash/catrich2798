import fs from 'node:fs';
const required = [
  'src/ui-core/components/UIWorkspaceLayoutManager.jsx',
  'src/ui-core/runtime/workspaceLayout.js',
  'src/ui-core/styles/workspace-layout.css',
  'src/components/WorkspaceTabs.jsx',
  'src/main.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
  'public/version.json',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const component = read(required[0]);
const runtime = read(required[1]);
const css = read(required[2]);
const tabs = read(required[3]);
const main = read(required[4]);
const version = read(required[5]);
const pkg = JSON.parse(read(required[6]));
const index = read(required[7]);
const publicVersion = JSON.parse(read(required[8]));
const assertions = [
  ['Workspace layout runtime', runtime.includes('loadWorkspaceLayout') && runtime.includes('saveWorkspaceLayout')],
  ['Scoped persistence', runtime.includes('brian-workspace-layout-v12.13') && runtime.includes('scope(user)')],
  ['Cross-tab synchronization', runtime.includes('BroadcastChannel') && runtime.includes('WORKSPACE_LAYOUT_EVENT')],
  ['Single and split modes', runtime.includes("['single', 'split']")],
  ['Bounded split ratio', runtime.includes('Math.min(70') && runtime.includes('Math.max(30')],
  ['Layout manager UI', component.includes('UIWorkspaceLayoutManager') && component.includes('bui-layout-manager')],
  ['Secondary pane uses embedded route', component.includes("searchParams.set('embed', '1')") && component.includes('<iframe')],
  ['Open tab candidates only', component.includes('workspace.tabs.filter') && component.includes('currentTarget')],
  ['Focus mode', component.includes('dataset.brianFocus') && css.includes("html[data-brian-focus='true']")],
  ['Responsive split pane', css.includes('.bui-split-pane') && css.includes('@media (max-width: 760px)')],
  ['Workspace tab trigger', tabs.includes('openWorkspaceLayoutManager') && tabs.includes('bes-workspace-layout')],
  ['Embedded shell isolation', main.includes('EMBEDDED_WORKSPACE') && main.includes("get('embed') === '1'")],
  ['Embedded mode hides duplicate chrome', main.includes('!EMBEDDED_WORKSPACE ? <Suspense')],
  ['UI Core CSS import', main.includes("workspace-layout.css")],
  ['Horizontal controls retained', css.includes('min-width: 0')],
  ['No SQL migration required', publicVersion.requiresSql === false],
  ['Version registry', version.includes('12.13.0') && pkg.version === '12.13.0' && index.includes('content="12.13.0"')],
  ['V12.13 scripts', Boolean(pkg.scripts?.['verify:v12.13.0']) && Boolean(pkg.scripts?.['test:v12.13.0'])],
  ['Personal font remains external', !fs.existsSync('public/bes-fonts/brian-personal-font.ttf') && !fs.existsSync('public/fonts/personal-font.ttf')],
];
let passed=0;
for (const [label,ok] of assertions){ if(!ok) throw new Error(`FAIL: ${label}`); console.log(`✓ ${label}`); passed++; }
console.log(`V12.13.0 Workspace Layout Manager verification PASS (${passed}/${assertions.length})`);
