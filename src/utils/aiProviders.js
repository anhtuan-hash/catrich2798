export const AI_PROVIDER_KEY = 'bes-ai-provider';
export const AI_CONFIGS_KEY = 'bes-ai-configs';
export const AI_FALLBACK_KEY = 'bes-ai-fallback-enabled';
export const AI_USER_SCOPE_KEY = 'bes-ai-user-scope';

export const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-flash-latest',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    kind: 'gemini',
    models: [
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'OpenAI',
    defaultModel: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
    kind: 'openai',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    kind: 'openai',
    models: [
      'openai/gpt-4o-mini',
      'openai/gpt-4.1-mini',
      'anthropic/claude-3.5-haiku',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    kind: 'openai',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    label: 'Mistral AI',
    defaultModel: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    kind: 'openai',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'open-mixtral-8x7b'],
  },
  {
    id: 'claude',
    name: 'Claude',
    label: 'Anthropic Claude',
    defaultModel: 'claude-3-5-haiku-latest',
    baseUrl: 'https://api.anthropic.com/v1',
    kind: 'claude',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest'],
  },
  {
    id: 'custom',
    name: 'Custom',
    label: 'Custom OpenAI-compatible',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://your-endpoint.example/v1',
    kind: 'openai',
    models: ['gpt-4o-mini', 'local-model', 'custom-model'],
  },
];

export const DEFAULT_PROVIDER = 'gemini';

export function getProviderInfo(providerId) {
  return PROVIDERS.find((item) => item.id === providerId) || PROVIDERS[0];
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
  return localStorage.getItem(scopedKey(AI_PROVIDER_KEY)) || localStorage.getItem(AI_PROVIDER_KEY) || DEFAULT_PROVIDER;
}

export function setAiProvider(providerId) {
  localStorage.setItem(scopedKey(AI_PROVIDER_KEY), providerId || DEFAULT_PROVIDER);
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
}

export function getFallbackEnabled() {
  const value = localStorage.getItem(scopedKey(AI_FALLBACK_KEY));
  if (value !== null) return value !== 'false';
  const legacy = localStorage.getItem(AI_FALLBACK_KEY);
  return legacy !== 'false';
}

export function setFallbackEnabled(value) {
  localStorage.setItem(scopedKey(AI_FALLBACK_KEY), value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
}

export function getAiConfigs() {
  const base = defaultConfigs();
  const stored = readJson(AI_CONFIGS_KEY, {}, true);
  return Object.fromEntries(PROVIDERS.map((provider) => {
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
}

export function saveAiConfigs(configs) {
  const normalized = getAiConfigs();
  for (const provider of PROVIDERS) {
    normalized[provider.id] = {
      ...normalized[provider.id],
      ...(configs?.[provider.id] || {}),
    };
  }
  localStorage.setItem(scopedKey(AI_CONFIGS_KEY), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return normalized;
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
    hasKey: Boolean(String(active.apiKey || '').trim()),
    fallbackEnabled: getFallbackEnabled(),
  };
}
