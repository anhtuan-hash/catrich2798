import { callAiServerGateway, getAiServerHealth } from './aiServerGateway.js';

function elapsed(startedAt) {
  return Math.max(0, Date.now() - startedAt);
}

export async function runOpenRouterProductionDiagnostics({ onStatus } = {}) {
  const startedAt = Date.now();
  onStatus?.({ phase: 'health' });
  const health = await getAiServerHealth();

  onStatus?.({ phase: 'stream' });
  const streamStartedAt = Date.now();
  let firstTokenAt = 0;
  const stream = await callAiServerGateway({
    taskId: 'diagnostic.streaming',
    routingHint: 'fast',
    prompt: 'Reply with exactly: Brian English Studio API OK',
    maxOutputTokens: 48,
    temperature: 0,
    stream: true,
    onToken: () => { if (!firstTokenAt) firstTokenAt = Date.now(); },
  });

  onStatus?.({ phase: 'json' });
  const jsonStartedAt = Date.now();
  const json = await callAiServerGateway({
    taskId: 'diagnostic.json',
    routingHint: 'quality',
    prompt: 'Return strict JSON only with this exact object: {"status":"ok","service":"Brian English Studio"}',
    responseMimeType: 'application/json',
    maxOutputTokens: 96,
    temperature: 0,
    stream: false,
  });
  let parsed;
  try { parsed = JSON.parse(String(json.text || '').replace(/^```json\s*|```$/g, '').trim()); }
  catch { throw new Error('OpenRouter JSON diagnostic returned invalid JSON.'); }
  if (parsed?.status !== 'ok') throw new Error('OpenRouter JSON diagnostic returned an unexpected result.');

  return {
    ok: true,
    health,
    totalMs: elapsed(startedAt),
    stream: {
      text: stream.text,
      model: stream.model,
      totalMs: elapsed(streamStartedAt),
      firstTokenMs: firstTokenAt ? firstTokenAt - streamStartedAt : null,
      providerAttempts: stream.providerAttempts || 1,
    },
    json: {
      model: json.model,
      totalMs: elapsed(jsonStartedAt),
      providerAttempts: json.providerAttempts || 1,
      valid: true,
    },
  };
}
