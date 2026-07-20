export const AI_PROVIDER_CATEGORIES = Object.freeze({
  server: { label: 'Máy chủ', description: 'Cấu hình tập trung trên Vercel.' },
});

export const PROVIDER_CATALOG = Object.freeze([
  Object.freeze({
    id: 'openrouter',
    label: 'OpenRouter · Server Gateway',
    shortLabel: 'OpenRouter',
    icon: '↗',
    kind: 'server',
    category: 'server',
    freeTier: false,
    requiresApiKey: false,
    baseUrl: '/api/ai',
    defaultModel: 'Admin quản lý trên máy chủ',
    models: [],
    apiKeyUrl: '',
    docsUrl: 'https://openrouter.ai/docs/quickstart',
    actionLabel: 'Xem tài liệu',
    note: 'API key nằm trong Vercel Environment Variables. Giáo viên không cần nhập key.',
    serverManaged: true,
  }),
]);

const CATALOG_MAP = new Map(PROVIDER_CATALOG.map((provider) => [provider.id, provider]));

export function getProviderCatalogEntry() {
  return CATALOG_MAP.get('openrouter');
}

export function getProviderCatalogMap() {
  return Object.fromEntries(PROVIDER_CATALOG.map((provider) => [provider.id, provider]));
}
