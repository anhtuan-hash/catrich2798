const DEFAULT_ENDPOINT = 'https://kiraai.vn/api/v1/chat/completions';
const DEFAULT_MODEL = 'kira-3.5-flash';
const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 8000;
const REQUEST_TIMEOUT_MS = 45000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateLimitStore = globalThis.__BES_KIRA_RATE_LIMIT__ || new Map();
globalThis.__BES_KIRA_RATE_LIMIT__ = rateLimitStore;

function getClientIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function checkRateLimit(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const current = rateLimitStore.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  rateLimitStore.set(key, current);
  if (current.count <= RATE_LIMIT_MAX) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.startedAt)) / 1000)) };
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((item) => item.content)
    .slice(-MAX_MESSAGES);
}

function extractAssistantMessage(payload) {
  const content = payload?.choices?.[0]?.message?.content
    ?? payload?.choices?.[0]?.text
    ?? payload?.output_text
    ?? payload?.message;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => typeof part === 'string' ? part : part?.text || part?.content || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return '';
}

function safeUpstreamError(payload, status) {
  const message = payload?.error?.message || payload?.message || payload?.error;
  const normalized = typeof message === 'string' ? message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]') : '';
  return normalized.slice(0, 280) || `Kira AI returned HTTP ${status}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      code: 'RATE_LIMITED',
      error: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.',
    });
  }

  const apiKey = String(process.env.KIRAAI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({
      code: 'KIRAAI_NOT_CONFIGURED',
      error: 'Kira AI is not configured on the server.',
    });
  }

  const body = parseBody(req);
  const messages = normalizeMessages(body.messages);
  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return res.status(400).json({
      code: 'INVALID_MESSAGES',
      error: 'A final user message is required.',
    });
  }

  const language = body.language === 'en' ? 'en' : 'vi';
  const endpoint = String(process.env.KIRAAI_BASE_URL || DEFAULT_ENDPOINT).trim();
  const model = String(process.env.KIRAAI_MODEL || DEFAULT_MODEL).trim();
  const systemPrompt = language === 'vi'
    ? 'Bạn là Brian AI, trợ lý chuyên môn tích hợp trong Brian English Studio. Hãy trả lời bằng tiếng Việt rõ ràng, chính xác, thực tế và ưu tiên bối cảnh giáo dục, dạy tiếng Anh, quản lý tổ chuyên môn và công việc giáo viên. Khi người dùng yêu cầu nội dung tiếng Anh, hãy cung cấp đúng ngôn ngữ họ cần. Không tự nhận đã thực hiện thao tác trên hệ thống khi chưa có dữ liệu xác nhận.'
    : 'You are Brian AI, the professional assistant inside Brian English Studio. Respond clearly, accurately, and practically, prioritizing English teaching, classroom practice, department management, and teacher workflows. Use Vietnamese when the user requests it. Never claim to have completed an action in the system without confirmed data.';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.45,
        max_tokens: 1400,
        stream: false,
      }),
      signal: controller.signal,
    });

    const payload = await upstream.json().catch(async () => ({ message: await upstream.text().catch(() => '') }));
    if (!upstream.ok) {
      return res.status(502).json({
        code: 'KIRAAI_UPSTREAM_ERROR',
        error: safeUpstreamError(payload, upstream.status),
      });
    }

    const message = extractAssistantMessage(payload);
    if (!message) {
      return res.status(502).json({
        code: 'KIRAAI_EMPTY_RESPONSE',
        error: 'Kira AI returned an empty response.',
      });
    }

    return res.status(200).json({
      message,
      provider: 'kiraai.vn',
      model: payload?.model || model,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({
        code: 'KIRAAI_TIMEOUT',
        error: 'Kira AI response timed out. Please try again.',
      });
    }
    return res.status(502).json({
      code: 'KIRAAI_REQUEST_FAILED',
      error: 'Unable to connect to Kira AI.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
