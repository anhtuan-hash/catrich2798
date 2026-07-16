import fs from 'node:fs';

const paths = ['public/version.json', 'public/release-manifest.json'];
const flags = {
  version: '12.40.1',
  appVersion: '12.40.1',
  release: 'OpenRouter Credit-Aware Runtime',
  releaseName: 'OpenRouter Credit-Aware Runtime',
  runtime: '9.0.1',
  runtimeCore: '9.0.1',
  schema: '12.40.1',
  schemaVersion: '12.40.1',
  openRouterOnly: true,
  providerCount: 1,
  openRouterProductionRuntime: true,
  openRouterCreditAwareRuntime: true,
  openRouterBillingMode: 'auto',
  openRouterFreeFallback: true,
  openRouterFreeFallbackModel: 'openrouter/free',
  textLabMaxOutputTokens: 1400,
  serverGatewayReadinessBridge: true,
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
console.log('Synced V12.40.1 OpenRouter Credit-Aware Runtime manifests.');
