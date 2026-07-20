const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_PRIMARY_MODEL = 'openrouter/free';
const DEFAULT_FREE_FALLBACK_MODEL = 'openrouter/free';
const MAX_TOTAL_TIMEOUT_MS = 110_000;
const TRANSIENT_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export const DEFAULT_SERVER_AI_SETTINGS = Object.freeze({
  id: 'global',
  enabled: true,
  model: process.env.OPENROUTER_MODEL || 'openrouter/free',
  perMinuteLimit: Number(process.env.AI_PER_MINUTE_LIMIT || 12),
  dailyRequestLimit: Number(process.env.AI_DAILY_REQUEST_LIMIT || 160),
  dailyTokenBudget: Number(process.env.AI_DAILY_TOKEN_BUDGET || 180000),
  maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 2800),
  profiles: {
    chat: 2400,
    worksheet: 2800,
    document: 2600,
    administration: 1800,
    'teaching-content': 3200,
    default: 2200,
  },
  updatedAt: '',
  updatedBy: null,
});

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function validModel(value, fallback = DEFAULT_SERVER_AI_SETTINGS.model) {
  const model = String(value || '').trim();
  if (!model || model.length > 160 || !/^[a-z0-9._~:/-]+$/i.test(model)) return fallback;
  return model;
}

function uniqueModels(items = []) {
  const seen = new Set();
  return items.map((item) => validModel(item, '')).filter((item) => item && !seen.has(item) && seen.add(item));
}

function envNumber(name, fallback) {
  return clamp(process.env[name], 10_000, MAX_TOTAL_TIMEOUT_MS, fallback);
}

function timeoutForRequest({ profile = 'default', images = 0, responseMimeType = '', prompt = '' } = {}) {
  if (images > 0) return envNumber('OPENROUTER_TIMEOUT_VISION_MS', 105_000);
  const normalized = String(profile || 'default').toLowerCase();
  const defaults = {
    diagnostic: 25_000,
    chat: 60_000,
    worksheet: 96_000,
    document: 102_000,
    administration: 88_000,
    'teaching-content': 105_000,
    default: 72_000,
  };
  const envKey = `OPENROUTER_TIMEOUT_${normalized.replace(/[^A-Z0-9]+/gi, '_').toUpperCase()}_MS`;
  let timeout = envNumber(envKey, defaults[normalized] || defaults.default);
  if (responseMimeType === 'application/json') timeout = Math.max(timeout, envNumber('OPENROUTER_TIMEOUT_JSON_MS', 100_000));
  if (String(prompt || '').length > 32_000) timeout = Math.max(timeout, envNumber('OPENROUTER_TIMEOUT_LONG_MS', 108_000));
  return Math.min(MAX_TOTAL_TIMEOUT_MS, timeout);
}

export function normalizeServerAiSettings(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const profileSource = source.profiles && typeof source.profiles === 'object' ? source.profiles : {};
  const profiles = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SERVER_AI_SETTINGS.profiles)) {
    const raw = typeof profileSource[key] === 'object' ? profileSource[key]?.maxOutputTokens : profileSource[key];
    profiles[key] = clamp(raw, 128, 8192, fallback);
  }
  return {
    id: 'global',
    enabled: source.enabled !== false,
    model: 'openrouter/free',
    perMinuteLimit: clamp(source.perMinuteLimit ?? source.per_minute_limit, 1, 120, DEFAULT_SERVER_AI_SETTINGS.perMinuteLimit),
    dailyRequestLimit: clamp(source.dailyRequestLimit ?? source.daily_request_limit, 1, 10000, DEFAULT_SERVER_AI_SETTINGS.dailyRequestLimit),
    dailyTokenBudget: clamp(source.dailyTokenBudget ?? source.daily_token_budget, 1000, 100000000, DEFAULT_SERVER_AI_SETTINGS.dailyTokenBudget),
    maxOutputTokens: clamp(source.maxOutputTokens ?? source.max_output_tokens, 128, 8192, DEFAULT_SERVER_AI_SETTINGS.maxOutputTokens),
    profiles,
    updatedAt: String(source.updatedAt || source.updated_at || ''),
    updatedBy: source.updatedBy || source.updated_by || null,
  };
}

export async function readServerAiSettings(context) {
  const fallback = normalizeServerAiSettings(DEFAULT_SERVER_AI_SETTINGS);
  try {
    const { data, error } = await (context.adminClient || context.client)
      .from('ai_runtime_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { settings: fallback, databaseBacked: false };
    return { settings: normalizeServerAiSettings(data), databaseBacked: true };
  } catch {
    return { settings: fallback, databaseBacked: false };
  }
}

export async function writeServerAiSettings(context, patch = {}) {
  const current = (await readServerAiSettings(context)).settings;
  const next = normalizeServerAiSettings({ ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: context.user.id });
  const payload = {
    id: 'global',
    enabled: next.enabled,
    model: 'openrouter/free',
    per_minute_limit: next.perMinuteLimit,
    daily_request_limit: next.dailyRequestLimit,
    daily_token_budget: next.dailyTokenBudget,
    max_output_tokens: next.maxOutputTokens,
    profiles: next.profiles,
    updated_by: context.user.id,
    updated_at: next.updatedAt,
  };
  const { error } = await (context.adminClient || context.client).from('ai_runtime_settings').upsert(payload, { onConflict: 'id' });
  if (error) {
    const failure = new Error('Chưa cài bảng ai_runtime_settings trên Supabase. Hãy chạy migration OpenRouter Gateway V11.6.7.');
    failure.status = 503;
    failure.code = 'AI_DATABASE_MIGRATION_REQUIRED';
    throw failure;
  }
  return next;
}

export function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return Math.max(1, Math.ceil(text.length / 4));
}

export function resolveOutputLimit(settings, profile, requested) {
  const profileLimit = Number(settings.profiles?.[profile] || settings.profiles?.default || settings.maxOutputTokens);
  return Math.min(
    clamp(requested, 128, 8192, profileLimit),
    settings.maxOutputTokens,
    profileLimit,
  );
}

export async function reserveServerAiQuota(context, settings, { inputTokens, outputReserve }) {
  const { data, error } = await context.client.rpc('bes_ai_reserve_quota_v1167', {
    p_user_id: context.user.id,
    p_per_minute: settings.perMinuteLimit,
    p_daily_requests: settings.dailyRequestLimit,
    p_daily_tokens: settings.dailyTokenBudget,
    p_input_tokens: inputTokens,
    p_output_reserve: outputReserve,
  });
  if (error) {
    const failure = new Error('Chưa cài quota server-side cho AI. Hãy chạy migration OpenRouter Gateway V11.6.7.');
    failure.status = 503;
    failure.code = 'AI_DATABASE_MIGRATION_REQUIRED';
    throw failure;
  }
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  if (!result?.allowed) {
    const failure = new Error(result?.reason === 'token_budget' ? 'Đã đạt ngân sách token AI hôm nay.' : result?.reason === 'minute_limit' ? 'Bạn gửi yêu cầu quá nhanh. Hãy chờ một phút.' : 'Đã đạt hạn mức yêu cầu AI hôm nay.');
    failure.status = 429;
    failure.code = 'AI_SERVER_QUOTA_REACHED';
    failure.retryAfter = Number(result?.retry_after || 60);
    throw failure;
  }
  return result;
}

export async function settleServerAiQuota(context, { outputReserve, outputTokens, success }) {
  try {
    await context.client.rpc('bes_ai_settle_quota_v1167', {
      p_user_id: context.user.id,
      p_output_reserve: Math.max(0, Number(outputReserve) || 0),
      p_output_tokens: Math.max(0, Number(outputTokens) || 0),
      p_success: Boolean(success),
    });
  } catch {
    // Reservation already enforced the hard quota; settlement is best effort.
  }
}

function normalizeAttachments(items = []) {
  let total = 0;
  const output = [];
  for (const item of Array.isArray(items) ? items.slice(0, 4) : []) {
    const mimeType = String(item?.mimeType || 'image/jpeg');
    const dataUrl = String(item?.dataUrl || '');
    if (!mimeType.startsWith('image/') || !dataUrl.startsWith('data:image/')) continue;
    total += dataUrl.length;
    if (total > 3_200_000) break;
    output.push({ mimeType, dataUrl });
  }
  return output;
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((part) => part?.text || part?.content || '').join('\n').trim();
  return String(data?.choices?.[0]?.text || '').trim();
}

function providerMessage(data, status) {
  return String(data?.error?.message || data?.message || `OpenRouter request failed with status ${status}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function retryAfterMs(response) {
  const raw = String(response?.headers?.get?.('retry-after') || '').trim();
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.min(4_000, Math.max(0, seconds * 1000));
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(4_000, Math.max(0, date - Date.now())) : 0;
}

function errorCodeForStatus(status, message = '') {
  if (status === 402 || /credit|can only afford/i.test(message)) return 'OPENROUTER_CREDIT_REQUIRED';
  if (status === 408 || status === 504) return 'OPENROUTER_TIMEOUT';
  if (status === 429) return 'OPENROUTER_RATE_LIMITED';
  if ([502, 503].includes(status)) return 'OPENROUTER_PROVIDER_UNAVAILABLE';
  return 'OPENROUTER_PROVIDER_ERROR';
}

function userMessageForError(status, message = '') {
  if (status === 402 || /credit|can only afford/i.test(message)) return 'OpenRouter không đủ hạn mức cho yêu cầu này. Brian đã thử giảm độ dài và chuyển sang model dự phòng nhưng chưa thành công.';
  if (status === 408 || status === 504) return 'OpenRouter phản hồi quá lâu. Yêu cầu đã được dừng an toàn; hãy thử lại hoặc dùng nội dung ngắn hơn.';
  if (status === 429) return 'OpenRouter đang giới hạn tốc độ. Hãy chờ vài giây rồi thử lại.';
  if ([502, 503].includes(status)) return 'Model OpenRouter tạm thời không sẵn sàng. Brian đã thử model dự phòng nhưng chưa nhận được kết quả.';
  return String(message || 'OpenRouter không thể hoàn thành yêu cầu.').slice(0, 500);
}

export function resolveOpenRouterRequestPlan(settings = {}, profile = 'default') {
  const configured = 'openrouter/free';
  const explicitPrimary = validModel(process.env.OPENROUTER_PRIMARY_MODEL, '');
  const staleDefault = configured === 'openrouter/free' || configured === 'openrouter/auto';
  const primaryModel = 'openrouter/free';
  const fallbackModel = 'openrouter/free';
  return {
    configuredModel: configured,
    primaryModel,
    fallbackModel,
    models: uniqueModels([primaryModel, fallbackModel]),
    profile: String(profile || 'default'),
  };
}

async function fetchAttempt({ key, body, requestId, timeoutMs }) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://esl-pek.vercel.app',
        'X-OpenRouter-Title': 'Brian English Studio',
        ...(requestId ? { 'X-Client-Request-Id': requestId } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data, durationMs: Date.now() - startedAt };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('OpenRouter request timed out.');
      timeoutError.status = 504;
      timeoutError.code = 'OPENROUTER_TIMEOUT';
      timeoutError.durationMs = Date.now() - startedAt;
      throw timeoutError;
    }
    const networkError = new Error('Không thể kết nối ổn định đến OpenRouter.');
    networkError.status = 502;
    networkError.code = 'OPENROUTER_NETWORK_ERROR';
    networkError.cause = error;
    networkError.durationMs = Date.now() - startedAt;
    throw networkError;
  } finally {
    clearTimeout(timer);
  }
}

export async function callOpenRouter({
  settings,
  prompt,
  systemInstruction = '',
  attachments = [],
  temperature = 0.7,
  responseMimeType = '',
  maxOutputTokens,
  requestId = '',
  profile = 'default',
  action = 'completion',
}) {
  const key = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) {
    const error = new Error('OPENROUTER_API_KEY chưa được cấu hình trong Vercel Environment Variables.');
    error.status = 503;
    error.code = 'OPENROUTER_NOT_CONFIGURED';
    throw error;
  }

  const images = normalizeAttachments(attachments);
  const userContent = images.length
    ? [{ type: 'text', text: prompt }, ...images.map((image) => ({ type: 'image_url', image_url: { url: image.dataUrl } }))]
    : prompt;
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: userContent });

  const timeoutMs = timeoutForRequest({ profile, images: images.length, responseMimeType, prompt });
  const plan = resolveOpenRouterRequestPlan(settings, profile);
  const attempts = [];
  const startedAt = Date.now();
  let lastFailure = null;

  for (const model of plan.models) {
    let maxTokens = clamp(maxOutputTokens, 64, 8192, 1600);
    let includeResponseFormat = responseMimeType === 'application/json';
    let adaptiveRetryUsed = false;
    let formatRetryUsed = false;

    for (let subAttempt = 0; subAttempt < 2; subAttempt += 1) {
      const remaining = MAX_TOTAL_TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining < 8_000) break;
      const attemptTimeout = Math.min(timeoutMs, remaining);
      const body = {
        model,
        messages,
        temperature: Math.min(1.5, Math.max(0, Number(temperature) || 0.7)),
        max_tokens: maxTokens,
        provider: {
          sort: 'latency',
          allow_fallbacks: true,
          require_parameters: includeResponseFormat,
          data_collection: process.env.OPENROUTER_DATA_COLLECTION || 'deny',
        },
      };
      if (includeResponseFormat) body.response_format = { type: 'json_object' };

      try {
        const { response, data, durationMs } = await fetchAttempt({ key, body, requestId, timeoutMs: attemptTimeout });
        const message = providerMessage(data, response.status);
        attempts.push({ model, status: response.status, durationMs, maxTokens, responseFormat: includeResponseFormat });

        if (response.ok) {
          const text = extractText(data);
          if (text) {
            return {
              text,
              model: String(data?.model || model),
              configuredModel: plan.configuredModel,
              generationId: String(data?.id || ''),
              usage: {
                inputTokens: Number(data?.usage?.prompt_tokens || 0),
                outputTokens: Number(data?.usage?.completion_tokens || 0),
                totalTokens: Number(data?.usage?.total_tokens || 0),
              },
              maxOutputTokens: maxTokens,
              attempts,
              durationMs: Date.now() - startedAt,
              profile,
              action,
            };
          }
          lastFailure = Object.assign(new Error('OpenRouter không trả về nội dung văn bản.'), {
            status: 502,
            code: 'OPENROUTER_EMPTY_RESPONSE',
          });
          break;
        }

        const affordableMatch = message.match(/can only afford\s+(\d+)/i);
        const affordable = affordableMatch ? Number(affordableMatch[1]) : 0;
        if (!adaptiveRetryUsed && affordable >= 80 && maxTokens > affordable - 24) {
          adaptiveRetryUsed = true;
          maxTokens = Math.max(64, affordable - 24);
          continue;
        }

        if (!formatRetryUsed && includeResponseFormat && response.status === 400 && /response[_ -]?format|json_object|structured/i.test(message)) {
          formatRetryUsed = true;
          includeResponseFormat = false;
          continue;
        }

        const failure = new Error(userMessageForError(response.status, message));
        failure.status = response.status >= 500 ? 502 : response.status;
        failure.code = errorCodeForStatus(response.status, message);
        failure.providerMessage = message.slice(0, 500);
        failure.retryAfter = Math.ceil(retryAfterMs(response) / 1000) || undefined;
        lastFailure = failure;

        if (TRANSIENT_STATUSES.has(response.status) || response.status === 402) {
          const wait = retryAfterMs(response);
          if (wait) await sleep(wait);
          break;
        }
        throw failure;
      } catch (error) {
        if (!attempts.length || attempts[attempts.length - 1]?.model !== model || !attempts[attempts.length - 1]?.durationMs) {
          attempts.push({ model, status: error?.status || 0, durationMs: Number(error?.durationMs || 0), maxTokens, responseFormat: includeResponseFormat });
        }
        lastFailure = error;
        if (['OPENROUTER_TIMEOUT', 'OPENROUTER_NETWORK_ERROR', 'OPENROUTER_EMPTY_RESPONSE'].includes(error?.code)) break;
        if (!TRANSIENT_STATUSES.has(Number(error?.status || 0)) && error?.code !== 'OPENROUTER_CREDIT_REQUIRED') throw error;
        break;
      }
    }
  }

  const status = Number(lastFailure?.status || 502);
  const error = new Error(userMessageForError(status, lastFailure?.message));
  error.status = status >= 500 ? 502 : status;
  error.code = lastFailure?.code || errorCodeForStatus(status, lastFailure?.message);
  error.retryAfter = lastFailure?.retryAfter;
  error.attempts = attempts;
  error.configuredModel = plan.configuredModel;
  error.durationMs = Date.now() - startedAt;
  throw error;
}
