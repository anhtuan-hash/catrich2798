import { PROVIDER_CATALOG, getProviderCatalogEntry, mergeProviderInfo } from '../data/aiProviderCatalog.js';
import {
  getEffectiveActiveProvider,
  getRoutingPreferences,
  mergeAiConfigs,
  saveRoutingPreferences,
} from './aiProviderOverrides.js';

export const AI_ROUTING_MODES = [
  { id: 'smart', label: 'Tự động thông minh', shortLabel: 'Tự động', description: 'Tự chọn provider và model phù hợp với yêu cầu.' },
  { id: 'free', label: 'Ưu tiên miễn phí', shortLabel: 'Miễn phí', description: 'Ưu tiên free tier, trial và local; bỏ qua provider trả phí.' },
  { id: 'fast', label: 'Ưu tiên tốc độ', shortLabel: 'Nhanh', description: 'Ưu tiên provider phản hồi nhanh.' },
  { id: 'quality', label: 'Ưu tiên chất lượng', shortLabel: 'Chất lượng', description: 'Ưu tiên model mạnh nhất đang được cấu hình.' },
  { id: 'long-context', label: 'Tài liệu dài', shortLabel: 'Tài liệu dài', description: 'Ưu tiên context lớn cho PDF và nội dung dài.' },
  { id: 'vision', label: 'Ảnh / PDF', shortLabel: 'Vision', description: 'Chỉ ưu tiên model hỗ trợ hình ảnh.' },
  { id: 'local', label: 'Local riêng tư', shortLabel: 'Local', description: 'Chỉ dùng Ollama, LM Studio hoặc LocalAI.' },
  { id: 'manual', label: 'Chọn thủ công', shortLabel: 'Thủ công', description: 'Cố định provider và model đã chọn.' },
];

export function getRoutingModeInfo(mode) {
  return AI_ROUTING_MODES.find((item) => item.id === mode) || AI_ROUTING_MODES[0];
}

export function analyzeAiRequest(options = {}) {
  const prompt = String(options.prompt || '');
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  const hasImage = attachments.some((item) => String(item?.mimeType || item?.type || '').startsWith('image/'));
  const hasFile = attachments.length > 0 || /pdf|docx|tài liệu|document|file/i.test(prompt);
  const estimatedInputTokens = Math.ceil(prompt.length / 3.7);
  const taskText = `${options.governanceProfile || ''} ${options.profile || ''} ${options.loadingLabel || ''} ${prompt.slice(0, 1400)}`.toLowerCase();
  let taskType = 'chat';
  if (/worksheet|bài tập|exercise|question|quiz|đề thi|exam/.test(taskText)) taskType = 'teaching-content';
  if (/analy|phân tích|summar|tóm tắt|document|tài liệu/.test(taskText)) taskType = 'document-analysis';
  if (/image|ảnh|screenshot|vision/.test(taskText) || hasImage) taskType = 'image-analysis';
  if (/json|structured|schema/.test(taskText) || options.responseMimeType === 'application/json') taskType = 'structured-output';
  const privacyLevel = options.privacyLevel || (/riêng tư|confidential|dữ liệu cá nhân|personal data|student data/.test(taskText) ? 'private' : 'normal');
  return {
    hasImage,
    hasFile,
    requiresVision: hasImage || options.routingMode === 'vision',
    requiresJson: options.responseMimeType === 'application/json' || taskType === 'structured-output',
    estimatedInputTokens,
    requiresLongContext: estimatedInputTokens > 12000 || prompt.length > 45000 || options.routingMode === 'long-context',
    privacyLevel,
    taskType,
  };
}

function isConfigured(provider, config = {}) {
  if (config.enabled === false) return false;
  if (provider.requiresApiKey === false) return Boolean(String(config.baseUrl || provider.baseUrl || '').trim());
  return Boolean(String(config.apiKey || '').trim());
}

function supportsProfile(provider, profile) {
  const caps = new Set(provider.capabilities || []);
  if (profile.requiresVision && !caps.has('vision')) return false;
  if (profile.privacyLevel === 'private' && !provider.local) return false;
  return true;
}

function scoreProvider(provider, config, profile, prefs, activeProvider) {
  let score = 0;
  const mode = prefs.mode || 'smart';
  if (provider.id === activeProvider) score += mode === 'smart' ? 96 : 24;
  if (provider.id === prefs.manualProvider) score += 1000;
  if (provider.freeTier) score += 12;
  if (provider.local) score += 6;
  if (config.lastSuccessAt) score += 5;
  if (config.lastErrorAt && Date.now() - new Date(config.lastErrorAt).getTime() < 5 * 60 * 1000) score -= 22;
  if (mode === 'free') score += provider.category === 'free' ? 80 : provider.category === 'trial' ? 45 : provider.local ? 70 : -200;
  if (mode === 'fast') score += Number(provider.speed || 0) * 22;
  if (mode === 'quality') score += Number(provider.quality || 0) * 22;
  if (mode === 'long-context') score += Number(provider.context || 0) * 24;
  if (mode === 'vision') score += (provider.capabilities || []).includes('vision') ? 100 : -300;
  if (mode === 'local') score += provider.local ? 300 : -500;
  if (profile.requiresVision) score += (provider.capabilities || []).includes('vision') ? 90 : -300;
  if (profile.requiresLongContext) score += Number(provider.context || 0) * 18;
  if (profile.requiresJson) score += (provider.capabilities || []).includes('json') ? 24 : 0;
  if (profile.taskType === 'teaching-content' && ['cerebras', 'groq', 'gemini', 'mistral'].includes(provider.id)) score += 16;
  if (profile.taskType === 'document-analysis' && ['gemini', 'claude', 'mistral'].includes(provider.id)) score += 18;
  if (profile.taskType === 'image-analysis' && ['gemini', 'openai', 'claude'].includes(provider.id)) score += 22;
  const fallbackIndex = prefs.fallbackOrder.indexOf(provider.id);
  if (fallbackIndex >= 0) score += Math.max(0, 30 - fallbackIndex * 2);
  return score;
}

export function buildAiRoutingCandidates({ legacyProviders = [], legacyConfigs = {}, legacyActiveProvider = '', options = {} } = {}) {
  const prefs = { ...getRoutingPreferences(), ...(options.routingPreferences || {}) };
  if (options.routingMode) prefs.mode = options.routingMode;
  if (options.manualProvider) prefs.manualProvider = options.manualProvider;
  if (options.manualModel) prefs.manualModel = options.manualModel;
  const profile = analyzeAiRequest({ ...options, routingMode: prefs.mode });
  const mergedConfigs = mergeAiConfigs(legacyConfigs);
  const legacyMap = new Map((legacyProviders || []).map((provider) => [provider.id, provider]));
  const catalog = PROVIDER_CATALOG.map((provider) => mergeProviderInfo(provider.id, legacyMap.get(provider.id) || {}));
  for (const provider of legacyProviders || []) {
    if (!catalog.some((item) => item.id === provider.id)) catalog.push(mergeProviderInfo(provider.id, provider));
  }
  const activeProvider = getEffectiveActiveProvider(options.provider || legacyActiveProvider);
  let candidates = catalog
    .map((provider) => ({ provider, config: { ...(mergedConfigs[provider.id] || {}), ...((prefs.providerHealth || {})[provider.id] || {}) } }))
    .filter(({ provider, config }) => isConfigured(provider, config))
    .filter(({ provider }) => supportsProfile(provider, profile))
    .filter(({ provider }) => provider.category !== 'paid' || prefs.allowPaid || (prefs.mode === 'manual' && provider.id === (options.manualProvider || prefs.manualProvider || activeProvider)) || (options.provider && provider.id === options.provider));

  if (Array.isArray(options.excludeProviders) && options.excludeProviders.length) {
    const excluded = new Set(options.excludeProviders);
    candidates = candidates.filter(({ provider }) => !excluded.has(provider.id));
  }

  if (prefs.mode === 'manual') {
    const manualId = options.manualProvider || prefs.manualProvider || activeProvider;
    candidates.sort((a, b) => Number(b.provider.id === manualId) - Number(a.provider.id === manualId));
  } else {
    candidates.sort((a, b) => scoreProvider(b.provider, b.config, profile, prefs, activeProvider) - scoreProvider(a.provider, a.config, profile, prefs, activeProvider));
  }

  if (!candidates.some(({ provider }) => provider.id === activeProvider)) {
    const provider = getProviderCatalogEntry(activeProvider);
    const config = mergedConfigs[activeProvider] || {};
    if (isConfigured(provider, config) && supportsProfile(provider, profile)) candidates.unshift({ provider, config });
  }

  return candidates.map(({ provider, config }, index) => ({
    id: provider.id,
    provider,
    config,
    model: (prefs.mode === 'manual' && provider.id === (prefs.manualProvider || activeProvider) && (options.manualModel || prefs.manualModel))
      || config.model
      || provider.defaultModel,
    baseUrl: config.baseUrl || provider.baseUrl,
    apiKey: config.apiKey || '',
    rank: index + 1,
  }));
}

export function classifyAiError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const status = Number(error?.status || 0);
  if (error?.code === 'AI_OUTPUT_VALIDATION_FAILED') return 'output-validation';
  if (error?.code === 'AI_PROVIDER_CREDIT_LIMIT' || /credit|billing|quota exceeded|insufficient/.test(message)) return 'capacity';
  if (status === 429 || /rate limit|too many requests|429/.test(message)) return 'rate-limit';
  if (status === 401 || status === 403 || /authentication|unauthorized|invalid api key|missing authentication|forbidden/.test(message)) return 'auth';
  if (status >= 500 || /server error|temporarily unavailable|model unavailable|overloaded/.test(message)) return 'provider-unavailable';
  if (/network|failed to fetch|load failed|timeout|timed out|abort/.test(message)) return 'network';
  if (/context length|too many tokens|maximum context/.test(message)) return 'context';
  return 'unknown';
}

export function shouldFallbackAiError(error) {
  return ['capacity', 'rate-limit', 'provider-unavailable', 'network', 'context', 'auth', 'output-validation'].includes(classifyAiError(error));
}

export function noteProviderHealth(providerId, { success = false, error = '' } = {}) {
  if (!providerId) return;
  const prefs = getRoutingPreferences();
  const health = prefs.providerHealth && typeof prefs.providerHealth === 'object' ? prefs.providerHealth : {};
  health[providerId] = success
    ? { ...(health[providerId] || {}), lastSuccessAt: new Date().toISOString(), lastError: '' }
    : { ...(health[providerId] || {}), lastErrorAt: new Date().toISOString(), lastError: String(error || '').slice(0, 240) };
  saveRoutingPreferences({ providerHealth: health });
}

export function getRoutingDisplay() {
  const prefs = getRoutingPreferences();
  return { ...prefs, modeInfo: getRoutingModeInfo(prefs.mode) };
}
