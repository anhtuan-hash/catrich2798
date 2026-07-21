import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage, dispatchEvent() {}, setTimeout };
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };

const cloud = await import('../src/utils/aiGovernanceCloud.js');

const event = cloud.buildAiGovernanceCloudEvent({
  type: 'request',
  status: 'success',
  label: 'AI request completed',
  taskId: 'worksheet',
  provider: 'openrouter',
  model: 'openrouter/free',
  transport: 'browser-unified',
  operationId: 'operation-123',
  actor: { email: 'teacher@example.edu.vn', role: 'teacher' },
  detail: {
    inputTokens: 120,
    outputTokens: 240,
    durationMs: 1600,
    providerCalls: 2,
    fallbackUsed: true,
    prompt: 'PRIVATE STUDENT PROMPT',
    result: 'PRIVATE GENERATED RESPONSE',
    apiKey: 'sk-private',
    privacy: { maskedCount: 3, categories: ['email', 'person'] },
    validation: { valid: true, repaired: true },
    runtime: { retries: 1, cacheHit: false, deduplicated: true, timedOut: false },
  },
});

assert.match(event.id, /^[0-9a-f-]{36}$/i);
assert.equal(event.event_type, 'request');
assert.equal(event.input_tokens, 120);
assert.equal(event.output_tokens, 240);
assert.equal(event.provider_calls, 2);
assert.equal(event.fallback_used, true);
assert.equal(event.privacy_redactions, 3);
assert.equal(event.validation_repairs, 1);
assert.equal(event.runtime_retries, 1);
assert.equal(event.runtime_dedupe_hit, true);
const serialized = JSON.stringify(event);
assert.doesNotMatch(serialized, /PRIVATE STUDENT PROMPT/);
assert.doesNotMatch(serialized, /PRIVATE GENERATED RESPONSE/);
assert.doesNotMatch(serialized, /sk-private/);
assert.doesNotMatch(serialized, /apiKey/);
assert.match(serialized, /worksheet/);

const status = cloud.getAiGovernanceCloudStatus();
assert.equal(status.mode, 'local-first-cloud-sync');
assert.equal(typeof status.pending, 'number');

console.log('✓ Cloud events preserve operational telemetry and provenance.');
console.log('✓ Prompt, generated response and API credentials are excluded from cloud payloads.');
console.log('✓ Privacy, validation and runtime counters remain available for central reporting.');
console.log('✓ Local-first sync status is resilient when Supabase is not configured.');
