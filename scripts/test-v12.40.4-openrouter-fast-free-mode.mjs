import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-key';
process.env.OPENROUTER_FAST_FREE_MODE = 'true';
delete process.env.OPENROUTER_BILLING_MODE;
delete process.env.OPENROUTER_ALLOW_PAID_MODE;
delete process.env.OPENROUTER_FREE_MODEL_JSON;

const originalFetch = globalThis.fetch;
const catalogUrls = [];
let scenario = 'success';
let chatRequests = [];

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json' },
});

globalThis.fetch = async (url, init = {}) => {
  const target = String(url || '');
  if (target.includes('/models?')) {
    catalogUrls.push(target);
    return jsonResponse({
      data: [
        {
          id: 'paid/fast-json',
          context_length: 131072,
          pricing: { prompt: '0.000001', completion: '0.000001', request: '0' },
          supported_parameters: ['response_format'],
        },
        {
          id: 'slow/thinking-model:free',
          context_length: 131072,
          pricing: { prompt: '0', completion: '0', request: '0' },
          supported_parameters: ['response_format'],
        },
        {
          id: 'nvidia/nemotron-fast-json:free',
          context_length: 131072,
          pricing: { prompt: '0', completion: '0', request: '0' },
          supported_parameters: ['response_format', 'structured_outputs'],
        },
      ],
    });
  }

  const body = JSON.parse(String(init.body || '{}'));
  chatRequests.push(body);
  if (scenario === 'timeout-fallback' && body.model === 'nvidia/nemotron-fast-json:free') {
    throw new Error('AI request timeout');
  }
  if (scenario === 'empty-fallback' && body.model === 'nvidia/nemotron-fast-json:free') {
    return jsonResponse({ model: body.model, choices: [{ message: { content: '' } }] });
  }
  const content = body.model === 'openrouter/free'
    ? '{"templateId":"quiz","content":"Recovered through free router"}'
    : '{"templateId":"quiz","content":"Fast free JSON"}';
  return jsonResponse({
    model: body.model,
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 25, completion_tokens: 20 },
  });
};

try {
  const { callServerAI, getServerAiReadiness } = await import('../server/unifiedAiProviderAdapter.js');
  const { getAiPromptDefinition } = await import('../src/utils/aiPromptRegistry.js');
  const baseOptions = {
    prompt: 'Create a compact TextLab quiz.',
    responseMimeType: 'application/json',
    maxOutputTokens: 1800,
    taskId: 'textlab.generateActivity',
    sessionId: 'textlab-fast-free-test',
  };

  const successEvents = [];
  const success = await callServerAI({ ...baseOptions, onRetry: (event) => successEvents.push(event) });
  assert.equal(catalogUrls.length, 1);
  assert.match(catalogUrls[0], /sort=latency-low-to-high/);
  assert.match(catalogUrls[0], /supported_parameters=response_format/);
  assert.equal(chatRequests.length, 1);
  assert.equal(chatRequests[0].model, 'nvidia/nemotron-fast-json:free');
  assert.equal(chatRequests[0].max_tokens, 1800);
  assert.equal(chatRequests[0].provider.sort, 'latency');
  assert.equal(chatRequests[0].provider.preferred_max_latency, 8);
  assert.equal(chatRequests[0].provider.require_parameters, true);
  assert.equal('data_collection' in chatRequests[0].provider, false);
  assert.deepEqual(chatRequests[0].response_format, { type: 'json_object' });
  assert.equal(success.fastFreeMode, true);
  assert.equal(success.fastFreePrimaryUsed, true);
  assert.equal(success.fastFreeSelectedModel, 'nvidia/nemotron-fast-json:free');
  assert.equal(success.fastFreeSelectionSource, 'latency-catalog');
  assert.equal(success.fastFreeFallback, false);
  assert.equal(success.providerAttempts, 1);
  assert.equal(successEvents.length, 0);

  scenario = 'timeout-fallback';
  chatRequests = [];
  const timeoutEvents = [];
  const recoveredFromTimeout = await callServerAI({ ...baseOptions, onRetry: (event) => timeoutEvents.push(event) });
  assert.equal(catalogUrls.length, 1, 'catalog result should be cached');
  assert.deepEqual(chatRequests.map((item) => item.model), ['nvidia/nemotron-fast-json:free', 'openrouter/free']);
  assert.equal(recoveredFromTimeout.fastFreeFallback, true);
  assert.equal(recoveredFromTimeout.fallbackUsed, true);
  assert.equal(recoveredFromTimeout.providerAttempts, 2);
  assert.ok(timeoutEvents.some((event) => event.reason === 'fast-free-router-fallback'));

  scenario = 'empty-fallback';
  chatRequests = [];
  const emptyEvents = [];
  const recoveredFromEmpty = await callServerAI({ ...baseOptions, onRetry: (event) => emptyEvents.push(event) });
  assert.deepEqual(chatRequests.map((item) => item.model), ['nvidia/nemotron-fast-json:free', 'openrouter/free']);
  assert.equal(recoveredFromEmpty.fastFreeFallback, true);
  assert.equal(recoveredFromEmpty.freeRouteRetry, true);
  assert.equal(recoveredFromEmpty.providerAttempts, 2);
  assert.ok(emptyEvents.some((event) => event.reason === 'empty-fast-free-fallback'));
  assert.doesNotThrow(() => JSON.parse(recoveredFromEmpty.text));

  for (const request of [...chatRequests]) {
    assert.ok(request.model === 'openrouter/free' || /:free$/i.test(request.model));
  }
  const readiness = getServerAiReadiness();
  assert.equal(readiness.fastFreeMode, true);
  assert.equal(readiness.fastFreePrimaryTimeoutMs, 40000);
  assert.equal(readiness.fastFreeFallbackTimeoutMs, 45000);
  assert.equal(readiness.paidModelsAllowed, false);

  const textLabTask = getAiPromptDefinition('textlab.generateActivity');
  assert.equal(textLabTask.routingHint, 'fast');
  assert.equal(textLabTask.maxOutputTokens, 1800);
  assert.equal(textLabTask.temperature, 0.2);
  assert.equal(textLabTask.version, '1.5.0');

  console.log('V12.40.4 OpenRouter Fast Free Mode test passed.');
} finally {
  globalThis.fetch = originalFetch;
}
