import fs from 'node:fs';
const admin = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');
const main = fs.readFileSync('src/main.jsx', 'utf8');
const css = fs.readFileSync('src/ui-core/styles/admin-center-v1224.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [
  ['version', pkg.version === '12.24.0'],
  ['stylesheet import', main.includes("admin-center-v1224.css")],
  ['sidebar removed', admin.includes('admin-page-v124') && css.includes('.admin-v41-sidebar{display:none!important}')],
  ['top navigation', admin.includes('admin-v124-topbar') && admin.includes('Admin Center')],
  ['full width layout', css.includes('max-width:none!important') && css.includes('padding:12px 14px 48px!important')],
  ['four color coded panels', ['admin-v124-panel-blue','admin-v124-panel-green','admin-v124-panel-orange','admin-v124-panel-purple'].every((token) => admin.includes(token))],
  ['interactive permission profiles', admin.includes('AdminPermissionProfileCard') && admin.includes('Duyệt toàn quyền')],
  ['notification bridge', admin.includes("brian:activity-center-open")],
  ['report export', admin.includes('exportAdminReport') && admin.includes('Blob')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
if (failed.length) process.exit(1);
console.log(`All ${checks.length} V12.24.0 checks passed.`);
