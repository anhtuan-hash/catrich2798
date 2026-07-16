import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const retiredApps = [
  'worksheet-factory', 'exam-studio', 'reading-studio', 'smart-id',
  'speaking-studio', 'student-practice', 'writing-studio', 'pronunciation-coach',
];
const retiredManifestPrefixes = ['worksheet', 'writingStudio', 'pronunciationCoach', 'smartId'];
const flags = {
  version: '12.40.9',
  appVersion: '12.40.9',
  release: 'Stability & Speed',
  releaseName: 'Stability & Speed',
  runtime: '9.0.9',
  runtimeCore: '9.0.9',
  schema: '12.40.9',
  schemaVersion: '12.40.9',
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
  stabilitySpeedVersion: 'v12.40.9',
  routeCssCodeSplitting: true,
  deferredShellPhases: 2,
  predictiveRoutePrefetch: true,
  stickyChromeGpuLayer: true,
  initialCssBudgetBytes: 1100000,
  initialJsBudgetBytes: 800000,
  initialJsGzipBudgetBytes: 245000,
  isolatedLazyRouteChunks: true,
  aiFastFreeTextMode: true,
  aiRuntimeWarmup: true,
  aiStreamingFallback: true,
  aiHealthCacheMs: 120000,
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

console.log('Synced V12.40.9 Stability & Speed manifests.');
