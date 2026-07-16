export const AI_PROVIDER_CATEGORIES = {
  gateway: { id: 'gateway', label: 'OpenRouter AI Gateway' },
};

export const PROVIDER_CATALOG = Object.freeze([
  {
    id: 'openrouter',
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    icon: '↗',
    kind: 'openrouter',
    category: 'gateway',
    plan: 'free-limited',
    recommended: true,
    freeTier: true,
    requiresApiKey: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    defaultVisionModel: 'openrouter/auto',
    defaultImageModel: 'bytedance-seed/seedream-4.5',
    models: [
      'openrouter/free',
      'openrouter/auto',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-8b:free',
      'google/gemma-3-27b-it:free',
    ],
    capabilities: ['text', 'vision', 'image-generation', 'json', 'routing', 'long-context'],
    speed: 4,
    quality: 5,
    context: 5,
    descriptionVi: 'Một OpenRouter API key vận hành toàn bộ AI văn bản, Vision và hình ảnh trong Brian.',
    descriptionEn: 'One OpenRouter API key powers all text, vision, and image AI across Brian.',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    keyUrl: 'https://openrouter.ai/settings/keys',
    docsUrl: 'https://openrouter.ai/docs/quickstart',
    helpUrl: 'https://openrouter.ai/docs/quickstart',
    actionLabel: 'Lấy OpenRouter API key',
    note: 'Một API key dùng xuyên suốt mọi chức năng AI trong Brian English Studio.',
  },
]);

const OPENROUTER = PROVIDER_CATALOG[0];

export function getProviderCatalogEntry() {
  return OPENROUTER;
}

export function getProviderCatalogMap() {
  return { openrouter: OPENROUTER };
}

export function mergeProviderInfo(_id, legacy = {}) {
  return {
    ...OPENROUTER,
    ...legacy,
    id: 'openrouter',
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    kind: 'openrouter',
    baseUrl: legacy?.baseUrl || OPENROUTER.baseUrl,
    defaultModel: legacy?.defaultModel || OPENROUTER.defaultModel,
    defaultVisionModel: legacy?.defaultVisionModel || OPENROUTER.defaultVisionModel,
    defaultImageModel: legacy?.defaultImageModel || OPENROUTER.defaultImageModel,
  };
}
