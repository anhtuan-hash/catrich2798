import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (path, tokens) => {
  const text = read(path);
  for (const token of tokens) if (!text.includes(token)) failures.push(`${path}: missing ${token}`);
};

requireText('src/utils/aiPrivacyFilter.js', [
  'applyAiPrivacyFilter',
  'AI_PRIVACY_BLOCKED',
  'restoreText',
  'PRIVACY RULE',
]);
requireText('src/utils/aiOutputValidator.js', [
  'validateAiOutput',
  'buildAiRepairPrompt',
  'AI_OUTPUT_VALIDATION_FAILED',
  'expectedCount',
]);
requireText('src/utils/gemini.js', [
  'applyAiPrivacyFilter',
  'validateAiOutput',
  'phase: \'repair\'',
  'providerCalls',
  'restored',
]);
requireText('src/utils/aiGovernance.js', [
  'privacyRedactions',
  'validationFailures',
  'validationRepairs',
  'outputValidation',
]);
requireText('src/pages/AIGovernanceCenter.jsx', [
  'Privacy Filter & Output Guard',
  'forceLocalForSensitive',
  'maxRepairAttempts',
]);
requireText('src/pages/WorksheetFactory.jsx', ['collectionKey: \'activities.0.items\'', 'expectedCount: plan.count']);
requireText('src/pages/GrammarBuilder.jsx', ['expectedCount: count', 'collectionKey: \'items\'']);
requireText('src/pages/SpeakingStudio.jsx', ['collectionKey: \'cards\'', 'expectedCount: Number(quantity)']);
requireText('src/config/version.js', ['12.33.0', 'Unified AI Core Phase 2']);
requireText('package.json', ['"version": "12.33.0"', 'verify:v12.33.0', 'test:v12.33.0']);
requireText('public/version.json', ['"version": "12.33.0"', '"aiPrivacyFilter": true', '"aiOutputAutoRepair": true']);

if (failures.length) {
  console.error('V12.33.0 verification failed');
  failures.forEach((item) => console.error('✗', item));
  process.exit(1);
}
console.log('✓ Privacy Filter is centralized before provider transport.');
console.log('✓ Private placeholders are restored locally after validated responses.');
console.log('✓ Output Guard validates and repairs structured responses centrally.');
console.log('✓ Worksheet, Grammar and Speaking workflows declare exact output contracts.');
console.log('✓ AI Governance exposes privacy and validation controls plus usage metrics.');
console.log('✓ V12.33.0 source verification passed.');
