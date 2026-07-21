import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.23.0',
    release: 'Department Detail Workspace & Notification Bridge',
    releaseName: 'Department Detail Workspace & Notification Bridge',
    runtimeCore: '3.6.1',
    uiCore: true,
    workspaceOsCore: true,
    departmentColorCodedDesignSystem: true,
    departmentDetailFullWidth: true,
    departmentDetailModuleScroll: true,
    departmentUnifiedDetailCards: true,
    activityCenterBridgeRestored: true,
    notificationPanelOpenFix: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.23.0');
