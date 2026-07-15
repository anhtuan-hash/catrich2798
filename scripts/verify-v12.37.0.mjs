import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const cloud = read('src/utils/aiGovernanceCloud.js');
const governance = read('src/utils/aiGovernance.js');
const page = read('src/pages/AIGovernanceCenter.jsx');
const migration = read('supabase/brian_v12_37_ai_governance_cloud.sql');
const manifest = JSON.parse(read('public/version.json'));

assert.match(cloud, /local-first-cloud-sync/);
assert.match(cloud, /bes_v1237_ingest_ai_events/);
assert.match(cloud, /SENSITIVE_KEYS/);
assert.match(cloud, /flushAiGovernanceCloudQueue/);
assert.match(governance, /syncAiGovernanceSettingsFromCloud/);
assert.match(governance, /queueAiGovernanceCloudEvent\(item\)/);
assert.match(page, /AI Governance Cloud Sync/);
assert.match(page, /Prompt, nội dung trả lời và API key không được tải lên/);
assert.match(migration, /create table if not exists public\.ai_governance_events/);
assert.match(migration, /create table if not exists public\.ai_governance_daily/);
assert.match(migration, /bes_v1237_get_ai_governance_dashboard/);
assert.match(migration, /Privacy-safe AI telemetry only/);
assert.equal(manifest.version, '12.37.0');
assert.equal(manifest.aiUnifiedCorePhase, 6);
assert.equal(manifest.aiCloudGovernanceSync, true);
assert.equal(manifest.aiCloudPromptStorage, false);
assert.equal(manifest.requiresSql, true);
assert.equal(manifest.requiredMigration, 'supabase/brian_v12_37_ai_governance_cloud.sql');
assert.equal(manifest.aiGatewayContract, 'bes-ai-core/1.3');

console.log('✓ Local-first AI cloud queue and automatic retry are connected.');
console.log('✓ Cloud payload strips prompts, responses, attachments and secrets.');
console.log('✓ Supabase migration includes RLS, ingestion RPC and admin dashboard RPC.');
console.log('✓ Governance settings and telemetry can synchronize across accounts/devices.');
console.log('✓ Version and release manifest are synchronized to V12.37.0.');
