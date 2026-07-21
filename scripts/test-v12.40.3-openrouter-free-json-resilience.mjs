import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-key';
delete process.env.OPENROUTER_BILLING_MODE;
delete process.env.OPENROUTER_ALLOW_PAID_MODE;
delete process.env.OPENROUTER_MODEL;

const originalFetch = globalThis.fetch;
const requests = [];
let responseIndex = 0;

globalThis.fetch = async (_url, init = {}) => {
  const body = JSON.parse(String(init.body || '{}'));
  requests.push(body);
  responseIndex += 1;
  if (responseIndex === 1) {
    return new Response(JSON.stringify({
      model: 'free-provider/empty',
      choices: [{ message: { content: '' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({
    model: 'free-provider/json-capable',
    choices: [{ message: { content: '{"templateId":"quiz","content":"Question | correct | wrong 1 | wrong 2 | wrong 3"}' } }],
    usage: { prompt_tokens: 30, completion_tokens: 25 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const { callServerAI } = await import('../server/unifiedAiProviderAdapter.js');
  const { getAiPromptDefinition } = await import('../src/utils/aiPromptRegistry.js');
  const retryEvents = [];
  const result = await callServerAI({
    prompt: 'Return a TextLab activity as JSON.',
    responseMimeType: 'application/json',
    maxOutputTokens: 2200,
    taskId: 'textlab.generateActivity',
    sessionId: 'textlab-session',
    onRetry: (event) => retryEvents.push(event),
  });

  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.model, 'openrouter/free');
    assert.equal(request.provider.require_parameters, true);
    assert.equal('data_collection' in request.provider, false);
    assert.deepEqual(request.response_format, { type: 'json_object' });
    assert.equal(request.max_tokens, 2200);
  }
  assert.match(requests[1].session_id, /empty-retry/);
  assert.equal(result.freeRouteRetry, true);
  assert.equal(result.providerAttempts, 2);
  assert.equal(result.model, 'free-provider/json-capable');
  assert.ok(retryEvents.some((event) => event.reason === 'empty-free-response'));
  assert.doesNotThrow(() => JSON.parse(result.text));

  const textLabTask = getAiPromptDefinition('textlab.generateActivity');
  assert.equal(textLabTask.maxOutputTokens, 2200);
  assert.equal(textLabTask.output, 'json');
  assert.deepEqual(textLabTask.validation.requiredFields, ['templateId', 'content']);

  const networkRequests = [];
  const networkRetryEvents = [];
  let networkAttempt = 0;
  globalThis.fetch = async (_url, init = {}) => {
    networkRequests.push(JSON.parse(String(init.body || '{}')));
    networkAttempt += 1;
    if (networkAttempt === 1) throw new Error('AI request timeout');
    return new Response(JSON.stringify({
      model: 'free-provider/recovered',
      choices: [{ message: { content: '{"status":"ok"}' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const recovered = await callServerAI({
    prompt: 'Return JSON after a transient timeout.',
    responseMimeType: 'application/json',
    maxOutputTokens: 300,
    taskId: 'diagnostic.json',
    onRetry: (event) => networkRetryEvents.push(event),
  });
  assert.equal(networkRequests.length, 2);
  assert.equal(recovered.providerAttempts, 2);
  assert.equal(recovered.freeRouteRetry, false);
  assert.equal(recovered.model, 'free-provider/recovered');
  assert.ok(networkRetryEvents.some((event) => event.reason === 'network-or-timeout'));

  console.log('V12.40.3 free JSON resilience test passed.');
} finally {
  globalThis.fetch = originalFetch;
}
