import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, condition, details = '') => checks.push({ name, pass: Boolean(condition), details });

const required = [
  'src/ui-core/index.css',
  'src/ui-core/index.js',
  'src/ui-core/primitives.jsx',
  'src/ui-core/routeLayouts.js',
  'src/ui-core/runtime/designLanguage.js',
  'src/ui-core/runtime/DesignLanguageProvider.jsx',
  'src/ui-core/styles/tokens.css',
  'src/ui-core/styles/primitives.css',
  'src/ui-core/styles/layouts.css',
  'src/ui-core/styles/legacy-bridge.css',
  'src/ui-core/adapters/brian-unified.css',
  'src/ui-core/adapters/material-3.css',
  'src/ui-core/adapters/apple.css',
];
required.forEach((file) => check(`Required file: ${file}`, exists(file)));

const main = read('src/main.jsx');
const index = read('index.html');
const bridge = read('src/ui-core/styles/legacy-bridge.css');
const allCore = required.filter((file) => exists(file)).map(read).join('\n');
const pkg = JSON.parse(read('package.json'));
const config = read('src/config/version.js');
const designRuntime = read('src/ui-core/runtime/designLanguage.js');
const designProvider = read('src/ui-core/runtime/DesignLanguageProvider.jsx');

check('UI Core CSS loaded after legacy styles', main.indexOf("./ui-core/index.css") > main.indexOf("./styles/v1159.css"));
check('DesignLanguageProvider wraps application root', main.includes('<DesignLanguageProvider>') && main.includes('</DesignLanguageProvider>'));
check('App shell declares UI Core version', main.includes('data-ui-core={uiCoreVersion}'));
check('Main content declares layout contract', main.includes('data-ui-layout={uiLayout}'));
check('Route layout registry is used', main.includes('getUiLayout(currentRoute, selectedTool)'));
check('Pre-render design language bootstrap exists', index.includes('bes-ui-core-v12-boot'));
check('Persistent font uses deployed path', index.includes('/bes-fonts/brian-personal-font.ttf'));
check('Old unresolved personal font path removed', !index.includes("url('/fonts/personal-font.ttf')"));
check('UI Core contains no MutationObserver', !allCore.includes('MutationObserver'));
check('UI Core contains no wildcard class selector', !allCore.includes('[class*='));
check('Compatibility bridge documents exact selectors', bridge.includes('Exact shared selectors only'));
check('Design language syncs to account metadata', designRuntime.includes('brian_design_language_v1') && designRuntime.includes('supabase.auth.updateUser') && designProvider.includes('hydrateDesignLanguageFromAccount'));
check('Three design adapters registered', ['brian-unified', 'material-3', 'apple'].every((id) => allCore.includes(id)));
check('Package version is 12.0.0', pkg.version === '12.0.0', pkg.version);
check('Version config is 12.0.0', config.includes("APP_VERSION = '12.0.0'"));
check('V12 verification command registered', Boolean(pkg.scripts?.['verify:v12.0.0']));
check('UI Core audit command registered', pkg.scripts?.['audit:ui-core']?.includes('ui-core-audit-v12.0.0'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item, index) => console.log(`${String(index + 1).padStart(2, '0')}. ${item.pass ? 'PASS' : 'FAIL'} — ${item.name}${item.details ? ` (${item.details})` : ''}`));
if (failed.length) {
  console.error(`\nUI Core V12 audit FAILED: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nUI Core V12 audit PASS (${checks.length}/${checks.length}).`);
