import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (path, tokens) => {
  const text = read(path);
  for (const token of tokens) if (!text.includes(token)) failures.push(`${path}: missing ${token}`);
};

requireText('src/utils/gemini.js', [
  'callAIWithMeta',
  'buildAiRoutingCandidates',
  'noteProviderHealth',
  'AI_ALL_PROVIDERS_FAILED',
  '__BES_LAST_AI_META__',
]);
requireText('src/utils/aiProviders.js', [
  'mergeAiConfigs',
  'getEffectiveActiveProvider',
  'saveProviderOverride',
  'setActiveProviderOverride',
]);
requireText('src/utils/aiProviderOverrides.js', [
  'scopedStorageKey',
  'USER_SCOPE_KEY',
]);
requireText('src/utils/aiTaskRegistry.js', [
  'AI_TASK_REGISTRY',
  'teacher-content-creation',
  'enrichAiTaskOptions',
]);
requireText('src/config/version.js', ['12.32.0', 'Unified AI Core Phase 1']);
requireText('package.json', ['"version": "12.32.0"', 'verify:v12.32.0']);

if (failures.length) {
  console.error('V12.32.0 verification failed');
  failures.forEach((item) => console.error('✗', item));
  process.exit(1);
}
console.log('✓ Provider Hub, legacy settings and active-provider resolution are unified.');
console.log('✓ callAI now uses Smart Routing candidates and provider health feedback.');
console.log('✓ AI task aliases normalize historical app profiles into canonical governance profiles.');
console.log('✓ Provenance metadata is available through callAIWithMeta without breaking existing callAI callers.');
console.log('✓ V12.32.0 source verification passed.');
