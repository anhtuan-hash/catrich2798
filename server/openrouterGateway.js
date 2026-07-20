const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

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

function validModel(value) {
  const model = String(value || '').trim();
  if (!model || model.length > 160 || !/^[a-z0-9._~:/-]+$/i.test(model)) return DEFAULT_SERVER_AI_SETTINGS.model;
  return model;
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
    model: validModel(source.model),
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
    model: next.model,
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

export async function callOpenRouter({ settings, prompt, systemInstruction = '', attachments = [], temperature = 0.7, responseMimeType = '', maxOutputTokens, requestId = '' }) {
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

  const body = {
    model: settings.model,
    messages,
    temperature: Math.min(1.5, Math.max(0, Number(temperature) || 0.7)),
    max_tokens: maxOutputTokens,
  };
  if (responseMimeType === 'application/json') body.response_format = { type: 'json_object' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  const execute = async () => {
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
    return { response, data };
  };

  try {
    let { response, data } = await execute();
    if (!response.ok) {
      const message = providerMessage(data, response.status);
      const affordableMatch = message.match(/can only afford\s+(\d+)/i);
      const affordable = affordableMatch ? Number(affordableMatch[1]) : 0;
      if (affordable >= 80 && body.max_tokens > affordable - 24) {
        body.max_tokens = Math.max(64, affordable - 24);
        ({ response, data } = await execute());
      }
    }
    if (!response.ok) {
      const error = new Error(providerMessage(data, response.status));
      error.status = response.status >= 500 ? 502 : response.status;
      error.code = 'OPENROUTER_PROVIDER_ERROR';
      throw error;
    }
    const text = extractText(data);
    if (!text) {
      const error = new Error('OpenRouter không trả về nội dung văn bản.');
      error.status = 502;
      error.code = 'OPENROUTER_EMPTY_RESPONSE';
      throw error;
    }
    return {
      text,
      model: String(data?.model || settings.model),
      generationId: String(data?.id || ''),
      usage: {
        inputTokens: Number(data?.usage?.prompt_tokens || 0),
        outputTokens: Number(data?.usage?.completion_tokens || 0),
        totalTokens: Number(data?.usage?.total_tokens || 0),
      },
      maxOutputTokens: body.max_tokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}
