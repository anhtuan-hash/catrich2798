import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
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
storage.setItem('bes-ai-user-scope', 'test-user');

const overrides = await import('../src/utils/aiProviderOverrides.js');
const providers = await import('../src/utils/aiProviders.js');
const { callAIWithMeta } = await import('../src/utils/gemini.js');

// Provider Hub overrides and the legacy provider API must now resolve to the
// same default provider and model.
overrides.saveProviderOverride('openrouter', {
  apiKey: 'or-key',
  model: 'openrouter/free',
  baseUrl: 'https://openrouter.ai/api/v1',
  enabled: true,
}, { activate: true });
overrides.saveRoutingPreferences({ mode: 'smart', fallbackEnabled: true, fallbackOrder: ['openrouter', 'groq', 'ollama'] });
assert.equal(providers.getAiProvider(), 'openrouter');
assert.equal(providers.getActiveAiConfig().model, 'openrouter/free');
assert.equal(providers.getActiveAiConfig().apiKey, 'or-key');

// Explicit diagnostic requests must stay on the requested provider and expose
// standardized provenance metadata without changing the string API used by apps.
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /openrouter\.ai\/api\/v1\/chat\/completions/);
  const body = JSON.parse(init.body);
  assert.equal(body.model, 'openrouter/free');
  return new Response(JSON.stringify({ choices: [{ message: { content: 'BRIAN_OK' } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const diagnostic = await callAIWithMeta({
  provider: 'openrouter',
  apiKey: 'or-key',
  model: 'openrouter/free',
  baseUrl: 'https://openrouter.ai/api/v1',
  prompt: 'Reply with exactly BRIAN_OK',
  governanceProfile: 'diagnostic',
  fallback: false,
  maxOutputTokens: 48,
});
assert.equal(diagnostic.text, 'BRIAN_OK');
assert.equal(diagnostic.meta.provider, 'openrouter');
assert.equal(diagnostic.meta.taskId, 'diagnostic');
assert.equal(diagnostic.meta.fallbackUsed, false);

// Smart fallback must use the default provider first, then move to the next
// configured provider after a retryable provider error.
overrides.saveProviderOverride('groq', {
  apiKey: 'groq-key',
  model: 'llama-3.3-70b-versatile',
  baseUrl: 'https://api.groq.com/openai/v1',
  enabled: true,
}, { activate: true });
overrides.saveProviderOverride('openrouter', {
  apiKey: 'or-key',
  model: 'openrouter/free',
  baseUrl: 'https://openrouter.ai/api/v1',
  enabled: true,
}, { activate: false });
overrides.saveRoutingPreferences({ mode: 'smart', fallbackEnabled: true, fallbackOrder: ['groq', 'openrouter', 'ollama'] });
let calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes('api.groq.com')) {
    return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: 'FALLBACK_OK' } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const fallback = await callAIWithMeta({ prompt: 'Create one short teaching activity.', maxOutputTokens: 80 });
assert.equal(fallback.text, 'FALLBACK_OK');
assert.equal(fallback.meta.provider, 'openrouter');
assert.equal(fallback.meta.fallbackUsed, true);
assert.equal(calls.length, 2);
assert.match(calls[0], /api\.groq\.com/);
assert.match(calls[1], /openrouter\.ai/);

// Local OpenAI-compatible providers must work without a fake API key.
overrides.saveProviderOverride('ollama', {
  apiKey: '',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434/v1',
  enabled: true,
}, { activate: true });
overrides.saveRoutingPreferences({ mode: 'smart', fallbackEnabled: false, fallbackOrder: ['ollama'] });
let localAuthHeader = 'not-checked';
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /localhost:11434\/v1\/chat\/completions/);
  localAuthHeader = init.headers.Authorization;
  return new Response(JSON.stringify({ choices: [{ message: { content: 'LOCAL_OK' } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const local = await callAIWithMeta({ prompt: 'Local private test', fallback: false });
assert.equal(local.text, 'LOCAL_OK');
assert.equal(local.meta.provider, 'ollama');
assert.equal(localAuthHeader, undefined);

console.log('✓ Provider Hub and legacy AI configuration resolve to one active provider.');
console.log('✓ Unified callAI routing returns standardized provenance metadata.');
console.log('✓ Smart fallback switches provider after retryable errors.');
console.log('✓ Local OpenAI-compatible providers work without API keys.');
