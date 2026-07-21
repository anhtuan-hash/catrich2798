import fs from 'node:fs';

const APP_VERSION = '12.36.0';
const RELEASE_NAME = 'Unified AI Control Plane & Observability';
const RUNTIME_VERSION = '5.0.0';
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
pkg.description = 'Brian English Studio V12.36.0 — adds an AI control plane with per-account fair use, task/provider/model telemetry, request traces and global AI result receipts.';
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
  manifest.unifiedAiCorePhase = 5;
  manifest.aiUnifiedCorePhase = 5;
  manifest.aiControlPlane = true;
  manifest.aiFairUseBudgets = true;
  manifest.aiPerAccountRequestLimit = true;
  manifest.aiPerAccountTokenBudget = true;
  manifest.aiTaskTelemetry = true;
  manifest.aiProviderCallTelemetry = true;
  manifest.aiModelTelemetry = true;
  manifest.aiTransportTelemetry = true;
  manifest.aiFallbackTelemetry = true;
  manifest.aiGlobalProvenanceReceipt = true;
  manifest.aiAuditTraceInspector = true;
  manifest.aiGovernanceReportSchema = 'bes-ai-governance-report/2.0';
  manifest.aiGatewayContract = 'bes-ai-core/1.2';
  manifest.aiTransportProvenance = true;
  manifest.requiresSql = false;
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Version synchronized to V${APP_VERSION}`);
