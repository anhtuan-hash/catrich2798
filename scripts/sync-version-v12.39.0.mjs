import fs from 'node:fs';

const APP_VERSION = '12.39.0';
const RELEASE_NAME = 'OpenRouter One-Key AI Runtime';
const RUNTIME_VERSION = '8.0.0';
const SCHEMA_VERSION = '12.39.0';

const versionSource = `export const APP_VERSION = '${APP_VERSION}';
export const RELEASE_NAME = '${RELEASE_NAME}';
export const RUNTIME_CORE_VERSION = '${RUNTIME_VERSION}';
export const SCHEMA_VERSION = '${SCHEMA_VERSION}';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}
`;
fs.writeFileSync('src/config/version.js', versionSource);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = APP_VERSION;
pkg.description = 'Brian English Studio V12.39.0 — removes every AI provider except OpenRouter and routes text, JSON, vision, image and app AI tasks through one shared OpenRouter key.';
pkg.scripts['version:sync'] = 'node scripts/sync-version-v12.39.0.mjs';
pkg.scripts['test:v12.39.0'] = 'node scripts/test-v12.39.0-openrouter-one-key.mjs';
pkg.scripts['verify:v12.39.0'] = 'node scripts/verify-v12.39.0.mjs && npm run test:v12.39.0 && npm run build && npm test && npm run test:department';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
lock.version = APP_VERSION;
if (lock.packages?.['']) lock.packages[''].version = APP_VERSION;
fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

const obsoleteKeys = [
  'aiFreeProviderIds',
  'aiProviderCohereNativeAdapter',
  'aiProviderCloudflareAccountBaseUrl',
  'aiLocalPrivacyRouting',
  'smartIdDirectGeminiRemoved',
  'aiFallbackTelemetry',
  'oneClickDefaultProvider',
  'providerSearchAndFilters',
];

for (const file of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of obsoleteKeys) delete manifest[key];
  manifest.version = APP_VERSION;
  manifest.release = RELEASE_NAME;
  manifest.releaseName = RELEASE_NAME;
  manifest.runtime = RUNTIME_VERSION;
  manifest.runtimeCore = RUNTIME_VERSION;
  manifest.schema = SCHEMA_VERSION;
  manifest.schemaVersion = SCHEMA_VERSION;
  manifest.unifiedAiCorePhase = 8;
  manifest.aiUnifiedCorePhase = 8;
  manifest.aiGatewayContract = 'bes-ai-core/1.5';
  manifest.aiGovernanceReportSchema = 'bes-ai-governance-report/2.3';
  manifest.aiProviderHubV2 = true;
  manifest.aiProviderCount = 1;
  manifest.aiProviderIds = ['openrouter'];
  manifest.openRouterOnly = true;
  manifest.openRouterOneKeyRuntime = true;
  manifest.openRouterSharedApiKey = true;
  manifest.openRouterTextRuntime = true;
  manifest.openRouterJsonRuntime = true;
  manifest.openRouterVisionRuntime = true;
  manifest.openRouterImageRuntime = true;
  manifest.openRouterServerGateway = true;
  manifest.openRouterModelRouting = true;
  manifest.openRouterAccountScopedKey = true;
  manifest.openRouterAdaptiveCreditRetry = true;
  manifest.openRouterLegacyConfigMigration = true;
  manifest.openRouterProviderHub = true;
  manifest.multiProviderRuntime = false;
  manifest.providerFallback = false;
  manifest.smartRoutingConnectedToCallAI = true;
  manifest.providerHubRuntimeUnified = true;
  manifest.aiUnifiedMediaPipeline = true;
  manifest.smartIdUnifiedVision = true;
  manifest.smartIdUnifiedImageGeneration = true;
  manifest.aiServerProviderAdapter = true;
  manifest.lessonAiSharedGatewayAdapter = true;
  manifest.aiApplicationDirectCallMigration = true;
  manifest.requiresSql = true;
  manifest.requiredMigration = 'supabase/brian_v12_37_ai_governance_cloud.sql';
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Version synchronized to V${APP_VERSION}`);
