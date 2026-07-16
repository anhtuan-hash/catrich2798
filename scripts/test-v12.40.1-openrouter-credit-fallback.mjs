import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-key';
process.env.OPENROUTER_BILLING_MODE = 'auto';
delete process.env.OPENROUTER_MODEL;

const requests = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, init = {}) => {
  const body = JSON.parse(String(init.body || '{}'));
  requests.push(body);
  if (requests.length === 1) {
    return new Response(JSON.stringify({ error: { message: 'This request requires more credits, or fewer max_tokens. You requested up to 3800 tokens, but can only afford 313.' } }), {
      status: 402,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({
    model: 'openrouter/free',
    choices: [{ message: { content: '{"templateId":"quick-quiz","content":"Question | A | B | C | D | A"}' } }],
    usage: { prompt_tokens: 20, completion_tokens: 30 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const { callServerAI, getServerAiReadiness } = await import('../server/unifiedAiProviderAdapter.js');
  const result = await callServerAI({
    prompt: 'Create a short quiz.',
    responseMimeType: 'application/json',
    maxOutputTokens: 3800,
    taskId: 'textlab.generateActivity',
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].model, 'openrouter/auto');
  assert.equal(requests[0].max_tokens, 3800);
  assert.equal(requests[1].model, 'openrouter/free');
  assert.ok(requests[1].max_tokens <= 2200);
  assert.equal(requests[1].provider.require_parameters, false);
  assert.equal(result.creditFallback, true);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.affordableTokens, 313);
  assert.equal(result.model, 'openrouter/free');
  const health = getServerAiReadiness();
  assert.equal(health.billingMode, 'auto');
  assert.equal(health.freeFallbackEnabled, true);
  console.log('V12.40.1 credit fallback test passed.');
} finally {
  globalThis.fetch = originalFetch;
}
