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
globalThis.window = {
  localStorage: storage,
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
  location: { origin: 'http://localhost' },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};

const sharedKey = 'sk-or-v1-shared-test-key';
process.env.OPENROUTER_API_KEY = sharedKey;
process.env.OPENROUTER_MODEL = 'openrouter/free';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const body = JSON.parse(String(init.body || '{}'));
  calls.push({ url: String(url), headers: init.headers || {}, body });
  if (String(url).endsWith('/images')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'aW1hZ2U=', media_type: 'image/png' }] }),
    };
  }
  const hasImage = JSON.stringify(body).includes('image_url');
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: hasImage ? 'VISION_OK' : 'BRIAN_OK' } }] }),
  };
};

const providers = await import('../src/utils/aiProviders.js');
providers.setAiStorageUser({ id: 'teacher-openrouter-test' });
providers.saveAiConfigs({
  openrouter: {
    apiKey: sharedKey,
    model: 'openrouter/free',
    visionModel: 'openrouter/auto',
    imageModel: 'bytedance-seed/seedream-4.5',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
});

const configs = providers.getAiConfigs();
assert.deepEqual(Object.keys(configs), ['openrouter']);
assert.equal(configs.openrouter.apiKey, sharedKey);
assert.equal(providers.getAiProvider(), 'openrouter');
assert.equal(providers.getFallbackEnabled(), false);

const { runAITaskWithMeta } = await import('../src/utils/aiTaskRuntime.js');
const { callAIVisionWithMeta, callAIImageWithMeta } = await import('../src/utils/aiMedia.js');
const { callServerAI } = await import('../server/unifiedAiProviderAdapter.js');

const textResult = await runAITaskWithMeta('system.connectionTest', {
  prompt: 'Reply with BRIAN_OK only.',
  maxOutputTokens: 40,
});
assert.equal(textResult.text, 'BRIAN_OK');
assert.equal(textResult.meta.provider, 'openrouter');
assert.equal(textResult.meta.fallbackUsed, false);

const visionResult = await callAIVisionWithMeta({
  prompt: 'Describe the image briefly.',
  imageDataUrl: 'data:image/png;base64,aW1hZ2U=',
});
assert.equal(visionResult.text, 'VISION_OK');
assert.equal(visionResult.meta.provider, 'openrouter');

const imageResult = await callAIImageWithMeta({
  prompt: 'Create a clean educational icon.',
  imageDataUrl: 'data:image/png;base64,aW1hZ2U=',
});
assert.equal(imageResult.imageDataUrl, 'data:image/png;base64,aW1hZ2U=');
assert.equal(imageResult.meta.provider, 'openrouter');

const serverResult = await callServerAI({ prompt: 'Reply with BRIAN_OK only.', maxOutputTokens: 40 });
assert.equal(serverResult.text, 'BRIAN_OK');
assert.equal(serverResult.provider, 'openrouter');

assert.ok(calls.length >= 4);
assert.ok(calls.every((call) => call.url.startsWith('https://openrouter.ai/api/v1/')));
assert.ok(calls.every((call) => String(call.headers.Authorization || '') === `Bearer ${sharedKey}`));
assert.ok(calls.some((call) => call.url.endsWith('/chat/completions') && JSON.stringify(call.body).includes('image_url')));
assert.ok(calls.some((call) => call.url.endsWith('/images') && Array.isArray(call.body.input_references)));
assert.ok(calls.every((call) => !/generativelanguage|api\.openai|anthropic|groq|mistral|cohere/i.test(call.url)));

console.log('✓ One shared OpenRouter key is read from the account-scoped AI configuration.');
console.log('✓ Text and Task Registry requests use OpenRouter chat completions.');
console.log('✓ Vision uses the same key with OpenRouter image_url content.');
console.log('✓ Image generation/editing uses the same key with OpenRouter /images.');
console.log('✓ The server compatibility adapter is OpenRouter-only.');
