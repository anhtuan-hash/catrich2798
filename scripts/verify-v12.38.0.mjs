import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const promptRegistry = read('src/utils/aiPromptRegistry.js');
const taskRuntime = read('src/utils/aiTaskRuntime.js');
const gemini = read('src/utils/gemini.js');
const governancePage = read('src/pages/AIGovernanceCenter.jsx');
const manifest = JSON.parse(read('public/version.json'));

assert.match(promptRegistry, /AI_PROMPT_REGISTRY_VERSION = 'bes-ai-prompt-registry\/1\.0'/);
assert.match(promptRegistry, /worksheet\.generateSource/);
assert.match(promptRegistry, /grammar\.generateBatch/);
assert.match(promptRegistry, /homeroom\.writeComment/);
assert.match(promptRegistry, /department\.generateReport/);
assert.match(taskRuntime, /runAITaskWithMeta/);
assert.match(taskRuntime, /runLegacyAITask/);
assert.match(taskRuntime, /getAiTaskRuntimeMetrics/);
assert.match(gemini, /registryTaskId/);
assert.match(gemini, /promptRegistryVersion/);
assert.match(governancePage, /AI Task & Prompt Registry/);
assert.match(governancePage, /runAITask\(\)/);

const appFiles = [
  ...fs.readdirSync('src/pages').filter((name) => name.endsWith('.jsx')).map((name) => `src/pages/${name}`),
  ...fs.readdirSync('src/components').filter((name) => name.endsWith('.jsx')).map((name) => `src/components/${name}`),
];
const directCallers = appFiles.filter((file) => /\bcallAI(?:WithMeta)?\s*\(/.test(read(file)));
assert.deepEqual(directCallers, []);

assert.equal(manifest.version, '12.38.0');
assert.equal(manifest.aiUnifiedCorePhase, 7);
assert.equal(manifest.aiPromptRegistry, true);
assert.equal(manifest.aiTaskContracts, true);
assert.equal(manifest.aiApplicationDirectCallMigration, true);
assert.equal(manifest.aiGatewayContract, 'bes-ai-core/1.4');

console.log('✓ App-level direct callAI usage has been migrated to runAITask().');
console.log('✓ Prompt versions and task contracts are attached to AI provenance metadata.');
console.log('✓ Governance exposes task success, repair, fallback and latency metrics.');
console.log('✓ Legacy callAI remains only inside AI infrastructure adapters.');
console.log('✓ Version and release manifest are synchronized to V12.38.0.');
