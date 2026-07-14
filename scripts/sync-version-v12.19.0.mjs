import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.19.0',
    release: 'Department Command Center',
    releaseName: 'Department Command Center',
    runtimeCore: '3.6.0',
    uiCore: true,
    workspaceOsCore: true,
    departmentCommandCenter: true,
    departmentWidescreenHero: true,
    departmentOperationalStatus: true,
    departmentModernDashboard: true,
    departmentStickyModuleTabs: true,
    departmentRoleAwareActions: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.19.0');
