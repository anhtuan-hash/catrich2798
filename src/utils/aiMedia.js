import { getAiConfigs, getProviderInfo } from './aiProviders.js';
import { callAIWithMeta } from './openRouter.js';
import { appendAiAudit, getAiGovernanceSettings, guardAiRequest, recordAiRequest } from './aiGovernance.js';
import { applyAiPrivacyFilter, summarizeAiPrivacyReport } from './aiPrivacyFilter.js';
import { classifyAiError } from './aiSmartRouting.js';
import { createAiRuntimeFingerprint, runAiProviderRuntime } from './aiRuntimeManager.js';
import { callAiImageGateway } from './aiServerGateway.js';

const OPENROUTER_ID = 'openrouter';

function emitAiOperation(type, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function normalizeDataUrl(dataUrl = '', { optional = false } = {}) {
  if (!dataUrl && optional) return null;
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('The image attachment is not a valid base64 data URL.');
  return { mimeType: match[1], base64: match[2], dataUrl: String(dataUrl) };
}

export function getAiMediaReadiness() {
  const config = getAiConfigs()?.openrouter || {};
  return {
    imageAnalysisReady: true,
    imageGenerationReady: true,
    serverManaged: true,
    imageGenerationProvider: OPENROUTER_ID,
    imageGenerationModel: String(config.imageModel || getProviderInfo().defaultImageModel || ''),
  };
}

export async function callAIVisionWithMeta({ imageDataUrl, prompt, ...options } = {}) {
  const image = normalizeDataUrl(imageDataUrl);
  const config = getAiConfigs()?.openrouter || {};
  return callAIWithMeta({
    ...options,
    provider: OPENROUTER_ID,
    model: options.model || config.visionModel || config.model,
    aiTaskId: options.aiTaskId || 'image-analysis',
    governanceProfile: options.governanceProfile || 'document',
    routingMode: 'openrouter',
    prompt: String(prompt || '').trim(),
    attachments: [
      ...(Array.isArray(options.attachments) ? options.attachments : []),
      { mimeType: image.mimeType, base64: image.base64, dataUrl: image.dataUrl, name: options.fileName || 'image' },
    ],
    fallback: false,
  });
}

export async function callAIImageWithMeta({
  prompt = '',
  imageDataUrl = '',
  model = '',
  models = [],
  apiKey = '',
  baseUrl = '',
  governanceProfile = 'document',
  loadingLabel = 'OpenRouter is processing an image…',
  aiTaskId = 'image-edit',
} = {}) {
  const startedAt = Date.now();
  const source = normalizeDataUrl(imageDataUrl, { optional: true });
  const governanceSettings = getAiGovernanceSettings();
  let privacyResult;
  try {
    privacyResult = applyAiPrivacyFilter({
      aiTaskId,
      governanceProfile,
      prompt,
      attachments: source ? [{ mimeType: source.mimeType, base64: source.base64, dataUrl: source.dataUrl, name: 'source-image' }] : [],
    }, governanceSettings.privacy);
  } catch (error) {
    const privacy = summarizeAiPrivacyReport(error?.privacyReport || {});
    appendAiAudit({ type: 'privacy', status: 'blocked', label: 'OpenRouter image request blocked by Privacy Filter', profile: governanceProfile, detail: { taskId: aiTaskId, code: error?.code || '', privacy } });
    throw error;
  }

  const privacySummary = summarizeAiPrivacyReport(privacyResult.report);
  if (privacySummary.forceLocal) {
    const error = new Error('Chính sách đang yêu cầu AI local, nhưng hệ thống chỉ sử dụng OpenRouter. Hãy đổi chính sách sang Che dữ liệu hoặc Chặn request.');
    error.code = 'AI_PRIVACY_LOCAL_UNAVAILABLE';
    error.privacy = privacySummary;
    throw error;
  }

  const governance = guardAiRequest({ ...privacyResult.options, aiTaskId, governanceProfile, maxOutputTokens: 256 });
  const config = getAiConfigs()?.openrouter || {};
  const providerInfo = getProviderInfo();
  const selectedModel = String(model || (Array.isArray(models) ? models[0] : '') || config.imageModel || providerInfo.defaultImageModel).trim();

  const operationId = `ai-media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const operation = {
    id: operationId,
    operationId,
    provider: 'OpenRouter',
    model: selectedModel,
    label: loadingLabel,
    profile: governance.profileKey,
    taskId: aiTaskId,
    mediaType: 'image',
    privacy: privacySummary,
  };
  emitAiOperation('bes-ai-operation-start', operation);

  try {
    const attachment = privacyResult.options.attachments?.[0] || source;
    const runtimeResult = await runAiProviderRuntime({
      operationId: `${operationId}:openrouter:${selectedModel}`,
      providerId: `${OPENROUTER_ID}:${selectedModel || 'image'}`,
      model: selectedModel || 'openrouter-image',
      taskId: aiTaskId,
      fingerprint: createAiRuntimeFingerprint({ providerId: `${OPENROUTER_ID}:${selectedModel || 'image'}`, model: selectedModel, taskId: aiTaskId, prompt: privacyResult.options.prompt || prompt, responseMimeType: 'image/png', attachments: attachment ? [attachment] : [] }),
      settings: governance.settings.runtime,
      cacheAllowed: false,
      classifyError: classifyAiError,
      onUpdate: (detail) => emitAiOperation('bes-ai-operation-update', { ...operation, ...detail, phase: detail.phase || 'generate-image' }),
      executor: async ({ signal }) => callAiImageGateway({
        prompt: String(privacyResult.options.prompt || prompt).trim(),
        imageDataUrl: attachment?.dataUrl || '',
        taskId: aiTaskId,
        operationId,
        signal,
      }),
    });
    const image = String(runtimeResult.value?.imageDataUrl || '');
    if (!image) throw new Error('OpenRouter did not return an image. Check the configured image model.');
    const durationMs = Date.now() - startedAt;
    const meta = {
      operationId,
      taskId: aiTaskId,
      engine: 'ai',
      transport: 'server-gateway',
      provider: OPENROUTER_ID,
      providerName: 'OpenRouter',
      model: String(runtimeResult.value?.model || selectedModel || 'openrouter-image'),
      durationMs,
      createdAt: new Date().toISOString(),
      privacy: { ...privacySummary, restored: false },
      runtime: { ...runtimeResult.runtime, durationMs },
      mediaType: 'image',
    };
    recordAiRequest({ provider: 'OpenRouter', model: String(runtimeResult.value?.model || selectedModel || 'openrouter-image'), prompt: prompt || '', result: '[IMAGE]', durationMs, success: true, error: '', profile: governance.profileKey, taskId: aiTaskId, transport: meta.transport, operationId, privacy: privacySummary, providerCalls: runtimeResult.runtime.networkAttempts, fallbackUsed: false, attempts: [{ provider: OPENROUTER_ID, model: String(runtimeResult.value?.model || selectedModel || 'openrouter-image'), status: 'success' }], runtime: meta.runtime });
    emitAiOperation('bes-ai-operation-end', { ...operation, ...meta, success: true });
    return { imageDataUrl: image, text: '', meta };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    recordAiRequest({ provider: 'OpenRouter', model: selectedModel, prompt: prompt || '', result: '', durationMs, success: false, error: error?.message || String(error), profile: governance.profileKey, taskId: aiTaskId, transport: 'server-gateway', operationId, privacy: privacySummary, providerCalls: 1, fallbackUsed: false, attempts: [{ provider: OPENROUTER_ID, model: selectedModel, status: 'error', error: error?.message || String(error) }] });
    appendAiAudit({ type: 'media', status: 'error', label: 'OpenRouter image request failed', profile: governance.profileKey, detail: { taskId: aiTaskId, model: selectedModel, error: error?.message || String(error) } });
    emitAiOperation('bes-ai-operation-end', { ...operation, success: false, durationMs, error: error?.message || String(error) });
    throw error;
  }
}
