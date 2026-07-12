import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const checks = [];

function add(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}
function warn(name, condition, detail) {
  if (condition) warnings.push(`${name}: ${detail}`);
}
function read(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function bytes(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}
function fmt(value) { return `${(value / 1024).toFixed(1)} KB`; }

const pkg = JSON.parse(read('package.json') || '{}');
const main = read('src/main.jsx');
const permissions = read('src/utils/permissions.js');
const nav = read('src/components/GlobalFlatNavigation.jsx');
const releasePage = read('src/pages/ReleaseCenter.jsx');
const aiApi = read('api/ai.js');
const uploadApi = read('api/_uploadSecurity.js');
const featureFlags = read('src/utils/featureFlags.js');
const releaseSql = read('supabase/release_settings_v10_87.sql');

add('Package version is V10.87.0', pkg.version === '10.87.0', String(pkg.version || 'missing'));
add('Release Center route is registered', main.includes("currentRoute === 'updates'") && main.includes("'updates'"), '#/updates');
add('Release Center is admin protected', permissions.includes("route === 'updates'") && permissions.includes("route === 'admin' || route === 'updates'"), 'admin-only route guard');
add('Update Center appears in navigation', nav.includes("route:updates") && nav.includes("updates: 'Cập nhật'"), 'drawer entry');
add('Feature flags include rollback', releasePage.includes('restoreFeatureFlagSnapshotToCloud') && releasePage.includes('createFeatureFlagSnapshot'), 'snapshot and cloud restore controls');
add('Feature flags support Supabase global sync', featureFlags.includes('loadFeatureFlagsFromCloud') && featureFlags.includes('saveFeatureFlagsToCloud') && main.includes('loadFeatureFlagsFromCloud'), 'cloud load, save and realtime subscription');
add('Release settings SQL migration exists', releaseSql.includes('bes_release_settings') && releaseSql.includes('supabase_realtime') && releaseSql.includes('public.is_admin()'), 'RLS, seed and realtime migration');
add('AI gateway security controls present', aiApi.includes('enforceRateLimit') && aiApi.includes('REQUEST_TIMEOUT_MS') && aiApi.includes('isSameOrigin'), 'rate, timeout and same-origin');
add('Upload security controls present', uploadApi.includes('validateUploadMetadata') && uploadApi.includes('validateMagicBytes') && uploadApi.includes('EXECUTABLES'), 'metadata and signature checks');
add('Release CSS is code-split', fs.existsSync(path.join(root, 'src/pages/ReleaseCenter.css')) && read('src/pages/ReleaseCenter.jsx').includes("import './ReleaseCenter.css'"), 'page-level stylesheet');
add('Version manifest exists', fs.existsSync(path.join(root, 'public/version.json')), 'public/version.json');

const criticalRoutes = ['home', 'apps', 'news', 'department', 'homeroom', 'settings', 'qa', 'updates', 'trash'];
for (const route of criticalRoutes) add(`Critical route registered: ${route}`, main.includes(`'${route}'`) || main.includes(`currentRoute === '${route}'`), route);

const dist = path.join(root, 'dist');
add('Production dist exists', fs.existsSync(dist), 'run npm run build before release:guard');
if (fs.existsSync(path.join(dist, 'assets'))) {
  const assets = fs.readdirSync(path.join(dist, 'assets')).map((name) => ({ name, size: fs.statSync(path.join(dist, 'assets', name)).size }));
  const js = assets.filter((item) => item.name.endsWith('.js'));
  const css = assets.filter((item) => item.name.endsWith('.css'));
  const largestJs = js.sort((a, b) => b.size - a.size)[0];
  const largestCss = css.sort((a, b) => b.size - a.size)[0];
  add('No JavaScript asset exceeds 2.5 MB', !largestJs || largestJs.size <= 2.5 * 1024 * 1024, largestJs ? `${largestJs.name} · ${fmt(largestJs.size)}` : 'no JS assets');
  add('No CSS asset exceeds 1.5 MB', !largestCss || largestCss.size <= 1.5 * 1024 * 1024, largestCss ? `${largestCss.name} · ${fmt(largestCss.size)}` : 'no CSS assets');
  warn('Large JavaScript chunk', largestJs?.size > 900 * 1024, largestJs ? `${largestJs.name} · ${fmt(largestJs.size)}` : '');
  warn('Large CSS chunk', largestCss?.size > 900 * 1024, largestCss ? `${largestCss.name} · ${fmt(largestCss.size)}` : '');
  add('ReleaseCenter produces a lazy chunk', assets.some((item) => /ReleaseCenter/i.test(item.name)), 'dynamic import chunk');
}

console.log('Brian English Studio V10.87 Release Guard');
console.log('------------------------------------------');
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` · ${check.detail}` : ''}`);
if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((item) => console.log(`WARN  ${item}`));
}
if (failures.length) {
  console.error(`\nRelease Guard failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}
console.log(`\nRelease Guard passed: ${checks.length}/${checks.length} checks.`);
