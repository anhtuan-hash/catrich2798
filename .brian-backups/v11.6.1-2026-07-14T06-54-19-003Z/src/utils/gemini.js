import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  getActiveAiConfig,
  getAiConfigs,
  getFallbackEnabled,
  getProviderInfo,
} from './aiProviders.js';
import { appendAiAudit, guardAiRequest, recordAiRequest } from './aiGovernance.js';
import { getProviderCatalogEntry, mergeProviderInfo } from '../data/aiProviderCatalog.js';
import { getRoutingPreferences } from './aiProviderOverrides.js';
import {
  buildAiRoutingCandidates,
  classifyAiError,
  noteProviderHealth,
  shouldFallbackAiError,
} from './aiSmartRouting.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
export const DEFAULT_MAX_OUTPUT_TOKENS = 1600;

function normalizeMaxOutputTokens(value, fallback = DEFAULT_MAX_OUTPUT_TOKENS) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(8192, Math.max(32, parsed));
}

export const ACTIVITY_OUTPUT_FORMATS = {
  quiz: `Return lines only. Format: Question | option A | option B | option C | option D | correct letter.\nExample: While I _____ dinner, the phone rang. | was cooking | cooked | have cooked | cook | A`,
  match: `Return lines only. Format: term | definition.\nExample: allegation | a claim that someone has done something wrong`,
  pairs: `Return lines only. Format: left item | matching right item.\nExample: happy | happiness`,
  cards: `Return lines only. Each line is one speaking prompt or task.`,
  box: `Return lines only. Format: points | question or task. Use varied points such as 10, 20, 30, 40, 50.`,
  sort: `Return lines only. Format: Category | item 1, item 2, item 3, item 4.\nExample: Nouns | happiness, decision, performance`,
  unjumble: `Return lines only. Each line is one complete correct sentence. Do not jumble the words; the app will jumble them.`,
  wordsearch: `Return lines only. Format: WORD | clue. Use uppercase single words with no spaces, maximum 15 letters.`,
};

function normalizeModelName(model, fallback = DEFAULT_GEMINI_MODEL) {
  const clean = String(model || fallback).trim();
  return clean || fallback;
}

function normalizeApiKey(value = '') {
  return String(value || '').trim().replace(/^Bearer\s+/i, '');
}

function providerError(message, { status = 0, provider = '', code = '' } = {}) {
  const error = new Error(String(message || 'AI provider error'));
  if (status) error.status = status;
  if (provider) error.provider = provider;
  if (code) error.code = code;
  return error;
}

function resolveProviderInfo(providerId) {
  const id = String(providerId || DEFAULT_PROVIDER || 'gemini').trim();
  let legacy = {};
  try { legacy = getProviderInfo(id) || {}; } catch { legacy = {}; }
  return mergeProviderInfo(id, legacy);
}

function appendEndpoint(baseUrl, endpoint) {
  const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (clean.toLowerCase().endsWith(endpoint.toLowerCase())) return clean;
  return `${clean}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

function extractOpenAIText(data) {
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
  if (Array.isArray(content)) return content.map((part) => part?.text || part?.content || '').join('\n').trim();
  return String(content || '').trim();
}

async function callGeminiProvider({ apiKey, model, baseUrl, prompt, attachments = [], systemInstruction = '', temperature = 0.7, responseMimeType = '', maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS, provider = 'gemini' }) {
  const key = normalizeApiKey(apiKey);
  if (!key) throw providerError('Missing Gemini API key.', { provider, code: 'AI_AUTH_MISSING' });
  const cleanBase = String(baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const chosenModel = normalizeModelName(model, DEFAULT_GEMINI_MODEL);
  const url = `${cleanBase}/models/${encodeURIComponent(chosenModel)}:generateContent`;
  const imageParts = (Array.isArray(attachments) ? attachments : [])
    .filter((item) => String(item?.mimeType || item?.type || '').startsWith('image/') && item?.base64)
    .slice(0, 4)
    .map((item) => ({ inlineData: { mimeType: item.mimeType || item.type, data: item.base64 } }));
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
    generationConfig: { temperature, maxOutputTokens: normalizeMaxOutputTokens(maxOutputTokens) },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (responseMimeType) body.generationConfig.responseMimeType = responseMimeType;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed with status ${response.status}`;
    throw providerError(message, { status: response.status, provider });
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  if (!text) throw providerError('Gemini returned an empty response.', { provider, code: 'AI_EMPTY_RESPONSE' });
  return text;
}

async function callOpenAICompatibleProvider({ apiKey, model, baseUrl, prompt, attachments = [], systemInstruction = '', temperature = 0.7, responseMimeType = '', provider = '', requiresApiKey = true, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS, onAdaptiveRetry }) {
  const key = normalizeApiKey(apiKey);
  if (requiresApiKey !== false && !key) throw providerError(`Missing ${provider || 'AI'} API key.`, { provider, code: 'AI_AUTH_MISSING' });
  const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
  if (!cleanBase) throw providerError('Missing OpenAI-compatible base URL.', { provider, code: 'AI_BASE_URL_MISSING' });
  const url = appendEndpoint(cleanBase, '/chat/completions');
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? (window.location?.origin || 'http://localhost') : 'http://localhost';
    headers['X-Title'] = 'Brian English Studio';
  }

  const imageParts = (Array.isArray(attachments) ? attachments : [])
    .filter((item) => String(item?.mimeType || item?.type || '').startsWith('image/') && (item?.dataUrl || item?.base64))
    .slice(0, 4);
  const userContent = imageParts.length
    ? [{ type: 'text', text: prompt }, ...imageParts.map((item) => ({ type: 'image_url', image_url: { url: item.dataUrl || `data:${item.mimeType || item.type};base64,${item.base64}` } }))]
    : prompt;
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: userContent });
  const body = {
    model: normalizeModelName(model, 'gpt-4o-mini'),
    messages,
    temperature,
    max_tokens: normalizeMaxOutputTokens(maxOutputTokens),
  };
  if (responseMimeType === 'application/json') body.response_format = { type: 'json_object' };

  const executeRequest = async (requestBody) => {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestBody) });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let { response, data } = await executeRequest(body);
  if (!response.ok && provider === 'openrouter') {
    const message = data?.error?.message || data?.message || '';
    const affordableMatch = String(message).match(/can only afford\s+(\d+)/i);
    const affordable = affordableMatch ? Number.parseInt(affordableMatch[1], 10) : 0;
    if (Number.isFinite(affordable) && affordable >= 80 && body.max_tokens > 64) {
      const adaptiveMax = Math.max(64, Math.min(body.max_tokens - 32, affordable - 24));
      if (adaptiveMax < body.max_tokens) {
        body.max_tokens = adaptiveMax;
        if (typeof onAdaptiveRetry === 'function') onAdaptiveRetry({ provider, affordableTokens: affordable, maxOutputTokens: adaptiveMax, reason: 'credit-limit' });
        ({ response, data } = await executeRequest(body));
      }
    }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `${provider || 'AI'} request failed with status ${response.status}`;
    const affordableMatch = String(message).match(/can only afford\s+(\d+)/i);
    const creditLimited = provider === 'openrouter' && (/requires more credits|insufficient credits|can only afford|credit balance/i.test(String(message)));
    const error = providerError(message, {
      status: response.status,
      provider,
      code: creditLimited ? 'AI_PROVIDER_CREDIT_LIMIT' : '',
    });
    if (creditLimited) {
      error.affordableTokens = affordableMatch ? Number.parseInt(affordableMatch[1], 10) : 0;
      error.requestedTokens = body.max_tokens;
    }
    throw error;
  }
  const text = extractOpenAIText(data);
  if (!text) throw providerError(`${provider || 'AI'} returned an empty response.`, { provider, code: 'AI_EMPTY_RESPONSE' });
  return text;
}

async function callClaudeProvider({ apiKey, model, baseUrl, prompt, attachments = [], systemInstruction = '', temperature = 0.7, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS, provider = 'claude' }) {
  const key = normalizeApiKey(apiKey);
  if (!key) throw providerError('Missing Claude API key.', { provider, code: 'AI_AUTH_MISSING' });
  const cleanBase = String(baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
  const response = await fetch(appendEndpoint(cleanBase, '/messages'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: normalizeModelName(model, 'claude-3-5-haiku-latest'),
      max_tokens: normalizeMaxOutputTokens(maxOutputTokens),
      temperature,
      system: systemInstruction || undefined,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        ...(Array.isArray(attachments) ? attachments : [])
          .filter((item) => String(item?.mimeType || item?.type || '').startsWith('image/') && item?.base64)
          .slice(0, 4)
          .map((item) => ({ type: 'image', source: { type: 'base64', media_type: item.mimeType || item.type, data: item.base64 } })),
      ] }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Claude request failed with status ${response.status}`;
    throw providerError(message, { status: response.status, provider });
  }
  const text = data?.content?.map((part) => part.text || '').join('\n').trim();
  if (!text) throw providerError('Claude returned an empty response.', { provider, code: 'AI_EMPTY_RESPONSE' });
  return text;
}

async function callSingleProvider({ provider, apiKey, model, baseUrl, prompt, attachments = [], systemInstruction = '', temperature = 0.7, responseMimeType = '', maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS, onAdaptiveRetry }) {
  const info = resolveProviderInfo(provider || DEFAULT_PROVIDER);
  const config = {
    provider: info.id,
    apiKey,
    model: model || info.defaultModel,
    baseUrl: baseUrl || info.baseUrl,
    prompt,
    attachments,
    systemInstruction,
    temperature,
    responseMimeType,
    requiresApiKey: info.requiresApiKey !== false,
    maxOutputTokens: normalizeMaxOutputTokens(maxOutputTokens),
    onAdaptiveRetry,
  };
  if (info.kind === 'gemini') return callGeminiProvider(config);
  if (info.kind === 'claude') return callClaudeProvider(config);
  return callOpenAICompatibleProvider(config);
}

function emitAiOperation(type, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function publishLastRoute(route) {
  if (typeof window === 'undefined') return;
  window.__besLastAiRoute = route;
  emitAiOperation('bes-ai-routing-success', route);
}

function explicitCandidate(options, active, configured = null) {
  const id = String(options.provider || options.manualProvider || active.provider || DEFAULT_PROVIDER).trim();
  const info = resolveProviderInfo(id);
  const sameAsActive = id === String(active.provider || '').trim();
  const source = configured || {};
  const key = normalizeApiKey(String(options.apiKey || source.apiKey || (sameAsActive ? active.apiKey : '') || '').trim());
  return {
    id,
    provider: info,
    apiKey: key,
    model: options.model || options.manualModel || source.model || (sameAsActive ? active.model : '') || info.defaultModel,
    baseUrl: options.baseUrl || source.baseUrl || (sameAsActive ? active.baseUrl : '') || info.baseUrl,
    rank: 0,
    config: source,
  };
}

export async function callAI(options = {}) {
  const startedAt = Date.now();
  let governance;
  try {
    governance = guardAiRequest(options);
  } catch (error) {
    appendAiAudit({
      type: 'request', status: 'blocked', label: 'AI request blocked by governance',
      profile: String(options.governanceProfile || options.profile || ''),
      detail: { code: error?.code || '', error: error?.message || String(error) },
    });
    throw error;
  }

  const active = getActiveAiConfig();
  const prefs = getRoutingPreferences();
  const configuredCandidates = buildAiRoutingCandidates({
    legacyProviders: PROVIDERS,
    legacyConfigs: getAiConfigs(),
    legacyActiveProvider: active.provider,
    options: {
      ...options,
      routingMode: options.routingMode || prefs.mode,
      manualProvider: options.manualProvider || prefs.manualProvider,
      manualModel: options.manualModel || prefs.manualModel,
    },
  });
  const explicitId = String(options.provider || options.manualProvider || active.provider || DEFAULT_PROVIDER).trim();
  const configuredMatch = configuredCandidates.find((candidate) => candidate.id === explicitId);
  const explicit = explicitCandidate(options, active, configuredMatch);
  const candidates = []
  const excludedProviders = new Set(Array.isArray(options.excludeProviders) ? options.excludeProviders : []);
  const pushCandidate = (candidate) => {
    if (!candidate?.id || excludedProviders.has(candidate.id) || candidates.some((item) => item.id === candidate.id)) return;
    candidates.push(candidate);
  };
  const hasExplicitSelection = Boolean(options.provider || options.apiKey || options.model || options.baseUrl || options.routingMode === 'manual' || prefs.mode === 'manual');
  if (hasExplicitSelection) pushCandidate(explicit);
  configuredCandidates.forEach(pushCandidate);
  if (!candidates.length && hasExplicitSelection) pushCandidate(explicit);

  const fallbackAllowed = options.fallback ?? (prefs.fallbackEnabled !== false);
  const queue = fallbackAllowed ? candidates : candidates.slice(0, 1);
  if (!queue.length) throw providerError('Chưa có AI provider khả dụng. Mở Cài đặt → AI Provider Hub để thêm API key.', { code: 'AI_PROVIDER_NOT_CONFIGURED' });

  const operationId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const first = queue[0];
  const operationDetail = {
    id: operationId,
    provider: first.provider?.label || first.id,
    providerId: first.id,
    model: first.model,
    label: options.loadingLabel || options.aiLabel || '',
    maxOutputTokens: governance.maxOutputTokens,
    profile: governance.profileKey,
    routingMode: options.routingMode || prefs.mode,
  };
  let finalProvider = operationDetail.provider;
  let finalProviderId = first.id;
  let finalModel = first.model;
  let result = '';
  let finalError = null;
  const attempts = [];
  emitAiOperation('bes-ai-operation-start', operationDetail);

  try {
    for (let index = 0; index < queue.length; index += 1) {
      const candidate = queue[index];
      const info = candidate.provider || resolveProviderInfo(candidate.id);
      const attemptStartedAt = Date.now();
      finalProvider = info.label || candidate.id;
      finalProviderId = candidate.id;
      finalModel = candidate.model || info.defaultModel;
      emitAiOperation('bes-ai-operation-update', {
        ...operationDetail,
        provider: finalProvider,
        providerId: finalProviderId,
        model: finalModel,
        attempt: index + 1,
        totalCandidates: queue.length,
      });
      try {
        result = await callSingleProvider({
          ...options,
          provider: candidate.id,
          apiKey: candidate.apiKey,
          model: finalModel,
          baseUrl: candidate.baseUrl || info.baseUrl,
          maxOutputTokens: governance.maxOutputTokens,
          onAdaptiveRetry: options.onAdaptiveRetry,
        });
        const attempt = { provider: candidate.id, providerName: finalProvider, model: finalModel, success: true, durationMs: Date.now() - attemptStartedAt };
        attempts.push(attempt);
        noteProviderHealth(candidate.id, { success: true });
        finalError = null;
        publishLastRoute({
          operationId,
          provider: candidate.id,
          providerName: finalProvider,
          model: finalModel,
          routingMode: options.routingMode || prefs.mode,
          fallbackUsed: index > 0,
          attempts,
          durationMs: Date.now() - startedAt,
          completedAt: new Date().toISOString(),
        });
        return result;
      } catch (error) {
        const classification = classifyAiError(error);
        attempts.push({ provider: candidate.id, providerName: finalProvider, model: finalModel, success: false, classification, error: String(error?.message || error).slice(0, 280), durationMs: Date.now() - attemptStartedAt });
        noteProviderHealth(candidate.id, { success: false, error: error?.message || error });
        finalError = error;
        if (!fallbackAllowed || index === queue.length - 1 || !shouldFallbackAiError(error)) throw error;
      }
    }
    throw finalError || providerError('All AI providers failed.', { code: 'AI_ALL_PROVIDERS_FAILED' });
  } catch (error) {
    finalError = error;
    if (attempts.length > 1) {
      const wrapped = providerError(`Tất cả provider đã thử đều thất bại. ${attempts.map((item) => `${item.providerName}: ${item.error || 'lỗi'}`).join(' | ')}`, {
        provider: finalProviderId,
        code: error?.code || 'AI_ALL_PROVIDERS_FAILED',
        status: error?.status || 0,
      });
      wrapped.attempts = attempts;
      throw wrapped;
    }
    throw error;
  } finally {
    recordAiRequest({
      provider: finalProvider,
      model: finalModel,
      prompt: options.prompt || '',
      result,
      durationMs: Date.now() - startedAt,
      success: !finalError && Boolean(String(result || '').trim()),
      error: finalError?.message || '',
      profile: governance.profileKey,
      operationId,
    });
    emitAiOperation('bes-ai-operation-end', { ...operationDetail, provider: finalProvider, providerId: finalProviderId, model: finalModel, attempts });
  }
}

export async function callGemini(options = {}) {
  return callAI(options);
}

export function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
  return JSON.parse(jsonText);
}

export async function generateActivityWithGemini({ apiKey, model, templateId, topic, sourceText, level, itemCount, language }) {
  const outputFormat = ACTIVITY_OUTPUT_FORMATS[templateId] || ACTIVITY_OUTPUT_FORMATS.quiz;
  const systemInstruction = `You are an expert English teacher and test writer. Create accurate, classroom-ready English learning activities. Never include markdown fences unless specifically requested. Avoid duplicate items. Use natural, correct English.`;
  const prompt = `Create content for Brian English Studio Activity Tiles.\n\nTemplate: ${templateId}\nLevel: ${level}\nNumber of items: ${itemCount}\nOutput language for explanations/prompts: ${language === 'vi' ? 'Vietnamese support is allowed, but English learning content should stay in English unless the task requires Vietnamese.' : 'English'}\nTopic or instruction: ${topic || 'General English'}\nSource text / vocabulary / notes:\n${sourceText || '(none)'}\n\n${outputFormat}\n\nReturn strict JSON only with this schema:\n{\n  "title": "short activity title",\n  "content": "the generated activity lines in the exact format required"\n}\n\nImportant: The content field must contain only the activity lines, separated by \\n. No numbering unless it is part of the question.`;

  const text = await callGemini({ apiKey, model, prompt, systemInstruction, temperature: 0.65, responseMimeType: 'application/json' });
  const json = extractJson(text);
  if (!json.content) throw new Error('AI response did not include content.');
  return {
    title: String(json.title || topic || 'AI Activity').trim(),
    content: String(json.content || '').trim(),
  };
}

export const AI_TOOL_PRESETS = {
  text2quiz: {
    title: 'QuizForge AI',
    description: 'Generate quick multiple-choice questions with answer keys and short explanations.',
    taskVi: 'Tạo câu hỏi trắc nghiệm tiếng Anh có đáp án và giải thích ngắn.',
    outputHint: 'Multiple-choice quiz with answer key',
    defaultInstruction: 'Past Simple vs Past Continuous, level B2, 10 questions',
  },
  'exam-studio': {
    title: 'Exam Studio',
    description: 'Build complete tests, THPT-style items, test matrices and Google Forms-ready content.',
    taskVi: 'Tạo đề kiểm tra, câu hỏi kiểu THPT, ma trận đề và định dạng Google Forms khi cần.',
    outputHint: 'Complete exam / THPT item set / test matrix / Google Forms format',
    defaultInstruction: 'Create a 45-minute grade 12 English test, B2 level, with 40 questions, answer key, matrix and Google Forms-ready format',
  },
  'wordform-generator': {
    title: 'WordForm Forge',
    description: 'Create B2-C1 word form questions from target word families.',
    taskVi: 'Tạo bài word form B2-C1 từ danh sách word family.',
    outputHint: 'Word form questions',
    defaultInstruction: 'Create 20 B2-C1 word form multiple-choice questions about education and technology. Use exact MCQ format with A-D options, Answer and Explanation for Google Forms export.',
  },
  'cloze-test-builder': {
    title: 'GapCraft Builder',
    description: 'Generate cloze passages with options and answer keys.',
    taskVi: 'Tạo bài cloze test có đoạn văn, phương án A-D và đáp án.',
    outputHint: 'Cloze test',
    defaultInstruction: 'Create a B2 cloze test about a trip to England, 10 blanks',
  },
  word2graph: {
    title: 'WordGraph Studio',
    description: 'Create word-family graphs, collocation maps, meanings, examples and teaching notes.',
    taskVi: 'Tạo sơ đồ word family, collocation, nghĩa, ví dụ và gợi ý dạy từ vựng.',
    outputHint: 'Word family graph outline',
    defaultInstruction: 'Create a word family graph for resilience, meticulous, plausible, undermine and invaluable',
  },
  'reading-studio': {
    title: 'Reading Studio',
    description: 'Create reading passages, comprehension questions, summaries and vocabulary support.',
    taskVi: 'Tạo bài đọc, câu hỏi đọc hiểu, tóm tắt, giải thích từ vựng và hoạt động khai thác văn bản.',
    outputHint: 'Reading package',
    defaultInstruction: 'Create a 350-word B2 reading passage about AI in education with 8 MCQs, vocabulary notes and a short summary task',
  },
  'speaking-studio': {
    title: 'Speaking Studio',
    description: 'Generate speaking prompt cards, pair-work tasks, debates, role plays and presentation tasks.',
    taskVi: 'Tạo thẻ speaking, hoạt động cặp/nhóm, debate, role play và nhiệm vụ thuyết trình.',
    outputHint: 'Speaking activity set',
    defaultInstruction: 'Create 20 speaking cards for B2 students about school, technology and future careers, with follow-up questions',
  },
  textcare: {
    title: 'TextCare Fixer',
    description: 'Upload, paste, detect, create and normalize Vietnamese administrative documents.',
    taskVi: 'Nhận diện, tạo mới hoặc chuẩn hoá văn bản hành chính theo Nghị định 30/2020/NĐ-CP.',
    outputHint: 'Administrative document preview',
    defaultInstruction: 'Chuẩn hoá văn bản hành chính theo Nghị định số 30/2020/NĐ-CP; giữ thông tin thật, không bịa dữ liệu còn thiếu.',
  },
  'lesson-plan-ai': {
    title: 'Lesson Architect',
    description: 'Draft lesson plans with stages, activities, materials and assessment ideas.',
    taskVi: 'Soạn giáo án tiếng Anh có tiến trình, hoạt động, học liệu và đánh giá.',
    outputHint: 'Lesson plan',
    defaultInstruction: 'Create a 45-minute TBLT lesson plan for Past Simple vs Past Continuous, level B2',
  },
};

export async function generateGenericToolOutput({ apiKey, model, slug, instruction, sourceText, level, itemCount, language }) {
  const preset = AI_TOOL_PRESETS[slug] || AI_TOOL_PRESETS.text2quiz;
  const quantityLine = Number(itemCount) > 0 ? `Quantity: ${itemCount}\n` : '';
  const assessmentSlugs = new Set(['text2quiz', 'exam-studio', 'wordform-generator', 'cloze-test-builder', 'reading-studio']);
  const googleFormRules = assessmentSlugs.has(slug) ? `

GOOGLE FORM COMPATIBILITY RULES:
If you generate multiple-choice questions, include a final section exactly titled "GOOGLE FORM QUESTIONS".
Inside that section, every MCQ must follow this exact pattern with no tables and no extra numbering format:

1. Question text here
A. option A
B. option B
C. option C
D. option D
Answer: B
Explanation: one short explanation

Rules:
- Use exactly four options A-D.
- Put only one correct answer after "Answer:".
- Do not put the answer in a separate answer-key table only.
- Do not use markdown tables for the Google Form section.
- If the output also needs a test matrix or lesson notes, put them before the GOOGLE FORM QUESTIONS section.
- Make sure the number of MCQs in GOOGLE FORM QUESTIONS matches the requested quantity unless the teacher specifically asks for fewer.` : '';
  const systemInstruction = `You are Brian English Studio, an expert assistant for Vietnamese high-school English teachers. Produce classroom-ready materials. Be precise, well-formatted, and avoid repeated questions. Include answer keys when the task is assessment-related. For MCQs, always use a Google-Forms-friendly A-D format.`;
  const prompt = `Tool: ${preset.title}
Teacher task: ${preset.taskVi}
Level: ${level}
${quantityLine}Main instruction:
${instruction}

Source text / vocabulary / notes / student writing:
${sourceText || '(none)'}

Output language: ${language === 'vi' ? 'Vietnamese interface notes are allowed. Main English teaching content should be in English unless Vietnamese explanations are useful.' : 'English'}${googleFormRules}

Return a polished result using clear headings, numbering, answer keys, and short teacher notes. Do not apologize. Do not mention that you are an AI.`;

  return callGemini({ apiKey, model, prompt, systemInstruction, temperature: 0.68 });
}
