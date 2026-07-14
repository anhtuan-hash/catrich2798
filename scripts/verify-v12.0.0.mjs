import fs from 'node:fs';

const checks = [
  ['package version', JSON.parse(fs.readFileSync('package.json','utf8')).version === '12.0.0'],
  ['UI Core CSS', fs.existsSync('src/ui-core/styles/ui-core.css')],
  ['design runtime', fs.existsSync('src/ui-core/runtime/designLanguage.js')],
  ['route contracts', fs.existsSync('src/ui-core/layouts/routeLayout.js')],
  ['primitives', fs.existsSync('src/ui-core/components/UIPrimitives.jsx')],
  ['main imports UI Core', fs.readFileSync('src/main.jsx','utf8').includes("./ui-core/styles/ui-core.css")],
  ['shell contract', fs.readFileSync('src/main.jsx','utf8').includes('data-ui-core="v12"')],
  ['layout contract', fs.readFileSync('src/main.jsx','utf8').includes('data-layout={getRouteLayout')],
  ['settings adapters', fs.readFileSync('src/pages/Settings.jsx','utf8').includes('Android · Material 3')],
  ['version module', fs.readFileSync('src/config/version.js','utf8').includes("APP_VERSION = '12.0.0'")],
];
const failed=checks.filter(([,ok])=>!ok);
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);
if (failed.length) { console.error(`V12 verification failed: ${failed.length}/${checks.length}`); process.exit(1); }
console.log(`V12.0.0 UI Core verification PASS (${checks.length}/${checks.length})`);
