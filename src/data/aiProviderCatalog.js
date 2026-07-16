export const AI_PROVIDER_CATEGORIES = {
  gateway: { id: 'gateway', label: 'OpenRouter Production Gateway' },
};

export const PROVIDER_CATALOG = Object.freeze([
  {
    id: 'openrouter',
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    icon: '↗',
    kind: 'openrouter',
    category: 'gateway',
    plan: 'server-managed',
    recommended: true,
    freeTier: false,
    requiresApiKey: false,
    serverManaged: true,
    baseUrl: '/api/ai',
    defaultModel: 'openrouter/free',
    defaultVisionModel: 'openrouter/free',
    defaultImageModel: 'bytedance-seed/seedream-4.5',
    models: ['openrouter/free'],
    capabilities: ['text', 'vision', 'image-generation', 'json', 'routing', 'long-context', 'streaming'],
    speed: 5,
    quality: 5,
    context: 5,
    descriptionVi: 'OpenRouter được vận hành qua gateway máy chủ. API key nằm trong Vercel và không được lưu trên trình duyệt.',
    descriptionEn: 'OpenRouter runs through a server gateway. The API key lives in Vercel and is never stored in the browser.',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    keyUrl: 'https://openrouter.ai/settings/keys',
    docsUrl: 'https://openrouter.ai/docs/quickstart',
    helpUrl: 'https://openrouter.ai/docs/quickstart',
    actionLabel: 'Mở tài liệu OpenRouter',
    note: 'Một OPENROUTER_API_KEY trên Vercel dùng xuyên suốt toàn bộ Brian English Studio.',
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
    serverManaged: true,
    requiresApiKey: false,
    baseUrl: '/api/ai',
    defaultModel: legacy?.defaultModel || OPENROUTER.defaultModel,
    defaultVisionModel: legacy?.defaultVisionModel || OPENROUTER.defaultVisionModel,
    defaultImageModel: legacy?.defaultImageModel || OPENROUTER.defaultImageModel,
  };
}
