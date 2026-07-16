import assert from 'node:assert/strict';

process.env.OPENROUTER_API_KEY = 'test-server-key';
process.env.OPENROUTER_MODEL = 'openrouter/auto';
process.env.OPENROUTER_MODEL_FAST = 'openrouter/auto';
process.env.OPENROUTER_MODEL_JSON = 'openrouter/auto';

const adapter = await import('../server/unifiedAiProviderAdapter.js');
const providers = await import('../src/utils/aiProviders.js');

assert.equal(providers.getActiveAiConfig().serverManaged, true);
assert.equal(providers.getProviderSummary().hasKey, true);
assert.equal(providers.getActiveAiConfig().model, 'openrouter/auto');

const originalFetch = globalThis.fetch;
try {
  let calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ model: 'test/json-model', choices: [{ message: { content: '{"ok":true}' } }], usage: { total_tokens: 12 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const jsonResult = await adapter.callServerAI({ prompt: 'Return JSON', responseMimeType: 'application/json', taskId: 'worksheet.generate', maxOutputTokens: 5000, requestId: 'test-json' });
  assert.equal(jsonResult.text, '{"ok":true}');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-server-key');
  assert.equal(calls[0].body.model, 'openrouter/auto');
  assert.equal(calls[0].body.response_format.type, 'json_object');
  assert.equal(calls[0].body.provider.require_parameters, true);
  assert.equal(calls[0].body.provider.allow_fallbacks, true);
  assert.equal(calls[0].body.max_tokens, 5000);

  let retryCount = 0;
  globalThis.fetch = async () => {
    retryCount += 1;
    if (retryCount === 1) return new Response(JSON.stringify({ error: { message: 'temporary overload' } }), { status: 503, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ model: 'test/fast-model', choices: [{ message: { content: 'Brian English Studio API OK' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const retryResult = await adapter.callServerAI({ prompt: 'health', taskId: 'diagnostic.connectionTest', maxOutputTokens: 48 });
  assert.equal(retryResult.providerAttempts, 2);
  assert.equal(retryCount, 2);

  globalThis.fetch = async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"model":"test/stream-model","choices":[{"delta":{"content":"Brian "}}]}\n\n',
      'data: {"model":"test/stream-model","choices":[{"delta":{"content":"OK"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const stream = new ReadableStream({
      start(controller) { chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk))); controller.close(); },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  let streamed = '';
  const streamResult = await adapter.streamServerAI({ prompt: 'stream', taskId: 'assistant.pageChat', maxOutputTokens: 64 }, { onToken: (delta) => { streamed += delta; } });
  assert.equal(streamResult.text, 'Brian OK');
  assert.equal(streamed, 'Brian OK');
  assert.equal(streamResult.model, 'test/stream-model');

  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ b64_json: 'YWJj', media_type: 'image/png' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const imageResult = await adapter.callServerImageAI({ prompt: 'image test' });
  assert.equal(imageResult.imageDataUrl, 'data:image/png;base64,YWJj');

  console.log('V12.40.0 OpenRouter production runtime tests passed: server key, task routing, structured JSON, one retry, streaming, and image gateway.');
} finally {
  globalThis.fetch = originalFetch;
}
