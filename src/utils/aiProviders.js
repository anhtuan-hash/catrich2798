import { PROVIDER_CATALOG, getProviderCatalogEntry, mergeProviderInfo } from '../data/aiProviderCatalog.js';
import {
  getEffectiveActiveProvider,
  getRoutingPreferences,
  mergeAiConfigs,
  saveProviderOverride,
  saveRoutingPreferences,
  setActiveProviderOverride,
} from './aiProviderOverrides.js';
export const AI_PROVIDER_KEY = 'bes-ai-provider';
export const AI_CONFIGS_KEY = 'bes-ai-configs';
export const AI_FALLBACK_KEY = 'bes-ai-fallback-enabled';
export const AI_USER_SCOPE_KEY = 'bes-ai-user-scope';

export const PROVIDERS = [
  {
    id: 'gemini', name: 'Gemini', label: 'Google Gemini', shortLabel: 'Gemini',
    defaultModel: 'gemini-flash-latest', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', kind: 'gemini',
    plan: 'free-limited', recommended: false,
    descriptionVi: 'Google AI Studio; hiện có thể yêu cầu billing hoặc bị giới hạn theo khu vực.',
    descriptionEn: 'Google AI Studio; availability and billing requirements may vary by region.',
    helpUrl: 'https://ai.google.dev/gemini-api/docs/api-key', keyUrl: 'https://aistudio.google.com/app/apikey',
    models: ['gemini-flash-latest','gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro','gemini-2.0-flash'],
  },
  {
    id: 'openai', name: 'OpenAI', label: 'OpenAI', shortLabel: 'OpenAI',
    defaultModel: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1', kind: 'openai',
    plan: 'paid', recommended: false,
    descriptionVi: 'Provider trả phí; giữ lại để tương thích với cấu hình cũ.',
    descriptionEn: 'Paid provider retained for backward compatibility.',
    helpUrl: 'https://platform.openai.com/docs/quickstart', keyUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4.1-mini','gpt-4.1','gpt-4o-mini','gpt-4o'],
  },
  {
    id: 'groq', name: 'Groq', label: 'GroqCloud', shortLabel: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1', kind: 'openai',
    plan: 'free', recommended: true,
    descriptionVi: 'Free tier tốc độ cao; phù hợp tạo worksheet, đề thi và chat.',
    descriptionEn: 'Fast free tier suited to worksheets, exams, and chat.',
    helpUrl: 'https://console.groq.com/docs/quickstart', keyUrl: 'https://console.groq.com/keys',
    models: ['llama-3.3-70b-versatile','llama-3.1-8b-instant','openai/gpt-oss-120b','openai/gpt-oss-20b'],
  },
  {
    id: 'cerebras', name: 'Cerebras', label: 'Cerebras Inference', shortLabel: 'Cerebras',
    defaultModel: 'gpt-oss-120b', baseUrl: 'https://api.cerebras.ai/v1', kind: 'openai',
    plan: 'free', recommended: true,
    descriptionVi: 'Inference rất nhanh, có API key miễn phí và endpoint tương thích OpenAI.',
    descriptionEn: 'Very fast inference with free API keys and OpenAI-compatible endpoints.',
    helpUrl: 'https://inference-docs.cerebras.ai/quickstart', keyUrl: 'https://cloud.cerebras.ai/',
    models: ['gpt-oss-120b','zai-glm-4.7'],
  },
  {
    id: 'mistral', name: 'Mistral', label: 'Mistral AI', shortLabel: 'Mistral',
    defaultModel: 'mistral-small-latest', baseUrl: 'https://api.mistral.ai/v1', kind: 'openai',
    plan: 'free-limited', recommended: true,
    descriptionVi: 'Free mode giới hạn; phù hợp nội dung song ngữ và biên tập tài liệu.',
    descriptionEn: 'Limited free mode, useful for bilingual content and editing.',
    helpUrl: 'https://docs.mistral.ai/admin/identity-access/api-keys', keyUrl: 'https://console.mistral.ai/',
    models: ['mistral-small-latest','mistral-medium-latest','mistral-large-latest','ministral-8b-latest'],
  },
  {
    id: 'sambanova', name: 'SambaNova', label: 'SambaNova Cloud', shortLabel: 'SambaNova',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct', baseUrl: 'https://api.sambanova.ai/v1', kind: 'openai',
    plan: 'free-credit', recommended: true,
    descriptionVi: 'Có credit khởi đầu miễn phí; dùng chuẩn OpenAI-compatible.',
    descriptionEn: 'Includes starter free credits and an OpenAI-compatible API.',
    helpUrl: 'https://docs.sambanova.ai/docs/en/get-started/quickstart', keyUrl: 'https://cloud.sambanova.ai/apis',
    models: ['Meta-Llama-3.3-70B-Instruct','DeepSeek-V3.1','gpt-oss-120b','MiniMax-M2.7'],
  },
  {
    id: 'cohere', name: 'Cohere', label: 'Cohere', shortLabel: 'Cohere',
    defaultModel: 'command-a-03-2025', baseUrl: 'https://api.cohere.com/v2', kind: 'cohere',
    plan: 'trial', recommended: true,
    descriptionVi: 'Trial key miễn phí; mạnh về đánh giá, phân loại, rubric và phản hồi.',
    descriptionEn: 'Free trial key; strong for evaluation, classification, rubrics, and feedback.',
    helpUrl: 'https://docs.cohere.com/docs/rate-limits', keyUrl: 'https://dashboard.cohere.com/api-keys',
    models: ['command-a-03-2025','command-r-plus-08-2024','command-r-08-2024','command-a-reasoning-08-2025'],
  },
  {
    id: 'openrouter', name: 'OpenRouter', label: 'OpenRouter Free', shortLabel: 'OpenRouter',
    defaultModel: 'openrouter/free', baseUrl: 'https://openrouter.ai/api/v1', kind: 'openai',
    plan: 'free-limited', recommended: true,
    descriptionVi: 'Router miễn phí; nên dùng openrouter/free hoặc model có hậu tố :free.',
    descriptionEn: 'Free router; use openrouter/free or a model ending in :free.',
    helpUrl: 'https://openrouter.ai/docs/quickstart', keyUrl: 'https://openrouter.ai/settings/keys',
    models: ['openrouter/free','meta-llama/llama-3.3-70b-instruct:free','qwen/qwen3-8b:free','google/gemma-3-27b-it:free'],
  },
  {
    id: 'nvidia', name: 'NVIDIA', label: 'NVIDIA NIM', shortLabel: 'NVIDIA',
    defaultModel: 'meta/llama-3.3-70b-instruct', baseUrl: 'https://integrate.api.nvidia.com/v1', kind: 'openai',
    plan: 'dev-free', recommended: false,
    descriptionVi: 'Serverless API miễn phí cho phát triển; phù hợp làm fallback.',
    descriptionEn: 'Free serverless development APIs, useful as a fallback.',
    helpUrl: 'https://build.nvidia.com/docs', keyUrl: 'https://build.nvidia.com/settings/api-keys',
    models: ['meta/llama-3.3-70b-instruct','meta/llama-3.1-8b-instruct','nvidia/llama-3.3-nemotron-super-49b-v1.5'],
  },
  {
    id: 'cloudflare', name: 'Cloudflare', label: 'Cloudflare Workers AI', shortLabel: 'Cloudflare',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct-fp8-fast', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1', kind: 'openai',
    plan: 'free-daily', recommended: false, requiresBaseUrlEdit: true,
    descriptionVi: 'Có quota miễn phí mỗi ngày; thay YOUR_ACCOUNT_ID trong Base URL bằng Account ID.',
    descriptionEn: 'Daily free allocation; replace YOUR_ACCOUNT_ID in the Base URL with your Account ID.',
    helpUrl: 'https://developers.cloudflare.com/workers-ai/get-started/rest-api/', keyUrl: 'https://dash.cloudflare.com/?to=/:account/workers-ai',
    models: ['@cf/meta/llama-3.1-8b-instruct-fp8-fast','@cf/meta/llama-3.2-3b-instruct','@cf/openai/gpt-oss-120b'],
  },
  {
    id: 'claude', name: 'Claude', label: 'Anthropic Claude', shortLabel: 'Claude',
    defaultModel: 'claude-3-5-haiku-latest', baseUrl: 'https://api.anthropic.com/v1', kind: 'claude',
    plan: 'paid', recommended: false,
    descriptionVi: 'Provider trả phí; giữ lại để tương thích với cấu hình cũ.',
    descriptionEn: 'Paid provider retained for backward compatibility.',
    helpUrl: 'https://docs.anthropic.com/en/api/getting-started', keyUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-3-5-haiku-latest','claude-3-5-sonnet-latest','claude-3-opus-latest'],
  },
  {
    id: 'custom', name: 'Custom', label: 'Custom OpenAI-compatible', shortLabel: 'Custom',
    defaultModel: 'custom-model', baseUrl: 'https://your-endpoint.example/v1', kind: 'openai',
    plan: 'custom', recommended: false,
    descriptionVi: 'Dùng endpoint tương thích OpenAI do anh tự quản lý.',
    descriptionEn: 'Use an OpenAI-compatible endpoint you manage.',
    helpUrl: '', keyUrl: '',
    models: ['custom-model','local-model','gpt-4o-mini'],
  },
];

export const DEFAULT_PROVIDER = 'gemini';

export function getProviderInfo(providerId) {
  const legacy = PROVIDERS.find((item) => item.id === providerId) || {};
  return mergeProviderInfo(providerId || DEFAULT_PROVIDER, legacy);
}


export function defaultConfigs() {
  return Object.fromEntries(PROVIDERS.map((provider) => [
    provider.id,
    {
      apiKey: '',
      model: provider.defaultModel,
      baseUrl: provider.baseUrl,
      enabled: provider.id === DEFAULT_PROVIDER,
    },
  ]));
}

function normalizeScope(value = '') {
  return String(value || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';
}

function getStorageScope() {
  return normalizeScope(localStorage.getItem(AI_USER_SCOPE_KEY) || 'guest');
}

function scopedKey(key) {
  return `${key}:${getStorageScope()}`;
}

const OPENROUTER_FREE_MODEL_MIGRATION_KEY = 'bes-openrouter-free-model-migration:v126';
const LEGACY_OPENROUTER_PAID_MODELS = new Set(['openai/gpt-4o-mini', 'gpt-4o-mini']);

function migrateLegacyOpenRouterModel(stored = {}) {
  if (typeof localStorage === 'undefined') return stored;
  const marker = scopedKey(OPENROUTER_FREE_MODEL_MIGRATION_KEY);
  if (localStorage.getItem(marker) === 'done') return stored;
  const current = stored?.openrouter || {};
  const model = String(current.model || '').trim().toLowerCase();
  let next = stored;
  if (LEGACY_OPENROUTER_PAID_MODELS.has(model)) {
    next = {
      ...stored,
      openrouter: { ...current, model: 'openrouter/free' },
    };
    localStorage.setItem(scopedKey(AI_CONFIGS_KEY), JSON.stringify(next));
  }
  localStorage.setItem(marker, 'done');
  return next;
}

function readJson(key, fallback, allowLegacy = false) {
  try {
    const scopedRaw = localStorage.getItem(scopedKey(key));
    const raw = scopedRaw || (allowLegacy ? localStorage.getItem(key) : '');
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getAiSettingsScope() {
  return getStorageScope();
}

export function setAiStorageUser(user = null) {
  const scope = normalizeScope(user?.id || user?.email || 'guest');
  const oldScope = localStorage.getItem(AI_USER_SCOPE_KEY);
  localStorage.setItem(AI_USER_SCOPE_KEY, scope);
  if (oldScope !== scope) window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return scope;
}

export function getAiProvider() {
  const legacyProvider = localStorage.getItem(scopedKey(AI_PROVIDER_KEY)) || localStorage.getItem(AI_PROVIDER_KEY) || DEFAULT_PROVIDER;
  return getEffectiveActiveProvider(legacyProvider);
}

export function setAiProvider(providerId) {
  const id = providerId || DEFAULT_PROVIDER;
  localStorage.setItem(scopedKey(AI_PROVIDER_KEY), id);
  setActiveProviderOverride(id);
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
}

export function getFallbackEnabled() {
  const routing = getRoutingPreferences();
  if (typeof routing.fallbackEnabled === 'boolean') return routing.fallbackEnabled;
  const value = localStorage.getItem(scopedKey(AI_FALLBACK_KEY));
  if (value !== null) return value !== 'false';
  const legacy = localStorage.getItem(AI_FALLBACK_KEY);
  return legacy !== 'false';
}

export function setFallbackEnabled(value) {
  localStorage.setItem(scopedKey(AI_FALLBACK_KEY), value ? 'true' : 'false');
  saveRoutingPreferences({ fallbackEnabled: Boolean(value) });
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
}

export function getAiConfigs() {
  const base = defaultConfigs();
  const stored = migrateLegacyOpenRouterModel(readJson(AI_CONFIGS_KEY, {}, true));
  const legacyNormalized = Object.fromEntries(PROVIDERS.map((provider) => {
    const current = stored?.[provider.id] || {};
    return [
      provider.id,
      {
        ...base[provider.id],
        ...current,
        model: current.model || base[provider.id].model,
        baseUrl: current.baseUrl || base[provider.id].baseUrl,
      },
    ];
  }));
  return mergeAiConfigs(legacyNormalized);
}

export function saveAiConfigs(configs) {
  const current = getAiConfigs();
  const normalized = { ...current };
  for (const provider of PROVIDER_CATALOG) {
    const patch = configs?.[provider.id];
    if (!patch) continue;
    normalized[provider.id] = { ...normalized[provider.id], ...patch };
    saveProviderOverride(provider.id, normalized[provider.id], { activate: false });
  }
  const legacySubset = Object.fromEntries(PROVIDERS.map((provider) => [
    provider.id,
    normalized[provider.id] || current[provider.id] || {},
  ]));
  localStorage.setItem(scopedKey(AI_CONFIGS_KEY), JSON.stringify(legacySubset));
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return getAiConfigs();
}

export function getActiveAiConfig() {
  const provider = getAiProvider();
  const configs = getAiConfigs();
  const info = getProviderInfo(provider);
  return {
    provider,
    providerInfo: info,
    fallbackEnabled: getFallbackEnabled(),
    ...(configs[provider] || {}),
  };
}

export function getProviderSummary() {
  const provider = getAiProvider();
  const configs = getAiConfigs();
  const active = configs[provider] || {};
  return {
    provider,
    providerName: getProviderInfo(provider).label,
    model: active.model || getProviderInfo(provider).defaultModel,
    hasKey: getProviderInfo(provider).requiresApiKey === false || Boolean(String(active.apiKey || '').trim()),
    fallbackEnabled: getFallbackEnabled(),
  };
}
