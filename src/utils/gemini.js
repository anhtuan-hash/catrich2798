import { isSupabaseConfigured, supabase } from './supabase.js';

export const DEFAULT_GEMINI_MODEL = 'openrouter/free';
export const DEFAULT_MAX_OUTPUT_TOKENS = 2200;
export const ACTIVITY_OUTPUT_FORMATS = {
  json: 'json',
  text: 'text',
};

const WORDGRAPH_DEFAULT_INSTRUCTION = 'Tạo WordGraph cho danh sách từ vựng. Mỗi từ gồm Word Family, Collocations, Meaning, Examples và Teaching Note. Giữ nội dung ngắn gọn, rõ ràng và phù hợp học sinh THPT.';

export const AI_TOOL_PRESETS = {
  word2graph: { defaultInstruction: WORDGRAPH_DEFAULT_INSTRUCTION },
};

function makeError(message, code = 'AI_REQUEST_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function getAuthorizationHeader() {
  if (!isSupabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw makeError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'AI_AUTH_REQUIRED');
  return { Authorization: `Bearer ${token}` };
}

function normalizeOptions(input = {}) {
  if (typeof input === 'string') return { prompt: input };
  if (!input || typeof input !== 'object') return {};
  return input;
}

function dispatchAiEvent(type, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export async function callAI(input = {}) {
  const options = normalizeOptions(input);
  const operationId = options.operationId || `openrouter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const language = options.language === 'en' ? 'en' : 'vi';
  const task = ['chat', 'textcare', 'game', 'activity'].includes(options.task) ? options.task : 'chat';
  const label = options.label || (language === 'vi' ? 'Brian AI đang xử lý…' : 'Brian AI is processing…');
  const controller = options.controller || new AbortController();

  dispatchAiEvent('bes-ai-operation-start', { id: operationId, label, provider: 'OpenRouter' });
  try {
    const authHeaders = await getAuthorizationHeader();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        task,
        language,
        prompt: String(options.prompt || '').slice(0, 10_000),
        messages: Array.isArray(options.messages) ? options.messages : undefined,
        context: options.context && typeof options.context === 'object' ? options.context : undefined,
      }),
      signal: options.signal || controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback = language === 'vi' ? 'Brian AI chưa thể xử lý yêu cầu này.' : 'Brian AI could not process this request.';
      throw makeError(payload?.error || fallback, payload?.code || 'AI_REQUEST_FAILED');
    }

    const message = String(payload?.message || '').trim();
    if (!message) throw makeError(language === 'vi' ? 'AI trả về nội dung trống.' : 'AI returned an empty response.', 'AI_EMPTY_RESPONSE');

    return options.includeMetadata
      ? { message, model: payload?.model || '', provider: payload?.provider || 'openrouter', usage: payload?.usage || null, remainingToday: payload?.remainingToday }
      : message;
  } catch (error) {
    if (error?.name === 'AbortError') throw makeError(language === 'vi' ? 'Đã dừng yêu cầu AI.' : 'AI request was cancelled.', 'AI_ABORTED');
    throw error;
  } finally {
    dispatchAiEvent('bes-ai-operation-end', { id: operationId, provider: 'OpenRouter' });
  }
}

export async function callGemini(...args) {
  if (args.length === 1) return callAI(args[0]);
  const prompt = typeof args[1] === 'string' ? args[1] : String(args[0] || '');
  const options = args.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
  return callAI({ ...options, prompt });
}

export async function generateActivityWithGemini(options = {}) {
  const normalized = normalizeOptions(options);
  return callAI({
    ...normalized,
    task: normalized.task || 'activity',
    prompt: normalized.prompt || normalized.instruction || normalized.sourceText || '',
  });
}

export async function generateGenericToolOutput(options = {}) {
  const normalized = normalizeOptions(options);
  const preset = AI_TOOL_PRESETS[normalized.slug];
  const prompt = normalized.prompt
    || normalized.instruction
    || [preset?.defaultInstruction, normalized.sourceText].filter(Boolean).join('\n\n');
  return callAI({ ...normalized, task: normalized.task || 'activity', prompt });
}

export function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  if (firstObject >= 0 && lastObject > firstObject) {
    try { return JSON.parse(cleaned.slice(firstObject, lastObject + 1)); } catch { /* ignore */ }
  }
  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');
  if (firstArray >= 0 && lastArray > firstArray) {
    try { return JSON.parse(cleaned.slice(firstArray, lastArray + 1)); } catch { /* ignore */ }
  }
  return null;
}
