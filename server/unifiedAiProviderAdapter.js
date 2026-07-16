const DEFAULT_TIMEOUT_MS = 70_000;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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

function extractResponseText(data = {}) {
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : (part?.text || '')).join('\n').trim();
  return String(content || '').trim();
}

export function resolveServerAiProvider() {
  return 'openrouter';
}

export function getServerAiReadiness() {
  return {
    provider: 'openrouter',
    configured: Boolean(String(process.env.OPENROUTER_API_KEY || '').trim()),
    model: String(process.env.OPENROUTER_MODEL || 'openrouter/free').trim(),
    transport: 'server-gateway',
  };
}

export async function callServerAI({
  prompt = '',
  maxOutputTokens = 3600,
  temperature = 0.25,
  requestId = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw withStatus(new Error('AI prompt is empty.'), 400);
  if (cleanPrompt.length > 140_000) throw withStatus(new Error('AI prompt is too large.'), 413);
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  const model = String(process.env.OPENROUTER_MODEL || 'openrouter/free').trim();
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL).replace(/\/+$/, '');
  if (!apiKey) throw withStatus(new Error('OPENROUTER_API_KEY is not configured on the server.'), 503);
  const startedAt = Date.now();
  const response = await fetchWithAiTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': String(process.env.APP_URL || process.env.VERCEL_URL || 'https://brian-english-studio.vercel.app'),
      'X-Title': 'Brian English Studio',
      ...(requestId ? { 'X-Client-Request-Id': requestId } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: cleanPrompt }],
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.25)),
      max_tokens: Math.max(16, Math.min(12_000, Number(maxOutputTokens) || 3600)),
    }),
  }, timeoutMs);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw withStatus(new Error(data?.error?.message || data?.message || `OpenRouter request failed with status ${response.status}.`), response.status >= 500 ? 502 : response.status);
  const text = extractResponseText(data);
  if (!text) throw withStatus(new Error('OpenRouter returned no output text.'), 502);
  return {
    text,
    provider: 'openrouter',
    model,
    transport: 'server-gateway',
    durationMs: Date.now() - startedAt,
    requestId: requestId || null,
  };
}
