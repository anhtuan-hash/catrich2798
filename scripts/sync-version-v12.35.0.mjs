import fs from 'node:fs';

const APP_VERSION = '12.35.0';
const RELEASE_NAME = 'Unified AI Runtime Resilience';
const RUNTIME_VERSION = '4.0.0';
const SCHEMA_VERSION = '11.4.2';

const versionSource = `export const APP_VERSION = '${APP_VERSION}';
export const RELEASE_NAME = '${RELEASE_NAME}';
export const RUNTIME_CORE_VERSION = '${RUNTIME_VERSION}';
export const SCHEMA_VERSION = '${SCHEMA_VERSION}';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}
`;
fs.writeFileSync('src/config/version.js', versionSource);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = APP_VERSION;
pkg.description = 'Brian English Studio V12.35.0 — adds a unified AI runtime queue, retries, timeout, de-duplication, safe cache and provider circuit breakers.';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
lock.version = APP_VERSION;
if (lock.packages?.['']) lock.packages[''].version = APP_VERSION;
fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

for (const file of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.version = APP_VERSION;
  manifest.release = RELEASE_NAME;
  manifest.releaseName = RELEASE_NAME;
  manifest.runtime = RUNTIME_VERSION;
  manifest.runtimeCore = RUNTIME_VERSION;
  manifest.schema = SCHEMA_VERSION;
  manifest.unifiedAiCorePhase = 4;
  manifest.aiUnifiedCorePhase = 4;
  manifest.aiRuntimeManager = true;
  manifest.aiRequestQueue = true;
  manifest.aiConcurrencyControl = true;
  manifest.aiTransientRetry = true;
  manifest.aiRequestTimeout = true;
  manifest.aiInFlightDedupe = true;
  manifest.aiSafeSessionCache = true;
  manifest.aiCircuitBreaker = true;
  manifest.aiRuntimeGovernanceUi = true;
  manifest.aiGatewayContract = 'bes-ai-core/1.1';
  manifest.aiTransportProvenance = true;
  manifest.requiresSql = false;
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Version synchronized to V${APP_VERSION}`);
