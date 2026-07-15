import { getAiConfigs, getProviderInfo } from './aiProviders.js';
import { callAIWithMeta } from './gemini.js';
import {
  appendAiAudit,
  getAiGovernanceSettings,
  guardAiRequest,
  recordAiRequest,
} from './aiGovernance.js';
import { applyAiPrivacyFilter, summarizeAiPrivacyReport } from './aiPrivacyFilter.js';
import { classifyAiError } from './aiSmartRouting.js';
import { createAiRuntimeFingerprint, runAiProviderRuntime } from './aiRuntimeManager.js';

const DEFAULT_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

function emitAiOperation(type, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function normalizeDataUrl(dataUrl = '') {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('The image attachment is not a valid base64 data URL.');
  return { mimeType: match[1], base64: match[2], dataUrl: String(dataUrl) };
}

function extractGeneratedImage(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const part = parts.find((item) => item?.inlineData?.data || item?.inline_data?.data);
  const inline = part?.inlineData || part?.inline_data;
  if (!inline?.data) return '';
  return `data:${inline.mimeType || inline.mime_type || 'image/png'};base64,${inline.data}`;
}

async function fetchJsonWithRetry(url, init, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.error?.message || `AI media request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function getAiMediaReadiness() {
  const configs = getAiConfigs();
  const gemini = configs?.gemini || {};
  return {
    imageAnalysisReady: Object.entries(configs || {}).some(([providerId, config]) => {
      const info = getProviderInfo(providerId);
      return config?.enabled !== false
        && (info?.capabilities || []).includes('vision')
        && (info?.requiresApiKey === false || Boolean(String(config?.apiKey || '').trim()));
    }),
    imageGenerationReady: Boolean(String(gemini.apiKey || '').trim()),
    imageGenerationProvider: 'gemini',
    imageGenerationModel: String(gemini.model || DEFAULT_IMAGE_MODELS[0]),
  };
}

/**
 * Unified vision analysis entry point.
 * Uses the same task registry, Privacy Filter, Governance, smart routing,
 * provider health, Output Guard, retry and provenance as every text request.
 */
export async function callAIVisionWithMeta({ imageDataUrl, prompt, ...options } = {}) {
  const image = normalizeDataUrl(imageDataUrl);
  return callAIWithMeta({
    ...options,
    aiTaskId: options.aiTaskId || 'image-analysis',
    governanceProfile: options.governanceProfile || 'document',
    routingMode: options.routingMode || 'vision',
    prompt: String(prompt || '').trim(),
    attachments: [
      ...(Array.isArray(options.attachments) ? options.attachments : []),
      { mimeType: image.mimeType, base64: image.base64, dataUrl: image.dataUrl, name: options.fileName || 'image' },
    ],
  });
}

/**
 * Unified image editing/generation entry point for SmartID and future media apps.
 * Phase 3 initially uses Gemini image models, but all privacy, governance,
 * audit, usage and operation metadata are centralized here instead of inside UI pages.
 */
export async function callAIImageWithMeta({
  prompt = '',
  imageDataUrl = '',
  models = DEFAULT_IMAGE_MODELS,
  apiKey = '',
  baseUrl = '',
  governanceProfile = 'document',
  loadingLabel = 'AI is processing an image…',
  retries = 1,
  aiTaskId = 'image-edit',
} = {}) {
  const startedAt = Date.now();
  const source = normalizeDataUrl(imageDataUrl);
  const governanceSettings = getAiGovernanceSettings();
  let privacyResult;
  try {
    privacyResult = applyAiPrivacyFilter({
      aiTaskId,
      governanceProfile,
      prompt,
      attachments: [{ mimeType: source.mimeType, base64: source.base64, dataUrl: source.dataUrl, name: 'source-image' }],
    }, governanceSettings.privacy);
  } catch (error) {
    const privacy = summarizeAiPrivacyReport(error?.privacyReport || {});
    appendAiAudit({
      type: 'privacy',
      status: 'blocked',
      label: 'AI image request blocked by Privacy Filter',
      profile: governanceProfile,
      detail: { taskId: aiTaskId, code: error?.code || '', privacy },
    });
    throw error;
  }

  const privacySummary = summarizeAiPrivacyReport(privacyResult.report);
  if (privacySummary.forceLocal) {
    const error = new Error('Privacy Filter yêu cầu AI local, nhưng chỉnh sửa ảnh hiện chỉ hỗ trợ Gemini image models.');
    error.code = 'AI_MEDIA_LOCAL_NOT_SUPPORTED';
    error.privacy = privacySummary;
    throw error;
  }

  const governance = guardAiRequest({
    ...privacyResult.options,
    governanceProfile,
    maxOutputTokens: 256,
  });
  const configs = getAiConfigs();
  const providerInfo = getProviderInfo('gemini');
  const config = configs?.gemini || {};
  const key = String(apiKey || config.apiKey || '').trim();
  if (!key) {
    const error = new Error('SmartID image editing requires a configured Gemini API key.');
    error.code = 'AI_MEDIA_PROVIDER_NOT_CONFIGURED';
    throw error;
  }
  const cleanBase = String(baseUrl || config.baseUrl || providerInfo.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const modelList = [...new Set((Array.isArray(models) ? models : [models]).map((item) => String(item || '').trim()).filter(Boolean))];
  if (!modelList.length) modelList.push(...DEFAULT_IMAGE_MODELS);

  const operationId = `ai-media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const operation = {
    id: operationId,
    operationId,
    provider: providerInfo.label || 'Google Gemini',
    model: modelList[0],
    label: loadingLabel,
    profile: governance.profileKey,
    taskId: aiTaskId,
    mediaType: 'image',
    privacy: privacySummary,
  };
  emitAiOperation('bes-ai-operation-start', operation);

  const attempts = [];
  const runtimeAggregate = { queueWaitMs: 0, networkAttempts: 0, retries: 0, cacheHit: false, deduplicated: false, timedOut: false, circuitOpen: false };
  const mergeRuntime = (runtime = {}) => {
    runtimeAggregate.queueWaitMs += Math.max(0, Number(runtime.queueWaitMs) || 0);
    runtimeAggregate.networkAttempts += Math.max(0, Number(runtime.networkAttempts) || 0);
    runtimeAggregate.retries += Math.max(0, Number(runtime.retries) || 0);
    runtimeAggregate.cacheHit ||= Boolean(runtime.cacheHit);
    runtimeAggregate.deduplicated ||= Boolean(runtime.deduplicated);
    runtimeAggregate.timedOut ||= Boolean(runtime.timedOut);
    runtimeAggregate.circuitOpen ||= Boolean(runtime.circuitOpen);
  };
  let result = '';
  let finalModel = modelList[0];
  let finalError = null;
  for (const model of modelList) {
    finalModel = model;
    const attemptStartedAt = Date.now();
    emitAiOperation('bes-ai-operation-update', { ...operation, model, phase: 'generate-image' });
    try {
      const attachment = privacyResult.options.attachments?.[0] || source;
      const runtimeResult = await runAiProviderRuntime({
        operationId: `${operationId}:gemini:${model}`,
        providerId: 'gemini',
        model,
        taskId: aiTaskId,
        fingerprint: createAiRuntimeFingerprint({
          providerId: 'gemini',
          model,
          taskId: aiTaskId,
          prompt: privacyResult.options.prompt || prompt,
          responseMimeType: 'image/png',
          attachments: [attachment],
        }),
        settings: { ...governance.settings.runtime, transientRetries: Math.max(Number(retries) || 0, governance.settings.runtime?.transientRetries || 0) },
        cacheAllowed: false,
        classifyError: classifyAiError,
        onUpdate: (detail) => emitAiOperation('bes-ai-operation-update', { ...operation, ...detail, model, phase: detail.phase || 'generate-image' }),
        executor: async ({ signal }) => {
          const response = await fetch(`${cleanBase}/models/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            signal,
            body: JSON.stringify({
              contents: [{ parts: [
                { text: privacyResult.options.prompt || prompt },
                { inlineData: { mimeType: attachment.mimeType || source.mimeType, data: attachment.base64 || source.base64 } },
              ] }],
              generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const requestError = new Error(payload?.error?.message || `AI media request failed with status ${response.status}`);
            requestError.status = response.status;
            throw requestError;
          }
          return payload;
        },
      });
      mergeRuntime(runtimeResult.runtime);
      const payload = runtimeResult.value;
      result = extractGeneratedImage(payload);
      if (!result) throw new Error('The image model returned no image output.');
      attempts.push({ model, status: 'success', durationMs: Date.now() - attemptStartedAt });
      finalError = null;
      break;
    } catch (error) {
      finalError = error;
      attempts.push({
        model,
        status: 'error',
        statusCode: Number(error?.status || 0),
        error: String(error?.message || error).slice(0, 320),
        durationMs: Date.now() - attemptStartedAt,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  const meta = {
    operationId,
    taskId: aiTaskId,
    engine: 'ai',
    transport: 'browser-unified',
    mediaType: 'image',
    provider: 'gemini',
    providerName: providerInfo.label || 'Google Gemini',
    model: finalModel,
    profile: governance.profileKey,
    fallbackUsed: attempts.length > 1,
    attempts,
    providerCalls: runtimeAggregate.networkAttempts,
    durationMs,
    createdAt: new Date().toISOString(),
    privacy: { ...privacySummary, restored: false },
    validation: { enabled: true, valid: Boolean(result), kind: 'image', issueCount: result ? 0 : 1, issueCodes: result ? [] : ['missing_image_output'] },
    runtime: { ...runtimeAggregate, durationMs },
  };

  if (result && !finalError) {
    recordAiRequest({
      provider: meta.providerName,
      model: meta.model,
      prompt: privacyResult.options.prompt || prompt,
      result: `[generated image: ${result.slice(5, 32)}…]`,
      durationMs,
      success: true,
      profile: governance.profileKey,
      operationId,
      privacy: privacySummary,
      validation: meta.validation,
      providerCalls: meta.providerCalls,
      runtime: meta.runtime,
    });
    if (typeof window !== 'undefined') window.__BES_LAST_AI_META__ = meta;
    emitAiOperation('bes-ai-operation-end', { ...operation, ...meta, success: true });
    return { imageDataUrl: result, meta };
  }

  const error = finalError || new Error('AI image generation failed.');
  error.code = error.code || 'AI_MEDIA_REQUEST_FAILED';
  error.attempts = attempts;
  error.operationId = operationId;
  error.privacy = privacySummary;
  recordAiRequest({
    provider: meta.providerName,
    model: meta.model,
    prompt: privacyResult.options.prompt || prompt,
    result: '',
    durationMs,
    success: false,
    error: error.message,
    profile: governance.profileKey,
    operationId,
    privacy: privacySummary,
    validation: meta.validation,
    providerCalls: meta.providerCalls || 1,
    runtime: meta.runtime,
  });
  emitAiOperation('bes-ai-operation-end', { ...operation, ...meta, success: false, error: error.message });
  throw error;
}
