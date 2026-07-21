import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-key';
delete process.env.OPENROUTER_BILLING_MODE;
delete process.env.OPENROUTER_ALLOW_PAID_MODE;
delete process.env.OPENROUTER_MODEL;

const requests = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, init = {}) => {
  const body = JSON.parse(String(init.body || '{}'));
  requests.push(body);
  if (body.model === 'openrouter/auto') {
    return new Response(JSON.stringify({ error: { message: 'This request requires more credits, or fewer max_tokens. You requested up to 3800 tokens, but can only afford 313.' } }), {
      status: 402,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({
    model: 'openrouter/free',
    choices: [{ message: { content: '{"status":"ok"}' } }],
    usage: { prompt_tokens: 8, completion_tokens: 5 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const { callServerAI, getServerAiReadiness } = await import('../server/unifiedAiProviderAdapter.js');

  const freeResult = await callServerAI({
    prompt: 'Return JSON.',
    responseMimeType: 'application/json',
    maxOutputTokens: 3800,
    taskId: 'worksheet.generate',
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, 'openrouter/free');
  assert.ok(requests[0].max_tokens <= 2000);
  assert.equal(requests[0].provider.require_parameters, false);
  assert.equal('data_collection' in requests[0].provider, false);
  assert.equal(freeResult.billingMode, 'free');
  assert.equal(getServerAiReadiness().freeFirst, true);
  assert.equal(getServerAiReadiness().models.standard, 'openrouter/free');

  process.env.OPENROUTER_BILLING_MODE = 'auto';
  const staleEnvResult = await callServerAI({ prompt: 'Return JSON.', maxOutputTokens: 3800 });
  assert.equal(requests.at(-1).model, 'openrouter/free');
  assert.equal(staleEnvResult.billingMode, 'free');

  process.env.OPENROUTER_ALLOW_PAID_MODE = 'true';
  const beforeAuto = requests.length;
  const autoResult = await callServerAI({ prompt: 'Return JSON.', maxOutputTokens: 3800 });
  assert.equal(requests.length, beforeAuto + 2);
  assert.equal(requests.at(-2).model, 'openrouter/auto');
  assert.equal(requests.at(-2).provider.data_collection, 'deny');
  assert.equal(requests.at(-1).model, 'openrouter/free');
  assert.equal('data_collection' in requests.at(-1).provider, false);
  assert.equal(autoResult.creditFallback, true);
  assert.equal(autoResult.affordableTokens, 313);

  const memory = new Map();
  const localStorage = {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  globalThis.localStorage = localStorage;
  globalThis.window = { localStorage, dispatchEvent: () => {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  const governance = await import('../src/utils/aiGovernance.js');
  governance.recordAiRequest({ prompt: 'failed prompt', success: false, error: 'upstream rejected' });
  let usage = governance.getAiUsageSummary();
  assert.equal(usage.attempts, 1);
  assert.equal(usage.requests, 0);
  assert.equal(usage.inputTokens, 0);
  assert.equal(usage.errors, 1);
  governance.recordAiRequest({ prompt: 'successful prompt', result: 'done', success: true });
  usage = governance.getAiUsageSummary();
  assert.equal(usage.attempts, 2);
  assert.equal(usage.requests, 1);
  assert.ok(usage.inputTokens > 0);

  const runtime = await import('../src/utils/aiRuntimeManager.js');
  const circuitSettings = { circuitBreakerEnabled: true, circuitFailureThreshold: 2, circuitFailureWindowMs: 120000, circuitCooldownMs: 10000 };
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(runtime.runAiProviderRuntime({
      operationId: `auth-${index}`,
      providerId: 'openrouter:auth-check',
      settings: circuitSettings,
      classifyError: () => 'auth',
      executor: async () => { const error = new Error('invalid key'); error.status = 401; throw error; },
    }));
  }
  assert.equal(runtime.getAiProviderCircuit('openrouter:auth-check', circuitSettings).open, false);

  console.log('V12.40.2 free-first OpenRouter recovery test passed.');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
  delete globalThis.window;
  delete globalThis.CustomEvent;
}
