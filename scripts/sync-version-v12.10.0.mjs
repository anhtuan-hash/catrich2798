import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.10.0',
    release: 'Workspace Navigation & Unified Activity Center',
    releaseName: 'Workspace Navigation & Unified Activity Center',
    runtimeCore: '3.4.0',
    uiCore: true,
    workspaceOsCore: true,
    workspacePrimaryNavigation: true,
    unifiedActivityCenter: true,
    activityCategories: ['notifications','work','sync','history','ai'],
    headlessSyncIndicator: true,
    activityOwnedAutosaveHistory: true,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.10.0');
