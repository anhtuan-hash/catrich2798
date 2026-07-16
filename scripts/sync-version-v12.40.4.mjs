import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const flags = {
  version: '12.40.4',
  appVersion: '12.40.4',
  release: 'OpenRouter Fast Free Mode',
  releaseName: 'OpenRouter Fast Free Mode',
  runtime: '9.0.4',
  runtimeCore: '9.0.4',
  schema: '12.40.4',
  schemaVersion: '12.40.4',
  openRouterOnly: true,
  providerCount: 1,
  openRouterBillingMode: 'free',
  openRouterFreeFirst: true,
  openRouterPaidModeExplicitOptIn: true,
  openRouterFastFreeMode: true,
  openRouterFastFreeSelection: 'latency-catalog',
  openRouterFastFreeCacheMinutes: 15,
  openRouterFastFreePrimaryTimeoutMs: 40000,
  openRouterFastFreeFallbackTimeoutMs: 45000,
  openRouterFastFreeFallbackModel: 'openrouter/free',
  openRouterJsonRequireParameters: true,
  textLabJsonContract: true,
  textLabMaxOutputTokens: 1800,
  browserApiKeyStorage: false,
  openRouterServerManagedKey: true,
  generatedAt: new Date().toISOString(),
};

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  Object.assign(data, flags);
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

console.log('Synced V12.40.4 OpenRouter Fast Free Mode manifests.');
