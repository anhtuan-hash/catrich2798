import fs from 'node:fs';

const required = [
  'src/ui-core/runtime/uiPreferences.js',
  'src/ui-core/runtime/designLanguage.js',
  'src/ui-core/styles/design-adapters.css',
  'src/ui-core/styles/ui-core.css',
  'src/pages/Settings.jsx',
  'src/main.jsx',
  'src/utils/personalFont.js',
  'public/bes-fonts/brian-font.css',
  'src/config/version.js',
  'index.html',
  'package.json',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);

const read = (file) => fs.readFileSync(file, 'utf8');
const prefs = read(required[0]);
const adapter = read(required[2]);
const core = read(required[3]);
const settings = read(required[4]);
const main = read(required[5]);
const fontRuntime = read(required[6]);
const fontCss = read(required[7]);
const version = read(required[8]);
const index = read(required[9]);
const pkg = JSON.parse(read(required[10]));

const assertions = [
  ['Unified UI preferences runtime', prefs.includes('export function applyUiPreferences') && prefs.includes('export function readLocalUiPreferences')],
  ['Preference normalization and migration', prefs.includes('normalizeUiPreferences') && prefs.includes('readLegacyPreferences')],
  ['Account cloud hydration', prefs.includes('hydrateUiPreferencesFromCloud') && prefs.includes('supabase.auth.getUser')],
  ['Account metadata persistence', prefs.includes('saveUiPreferencesToCloud') && prefs.includes('supabase.auth.updateUser') && prefs.includes('brian_ui_preferences_v12')],
  ['Timestamp conflict resolution', prefs.includes('cloud.updatedAt >= local.updatedAt')],
  ['Cross-tab preference synchronization', prefs.includes("window.addEventListener('storage'") && prefs.includes('UI_PREFERENCES_STORAGE_KEY')],
  ['Accent token system', prefs.includes('ACCENT_COLORS') && adapter.includes("html[data-settings-accent='violet']") && core.includes('--ui-user-accent')],
  ['Density token system', adapter.includes("html[data-ui-density='relaxed']") && adapter.includes("html[data-ui-density='compact']")],
  ['Brian Unified native adapter', adapter.includes("html[data-design-language='brian-unified']")],
  ['Material 3 native adapter', adapter.includes("html[data-design-language='material-3']") && adapter.includes('.global-flat-link.active')],
  ['Apple native adapter', adapter.includes("html[data-design-language='apple']") && adapter.includes('backdrop-filter: blur(24px)')],
  ['Design preview cards', settings.includes('bui-language-preview--') && adapter.includes('.bui-language-preview')],
  ['Appearance sync status', settings.includes('UI_PREFERENCES_SYNC_EVENT') && settings.includes('bui-ui-sync-status')],
  ['Main state owns accent and density', main.includes('const [accentColor, setAccentColor]') && main.includes('const [displayDensity, setDisplayDensity]')],
  ['Main cloud preference integration', main.includes('hydrateUiPreferencesFromCloud') && main.includes('saveUiPreferencesToCloud')],
  ['Adapter CSS loaded after overlay core', main.indexOf("import './ui-core/styles/design-adapters.css';") > main.indexOf("import './ui-core/styles/overlay-core.css';")],
  ['Pre-render preference bootstrap', index.includes('bes-ui-preferences-boot') && index.includes('bes-ui-preferences-v12')],
  ['Legacy appearance engine retired', !index.includes('/bes-appearance-v1163/appearance-engine') && !fs.existsSync('public/bes-appearance-v1163') && !fs.existsSync('public/bes-appearance-v1162')],
  ['Persistent font bridge paths', fontCss.includes('/bes-fonts/brian-personal-font.ttf?v=12.7.0') && fontCss.includes('/fonts/personal-font.ttf?v=12.7.0')],
  ['Runtime font bridge excludes code typography', fontRuntime.includes(":not(code):not(pre):not(kbd):not(samp)")],
  ['Version registry', version.includes("12.7.0") && pkg.version === '12.7.0' && index.includes('content="12.7.0"')],
  ['V12.7 verification command', Boolean(pkg.scripts?.['verify:v12.7.0'])],
];

let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.7.0 Native Design Adapters & Appearance Sync verification PASS (${passed}/${assertions.length})`);
