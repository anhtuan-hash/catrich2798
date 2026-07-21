import fs from 'node:fs';

const required = [
  'src/ui-core/components/UICommandCenter.jsx',
  'src/ui-core/runtime/commandCenter.js',
  'src/ui-core/runtime/universalSearchIndex.js',
  'src/ui-core/styles/command-center.css',
  'src/pages/Library.jsx',
  'src/pages/ResourceLibrary.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
  'public/version.json',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const component = read(required[0]);
const commandRuntime = read(required[1]);
const searchRuntime = read(required[2]);
const css = read(required[3]);
const library = read(required[4]);
const resources = read(required[5]);
const version = read(required[6]);
const pkg = JSON.parse(read(required[7]));
const index = read(required[8]);
const publicVersion = JSON.parse(read(required[9]));

const assertions = [
  ['Universal Search Index runtime', searchRuntime.includes('buildUniversalSearchEntries') && searchRuntime.includes('openUniversalSearchEntry')],
  ['Five indexed data sources', searchRuntime.includes('loadHistory') && searchRuntime.includes('loadPrompts') && searchRuntime.includes('loadBank') && searchRuntime.includes('loadResourceLibrary') && searchRuntime.includes('loadActivityState')],
  ['Bounded local index', searchRuntime.includes('MAX_INDEX_ENTRIES = 720') && searchRuntime.includes('MAX_INDEX_TEXT = 6000')],
  ['Permission-aware resources', searchRuntime.includes('resourceVisibleToUser') && searchRuntime.includes('isAdminRole') && searchRuntime.includes('isDepartmentLeaderRole')],
  ['Deleted resources excluded', searchRuntime.includes('item.deletedAt')],
  ['Six Command Center scopes', component.includes("['content', 'Nội dung', 'Content', '~']") && component.includes('contentEntries')],
  ['Content query prefix', commandRuntime.includes("'~': 'content'")],
  ['Content mode persistence', commandRuntime.includes("'content'") && commandRuntime.includes('lastMode')],
  ['Dedicated content shortcut', component.includes("event.key.toLowerCase() === 'f'") && component.includes("setMode('content')")],
  ['Content entries in common result pool', component.includes('...contentEntries') && component.includes("entry.kind === 'content'")],
  ['Permission-safe local event refresh', searchRuntime.includes('subscribeUniversalSearchIndex') && searchRuntime.includes('LIBRARY_EVENT') && searchRuntime.includes('RESOURCE_EVENT') && searchRuntime.includes('ACTIVITY_CENTER_EVENT')],
  ['Activity results open native Activity Center', searchRuntime.includes('openActivityCenter(tab)')],
  ['Library deep links', searchRuntime.includes("#/library?tab=") && library.includes('getLibrarySearchTarget')],
  ['Resource deep links', searchRuntime.includes("#/resource-library?resource=") && resources.includes("params.get('resource')")],
  ['Target result visual focus', library.includes('bui-search-target') && css.includes('.bui-search-target')],
  ['Horizontal search input protection retained', css.includes('writing-mode: horizontal-tb !important') && css.includes('min-width: 0 !important')],
  ['Brian/Material/Apple adapter coverage retained', css.includes("html[data-design-language='material-3']") && css.includes("html[data-design-language='apple']")],
  ['No SQL migration required', publicVersion.requiresSql === false],
  ['Version registry', version.includes("12.12.0") && version.includes('Universal Search Index') && pkg.version === '12.12.0' && index.includes('content="12.12.0"')],
  ['V12.12 scripts', Boolean(pkg.scripts?.['verify:v12.12.0']) && Boolean(pkg.scripts?.['test:v12.12.0']) && pkg.scripts?.['version:sync']?.includes('v12.12.0')],
  ['Manifest feature flags', publicVersion.universalSearchIndex === true && publicVersion.commandScopes?.includes('content') && publicVersion.commandQueryPrefixes?.includes('~')],
  ['Personal font remains external', !fs.existsSync('public/bes-fonts/brian-personal-font.ttf') && !fs.existsSync('public/fonts/personal-font.ttf')],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.12.0 Universal Search Index verification PASS (${passed}/${assertions.length})`);
