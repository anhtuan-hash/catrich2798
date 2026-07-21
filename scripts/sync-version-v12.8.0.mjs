import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.8.0',
    release: 'Platform Core & Legacy CSS Retirement',
    releaseName: 'Platform Core & Legacy CSS Retirement',
    runtimeCore: '3.2.0',
    uiCore: true,
    platformCore: true,
    nativeRouteSurfaces: true,
    migratedPlatformRoutes: ['ai-workspace','content-factory','content-ecosystem','assessment-core','learning-intelligence','platform-readiness','automation-center','cloud-operations','collaboration-hub','data-governance','production-hardening'],
    legacyCssEntryCount: 1,
    retiredLegacyCssFiles: ['v1100','v1110','v1131','v1132','v1133','v1136','v1137','v1154','v1158','v1159'],
    providerHubStyleRecovered: true,
    deadLegacyCssRetired: true,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.8.0');
