import fs from 'node:fs';

const APP_VERSION = '12.37.0';
const RELEASE_NAME = 'AI Cloud Governance Sync';
const RUNTIME_VERSION = '6.0.0';
const SCHEMA_VERSION = '12.37.0';

const versionSource = `export const APP_VERSION = '${APP_VERSION}';
export const RELEASE_NAME = '${RELEASE_NAME}';
export const RUNTIME_CORE_VERSION = '${RUNTIME_VERSION}';
export const SCHEMA_VERSION = '${SCHEMA_VERSION}';
export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}
`;
fs.writeFileSync('src/config/version.js', versionSource);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = APP_VERSION;
pkg.description = 'Brian English Studio V12.37.0 — adds privacy-safe local-first Supabase synchronization for AI governance settings, audit events and system-wide telemetry.';
pkg.scripts['version:sync'] = 'node scripts/sync-version-v12.37.0.mjs';
pkg.scripts['test:v12.37.0'] = 'node scripts/test-v12.37.0-ai-cloud-sync.mjs';
pkg.scripts['verify:v12.37.0'] = 'node scripts/verify-v12.37.0.mjs && npm run test:v12.37.0 && npm run build && npm test && npm run test:department';
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
  manifest.schemaVersion = SCHEMA_VERSION;
  manifest.unifiedAiCorePhase = 6;
  manifest.aiUnifiedCorePhase = 6;
  manifest.aiControlPlane = true;
  manifest.aiCloudGovernanceSync = true;
  manifest.aiCloudLocalFirstQueue = true;
  manifest.aiCloudSettingsSync = true;
  manifest.aiCloudAuditSync = true;
  manifest.aiCloudDailyAggregates = true;
  manifest.aiCloudCentralDashboard = true;
  manifest.aiCloudPromptStorage = false;
  manifest.aiCloudResponseStorage = false;
  manifest.aiCloudSecretStorage = false;
  manifest.aiGatewayContract = 'bes-ai-core/1.3';
  manifest.aiGovernanceReportSchema = 'bes-ai-governance-report/2.1';
  manifest.requiresSql = true;
  manifest.requiredMigration = 'supabase/brian_v12_37_ai_governance_cloud.sql';
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Version synchronized to V${APP_VERSION}`);
