import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const flags = {
  version: '12.40.2',
  appVersion: '12.40.2',
  release: 'OpenRouter Free-First Recovery',
  releaseName: 'OpenRouter Free-First Recovery',
  runtime: '9.0.2',
  runtimeCore: '9.0.2',
  schema: '12.40.2',
  schemaVersion: '12.40.2',
  openRouterOnly: true,
  providerCount: 1,
  openRouterProductionRuntime: true,
  openRouterCreditAwareRuntime: true,
  openRouterBillingMode: 'free',
  openRouterFreeFirst: true,
  openRouterPaidModeExplicitOptIn: true,
  openRouterFreeFallback: true,
  openRouterFreeFallbackModel: 'openrouter/free',
  serverGatewayReadinessBridge: true,
  honestGatewayReadiness: true,
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

console.log('Synced V12.40.2 OpenRouter Free-First Recovery manifests.');
