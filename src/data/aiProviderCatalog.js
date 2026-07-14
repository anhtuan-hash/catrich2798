export const AI_PROVIDER_CATEGORIES = {
  free: { id: 'free', label: 'Miễn phí / có hạn mức' },
  trial: { id: 'trial', label: 'Trial / credit thử nghiệm' },
  paid: { id: 'paid', label: 'Trả phí' },
  local: { id: 'local', label: 'Local · không tính token' },
};

export const PROVIDER_CATALOG = [
  {
    id: 'gemini', label: 'Google Gemini', shortLabel: 'Gemini', icon: 'G', kind: 'gemini', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-flash-latest', models: ['gemini-flash-latest', 'gemini-pro-latest'],
    capabilities: ['text', 'vision', 'long-context', 'json'], speed: 4, quality: 4, context: 5,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey', docsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
    actionLabel: 'Lấy API key', note: 'Free tier có hạn mức; phù hợp ảnh, PDF và tài liệu dài.',
  },
  {
    id: 'openai', label: 'OpenAI', shortLabel: 'OpenAI', icon: '◎', kind: 'openai', category: 'paid',
    freeTier: false, requiresApiKey: true, baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini'],
    capabilities: ['text', 'vision', 'json', 'tools'], speed: 4, quality: 5, context: 4,
    apiKeyUrl: 'https://platform.openai.com/api-keys', docsUrl: 'https://platform.openai.com/docs/overview',
    actionLabel: 'Lấy API key', note: 'API tính phí riêng với ChatGPT.',
  },
  {
    id: 'openrouter', label: 'OpenRouter', shortLabel: 'OpenRouter', icon: '↗', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free', models: ['openrouter/free'],
    capabilities: ['text', 'vision', 'json', 'routing'], speed: 3, quality: 4, context: 4,
    apiKeyUrl: 'https://openrouter.ai/settings/keys', docsUrl: 'https://openrouter.ai/docs/api/reference/authentication',
    actionLabel: 'Lấy API key', note: 'Có router model miễn phí; model có thể thay đổi theo thời điểm.',
  },
  {
    id: 'groq', label: 'GroqCloud', shortLabel: 'Groq', icon: 'Q', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile', models: ['llama-3.3-70b-versatile'],
    capabilities: ['text', 'json', 'fast'], speed: 5, quality: 4, context: 3,
    apiKeyUrl: 'https://console.groq.com/keys', docsUrl: 'https://console.groq.com/docs/api-reference',
    actionLabel: 'Lấy API key', note: 'Rất nhanh cho chat, worksheet và tạo câu hỏi.',
  },
  {
    id: 'mistral', label: 'Mistral AI', shortLabel: 'Mistral', icon: 'M', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest', models: ['mistral-small-latest', 'mistral-medium-latest'],
    capabilities: ['text', 'json', 'long-context'], speed: 4, quality: 4, context: 4,
    apiKeyUrl: 'https://console.mistral.ai/api-keys/', docsUrl: 'https://docs.mistral.ai/getting-started/quickstart/',
    actionLabel: 'Lấy API key', note: 'Free mode phù hợp thử nghiệm và tác vụ văn bản.',
  },
  {
    id: 'claude', label: 'Anthropic Claude', shortLabel: 'Claude', icon: 'AI', kind: 'claude', category: 'paid',
    freeTier: false, requiresApiKey: true, baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-latest', models: ['claude-3-5-haiku-latest'],
    capabilities: ['text', 'vision', 'long-context'], speed: 3, quality: 5, context: 5,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys', docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
    actionLabel: 'Lấy API key', note: 'Mạnh với phân tích và viết dài; thường yêu cầu billing.',
  },
  {
    id: 'cerebras', label: 'Cerebras Inference', shortLabel: 'Cerebras', icon: 'C', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'gpt-oss-120b', models: ['gpt-oss-120b'],
    capabilities: ['text', 'json', 'fast'], speed: 5, quality: 4, context: 3,
    apiKeyUrl: 'https://cloud.cerebras.ai/platform/', docsUrl: 'https://inference-docs.cerebras.ai/api-reference/authentication',
    actionLabel: 'Lấy API key', note: 'Public inference miễn phí có rate limit; rất nhanh cho văn bản.',
  },
  {
    id: 'github-models', label: 'GitHub Models', shortLabel: 'GitHub Models', icon: '⌘', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://models.github.ai/inference',
    defaultModel: 'openai/gpt-4.1-mini', models: ['openai/gpt-4.1-mini'],
    capabilities: ['text', 'vision', 'json'], speed: 3, quality: 4, context: 4,
    apiKeyUrl: 'https://github.com/settings/personal-access-tokens/new', docsUrl: 'https://docs.github.com/en/github-models/quickstart',
    actionLabel: 'Tạo GitHub token', note: 'PAT cần quyền models:read; free API có rate limit.',
  },
  {
    id: 'cohere', label: 'Cohere', shortLabel: 'Cohere', icon: 'Co', kind: 'openai', category: 'trial',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.cohere.ai/compatibility/v1',
    defaultModel: 'command-a-03-2025', models: ['command-a-03-2025'],
    capabilities: ['text', 'json', 'search', 'rerank'], speed: 3, quality: 4, context: 4,
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys', docsUrl: 'https://docs.cohere.com/docs/compatibility-api',
    actionLabel: 'Lấy trial key', note: 'Phù hợp chat, semantic search, embedding và rerank.',
  },
  {
    id: 'cloudflare', label: 'Cloudflare Workers AI', shortLabel: 'Cloudflare AI', icon: '☁', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct', models: ['@cf/meta/llama-3.1-8b-instruct'],
    capabilities: ['text', 'json', 'serverless'], speed: 4, quality: 3, context: 3, requiresCustomBaseUrl: true,
    apiKeyUrl: 'https://dash.cloudflare.com/profile/api-tokens', docsUrl: 'https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/',
    actionLabel: 'Tạo API token', note: 'Thay YOUR_ACCOUNT_ID trong Base URL trước khi kiểm tra.',
  },
  {
    id: 'huggingface', label: 'Hugging Face', shortLabel: 'Hugging Face', icon: 'HF', kind: 'openai', category: 'trial',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'openai/gpt-oss-120b:fastest', models: ['openai/gpt-oss-120b:fastest'],
    capabilities: ['text', 'vision', 'routing'], speed: 3, quality: 3, context: 3,
    apiKeyUrl: 'https://huggingface.co/settings/tokens', docsUrl: 'https://huggingface.co/docs/inference-providers/index',
    actionLabel: 'Tạo access token', note: 'Credit miễn phí nhỏ; phù hợp thử model và fallback.',
  },
  {
    id: 'nvidia', label: 'NVIDIA NIM', shortLabel: 'NVIDIA NIM', icon: 'N', kind: 'openai', category: 'trial',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.1-8b-instruct', models: ['meta/llama-3.1-8b-instruct'],
    capabilities: ['text', 'vision', 'json'], speed: 4, quality: 4, context: 3,
    apiKeyUrl: 'https://build.nvidia.com/settings/api-keys', docsUrl: 'https://build.nvidia.com/explore/discover',
    actionLabel: 'Lấy API key', note: 'Serverless API dành cho phát triển; credit phụ thuộc tài khoản.',
  },
  {
    id: 'vercel', label: 'Vercel AI Gateway', shortLabel: 'Vercel Gateway', icon: '▲', kind: 'openai', category: 'trial',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://ai-gateway.vercel.sh/v1',
    defaultModel: 'openai/gpt-4o-mini', models: ['openai/gpt-4o-mini'],
    capabilities: ['text', 'vision', 'routing', 'observability'], speed: 4, quality: 4, context: 4,
    apiKeyUrl: 'https://vercel.com/ai-gateway', docsUrl: 'https://vercel.com/docs/ai-gateway',
    actionLabel: 'Mở AI Gateway', note: 'Thuận tiện vì Brian đang deploy trên Vercel.',
  },
  {
    id: 'sambanova', label: 'SambaNova Cloud', shortLabel: 'SambaNova', icon: 'S', kind: 'openai', category: 'free',
    freeTier: true, requiresApiKey: true, baseUrl: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct', models: ['Meta-Llama-3.3-70B-Instruct'],
    capabilities: ['text', 'json', 'fast'], speed: 4, quality: 4, context: 3,
    apiKeyUrl: 'https://cloud.sambanova.ai/apis', docsUrl: 'https://docs.sambanova.ai/cloud/docs/get-started/overview',
    actionLabel: 'Mở Cloud Console', note: 'Free tier thường có hạn mức ngày; dùng làm fallback.',
  },
  {
    id: 'ollama', label: 'Ollama', shortLabel: 'Ollama', icon: 'O', kind: 'openai', category: 'local',
    freeTier: true, requiresApiKey: false, baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2', models: ['llama3.2'],
    capabilities: ['text', 'private', 'local'], speed: 2, quality: 3, context: 3, local: true,
    apiKeyUrl: 'https://ollama.com/download', docsUrl: 'https://docs.ollama.com/api/openai-compatibility',
    actionLabel: 'Cài Ollama', note: 'Không tính phí token; máy chạy Ollama phải đang bật.',
  },
  {
    id: 'lmstudio', label: 'LM Studio', shortLabel: 'LM Studio', icon: 'LM', kind: 'openai', category: 'local',
    freeTier: true, requiresApiKey: false, baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model', models: ['local-model'],
    capabilities: ['text', 'private', 'local'], speed: 2, quality: 3, context: 3, local: true,
    apiKeyUrl: 'https://lmstudio.ai/download', docsUrl: 'https://lmstudio.ai/docs/developer/openai-compat',
    actionLabel: 'Tải LM Studio', note: 'Mở Local Server trong LM Studio trước khi dùng.',
  },
  {
    id: 'localai', label: 'LocalAI', shortLabel: 'LocalAI', icon: 'LA', kind: 'openai', category: 'local',
    freeTier: true, requiresApiKey: false, baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'local-model', models: ['local-model'],
    capabilities: ['text', 'vision', 'private', 'local'], speed: 2, quality: 3, context: 3, local: true,
    apiKeyUrl: 'https://localai.io/basics/getting_started/', docsUrl: 'https://localai.io/features/openai-functions/',
    actionLabel: 'Xem hướng dẫn cài', note: 'Tự host, riêng tư và không tính phí token.',
  },
  {
    id: 'custom', label: 'Custom OpenAI-compatible', shortLabel: 'Custom', icon: '⚙', kind: 'openai', category: 'local',
    freeTier: false, requiresApiKey: false, baseUrl: '', defaultModel: '', models: [],
    capabilities: ['text'], speed: 2, quality: 3, context: 3, requiresCustomBaseUrl: true,
    apiKeyUrl: '', docsUrl: '', actionLabel: 'Cấu hình endpoint', note: 'Dùng endpoint tương thích OpenAI của riêng bạn.',
  },
];

const CATALOG_MAP = new Map(PROVIDER_CATALOG.map((provider) => [provider.id, provider]));

export function getProviderCatalogEntry(id) {
  return CATALOG_MAP.get(String(id || '').trim()) || CATALOG_MAP.get('custom');
}

export function getProviderCatalogMap() {
  return Object.fromEntries(PROVIDER_CATALOG.map((provider) => [provider.id, provider]));
}

export function mergeProviderInfo(id, legacy = {}) {
  const catalog = getProviderCatalogEntry(id);
  return {
    ...catalog,
    ...legacy,
    id: String(id || legacy?.id || catalog?.id || 'custom'),
    label: legacy?.label || catalog?.label || String(id || 'Custom'),
    kind: legacy?.kind || catalog?.kind || 'openai',
    baseUrl: legacy?.baseUrl || catalog?.baseUrl || '',
    defaultModel: legacy?.defaultModel || catalog?.defaultModel || '',
  };
}
