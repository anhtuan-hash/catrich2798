const DEFAULT_TIMEOUT_MS = 70_000;

function withStatus(error, status) {
  if (error && typeof error === 'object') error.status = error.status || status;
  return error;
}

export async function fetchWithAiTimeout(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1_000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractOpenAIResponseText(data) {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  return (data?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((part) => part?.type === 'output_text' || typeof part?.text === 'string')
    .map((part) => part?.text || '')
    .join('\n')
    .trim();
}

function extractGeminiText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('\n')
    .trim();
}

export function resolveServerAiProvider(requested = '') {
  const provider = String(process.env.AI_PROVIDER || requested || 'openai').trim().toLowerCase();
  return ['openai', 'gemini'].includes(provider) ? provider : 'openai';
}

export function getServerAiReadiness(requested = '') {
  const provider = resolveServerAiProvider(requested);
  if (provider === 'gemini') {
    return {
      provider,
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
      model: process.env.GEMINI_MODEL || '',
      transport: 'server-gateway',
    };
  }
  return {
    provider,
    configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
    model: process.env.OPENAI_MODEL || '',
    transport: 'server-gateway',
  };
}

async function callOpenAI({ prompt, maxOutputTokens, requestId, timeoutMs }) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const model = String(process.env.OPENAI_MODEL || '').trim();
  if (!apiKey || !model) throw withStatus(new Error('OpenAI server provider is not configured.'), 503);
  const response = await fetchWithAiTimeout('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Client-Request-Id': requestId } : {}),
    },
    body: JSON.stringify({
      model,
      input: prompt,
      store: false,
      max_output_tokens: Math.max(16, Math.min(12_000, Number(maxOutputTokens) || 3600)),
    }),
  }, timeoutMs);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw withStatus(new Error(data?.error?.message || `OpenAI request failed with status ${response.status}.`), response.status >= 500 ? 502 : response.status);
  const text = extractOpenAIResponseText(data);
  if (!text) throw withStatus(new Error('OpenAI returned no output text.'), 502);
  return { text, provider: 'openai', model, transport: 'server-gateway' };
}

async function callGemini({ prompt, maxOutputTokens, temperature, timeoutMs }) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  const model = String(process.env.GEMINI_MODEL || '').trim();
  if (!apiKey || !model) throw withStatus(new Error('Gemini server provider is not configured.'), 503);
  const response = await fetchWithAiTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: Math.max(0, Math.min(2, Number(temperature) || 0.25)),
        maxOutputTokens: Math.max(16, Math.min(12_000, Number(maxOutputTokens) || 3600)),
      },
    }),
  }, timeoutMs);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw withStatus(new Error(data?.error?.message || `Gemini request failed with status ${response.status}.`), response.status >= 500 ? 502 : response.status);
  const text = extractGeminiText(data);
  if (!text) throw withStatus(new Error('Gemini returned no output text.'), 502);
  return { text, provider: 'gemini', model, transport: 'server-gateway' };
}

/**
 * Shared server-side provider transport used by every /api/ai compatibility mode
 * and the embedded lesson integration endpoint. Provider secrets remain in env.
 */
export async function callServerAI({
  provider = '',
  prompt = '',
  maxOutputTokens = 3600,
  temperature = 0.25,
  requestId = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const resolvedProvider = resolveServerAiProvider(provider);
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw withStatus(new Error('AI prompt is empty.'), 400);
  if (cleanPrompt.length > 140_000) throw withStatus(new Error('AI prompt is too large.'), 413);
  const startedAt = Date.now();
  const result = resolvedProvider === 'gemini'
    ? await callGemini({ prompt: cleanPrompt, maxOutputTokens, temperature, timeoutMs })
    : await callOpenAI({ prompt: cleanPrompt, maxOutputTokens, requestId, timeoutMs });
  return {
    ...result,
    durationMs: Date.now() - startedAt,
    requestId: requestId || null,
  };
}
