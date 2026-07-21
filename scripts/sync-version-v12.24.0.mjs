import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.24.0',
    release: 'Admin Center Option 1',
    releaseName: 'Admin Center Option 1',
    runtimeCore: '3.6.1',
    uiCore: true,
    workspaceOsCore: true,
    adminCenterOptionOne: true,
    adminSidebarRemoved: true,
    adminFullWidthWidescreen: true,
    adminColorCodedModules: true,
    adminUnifiedCardLanguage: true,
    adminInteractivePermissionProfiles: true,
    adminActivityCenterButton: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.24.0');
