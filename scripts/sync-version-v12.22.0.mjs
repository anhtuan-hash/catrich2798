import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.22.0',
    release: 'Color-Coded Department Design System',
    releaseName: 'Color-Coded Department Design System',
    runtimeCore: '3.6.0',
    uiCore: true,
    workspaceOsCore: true,
    departmentCommandCenter: true,
    departmentInteractiveCards: true,
    departmentRefinedWorkspace: true,
    departmentColorCodedDesignSystem: true,
    departmentFullWidthGutters: true,
    departmentUnifiedCardLanguage: true,
    departmentStatusChips: true,
    departmentColoredModuleTabs: true,
    departmentPolishedScrollbars: true,
    departmentDirectScheduleComposer: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.22.0');
