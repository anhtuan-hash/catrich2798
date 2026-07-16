import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-key';
process.env.OPENROUTER_FAST_FREE_MODE = 'true';
process.env.OPENROUTER_FAST_FREE_TEXT_MODE = 'true';
delete process.env.OPENROUTER_BILLING_MODE;
delete process.env.OPENROUTER_FREE_MODEL_TEXT;
delete process.env.OPENROUTER_FREE_MODEL_JSON;

const originalFetch = globalThis.fetch;
const catalogUrls = [];
const chatRequests = [];
let scenario = 'success';

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json' },
});

const streamResponse = (events) => new Response(`${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`, {
  status: 200,
  headers: { 'content-type': 'text/event-stream; charset=utf-8' },
});

globalThis.fetch = async (url, init = {}) => {
  const target = String(url || '');
  if (target.includes('/models?')) {
    catalogUrls.push(target);
    const json = target.includes('supported_parameters=response_format');
    return jsonResponse({
      data: json ? [{
        id: 'nvidia/fast-json:free', context_length: 131072,
        pricing: { prompt: '0', completion: '0', request: '0' },
        supported_parameters: ['response_format', 'structured_outputs'],
      }] : [
        { id: 'paid/fast-text', context_length: 131072, pricing: { prompt: '0.0001', completion: '0.0001', request: '0' } },
        { id: 'slow/thinking-model:free', context_length: 131072, pricing: { prompt: '0', completion: '0', request: '0' } },
        { id: 'meta/fast-conversation:free', context_length: 131072, pricing: { prompt: '0', completion: '0', request: '0' } },
      ],
    });
  }

  const body = JSON.parse(String(init.body || '{}'));
  chatRequests.push(body);
  if (scenario === 'fallback' && body.model === 'meta/fast-conversation:free') {
    return streamResponse([{ error: { message: 'Provider stream temporarily unavailable', code: 503 } }]);
  }
  const text = body.model === 'openrouter/free' ? 'Recovered through the free router.' : 'Fast streamed answer.';
  return streamResponse([
    { model: body.model, choices: [{ delta: { content: text.slice(0, 8) } }] },
    { model: body.model, choices: [{ delta: { content: text.slice(8) } }], usage: { prompt_tokens: 12, completion_tokens: 8 } },
  ]);
};

try {
  const { streamServerAI, warmServerAiRuntime } = await import('../server/unifiedAiProviderAdapter.js');
  const options = {
    prompt: 'Reply briefly about the present perfect.',
    maxOutputTokens: 700,
    taskId: 'assistant.pageChat',
    routingHint: 'fast',
    sessionId: 'stream-v12409-test',
  };

  const tokens = [];
  const success = await streamServerAI(options, { onToken: (delta) => tokens.push(delta) });
  assert.equal(catalogUrls.length, 1);
  assert.match(catalogUrls[0], /sort=latency-low-to-high/);
  assert.doesNotMatch(catalogUrls[0], /supported_parameters=response_format/);
  assert.equal(chatRequests[0].model, 'meta/fast-conversation:free');
  assert.equal(chatRequests[0].stream, true);
  assert.equal(success.text, 'Fast streamed answer.');
  assert.equal(success.fastFreePrimaryUsed, true);
  assert.equal(success.fastFreeSelectedModel, 'meta/fast-conversation:free');
  assert.equal(success.providerAttempts, 1);
  assert.equal(tokens.join(''), success.text);

  scenario = 'fallback';
  chatRequests.length = 0;
  const retryEvents = [];
  const recovered = await streamServerAI({ ...options, onRetry: (event) => retryEvents.push(event) });
  assert.deepEqual(chatRequests.map((request) => request.model), ['meta/fast-conversation:free', 'openrouter/free']);
  assert.equal(recovered.text, 'Recovered through the free router.');
  assert.equal(recovered.fallbackUsed, true);
  assert.equal(recovered.fastFreeFallback, true);
  assert.equal(recovered.providerAttempts, 2);
  assert.ok(retryEvents.some((event) => event.reason === 'stream-fast-free-fallback'));

  const warmed = await warmServerAiRuntime();
  assert.equal(warmed.warmed, true);
  assert.equal(warmed.warmup.textModel, 'meta/fast-conversation:free');
  assert.equal(warmed.warmup.jsonModel, 'nvidia/fast-json:free');

  console.log('V12.40.9 Fast Free streaming and warmup tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
