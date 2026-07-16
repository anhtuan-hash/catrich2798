import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const flags = {
  version: '12.40.3',
  appVersion: '12.40.3',
  release: 'OpenRouter Free JSON Resilience',
  releaseName: 'OpenRouter Free JSON Resilience',
  runtime: '9.0.3',
  runtimeCore: '9.0.3',
  schema: '12.40.3',
  schemaVersion: '12.40.3',
  openRouterOnly: true,
  providerCount: 1,
  openRouterProductionRuntime: true,
  openRouterBillingMode: 'free',
  openRouterFreeFirst: true,
  openRouterPaidModeExplicitOptIn: true,
  openRouterFreeFallbackModel: 'openrouter/free',
  openRouterJsonRequireParameters: true,
  openRouterEmptyResponseRetry: 1,
  openRouterNetworkRetry: 1,
  textLabJsonContract: true,
  textLabMaxOutputTokens: 2200,
  failedRequestsConsumeLocalQuota: false,
  transientOnlyCircuitBreaker: true,
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

console.log('Synced V12.40.3 OpenRouter Free JSON Resilience manifests.');
