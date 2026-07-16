import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const flags = {
  version: '12.40.0',
  appVersion: '12.40.0',
  release: 'OpenRouter Production Runtime',
  releaseName: 'OpenRouter Production Runtime',
  runtime: '9.0.0',
  runtimeCore: '9.0.0',
  schema: '12.40.0',
  schemaVersion: '12.40.0',
  openRouterOnly: true,
  providerCount: 1,
  openRouterProductionRuntime: true,
  aiServerGatewayContract: 'bes-ai-core/1.3',
  browserApiKeyStorage: false,
  openRouterAccountScopedKey: false,
  openRouterAdaptiveCreditRetry: false,
  openRouterServerManagedKey: true,
  openRouterTaskAwareRouting: true,
  openRouterAutoRouter: true,
  streamingAiResponses: true,
  structuredJsonRequireParameters: true,
  serverNetworkRetryLimit: 1,
  browserNetworkRetryLimit: 0,
  modelScopedCircuitBreaker: true,
  taskSpecificTimeouts: true,
  legacyElisPublicBundleRemoved: true,
  legacyGovernanceFetchPatchRemoved: true,
  generatedAt: new Date().toISOString(),
};
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  Object.assign(data, flags);
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
console.log('Synced V12.40.0 OpenRouter Production Runtime manifests.');
