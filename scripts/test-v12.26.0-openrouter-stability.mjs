#!/usr/bin/env node
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  location: { origin: 'https://esl-pek.vercel.app' },
  dispatchEvent() {},
  addEventListener() {},
};
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };

const providers = await import('../src/utils/aiProviders.js');
providers.setAiStorageUser({ id: 'test-user', email: 'test@example.com' });
storage.setItem('bes-ai-configs:test-user', JSON.stringify({
  openrouter: { apiKey: 'test-key', model: 'openai/gpt-4o-mini', baseUrl: 'https://openrouter.ai/api/v1', enabled: true },
}));
const migrated = providers.getAiConfigs();
assert.equal(migrated.openrouter.model, 'openrouter/free', 'legacy paid OpenRouter model should migrate once to free router');

const governance = await import('../src/utils/aiGovernance.js');
const diagnostic = governance.guardAiRequest({ prompt: 'ping', governanceProfile: 'diagnostic', maxOutputTokens: 48 });
assert.equal(diagnostic.maxOutputTokens, 48, 'diagnostic requests must not be inflated to the old 256-token minimum');

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const body = JSON.parse(init.body || '{}');
  calls.push({ url: String(url), body });
  if (calls.length === 1) {
    return new Response(JSON.stringify({ error: { message: 'Insufficient credits. Upgrade to a paid account.' } }), { status: 402, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: 'BRIAN_OK' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { callAI } = await import('../src/utils/gemini.js');
const retries = [];
const result = await callAI({
  provider: 'openrouter',
  apiKey: 'test-key',
  model: 'openai/gpt-4o-mini',
  baseUrl: 'https://openrouter.ai/api/v1',
  prompt: 'Reply exactly BRIAN_OK',
  governanceProfile: 'diagnostic',
  maxOutputTokens: 48,
  fallback: false,
  onAdaptiveRetry: (info) => retries.push(info),
});
assert.equal(result, 'BRIAN_OK');
assert.equal(calls.length, 2);
assert.equal(calls[0].body.max_tokens, 48);
assert.equal(calls[1].body.model, 'openrouter/free');
assert.equal(calls[1].body.max_tokens, 48);
assert.equal(retries[0]?.reason, 'free-model-fallback');
console.log('V12.26.0 OpenRouter stability tests PASS (3/3)');
