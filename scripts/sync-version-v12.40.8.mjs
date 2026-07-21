import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const retiredApps = [
  'worksheet-factory',
  'exam-studio',
  'reading-studio',
  'smart-id',
  'speaking-studio',
  'student-practice',
  'writing-studio',
  'pronunciation-coach',
];
const retiredManifestPrefixes = [
  'worksheet',
  'writingStudio',
  'pronunciationCoach',
  'smartId',
];
const flags = {
  version: '12.40.8',
  appVersion: '12.40.8',
  release: 'Three-Tier Visual Harmony',
  releaseName: 'Three-Tier Visual Harmony',
  runtime: '9.0.8',
  runtimeCore: '9.0.8',
  schema: '12.40.8',
  schemaVersion: '12.40.8',
  homepageTheme: 'avocado-raised',
  homepagePrimaryColor: '#B2C248',
  homepageDimensionalCards: true,
  homepageVividRegions: true,
  homepageResponsiveLayout: true,
  recentAppsBarVersion: 'v12.40.8',
  recentAppsCompactLimit: 5,
  recentAppsCurrentStateLabel: true,
  recentAppsExpandableList: true,
  recentAppsNamedActions: true,
  chromeVisualHarmonyVersion: 'v12.40.8',
  chromeTierCount: 3,
  chromeAvocadoHarmony: true,
  chromeStickyHierarchy: true,
  chromeResponsiveHarmony: true,
  chromeScrollDepthEffect: true,
  retiredAppsFullRemoval: true,
  retiredAppRoutesBlocked: true,
  retiredAppSourceModulesRemoved: true,
  openRouterOnly: true,
  providerCount: 1,
  browserApiKeyStorage: false,
  openRouterServerManagedKey: true,
  generatedAt: new Date().toISOString(),
};

for (const filePath of paths) {
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.keys(data).forEach((key) => {
    if (retiredManifestPrefixes.some((prefix) => key.startsWith(prefix))) delete data[key];
  });
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) data[key] = value.filter((item) => !retiredApps.includes(item));
  }
  data.removedApps = [...new Set(Array.isArray(data.removedApps) ? data.removedApps : [])]
    .filter((item) => !retiredApps.includes(item));
  data.retiredApplicationCount = retiredApps.length;
  Object.assign(data, flags);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

console.log('Synced V12.40.8 Three-Tier Visual Harmony manifests.');
