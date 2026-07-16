import { callAiServerGateway, getAiServerHealth } from './aiServerGateway.js';

function elapsed(startedAt) {
  return Math.max(0, Date.now() - startedAt);
}

export async function runOpenRouterProductionDiagnostics({ onStatus } = {}) {
  const startedAt = Date.now();
  onStatus?.({ phase: 'health' });
  const health = await getAiServerHealth();

  // One small real generation is enough to validate auth, routing and output.
  // Keeping diagnostics to one request preserves the limited free daily quota.
  onStatus?.({ phase: 'generation' });
  const generationStartedAt = Date.now();
  let firstTokenAt = 0;
  const generation = await callAiServerGateway({
    taskId: 'diagnostic.streaming',
    routingHint: 'fast',
    prompt: 'Reply with exactly: Brian English Studio API OK',
    maxOutputTokens: 32,
    temperature: 0,
    stream: true,
    onToken: () => { if (!firstTokenAt) firstTokenAt = Date.now(); },
  });
  if (!/Brian English Studio API OK/i.test(String(generation.text || ''))) {
    throw new Error('OpenRouter diagnostic returned an unexpected result.');
  }

  return {
    ok: true,
    health,
    totalMs: elapsed(startedAt),
    generation: {
      text: generation.text,
      model: generation.model,
      totalMs: elapsed(generationStartedAt),
      firstTokenMs: firstTokenAt ? firstTokenAt - generationStartedAt : null,
      providerAttempts: generation.providerAttempts || 1,
      billingMode: generation.billingMode || health.billingMode || 'free',
    },
  };
}
