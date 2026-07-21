import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (path, tokens) => {
  const text = read(path);
  for (const token of tokens) if (!text.includes(token)) failures.push(`${path}: missing ${token}`);
};
const forbidText = (path, tokens) => {
  const text = read(path);
  for (const token of tokens) if (text.includes(token)) failures.push(`${path}: forbidden ${token}`);
};

requireText('src/utils/aiMedia.js', [
  'callAIVisionWithMeta',
  'callAIImageWithMeta',
  'applyAiPrivacyFilter',
  'recordAiRequest',
  "mediaType: 'image'",
]);
requireText('src/pages/SmartIdStudio.jsx', [
  'callAIVisionWithMeta',
  'callAIImageWithMeta',
  'getAiMediaReadiness',
]);
forbidText('src/pages/SmartIdStudio.jsx', [
  'generativelanguage.googleapis.com',
  'x-goog-api-key',
  'fetchJsonWithRetry',
]);
requireText('server/unifiedAiProviderAdapter.js', [
  'callServerAI',
  'getServerAiReadiness',
  "transport: 'server-gateway'",
]);
requireText('server/lessonAiHandler.js', ['callServerAI', 'getServerAiReadiness']);
requireText('api/ai.js', ['bes-ai-core/1.0', 'callServerAI', 'transport: result.transport']);
forbidText('api/ai.js', ["fetch('https://api.openai.com/v1/responses'"]);
requireText('src/utils/gemini.js', ["transport: 'browser-direct'"]);
requireText('src/pages/EnglishLessonIntegrationStudio.jsx', ['callAIWithMeta', "transport: 'browser-unified'"]);
requireText('src/pages/AIGovernanceCenter.jsx', ['Độ phủ Unified AI Core', 'bes-ai-core/1.0']);
requireText('src/config/version.js', ['12.34.0', 'Unified AI Core Phase 3']);
requireText('package.json', ['"version": "12.34.0"', 'verify:v12.34.0', 'test:v12.34.0']);
requireText('public/version.json', ['"version": "12.34.0"', '"aiUnifiedMediaPipeline": true', '"aiServerProviderAdapter": true', '"aiGatewayContract": "bes-ai-core/1.0"']);

if (failures.length) {
  console.error('V12.34.0 verification failed');
  failures.forEach((item) => console.error('✗', item));
  process.exit(1);
}
console.log('✓ SmartID direct Gemini requests were removed from the page.');
console.log('✓ Vision and image editing now use the unified media pipeline.');
console.log('✓ Legacy /api/ai and lesson AI routes share one server provider adapter.');
console.log('✓ Gateway contract bes-ai-core/1.0 and transport provenance are available.');
console.log('✓ AI Governance displays unified transport coverage.');
console.log('✓ V12.34.0 source verification passed.');
