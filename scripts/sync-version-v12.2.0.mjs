import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.2.0',
    releaseName: 'Unified Workbench Migration',
    runtimeCore: '3.0.0',
    uiCore: true,
    workbenchCore: true,
    migratedWorkbenches: ['grammar-builder','worksheet-factory','writing-studio','pronunciation-coach'],
    designLanguages: ['brian-unified','material-3','apple'],
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.2.0');
