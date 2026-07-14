import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.3.0',
    releaseName: 'Native Management UI Migration',
    runtimeCore: '3.0.0',
    uiCore: true,
    workbenchCore: true,
    managementCore: true,
    migratedManagementApps: ['department','homeroom','work-hub','ai-governance'],
    designLanguages: ['brian-unified','material-3','apple'],
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.3.0');
