import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  getActiveAiConfig,
  getAiConfigs,
  getAiProvider,
  getFallbackEnabled,
  getProviderInfo,
} from './aiProviders.js';
import { appendAiAudit, getAiGovernanceSettings, guardAiRequest, recordAiRequest } from './aiGovernance.js';
import { buildAiRoutingCandidates, classifyAiError, noteProviderHealth, shouldFallbackAiError } from './aiSmartRouting.js';
import { enrichAiTaskOptions, resolveAiTask } from './aiTaskRegistry.js';
import { getRoutingPreferences } from './aiProviderOverrides.js';
import { applyAiPrivacyFilter, summarizeAiPrivacyReport } from './aiPrivacyFilter.js';
import {
  buildAiRepairPrompt,
  createAiValidationError,
  summarizeAiValidation,
  validateAiOutput,
} from './aiOutputValidator.js';
import { createAiRuntimeFingerprint, runAiProviderRuntime } from './aiRuntimeManager.js';
import { callAiServerGateway } from './aiServerGateway.js';

export const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
export const DEFAULT_MAX_OUTPUT_TOKENS = 1600;

function normalizeMaxOutputTokens(value, fallback = DEFAULT_MAX_OUTPUT_TOKENS) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(8192, Math.max(16, parsed));
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

function normalizeModelName(model, fallback = DEFAULT_OPENROUTER_MODEL) {
  const clean = String(model || fallback).trim();
  return clean || fallback;
}

async function callOpenRouterProvider({
  model,
  prompt,
  attachments = [],
  systemInstruction = '',
  temperature = 0.7,
  responseMimeType = '',
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  signal,
  registryTaskId = '',
  aiTaskId = '',
  routingHint = 'smart',
  operationId = '',
  onToken,
  onGatewayStatus,
  stream,
}) {
  const useStream = stream !== false && responseMimeType !== 'application/json';
  const payload = await callAiServerGateway({
    prompt,
    systemInstruction,
    attachments,
    responseMimeType,
    maxOutputTokens: normalizeMaxOutputTokens(maxOutputTokens),
    temperature,
    taskId: registryTaskId || aiTaskId || 'default',
    routingHint,
    requestedModel: normalizeModelName(model, 'openrouter/auto'),
    operationId,
    sessionId: registryTaskId || aiTaskId || operationId,
    stream: useStream,
    signal,
    onToken,
    onStatus: onGatewayStatus,
  });
  return {
    text: String(payload?.text || '').trim(),
    meta: {
      provider: 'openrouter',
      providerName: 'OpenRouter',
      model: String(payload?.model || payload?.requestedModel || model || 'openrouter/auto'),
      requestedModel: String(payload?.requestedModel || model || ''),
      profile: String(payload?.profile || routingHint || 'standard'),
      transport: String(payload?.transport || (useStream ? 'server-gateway-stream' : 'server-gateway')),
      requestId: String(payload?.requestId || ''),
      providerAttempts: Math.max(1, Number(payload?.providerAttempts || 1)),
      fallbackUsed: Boolean(payload?.fallbackUsed),
      creditFallback: Boolean(payload?.creditFallback),
      affordableTokens: Math.max(0, Number(payload?.affordableTokens || 0)),
      requestedMaxTokens: Math.max(0, Number(payload?.requestedMaxTokens || maxOutputTokens || 0)),
      actualMaxTokens: Math.max(0, Number(payload?.actualMaxTokens || maxOutputTokens || 0)),
      billingMode: String(payload?.billingMode || 'auto'),
      usage: payload?.usage || null,
    },
  };
}

async function callSingleProvider(options = {}) {
  return callOpenRouterProvider({ ...options, provider: 'openrouter' });
}

function emitAiOperation(type, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export async function callAIWithMeta(options = {}) {
  const startedAt = Date.now();
  const taskOptions = enrichAiTaskOptions(options);
  const task = resolveAiTask(taskOptions);
  const governanceSettings = getAiGovernanceSettings();

  let privacyResult;
  try {
    privacyResult = applyAiPrivacyFilter(taskOptions, governanceSettings.privacy);
  } catch (error) {
    const privacy = summarizeAiPrivacyReport(error?.privacyReport || {});
    appendAiAudit({
      type: 'privacy',
      status: 'blocked',
      label: 'AI request blocked by Privacy Filter',
      profile: String(taskOptions.governanceProfile || taskOptions.profile || ''),
      detail: { taskId: task.id, code: error?.code || '', privacy },
    });
    throw error;
  }

  const enrichedOptions = privacyResult.options;
  const privacySummary = summarizeAiPrivacyReport(privacyResult.report);
  let governance;
  try {
    governance = guardAiRequest(enrichedOptions);
  } catch (error) {
    appendAiAudit({
      type: 'request',
      status: 'blocked',
      label: 'AI request blocked by governance',
      profile: String(enrichedOptions.governanceProfile || enrichedOptions.profile || ''),
      detail: { taskId: task.id, code: error?.code || '', error: error?.message || String(error), privacy: privacySummary },
    });
    throw error;
  }

  const active = getActiveAiConfig();
  const effectiveRoutingMode = 'openrouter';
  const preferredProvider = DEFAULT_PROVIDER;
  const preferredInfo = getProviderInfo(preferredProvider);
  const configs = getAiConfigs();
  const preferredStored = configs[preferredProvider] || {};
  configs[preferredProvider] = {
    ...preferredStored,
    apiKey: String(enrichedOptions.apiKey || '').trim() ? enrichedOptions.apiKey : preferredStored.apiKey,
    model: enrichedOptions.model || preferredStored.model || preferredInfo.defaultModel,
    baseUrl: enrichedOptions.baseUrl || preferredStored.baseUrl || preferredInfo.baseUrl,
    enabled: true,
  };

  let candidates = buildAiRoutingCandidates({
    legacyProviders: PROVIDERS,
    legacyConfigs: configs,
    legacyActiveProvider: preferredProvider,
    options: {
      ...enrichedOptions,
      routingMode: 'openrouter-task-aware',
      provider: DEFAULT_PROVIDER,
      manualProvider: DEFAULT_PROVIDER,
      manualModel: enrichedOptions.manualModel || enrichedOptions.model || configs.openrouter?.model,
      runtimeSettings: governanceSettings.runtime,
    },
  });

  if (!candidates.length && !privacySummary.forceLocal) {
    candidates = [{
      id: preferredProvider,
      provider: preferredInfo,
      config: configs[preferredProvider],
      apiKey: '__SERVER_GATEWAY__',
      model: configs[preferredProvider]?.model || preferredInfo.defaultModel,
      baseUrl: configs[preferredProvider]?.baseUrl || preferredInfo.baseUrl,
      rank: 1,
    }];
  }

  const preferDefaultFirst = true;
  if (!privacySummary.forceLocal && (enrichedOptions.provider || preferDefaultFirst) && candidates.some((candidate) => candidate.id === preferredProvider)) {
    candidates = [
      ...candidates.filter((candidate) => candidate.id === preferredProvider),
      ...candidates.filter((candidate) => candidate.id !== preferredProvider),
    ].map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }

  const registryTaskId = String(enrichedOptions.registryTaskId || task.id);
  const fallbackEnabled = false;
  if (!fallbackEnabled) candidates = candidates.slice(0, 1);
  if (!candidates.length) {
    const error = new Error(privacySummary.forceLocal
      ? 'Chính sách riêng tư đang yêu cầu xử lý cục bộ, nhưng hệ thống chỉ sử dụng OpenRouter qua gateway máy chủ. Hãy đổi chính sách sang Che dữ liệu hoặc Chặn request.'
      : 'OpenRouter gateway chưa sẵn sàng. Hãy cấu hình OPENROUTER_API_KEY trên Vercel.');
    error.code = privacySummary.forceLocal ? 'AI_PRIVACY_LOCAL_UNAVAILABLE' : 'OPENROUTER_SERVER_KEY_MISSING';
    error.taskId = registryTaskId;
    error.privacy = privacySummary;
    throw error;
  }

  const operationId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const operationDetail = {
    id: operationId,
    provider: candidates[0]?.provider?.label || candidates[0]?.id || preferredProvider,
    model: candidates[0]?.model || '',
    label: enrichedOptions.loadingLabel || enrichedOptions.aiLabel || '',
    maxOutputTokens: governance.maxOutputTokens,
    profile: governance.profileKey,
    taskId: registryTaskId,
    taskGroup: task.id,
    promptVersion: enrichedOptions.promptVersion || '',
    promptRegistryVersion: enrichedOptions.promptRegistryVersion || '',
    routingMode: 'openrouter-task-aware',
    candidateCount: candidates.length,
    privacy: privacySummary,
  };
  emitAiOperation('bes-ai-operation-start', operationDetail);

  const attempts = [];
  let result = '';
  let finalCandidate = candidates[0];
  let finalError = null;
  let finalValidation = null;
  let providerCalls = 0;
  let repairAttempted = false;
  let repaired = false;
  let repairAttempts = 0;
  const runtimeAggregate = {
    queueWaitMs: 0,
    networkAttempts: 0,
    retries: 0,
    cacheHit: false,
    deduplicated: false,
    timedOut: false,
    circuitOpen: false,
  };
  const mergeRuntime = (runtime = {}) => {
    runtimeAggregate.queueWaitMs += Math.max(0, Number(runtime.queueWaitMs) || 0);
    runtimeAggregate.networkAttempts += Math.max(0, Number(runtime.networkAttempts) || 0);
    runtimeAggregate.retries += Math.max(0, Number(runtime.retries) || 0);
    runtimeAggregate.cacheHit = runtimeAggregate.cacheHit || Boolean(runtime.cacheHit);
    runtimeAggregate.deduplicated = runtimeAggregate.deduplicated || Boolean(runtime.deduplicated);
    runtimeAggregate.timedOut = runtimeAggregate.timedOut || Boolean(runtime.timedOut);
    runtimeAggregate.circuitOpen = runtimeAggregate.circuitOpen || Boolean(runtime.circuitOpen);
  };
  const baseCacheAllowed = !privacySummary.applied && (enrichedOptions.cache === true || task.id === 'diagnostic');

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const info = getProviderInfo(candidate.id);
    finalCandidate = candidate;
    const attemptStartedAt = Date.now();
    emitAiOperation('bes-ai-operation-update', {
      ...operationDetail,
      provider: info.label || candidate.id,
      model: candidate.model,
      rank: index + 1,
      fallbackUsed: index > 0,
      phase: 'generate',
    });
    try {
      const generationFingerprint = createAiRuntimeFingerprint({
        providerId: `${candidate.id}:${enrichedOptions.routingHint || task.routingMode || candidate.model || 'standard'}`,
        model: candidate.model,
        taskId: task.id,
        prompt: enrichedOptions.prompt || '',
        systemInstruction: enrichedOptions.systemInstruction || '',
        responseMimeType: enrichedOptions.responseMimeType || '',
        maxOutputTokens: governance.maxOutputTokens,
        temperature: enrichedOptions.temperature,
        attachments: enrichedOptions.attachments,
      });
      const generationRuntime = await runAiProviderRuntime({
        operationId: `${operationId}:${candidate.id}:generate`,
        providerId: `${candidate.id}:${enrichedOptions.routingHint || task.routingMode || candidate.model || 'standard'}`,
        model: candidate.model,
        taskId: task.id,
        fingerprint: generationFingerprint,
        settings: governance.settings.runtime,
        signal: enrichedOptions.signal,
        cacheAllowed: baseCacheAllowed,
        classifyError: classifyAiError,
        onUpdate: (detail) => emitAiOperation('bes-ai-operation-update', { ...operationDetail, ...detail, provider: info.label || candidate.id, model: candidate.model }),
        executor: ({ signal }) => callSingleProvider({
          ...enrichedOptions,
          provider: candidate.id,
          apiKey: candidate.apiKey,
          model: candidate.model,
          baseUrl: candidate.baseUrl,
          maxOutputTokens: governance.maxOutputTokens,
          signal,
          registryTaskId,
          aiTaskId: task.id,
          routingHint: enrichedOptions.routingHint || task.routingMode,
          operationId,
          stream: enrichedOptions.stream,
          onToken: enrichedOptions.onToken,
          onGatewayStatus: (detail) => emitAiOperation('bes-ai-operation-update', { ...operationDetail, ...detail, provider: info.label || candidate.id }),
        }),
      });
      mergeRuntime(generationRuntime.runtime);
      providerCalls += generationRuntime.runtime.networkAttempts;
      let gatewayMeta = generationRuntime.value?.meta || {};
      providerCalls += Math.max(0, Number(gatewayMeta.providerAttempts || 1) - 1);
      let candidateResult = String(generationRuntime.value?.text || '');

      let validation = validateAiOutput(candidateResult, {
        options: enrichedOptions,
        task,
        settings: governance.settings.outputValidation,
      });
      finalValidation = validation;

      const allowedRepairs = Math.max(0, Number(validation.config?.maxRepairAttempts) || 0);
      while (!validation.valid && validation.config?.autoRepair && repairAttempts < allowedRepairs) {
        repairAttempted = true;
        repairAttempts += 1;
        emitAiOperation('bes-ai-operation-update', {
          ...operationDetail,
          provider: info.label || candidate.id,
          model: candidate.model,
          rank: index + 1,
          fallbackUsed: index > 0,
          phase: 'repair',
          validationIssues: validation.issues.map((item) => item.code).slice(0, 8),
        });
        const repairPrompt = buildAiRepairPrompt({
          originalOutput: candidateResult,
          validation,
          task,
          originalPrompt: enrichedOptions.prompt || '',
        });
        const repairRuntime = await runAiProviderRuntime({
          operationId: `${operationId}:${candidate.id}:repair:${repairAttempts}`,
          providerId: `${candidate.id}:repair`,
          model: candidate.model,
          taskId: `${task.id}:repair`,
          fingerprint: createAiRuntimeFingerprint({
            providerId: `${candidate.id}:repair`,
            model: candidate.model,
            taskId: `${task.id}:repair`,
            prompt: repairPrompt,
            systemInstruction: 'Brian AI Output Repair',
            responseMimeType: enrichedOptions.responseMimeType || '',
            maxOutputTokens: governance.maxOutputTokens,
            temperature: 0.1,
          }),
          settings: governance.settings.runtime,
          signal: enrichedOptions.signal,
          cacheAllowed: false,
          classifyError: classifyAiError,
          onUpdate: (detail) => emitAiOperation('bes-ai-operation-update', { ...operationDetail, ...detail, provider: info.label || candidate.id, phase: 'repair' }),
          executor: ({ signal }) => callSingleProvider({
            ...enrichedOptions,
            provider: candidate.id,
            apiKey: candidate.apiKey,
            model: candidate.model,
            baseUrl: candidate.baseUrl,
            prompt: repairPrompt,
            systemInstruction: 'You are Brian AI Output Repair. Correct formatting and validation defects exactly. Never add commentary outside the requested final output.',
            temperature: 0.1,
            maxOutputTokens: governance.maxOutputTokens,
            signal,
            registryTaskId: `${registryTaskId}:repair`,
            aiTaskId: `${task.id}:repair`,
            routingHint: 'quality',
            operationId: `${operationId}:repair:${repairAttempts}`,
            stream: false,
          }),
        });
        mergeRuntime(repairRuntime.runtime);
        providerCalls += repairRuntime.runtime.networkAttempts;
        gatewayMeta = repairRuntime.value?.meta || gatewayMeta;
        providerCalls += Math.max(0, Number(repairRuntime.value?.meta?.providerAttempts || 1) - 1);
        candidateResult = String(repairRuntime.value?.text || '');
        validation = validateAiOutput(candidateResult, {
          options: enrichedOptions,
          task,
          settings: governance.settings.outputValidation,
        });
        finalValidation = validation;
        if (validation.valid) repaired = true;
      }

      if (!validation.valid) throw createAiValidationError(validation);
      result = privacyResult.restoreText(validation.normalizedText || candidateResult, { json: validation.config?.kind === 'json' });
      noteProviderHealth(candidate.id, { success: true });
      attempts.push({
        provider: candidate.id,
        model: gatewayMeta.model || candidate.model,
        requestedModel: gatewayMeta.requestedModel || candidate.model,
        transport: gatewayMeta.transport || 'server-gateway',
        requestId: gatewayMeta.requestId || '',
        status: 'success',
        durationMs: Date.now() - attemptStartedAt,
        validation: summarizeAiValidation(validation, { repairAttempted, repaired, repairAttempts }),
      });
      finalError = null;
      break;
    } catch (error) {
      finalError = error;
      if (error?.validation) finalValidation = error.validation;
      const kind = classifyAiError(error);
      runtimeAggregate.timedOut = runtimeAggregate.timedOut || kind === 'timeout';
      runtimeAggregate.circuitOpen = runtimeAggregate.circuitOpen || kind === 'circuit-open';
      noteProviderHealth(candidate.id, { success: false, error: error?.message || String(error) });
      attempts.push({
        provider: candidate.id,
        model: candidate.model,
        status: 'error',
        errorType: kind,
        statusCode: Number(error?.status || 0),
        error: String(error?.message || error).slice(0, 360),
        durationMs: Date.now() - attemptStartedAt,
        validation: finalValidation ? summarizeAiValidation(finalValidation, { repairAttempted, repaired, repairAttempts }) : undefined,
      });
      const canContinue = fallbackEnabled && index < candidates.length - 1 && (shouldFallbackAiError(error) || kind === 'unknown');
      if (!canContinue) break;
    }
  }

  const durationMs = Date.now() - startedAt;
  const finalInfo = getProviderInfo(finalCandidate?.id || preferredProvider);
  const validationSummary = finalValidation
    ? summarizeAiValidation(finalValidation, { repairAttempted, repaired, repairAttempts })
    : { enabled: false, valid: true, skipped: true, kind: 'text', issueCount: 0, issueCodes: [], repairAttempted, repaired, repairAttempts };
  const meta = {
    operationId,
    taskId: registryTaskId,
    taskGroup: task.id,
    taskLabel: enrichedOptions.taskLabel || task.label,
    taskApp: enrichedOptions.taskApp || '',
    promptVersion: enrichedOptions.promptVersion || '',
    promptRegistryVersion: enrichedOptions.promptRegistryVersion || '',
    engine: 'ai',
    transport: attempts.find((attempt) => attempt.status === 'success')?.transport || 'server-gateway',
    provider: DEFAULT_PROVIDER,
    providerName: 'OpenRouter',
    model: attempts.find((attempt) => attempt.status === 'success')?.model || finalCandidate?.model || '',
    profile: governance.profileKey,
    routingMode: 'openrouter-task-aware',
    fallbackUsed: false,
    candidateRank: Math.max(1, attempts.length),
    attempts,
    providerCalls,
    durationMs,
    createdAt: new Date().toISOString(),
    validated: Boolean(validationSummary.valid),
    privacy: { ...privacySummary, restored: Boolean(privacySummary.applied) },
    validation: validationSummary,
    runtime: { ...runtimeAggregate, durationMs },
  };

  if (result && !finalError) {
    recordAiRequest({
      provider: meta.providerName,
      model: meta.model,
      prompt: enrichedOptions.prompt || '',
      result,
      durationMs,
      success: true,
      error: '',
      profile: governance.profileKey,
      taskId: registryTaskId,
      taskGroup: task.id,
      promptVersion: enrichedOptions.promptVersion || '',
      transport: meta.transport,
      operationId,
      privacy: privacySummary,
      validation: validationSummary,
      providerCalls,
      fallbackUsed: meta.fallbackUsed,
      attempts,
      runtime: meta.runtime,
    });
    if (typeof window !== 'undefined') window.__BES_LAST_AI_META__ = meta;
    emitAiOperation('bes-ai-operation-end', { ...operationDetail, ...meta, success: true });
    return { text: result, meta };
  }

  let error = finalError;
  if (attempts.length > 1) {
    const capacityError = attempts.find((attempt) => attempt.errorType === 'capacity');
    if (!error || !capacityError) {
      error = new Error(`OpenRouter request failed after all allowed attempts. ${attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`).join(' | ')}`);
      error.code = 'OPENROUTER_REQUEST_FAILED';
    }
  }
  if (!error) {
    error = new Error('OpenRouter did not return a usable response.');
    error.code = 'OPENROUTER_REQUEST_FAILED';
  }
  error.attempts = attempts;
  error.operationId = operationId;
  error.taskId = registryTaskId;
  error.privacy = privacySummary;
  error.validationSummary = validationSummary;
  recordAiRequest({
    provider: meta.providerName,
    model: meta.model,
    prompt: enrichedOptions.prompt || '',
    result: '',
    durationMs,
    success: false,
    error: error?.message || String(error),
    profile: governance.profileKey,
    taskId: registryTaskId,
    taskGroup: task.id,
    promptVersion: enrichedOptions.promptVersion || '',
    transport: meta.transport,
    operationId,
    privacy: { ...privacySummary, restored: Boolean(privacySummary.applied) },
    validation: validationSummary,
    providerCalls,
    fallbackUsed: meta.fallbackUsed,
    attempts,
    runtime: meta.runtime,
  });
  emitAiOperation('bes-ai-operation-end', { ...operationDetail, ...meta, success: false, error: error?.message || String(error) });
  throw error;
}

export async function callAI(options = {}) {
  const response = await callAIWithMeta(options);
  return response.text;
}

export async function callOpenRouter(options = {}) {
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

export async function generateActivityWithOpenRouter({ apiKey, model, templateId, topic, sourceText, level, itemCount, language }) {
  const outputFormat = ACTIVITY_OUTPUT_FORMATS[templateId] || ACTIVITY_OUTPUT_FORMATS.quiz;
  const systemInstruction = `You are an expert English teacher and test writer. Create accurate, classroom-ready English learning activities. Never include markdown fences unless specifically requested. Avoid duplicate items. Use natural, correct English.`;
  const prompt = `Create content for Brian English Studio Activity Tiles.\n\nTemplate: ${templateId}\nLevel: ${level}\nNumber of items: ${itemCount}\nOutput language for explanations/prompts: ${language === 'vi' ? 'Vietnamese support is allowed, but English learning content should stay in English unless the task requires Vietnamese.' : 'English'}\nTopic or instruction: ${topic || 'General English'}\nSource text / vocabulary / notes:\n${sourceText || '(none)'}\n\n${outputFormat}\n\nReturn strict JSON only with this schema:\n{\n  "title": "short activity title",\n  "content": "the generated activity lines in the exact format required"\n}\n\nImportant: The content field must contain only the activity lines, separated by \\n. No numbering unless it is part of the question.`;

  const text = await callOpenRouter({ apiKey, model, prompt, systemInstruction, temperature: 0.65, responseMimeType: 'application/json' });
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

  return callOpenRouter({ apiKey, model, prompt, systemInstruction, temperature: 0.68 });
}
