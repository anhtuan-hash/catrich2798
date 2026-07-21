import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.window = {
  localStorage: storage,
  location: { origin: 'https://brian.test' },
  dispatchEvent() {},
};
storage.setItem('bes-ai-user-scope', 'transport-test-user');

const overrides = await import('../src/utils/aiProviderOverrides.js');
const governance = await import('../src/utils/aiGovernance.js');
const { callAIImageWithMeta, callAIVisionWithMeta, getAiMediaReadiness } = await import('../src/utils/aiMedia.js');
const { callServerAI, getServerAiReadiness } = await import('../server/unifiedAiProviderAdapter.js');

overrides.saveProviderOverride('gemini', {
  apiKey: 'gemini-test-key',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  enabled: true,
}, { activate: true });
overrides.saveRoutingPreferences({ mode: 'vision', fallbackEnabled: false, fallbackOrder: ['gemini'] });
governance.saveAiGovernanceSettings({
  privacy: { ...governance.getAiGovernanceSettings().privacy, enabled: true, mode: 'mask' },
  outputValidation: { ...governance.getAiGovernanceSettings().outputValidation, enabled: true },
});

const readiness = getAiMediaReadiness();
assert.equal(readiness.imageAnalysisReady, true);
assert.equal(readiness.imageGenerationReady, true);

const calls = [];
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url: String(url), body, headers: init.headers });
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /learner@school\.edu\.vn/);
  if (body?.generationConfig?.responseModalities) {
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'Lighting is balanced for [EMAIL_1].' }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const tinyImage = 'data:image/png;base64,aW1hZ2U=';
const vision = await callAIVisionWithMeta({
  imageDataUrl: tinyImage,
  prompt: 'Email học sinh: learner@school.edu.vn. Analyze this portrait for ID-photo lighting only.',
  fallback: false,
  maxOutputTokens: 120,
});
assert.match(vision.text, /learner@school\.edu\.vn/);
assert.equal(vision.meta.taskId, 'image-analysis');
assert.equal(vision.meta.transport, 'browser-direct');
assert.equal(vision.meta.privacy.applied, true);

const image = await callAIImageWithMeta({
  imageDataUrl: tinyImage,
  prompt: 'Create a clean portrait. Email học sinh: learner@school.edu.vn',
  models: ['gemini-image-test'],
  retries: 0,
});
assert.equal(image.imageDataUrl, 'data:image/png;base64,aW1hZ2U=');
assert.equal(image.meta.mediaType, 'image');
assert.equal(image.meta.provider, 'gemini');
assert.equal(image.meta.validation.valid, true);
assert.equal(image.meta.privacy.applied, true);
assert.ok(calls.some((item) => item.body?.generationConfig?.responseModalities));

process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'server-gemini-key';
process.env.GEMINI_MODEL = 'gemini-server-test';
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /generativelanguage\.googleapis\.com/);
  assert.equal(init.headers['x-goog-api-key'], 'server-gemini-key');
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Server adapter ready.' }] } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
assert.equal(getServerAiReadiness('gemini').configured, true);
const server = await callServerAI({ provider: 'gemini', prompt: 'Health check', requestId: 'req-test' });
assert.equal(server.text, 'Server adapter ready.');
assert.equal(server.transport, 'server-gateway');
assert.equal(server.requestId, 'req-test');

console.log('✓ SmartID vision analysis uses the unified text/vision pipeline.');
console.log('✓ SmartID image editing uses centralized privacy, governance, audit and metadata.');
console.log('✓ No personal email reached either Gemini media request.');
console.log('✓ Server AI routes share one provider adapter and transport contract.');
console.log('✓ Browser and server responses expose transport provenance.');
