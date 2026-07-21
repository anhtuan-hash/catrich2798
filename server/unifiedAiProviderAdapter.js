const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/auto';
const FREE_MODEL = 'openrouter/free';
const TRANSIENT_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 524, 529]);
const FAST_FREE_CACHE_TTL_MS = 15 * 60 * 1000;
const FAST_FREE_NEGATIVE_CACHE_TTL_MS = 3 * 60 * 1000;
let fastFreeJsonCache = { model: '', source: 'none', expiresAt: 0, catalogDurationMs: 0 };
let fastFreeTextCache = { model: '', source: 'none', expiresAt: 0, catalogDurationMs: 0 };

function withStatus(error, status, code = '') {
  if (error && typeof error === 'object') {
    error.status = error.status || status;
    if (code) error.code = error.code || code;
  }
  return error;
}

function clamp(value, min, max, fallback) {
  // Environment variables that are not configured arrive here as an empty
  // string. Number('') is 0, which previously collapsed 130s JSON timeouts to
  // 5s and 2400-token free responses to only 64 tokens.
  if (value == null || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export async function fetchWithAiTimeout(url, init, timeoutMs = 90_000) {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const timer = setTimeout(() => controller.abort(new Error('AI request timeout')), clamp(timeoutMs, 5_000, 240_000, 90_000));
  const abortUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal) {
    if (upstreamSignal.aborted) abortUpstream();
    else upstreamSignal.addEventListener('abort', abortUpstream, { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener?.('abort', abortUpstream);
  }
}

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function parseBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function billingMode() {
  const requested = env('OPENROUTER_BILLING_MODE', 'free').toLowerCase();
  const value = ['auto', 'paid', 'free'].includes(requested) ? requested : 'free';
  // A stale deployment variable must not silently put a low-budget account
  // back onto paid routing. Paid/auto mode requires an explicit second opt-in.
  if (value !== 'free' && !parseBool(process.env.OPENROUTER_ALLOW_PAID_MODE, false)) return 'free';
  return value;
}

function freeTokenCap(profile = 'standard') {
  const defaults = { diagnostic: 96, fast: 700, standard: 1200, quality: 1600, json: 2400, long: 2400, vision: 1200, image: 1 };
  return clamp(env(`OPENROUTER_FREE_MAX_TOKENS_${String(profile).toUpperCase()}`), 64, 6000, defaults[profile] || 1200);
}

function fastFreePrimaryTimeout() {
  return clamp(env('OPENROUTER_FAST_FREE_TIMEOUT_MS'), 15_000, 90_000, 40_000);
}

function fastFreeFallbackTimeout() {
  return clamp(env('OPENROUTER_FAST_FREE_FALLBACK_TIMEOUT_MS'), 20_000, 120_000, 45_000);
}

function fastFreeTextPrimaryTimeout() {
  return clamp(env('OPENROUTER_FAST_FREE_TEXT_TIMEOUT_MS'), 8_000, 60_000, 22_000);
}

function fastFreeTextFallbackTimeout() {
  return clamp(env('OPENROUTER_FAST_FREE_TEXT_FALLBACK_TIMEOUT_MS'), 15_000, 90_000, 35_000);
}

function hasImageAttachment(options = {}) {
  return (options.attachments || []).some((item) => /^image\//i.test(String(item?.mimeType || '')));
}

function isFreeModelEntry(model = {}) {
  const id = String(model?.id || '').trim();
  if (!/:free$/i.test(id)) return false;
  const pricing = model?.pricing || {};
  return Number(pricing.prompt || 0) === 0
    && Number(pricing.completion || 0) === 0
    && Number(pricing.request || 0) === 0;
}

function supportsJsonResponse(model = {}) {
  const supported = Array.isArray(model?.supported_parameters) ? model.supported_parameters.map((item) => String(item).toLowerCase()) : [];
  return supported.includes('response_format') || supported.includes('structured_outputs');
}

function isUsableFastFreeJsonModel(model = {}, options = {}) {
  const id = String(model?.id || '').toLowerCase();
  if (!isFreeModelEntry(model) || !supportsJsonResponse(model)) return false;
  if (/thinking|:thinking|deepseek-r1|rerank|embedding|moderation|guard|\bocr\b/.test(id)) return false;
  const minimumContext = Math.max(16_000, Math.ceil(String(options.prompt || '').length / 3) + Math.max(1800, Number(options.maxOutputTokens) || 0));
  return Math.max(0, Number(model?.context_length || 0)) >= minimumContext;
}

async function resolveFastFreeJsonModel(options = {}, { apiKey = '', baseUrl = '' } = {}) {
  const enabled = billingMode() === 'free'
    && parseBool(process.env.OPENROUTER_FAST_FREE_MODE, true)
    && options.responseMimeType === 'application/json'
    && !hasImageAttachment(options)
    && options.fastFreeBypass !== true;
  if (!enabled) return { enabled: false, active: false, model: FREE_MODEL, source: 'router', catalogDurationMs: 0 };

  const configured = env('OPENROUTER_FREE_MODEL_JSON');
  if (configured && (configured === FREE_MODEL || /:free$/i.test(configured))) {
    return { enabled: true, active: configured !== FREE_MODEL, model: configured, source: 'environment', catalogDurationMs: 0 };
  }

  const now = Date.now();
  if (fastFreeJsonCache.model && fastFreeJsonCache.expiresAt > now) {
    return {
      enabled: true,
      active: fastFreeJsonCache.model !== FREE_MODEL,
      model: fastFreeJsonCache.model,
      source: fastFreeJsonCache.source,
      catalogDurationMs: fastFreeJsonCache.catalogDurationMs,
    };
  }

  const startedAt = Date.now();
  try {
    const query = new URLSearchParams({
      output_modalities: 'text',
      supported_parameters: 'response_format',
      sort: 'latency-low-to-high',
    });
    const response = await fetchWithAiTimeout(`${baseUrl}/models?${query}`, {
      method: 'GET',
      headers: requestHeaders(apiKey, options.requestId),
      signal: options.signal,
    }, 5_000);
    if (!response.ok) throw new Error(`OpenRouter model catalog returned ${response.status}.`);
    const payload = await response.json().catch(() => ({}));
    const selected = (Array.isArray(payload?.data) ? payload.data : []).find((model) => isUsableFastFreeJsonModel(model, options));
    const model = String(selected?.id || FREE_MODEL);
    fastFreeJsonCache = {
      model,
      source: selected ? 'latency-catalog' : 'router-fallback',
      expiresAt: now + (selected ? FAST_FREE_CACHE_TTL_MS : FAST_FREE_NEGATIVE_CACHE_TTL_MS),
      catalogDurationMs: Date.now() - startedAt,
    };
  } catch {
    fastFreeJsonCache = {
      model: FREE_MODEL,
      source: 'catalog-unavailable',
      expiresAt: now + FAST_FREE_NEGATIVE_CACHE_TTL_MS,
      catalogDurationMs: Date.now() - startedAt,
    };
  }
  return {
    enabled: true,
    active: fastFreeJsonCache.model !== FREE_MODEL,
    model: fastFreeJsonCache.model,
    source: fastFreeJsonCache.source,
    catalogDurationMs: fastFreeJsonCache.catalogDurationMs,
  };
}

function isUsableFastFreeTextModel(model = {}, options = {}) {
  const id = String(model?.id || '').toLowerCase();
  if (!isFreeModelEntry(model)) return false;
  if (/thinking|:thinking|deepseek-r1|rerank|embedding|moderation|guard|\bocr\b|vision|image/.test(id)) return false;
  const minimumContext = Math.max(16_000, Math.ceil(String(options.prompt || '').length / 3) + Math.max(1200, Number(options.maxOutputTokens) || 0));
  return Math.max(0, Number(model?.context_length || 0)) >= minimumContext;
}

async function resolveFastFreeTextModel(options = {}, { apiKey = '', baseUrl = '' } = {}) {
  const profile = profileForTask(options);
  const enabled = billingMode() === 'free'
    && parseBool(process.env.OPENROUTER_FAST_FREE_MODE, true)
    && parseBool(process.env.OPENROUTER_FAST_FREE_TEXT_MODE, true)
    && options.responseMimeType !== 'application/json'
    && ['diagnostic', 'fast', 'standard'].includes(profile)
    && !hasImageAttachment(options)
    && options.fastFreeBypass !== true;
  if (!enabled) return { enabled: false, active: false, model: FREE_MODEL, source: 'router', catalogDurationMs: 0, kind: 'text' };

  const configured = env('OPENROUTER_FREE_MODEL_TEXT');
  if (configured && (configured === FREE_MODEL || /:free$/i.test(configured))) {
    return { enabled: true, active: configured !== FREE_MODEL, model: configured, source: 'environment-text', catalogDurationMs: 0, kind: 'text' };
  }

  const now = Date.now();
  if (fastFreeTextCache.model && fastFreeTextCache.expiresAt > now) {
    return { enabled: true, active: fastFreeTextCache.model !== FREE_MODEL, ...fastFreeTextCache, kind: 'text' };
  }

  const startedAt = Date.now();
  try {
    const query = new URLSearchParams({ output_modalities: 'text', sort: 'latency-low-to-high' });
    const response = await fetchWithAiTimeout(`${baseUrl}/models?${query}`, {
      method: 'GET',
      headers: requestHeaders(apiKey, options.requestId),
      signal: options.signal,
    }, 5_000);
    if (!response.ok) throw new Error(`OpenRouter model catalog returned ${response.status}.`);
    const payload = await response.json().catch(() => ({}));
    const selected = (Array.isArray(payload?.data) ? payload.data : []).find((model) => isUsableFastFreeTextModel(model, options));
    fastFreeTextCache = {
      model: String(selected?.id || FREE_MODEL),
      source: selected ? 'latency-catalog-text' : 'router-fallback-text',
      expiresAt: now + (selected ? FAST_FREE_CACHE_TTL_MS : FAST_FREE_NEGATIVE_CACHE_TTL_MS),
      catalogDurationMs: Date.now() - startedAt,
    };
  } catch {
    fastFreeTextCache = {
      model: FREE_MODEL,
      source: 'catalog-unavailable-text',
      expiresAt: now + FAST_FREE_NEGATIVE_CACHE_TTL_MS,
      catalogDurationMs: Date.now() - startedAt,
    };
  }
  return { enabled: true, active: fastFreeTextCache.model !== FREE_MODEL, ...fastFreeTextCache, kind: 'text' };
}

function parseAffordableTokens(message = '') {
  const match = String(message).match(/can only afford\s+(\d+)/i);
  return match ? Math.max(0, Number(match[1]) || 0) : 0;
}

function normalizeAttachment(item = {}) {
  const dataUrl = String(item?.dataUrl || '');
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return null;
  return { type: 'image_url', image_url: { url: dataUrl } };
}

function extractResponseText(data = {}) {
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : (part?.text || '')).join('\n').trim();
  return String(content || '').trim();
}

function extractImage(payload = {}) {
  const item = payload?.data?.[0] || payload?.images?.[0] || {};
  if (item.b64_json) return `data:${item.media_type || 'image/png'};base64,${item.b64_json}`;
  if (item.url) return String(item.url);
  const image = payload?.choices?.[0]?.message?.images?.[0] || {};
  return String(image?.image_url?.url || image?.url || '');
}

function profileForTask({ taskId = '', routingHint = '', responseMimeType = '', attachments = [], operation = 'chat', maxOutputTokens = 0 } = {}) {
  if (operation === 'image') return 'image';
  if ((attachments || []).some((item) => /^image\//i.test(String(item?.mimeType || '')))) return 'vision';
  if (responseMimeType === 'application/json') return 'json';
  const hint = String(routingHint || '').toLowerCase();
  const task = String(taskId || '').toLowerCase();
  if (/diagnostic|connectiontest/.test(task)) return 'diagnostic';
  if (hint === 'long-context' || Number(maxOutputTokens) > 4200 || /curriculum|generateplan|reading|document|lesson/.test(task)) return 'long';
  if (hint === 'quality' || /grammar|writing|speaking|pronunciation|report/.test(task)) return 'quality';
  if (hint === 'fast' || /chat|comment|message/.test(task)) return 'fast';
  return 'standard';
}

function modelForProfile(profile) {
  const base = env('OPENROUTER_MODEL', DEFAULT_MODEL) || DEFAULT_MODEL;
  const mapping = {
    diagnostic: env('OPENROUTER_MODEL_FAST', base),
    fast: env('OPENROUTER_MODEL_FAST', base),
    standard: env('OPENROUTER_MODEL_STANDARD', base),
    quality: env('OPENROUTER_MODEL_QUALITY', base),
    json: env('OPENROUTER_MODEL_JSON', env('OPENROUTER_MODEL_QUALITY', base)),
    long: env('OPENROUTER_MODEL_LONG', env('OPENROUTER_MODEL_QUALITY', base)),
    vision: env('OPENROUTER_MODEL_VISION', base),
    image: env('OPENROUTER_IMAGE_MODEL', 'bytedance-seed/seedream-4.5'),
  };
  return mapping[profile] || base;
}

function timeoutForProfile(profile) {
  const defaults = { diagnostic: 25_000, fast: 60_000, standard: 95_000, quality: 120_000, json: 130_000, long: 170_000, vision: 140_000, image: 180_000 };
  const envName = `OPENROUTER_TIMEOUT_${profile.toUpperCase()}_MS`;
  return clamp(env(envName), 5_000, 240_000, defaults[profile] || 95_000);
}

function costQualityTradeoff(profile) {
  const defaults = { diagnostic: 9, fast: 8, standard: 7, quality: 3, json: 3, long: 4, vision: 5 };
  return clamp(env(`OPENROUTER_AUTO_TRADEOFF_${profile.toUpperCase()}`), 0, 10, defaults[profile] ?? 7);
}

function buildProviderPreferences({ isJson = false, profile = 'standard', freeRoute = false } = {}) {
  return {
    allow_fallbacks: true,
    // JSON tasks must only use endpoints that implement response_format. Without
    // this filter, the free router may return prose or truncated pseudo-JSON.
    // Account-level OpenRouter privacy settings remain authoritative in free mode.
    require_parameters: Boolean(isJson),
    ...(!freeRoute ? { data_collection: env('OPENROUTER_DATA_COLLECTION', 'deny') === 'allow' ? 'allow' : 'deny' } : {}),
    sort: profile === 'quality' ? 'throughput' : 'latency',
    preferred_max_latency: profile === 'fast' || profile === 'diagnostic' || profile === 'json' ? 8 : profile === 'long' ? 25 : 15,
  };
}

function buildMessages({ prompt, systemInstruction, attachments = [] } = {}) {
  const messages = [];
  if (String(systemInstruction || '').trim()) messages.push({ role: 'system', content: String(systemInstruction).trim() });
  const images = attachments.map(normalizeAttachment).filter(Boolean).slice(0, 4);
  const content = images.length ? [{ type: 'text', text: String(prompt || '') }, ...images] : String(prompt || '');
  messages.push({ role: 'user', content });
  return messages;
}

function requestHeaders(apiKey, requestId = '') {
  const appUrl = env('APP_URL', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://brian-english-studio.vercel.app');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': appUrl,
    'X-Title': 'Brian English Studio',
    ...(requestId ? { 'X-Client-Request-Id': requestId } : {}),
  };
}

function buildChatBody(options, { stream = false, modelOverride = '', maxTokensOverride = null } = {}) {
  const profile = profileForTask(options);
  const allowClientOverride = parseBool(process.env.OPENROUTER_ALLOW_CLIENT_MODEL_OVERRIDE, false);
  const requested = String(options.requestedModel || '').trim();
  const mode = billingMode();
  const configuredModel = modelForProfile(profile);
  const selectedModel = allowClientOverride && requested && !/openrouter\/free/i.test(requested) ? requested : configuredModel;
  const model = String(modelOverride || (mode === 'free' ? FREE_MODEL : selectedModel));
  const freeRoute = model === FREE_MODEL || /:free$/i.test(model);
  const isJson = options.responseMimeType === 'application/json';
  const requestedMaxTokens = clamp(options.maxOutputTokens, 16, 12_000, 3600);
  const maxTokens = maxTokensOverride == null
    ? (mode === 'free' ? Math.min(requestedMaxTokens, freeTokenCap(profile)) : requestedMaxTokens)
    : clamp(maxTokensOverride, 16, 12_000, requestedMaxTokens);
  const body = {
    model,
    messages: buildMessages(options),
    temperature: Math.max(0, Math.min(2, Number(options.temperature) || 0.25)),
    max_tokens: maxTokens,
    provider: buildProviderPreferences({ isJson, profile, freeRoute }),
    stream,
  };
  if (isJson) body.response_format = { type: 'json_object' };
  if (String(options.sessionId || '').trim()) body.session_id = String(options.sessionId).slice(0, 200);
  if (model === 'openrouter/auto') {
    body.plugins = [{ id: 'auto-router', cost_quality_tradeoff: costQualityTradeoff(profile) }];
  }
  return { body, model, profile, timeoutMs: timeoutForProfile(profile), requestedMaxTokens, actualMaxTokens: maxTokens, billingMode: mode };
}

function normalizeOpenRouterError(payload, response) {
  const message = payload?.error?.message || payload?.message || `OpenRouter request failed with status ${response.status}.`;
  const error = withStatus(new Error(String(message)), response.status >= 500 ? 502 : response.status, 'OPENROUTER_REQUEST_FAILED');
  error.openRouterStatus = response.status;
  error.retryAfter = Number(response.headers?.get?.('retry-after') || 0);
  if (/credit|billing|can only afford|insufficient/i.test(String(message))) {
    error.code = 'OPENROUTER_CREDIT_LIMIT';
    error.affordableTokens = parseAffordableTokens(message);
  }
  if (response.status === 429) error.code = 'OPENROUTER_RATE_LIMIT';
  if (response.status === 401 || response.status === 403) error.code = 'OPENROUTER_AUTH_ERROR';
  if (/no endpoints|data polic|privacy setting|no available model/i.test(String(message))) {
    error.code = 'OPENROUTER_ROUTE_UNAVAILABLE';
    error.message = `OpenRouter chưa tìm được model phù hợp với tuyến và cài đặt riêng tư hiện tại (${message}). Hãy thử lại sau hoặc kiểm tra Privacy Settings trong OpenRouter.`;
  }
  return error;
}

async function fetchOpenRouterWithOneRetry(url, init, timeoutMs, onRetry, maxAttempts = 2) {
  const attemptLimit = clamp(maxAttempts, 1, 2, 2);
  let response;
  let payload;
  for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
    try {
      response = await fetchWithAiTimeout(url, init, timeoutMs);
    } catch (error) {
      if (init?.signal?.aborted) throw error;
      if (attempt >= attemptLimit) {
        const timedOut = /timeout|timed out|abort/i.test(String(error?.message || error?.name || ''));
        const normalized = withStatus(
          new Error(timedOut
            ? (attemptLimit > 1 ? 'OpenRouter request timed out after one controlled retry.' : 'OpenRouter request timed out.')
            : `OpenRouter network request failed${attemptLimit > 1 ? ' after one controlled retry' : ''} (${error?.message || 'network error'}).`),
          504,
          timedOut ? 'OPENROUTER_NETWORK_TIMEOUT' : 'OPENROUTER_NETWORK_ERROR',
        );
        normalized.cause = error;
        throw normalized;
      }
      const delayMs = 650 + Math.round(Math.random() * 250);
      onRetry?.({ attempt, delayMs, status: 0, reason: 'network-or-timeout' });
      await wait(delayMs);
      continue;
    }
    if (/text\/event-stream/i.test(String(response.headers.get('content-type') || ''))) return { response, payload: null, attempts: attempt };
    payload = await response.json().catch(() => ({}));
    if (response.ok) return { response, payload, attempts: attempt };
    if (attempt >= attemptLimit || !TRANSIENT_STATUSES.has(response.status)) break;
    const retryAfter = clamp(Number(response.headers.get('retry-after')) * 1000, 250, 3_500, 0);
    const delayMs = retryAfter || (650 + Math.round(Math.random() * 250));
    onRetry?.({ attempt, delayMs, status: response.status });
    await wait(delayMs);
  }
  throw normalizeOpenRouterError(payload || {}, response);
}

function canFallbackFromFastFree(error) {
  const code = String(error?.code || '');
  const status = Number(error?.openRouterStatus || error?.status || 0);
  if (code === 'OPENROUTER_AUTH_ERROR' || code === 'AI_REQUEST_CANCELLED' || status === 401 || status === 403) return false;
  return code === 'OPENROUTER_NETWORK_TIMEOUT'
    || code === 'OPENROUTER_NETWORK_ERROR'
    || code === 'OPENROUTER_RATE_LIMIT'
    || code === 'OPENROUTER_ROUTE_UNAVAILABLE'
    || code === 'OPENROUTER_REQUEST_FAILED'
    || status === 404
    || status === 408
    || status === 429
    || status >= 500;
}

async function executeChatRequest(options = {}, { stream = false } = {}) {
  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) throw withStatus(new Error('OPENROUTER_API_KEY is not configured on Vercel.'), 503, 'OPENROUTER_SERVER_KEY_MISSING');
  const baseUrl = env('OPENROUTER_BASE_URL', OPENROUTER_BASE_URL).replace(/\/+$/, '');
  const fastFreeSelection = options.responseMimeType === 'application/json'
    ? await resolveFastFreeJsonModel(options, { apiKey, baseUrl })
    : await resolveFastFreeTextModel(options, { apiKey, baseUrl });
  const primary = buildChatBody(options, {
    stream,
    modelOverride: fastFreeSelection.enabled ? fastFreeSelection.model : '',
  });
  const fastFreePrimaryUsed = fastFreeSelection.active
    && primary.billingMode === 'free'
    && primary.model !== FREE_MODEL;
  const boundedRouterRequest = options.fastFreeBypass === true
    && primary.billingMode === 'free'
    && ['diagnostic', 'fast', 'standard', 'json'].includes(primary.profile);
  const fastMeta = {
    fastFreeMode: fastFreeSelection.enabled,
    fastFreePrimaryUsed,
    fastFreeSelectedModel: fastFreeSelection.model,
    fastFreeSelectionSource: fastFreeSelection.source,
    fastFreeCatalogDurationMs: fastFreeSelection.catalogDurationMs,
    fastFreeFallback: false,
  };
  const send = async (config, { timeoutMs = config.timeoutMs, maxAttempts = 2 } = {}) => fetchOpenRouterWithOneRetry(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(apiKey, options.requestId),
    body: JSON.stringify(config.body),
    signal: options.signal,
  }, timeoutMs, options.onRetry, maxAttempts);

  try {
    const result = await send(primary, {
      timeoutMs: fastFreePrimaryUsed
        ? (fastFreeSelection.kind === 'text' ? fastFreeTextPrimaryTimeout() : fastFreePrimaryTimeout())
        : boundedRouterRequest
          ? (primary.profile === 'json' ? fastFreeFallbackTimeout() : fastFreeTextFallbackTimeout())
          : options.timeoutMs || primary.timeoutMs,
      maxAttempts: fastFreePrimaryUsed || boundedRouterRequest ? 1 : 2,
    });
    return { ...result, config: primary, fallbackUsed: false, creditFallback: false, affordableTokens: 0, ...fastMeta };
  } catch (error) {
    if (fastFreePrimaryUsed && canFallbackFromFastFree(error)) {
      const fallback = buildChatBody(options, {
        stream,
        modelOverride: FREE_MODEL,
        maxTokensOverride: Math.min(primary.requestedMaxTokens, freeTokenCap(primary.profile)),
      });
      options.onRetry?.({ attempt: 1, delayMs: 0, status: Number(error?.status || 0), reason: 'fast-free-router-fallback', model: FREE_MODEL });
      try {
        const result = await send(fallback, {
          timeoutMs: fastFreeSelection.kind === 'text' ? fastFreeTextFallbackTimeout() : fastFreeFallbackTimeout(),
          maxAttempts: 1,
        });
        return {
          ...result,
          attempts: 1 + result.attempts,
          config: fallback,
          fallbackUsed: true,
          creditFallback: false,
          affordableTokens: 0,
          ...fastMeta,
          fastFreeFallback: true,
        };
      } catch (fallbackError) {
        fallbackError.originalFastFreeError = error.message;
        if (!fallbackError.code || fallbackError.code === 'OPENROUTER_REQUEST_FAILED') fallbackError.code = 'OPENROUTER_FAST_FREE_FALLBACK_FAILED';
        fallbackError.message = `Model miễn phí ưu tiên và tuyến miễn phí dự phòng đều chưa phản hồi (${fallbackError.message}). Hãy thử lại sau; website không chuyển sang model trả phí.`;
        throw fallbackError;
      }
    }
    const canUseFreeFallback = primary.billingMode === 'auto' && error?.code === 'OPENROUTER_CREDIT_LIMIT';
    if (!canUseFreeFallback) {
      if (primary.billingMode === 'free' && error?.code === 'OPENROUTER_RATE_LIMIT') {
        error.message = `Quota OpenRouter miễn phí đang hết hoặc bị giới hạn tốc độ (${error.message}). Hãy đợi rồi thử lại; website sẽ không tự chuyển sang model trả phí.`;
      }
      throw error;
    }
    const fallback = buildChatBody(options, {
      stream,
      modelOverride: FREE_MODEL,
      maxTokensOverride: Math.min(primary.requestedMaxTokens, freeTokenCap(primary.profile)),
    });
    options.onRetry?.({ attempt: 0, delayMs: 0, status: 402, reason: 'credit-free-fallback', model: FREE_MODEL });
    try {
      const result = await send(fallback, { timeoutMs: fallback.timeoutMs, maxAttempts: 2 });
      return {
        ...result,
        config: fallback,
        fallbackUsed: true,
        creditFallback: true,
        affordableTokens: Math.max(0, Number(error.affordableTokens) || 0),
        ...fastMeta,
      };
    } catch (fallbackError) {
      fallbackError.originalCreditError = error.message;
      fallbackError.affordableTokens = Math.max(0, Number(error.affordableTokens) || 0);
      if (!fallbackError.code || fallbackError.code === 'OPENROUTER_REQUEST_FAILED') fallbackError.code = 'OPENROUTER_FREE_FALLBACK_FAILED';
      fallbackError.message = `OpenRouter không đủ credit và tuyến miễn phí hiện chưa phản hồi (${fallbackError.message}). Hãy thử lại sau hoặc nạp thêm credit.`;
      throw fallbackError;
    }
  }
}

export function resolveServerAiProvider() {
  return 'openrouter';
}

export function getServerAiReadiness() {
  const configured = Boolean(env('OPENROUTER_API_KEY'));
  const mode = billingMode();
  const fastFreeMode = mode === 'free' && parseBool(process.env.OPENROUTER_FAST_FREE_MODE, true);
  const effectiveModel = (profile) => mode === 'free' && profile !== 'image' ? FREE_MODEL : modelForProfile(profile);
  return {
    provider: 'openrouter',
    configured,
    transport: 'server-gateway',
    contract: 'bes-ai-core/1.3',
    models: {
      fast: effectiveModel('fast'),
      standard: effectiveModel('standard'),
      quality: effectiveModel('quality'),
      json: effectiveModel('json'),
      long: effectiveModel('long'),
      vision: effectiveModel('vision'),
      image: modelForProfile('image'),
    },
    clientKeyRequired: false,
    billingMode: mode,
    freeFirst: mode === 'free',
    paidModelsAllowed: mode !== 'free',
    freeFallbackEnabled: mode === 'auto',
    freeFallbackModel: FREE_MODEL,
    freeDailyRequestLimitHint: 50,
    fastFreeMode,
    fastFreeTextMode: fastFreeMode && parseBool(process.env.OPENROUTER_FAST_FREE_TEXT_MODE, true),
    fastFreeJsonModel: env('OPENROUTER_FREE_MODEL_JSON', 'latency-catalog'),
    fastFreeTextModel: env('OPENROUTER_FREE_MODEL_TEXT', 'latency-catalog-text'),
    fastFreePrimaryTimeoutMs: fastFreePrimaryTimeout(),
    fastFreeFallbackTimeoutMs: fastFreeFallbackTimeout(),
    fastFreeTextPrimaryTimeoutMs: fastFreeTextPrimaryTimeout(),
    fastFreeTextFallbackTimeoutMs: fastFreeTextFallbackTimeout(),
    fastFreeCatalogCacheMinutes: FAST_FREE_CACHE_TTL_MS / 60_000,
  };
}

export async function warmServerAiRuntime(options = {}) {
  const readiness = getServerAiReadiness();
  if (!readiness.configured || !readiness.fastFreeMode) return { ...readiness, warmed: false };
  const apiKey = env('OPENROUTER_API_KEY');
  const baseUrl = env('OPENROUTER_BASE_URL', OPENROUTER_BASE_URL).replace(/\/+$/, '');
  const [text, json] = await Promise.all([
    resolveFastFreeTextModel({
      prompt: 'Brian AI fast conversation warmup',
      maxOutputTokens: 900,
      routingHint: 'fast',
      taskId: 'runtime.warmup.text',
      signal: options.signal,
    }, { apiKey, baseUrl }),
    resolveFastFreeJsonModel({
      prompt: 'Brian AI structured content warmup',
      responseMimeType: 'application/json',
      maxOutputTokens: 1800,
      routingHint: 'fast',
      taskId: 'runtime.warmup.json',
      signal: options.signal,
    }, { apiKey, baseUrl }),
  ]);
  return {
    ...readiness,
    warmed: true,
    warmup: {
      textModel: text.model,
      textSource: text.source,
      jsonModel: json.model,
      jsonSource: json.source,
      durationMs: Math.max(text.catalogDurationMs || 0, json.catalogDurationMs || 0),
    },
  };
}

export async function callServerAI(options = {}) {
  const cleanPrompt = String(options.prompt || '').trim();
  if (!cleanPrompt) throw withStatus(new Error('AI prompt is empty.'), 400, 'AI_PROMPT_EMPTY');
  if (cleanPrompt.length > 180_000) throw withStatus(new Error('AI prompt is too large.'), 413, 'AI_PROMPT_TOO_LARGE');
  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) throw withStatus(new Error('OPENROUTER_API_KEY is not configured on Vercel.'), 503, 'OPENROUTER_SERVER_KEY_MISSING');
  const startedAt = Date.now();
  let execution = await executeChatRequest(options, { stream: false });
  let text = extractResponseText(execution.payload);
  let providerAttempts = execution.attempts;
  let freeRouteRetry = false;

  // A free provider can occasionally return HTTP 200 with an empty choice. That
  // response cannot trigger OpenRouter's normal provider fallback, so perform one
  // bounded retry with a fresh session id and never loop beyond it.
  if (!text && (execution.config.billingMode === 'free' || execution.config.model === FREE_MODEL)) {
    freeRouteRetry = true;
    const previousExecution = execution;
    const emptyFastFreePrimary = previousExecution.fastFreePrimaryUsed && !previousExecution.fastFreeFallback;
    options.onRetry?.({
      attempt: previousExecution.attempts,
      delayMs: 0,
      status: 200,
      reason: emptyFastFreePrimary ? 'empty-fast-free-fallback' : 'empty-free-response',
      model: FREE_MODEL,
    });
    const retrySession = `${String(options.sessionId || options.requestId || 'bes').slice(0, 150)}:empty-retry:${Date.now()}`;
    const retryExecution = await executeChatRequest({ ...options, sessionId: retrySession, fastFreeBypass: true }, { stream: false });
    providerAttempts += retryExecution.attempts;
    execution = {
      ...retryExecution,
      fallbackUsed: previousExecution.fallbackUsed || retryExecution.fallbackUsed || emptyFastFreePrimary,
      creditFallback: previousExecution.creditFallback || retryExecution.creditFallback,
      affordableTokens: Math.max(previousExecution.affordableTokens || 0, retryExecution.affordableTokens || 0),
      fastFreeMode: previousExecution.fastFreeMode || retryExecution.fastFreeMode,
      fastFreePrimaryUsed: previousExecution.fastFreePrimaryUsed || retryExecution.fastFreePrimaryUsed,
      fastFreeSelectedModel: previousExecution.fastFreeSelectedModel || retryExecution.fastFreeSelectedModel,
      fastFreeSelectionSource: previousExecution.fastFreeSelectionSource || retryExecution.fastFreeSelectionSource,
      fastFreeCatalogDurationMs: Math.max(previousExecution.fastFreeCatalogDurationMs || 0, retryExecution.fastFreeCatalogDurationMs || 0),
      fastFreeFallback: previousExecution.fastFreeFallback || retryExecution.fastFreeFallback || emptyFastFreePrimary,
    };
    text = extractResponseText(execution.payload);
  }

  const {
    payload,
    config,
    fallbackUsed,
    creditFallback,
    affordableTokens,
    fastFreeMode = false,
    fastFreePrimaryUsed = false,
    fastFreeSelectedModel = '',
    fastFreeSelectionSource = '',
    fastFreeCatalogDurationMs = 0,
    fastFreeFallback = false,
  } = execution;
  const { model, profile, requestedMaxTokens, actualMaxTokens } = config;
  if (!text) {
    const actualModel = String(payload?.model || model);
    throw withStatus(new Error(`OpenRouter returned no output text after one controlled retry (${actualModel}).`), 502, 'OPENROUTER_EMPTY_RESPONSE');
  }
  return {
    text,
    provider: 'openrouter',
    model: String(payload?.model || model),
    requestedModel: model,
    profile,
    transport: 'server-gateway',
    durationMs: Date.now() - startedAt,
    requestId: options.requestId || null,
    providerAttempts,
    freeRouteRetry,
    fallbackUsed,
    fastFreeMode,
    fastFreePrimaryUsed,
    fastFreeSelectedModel,
    fastFreeSelectionSource,
    fastFreeCatalogDurationMs,
    fastFreeFallback,
    creditFallback,
    affordableTokens,
    requestedMaxTokens,
    actualMaxTokens,
    billingMode: config.billingMode,
    usage: payload?.usage || null,
  };
}

async function consumeOpenRouterStream(execution, handlers = {}) {
  const { response, config } = execution;
  const reader = response.body?.getReader?.();
  if (!reader) throw withStatus(new Error('OpenRouter streaming is unavailable.'), 502, 'OPENROUTER_STREAM_UNAVAILABLE');
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let actualModel = config.model;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      let boundary = buffer.indexOf('\n');
      while (boundary >= 0) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf('\n');
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        let data;
        try { data = JSON.parse(raw); } catch { continue; }
        if (data?.error) throw normalizeOpenRouterError({ error: data.error }, { status: Number(data.error.code || 502), headers: new Headers() });
        actualModel = String(data?.model || actualModel);
        const delta = data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content ?? '';
        const chunk = Array.isArray(delta) ? delta.map((part) => part?.text || '').join('') : String(delta || '');
        if (chunk) {
          text += chunk;
          handlers.onToken?.(chunk, text);
        }
        if (data?.usage) handlers.onUsage?.(data.usage);
      }
      if (done) break;
    }
  } catch (error) {
    error.partialText = text;
    throw error;
  }
  return { text: text.trim(), actualModel };
}

export async function streamServerAI(options = {}, handlers = {}) {
  const cleanPrompt = String(options.prompt || '').trim();
  if (!cleanPrompt) throw withStatus(new Error('AI prompt is empty.'), 400, 'AI_PROMPT_EMPTY');
  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) throw withStatus(new Error('OPENROUTER_API_KEY is not configured on Vercel.'), 503, 'OPENROUTER_SERVER_KEY_MISSING');
  const startedAt = Date.now();
  let execution = await executeChatRequest(options, { stream: true });
  let providerAttempts = execution.attempts;
  let streamed;
  try {
    streamed = await consumeOpenRouterStream(execution, handlers);
  } catch (error) {
    const recoverableStreamError = canFallbackFromFastFree(error)
      || /network|stream|terminated|failed to fetch|connection/i.test(String(error?.message || error));
    if (options.signal?.aborted || !execution.fastFreePrimaryUsed || error.partialText || !recoverableStreamError) throw error;
    options.onRetry?.({ attempt: providerAttempts, delayMs: 0, status: Number(error?.status || 0), reason: 'stream-fast-free-fallback', model: FREE_MODEL });
  }

  if (!streamed?.text && execution.fastFreePrimaryUsed) {
    options.onRetry?.({ attempt: providerAttempts, delayMs: 0, status: 200, reason: 'empty-stream-fast-free-fallback', model: FREE_MODEL });
  }

  if (!streamed?.text && execution.fastFreePrimaryUsed) {
    const primaryExecution = execution;
    execution = await executeChatRequest({
      ...options,
      sessionId: `${String(options.sessionId || options.requestId || 'bes').slice(0, 150)}:stream-retry:${Date.now()}`,
      fastFreeBypass: true,
    }, { stream: true });
    providerAttempts += execution.attempts;
    execution = {
      ...execution,
      fallbackUsed: true,
      fastFreeMode: primaryExecution.fastFreeMode || execution.fastFreeMode,
      fastFreePrimaryUsed: primaryExecution.fastFreePrimaryUsed,
      fastFreeSelectedModel: primaryExecution.fastFreeSelectedModel,
      fastFreeSelectionSource: primaryExecution.fastFreeSelectionSource,
      fastFreeCatalogDurationMs: primaryExecution.fastFreeCatalogDurationMs,
      fastFreeFallback: true,
    };
    streamed = await consumeOpenRouterStream(execution, handlers);
  }

  if (!streamed?.text) throw withStatus(new Error('OpenRouter returned no streamed output text after one controlled fallback.'), 502, 'OPENROUTER_EMPTY_RESPONSE');
  const { config } = execution;
  return {
    text: streamed.text,
    provider: 'openrouter',
    model: streamed.actualModel,
    requestedModel: config.model,
    profile: config.profile,
    transport: 'server-gateway-stream',
    durationMs: Date.now() - startedAt,
    requestId: options.requestId || null,
    providerAttempts,
    fallbackUsed: execution.fallbackUsed,
    fastFreeMode: execution.fastFreeMode,
    fastFreePrimaryUsed: execution.fastFreePrimaryUsed,
    fastFreeSelectedModel: execution.fastFreeSelectedModel,
    fastFreeSelectionSource: execution.fastFreeSelectionSource,
    fastFreeCatalogDurationMs: execution.fastFreeCatalogDurationMs,
    fastFreeFallback: execution.fastFreeFallback,
    creditFallback: execution.creditFallback,
    affordableTokens: execution.affordableTokens,
    requestedMaxTokens: config.requestedMaxTokens,
    actualMaxTokens: config.actualMaxTokens,
    billingMode: config.billingMode,
  };
}

export async function callServerImageAI(options = {}) {
  const prompt = String(options.prompt || '').trim();
  if (!prompt) throw withStatus(new Error('Image prompt is empty.'), 400, 'AI_PROMPT_EMPTY');
  const apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) throw withStatus(new Error('OPENROUTER_API_KEY is not configured on Vercel.'), 503, 'OPENROUTER_SERVER_KEY_MISSING');
  const baseUrl = env('OPENROUTER_BASE_URL', OPENROUTER_BASE_URL).replace(/\/+$/, '');
  const model = modelForProfile('image');
  const startedAt = Date.now();
  const body = { model, prompt, n: 1, output_format: 'png' };
  if (String(options.imageDataUrl || '').startsWith('data:image/')) body.input_references = [{ type: 'image_url', image_url: { url: options.imageDataUrl } }];
  const { payload, attempts } = await fetchOpenRouterWithOneRetry(`${baseUrl}/images`, {
    method: 'POST', headers: requestHeaders(apiKey, options.requestId), body: JSON.stringify(body), signal: options.signal,
  }, timeoutForProfile('image'), options.onRetry);
  const imageDataUrl = extractImage(payload);
  if (!imageDataUrl) throw withStatus(new Error('OpenRouter did not return an image.'), 502, 'OPENROUTER_IMAGE_EMPTY');
  return { imageDataUrl, provider: 'openrouter', model, transport: 'server-gateway', durationMs: Date.now() - startedAt, requestId: options.requestId || null, providerAttempts: attempts };
}
