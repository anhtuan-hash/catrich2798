import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.9.0',
    release: 'Workspace OS Core & Session Continuity',
    releaseName: 'Workspace OS Core & Session Continuity',
    runtimeCore: '3.3.0',
    uiCore: true,
    workspaceOsCore: true,
    workspaceTaxonomy: ['teaching','assessment','content','management','resources','ai','games','system'],
    workspaceHub: true,
    workspaceSessionMemory: true,
    workspaceCatalogFiltering: true,
    commandPaletteWorkspaceSearch: true,
    migratedPlatformRoutes: ['ai-workspace','content-factory','content-ecosystem','assessment-core','learning-intelligence','platform-readiness','automation-center','cloud-operations','collaboration-hub','data-governance','production-hardening'],
    legacyCssEntryCount: 1,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.9.0');
