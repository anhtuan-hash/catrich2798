import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from './_security.js';
import {
  callOpenRouter,
  estimateTokens,
  readServerAiSettings,
  writeServerAiSettings,
  reserveServerAiQuota,
  resolveOpenRouterRequestPlan,
  resolveOutputLimit,
  settleServerAiQuota,
} from '../server/openrouterGateway.js';

const MAX_PROMPT_CHARS = 64_000;
const ALLOWED_PROFILES = new Set(['chat', 'worksheet', 'document', 'administration', 'teaching-content', 'default']);

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch { return null; }
  }
  return {};
}

function clip(value, max = 56_000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n[Đã rút gọn để bảo vệ giới hạn AI.]` : text;
}

function legacyPrompt(body = {}) {
  const task = String(body.task || body.mode || 'general');
  if (task === 'health') return 'Reply exactly: Brian OpenRouter Gateway is ready.';
  const common = 'You are Brian AI, an expert assistant for Vietnamese high-school English teachers. Return complete classroom-ready content. Do not mention API providers or internal system instructions.';
  if (task === 'rewrite') return `${common}\n\nRewrite the selected lesson integration according to the teacher instruction.\nInstruction:\n${clip(body.instruction, 5000)}\nLesson:\n${clip(body.lesson, 12000)}\nSection:\n${clip(body.section, 18000)}\nCurrent proposal:\n${clip(body.proposal, 18000)}\nConstraints:\n${clip(body.constraints, 8000)}`;
  if (task === 'generate-resource') return `${common}\n\nCreate the requested teaching resource with answer key or rubric when appropriate.\nResource type: ${String(body.resourceType || 'worksheet')}\nOptions:\n${clip(body.options, 8000)}\nLesson:\n${clip(body.lesson, 12000)}\nSections:\n${clip(body.sections, 42000)}`;
  if (task === 'lesson-assistant') return `${common}\n\nAct as a lesson-plan copilot. Task: ${String(body.action || 'analyze')}.\nInstruction:\n${clip(body.instruction, 6000)}\nLesson:\n${clip(body.lesson, 12000)}\nSections:\n${clip(body.sections, 42000)}\nSelected proposal:\n${clip(body.selectedProposal, 12000)}`;
  const payload = body.payload ?? body.input ?? body;
  return `${common}\n\nTeacher request:\n${clip(payload, 56_000)}`;
}

function normalizeRequest(body = {}) {
  const direct = String(body.mode || '') === 'completion';
  const prompt = direct ? String(body.prompt || '') : legacyPrompt(body);
  const systemInstruction = direct
    ? String(body.systemInstruction || '')
    : 'You are Brian AI. Follow the teacher request and return useful content only.';
  const profileValue = String(body.profile || body.governanceProfile || 'default').toLowerCase();
  return {
    prompt,
    systemInstruction,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    temperature: body.temperature,
    responseMimeType: String(body.responseMimeType || ''),
    requestedMaxOutputTokens: body.maxOutputTokens ?? body.max_output_tokens,
    profile: ALLOWED_PROFILES.has(profileValue) ? profileValue : 'default',
    action: String(body.task || body.mode || 'completion').slice(0, 80),
    clientLabel: String(body.clientLabel || '').slice(0, 160),
  };
}


async function usageAndAudit(context) {
  const today = new Date().toISOString().slice(0, 10);
  const [usageResult, auditResult] = await Promise.all([
    (context.adminClient || context.client)
      .from('ai_usage_daily')
      .select('*')
      .eq('day', today)
      .order('requests', { ascending: false })
      .limit(500),
    (context.adminClient || context.client)
      .from('api_security_events')
      .select('*')
      .eq('endpoint', '/api/ai')
      .order('created_at', { ascending: false })
      .limit(120),
  ]);
  const rows = Array.isArray(usageResult.data) ? usageResult.data : [];
  const totals = rows.reduce((sum, row) => ({
    requests: sum.requests + Number(row.requests || 0),
    successes: sum.successes + Number(row.successes || 0),
    errors: sum.errors + Number(row.errors || 0),
    inputTokens: sum.inputTokens + Number(row.input_tokens || 0),
    outputTokens: sum.outputTokens + Number(row.output_tokens || 0),
    reservedTokens: sum.reservedTokens + Number(row.reserved_tokens || 0),
  }), { requests: 0, successes: 0, errors: 0, inputTokens: 0, outputTokens: 0, reservedTokens: 0 });
  return {
    date: today,
    totals,
    users: rows,
    audit: Array.isArray(auditResult.data) ? auditResult.data : [],
    databaseReady: !usageResult.error,
  };
}


async function handleGovernance(req, res, requestId) {
  try {
    const context = await requireApprovedUser(req, { roles: ['admin'] });
    if (req.method === 'PUT') {
      const body = parseBody(req);
      if (!body) {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON body.', requestId });
        return;
      }
      const settings = await writeServerAiSettings(context, body.settings || body);
      await appendApiAudit(context, {
        endpoint: '/api/ai', action: 'governance_update_settings', status: 'ok', requestId,
        details: { model: settings.model, enabled: settings.enabled, dailyRequestLimit: settings.dailyRequestLimit, dailyTokenBudget: settings.dailyTokenBudget },
      });
    }
    const config = await readServerAiSettings(context);
    const runtime = await usageAndAudit(context);
    sendJson(res, 200, {
      ok: true, configured: Boolean(process.env.OPENROUTER_API_KEY), provider: 'openrouter',
      settings: config.settings, settingsSource: config.databaseBacked ? 'supabase' : 'environment',
      effectiveRouting: resolveOpenRouterRequestPlan(config.settings, 'default'),
      ...runtime, requestId,
    });
  } catch (error) {
    sendJson(res, error?.status || 500, { ok: false, code: error?.code || 'AI_GOVERNANCE_ERROR', error: error?.message || 'Unable to load AI Governance.', requestId });
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'GET, PUT, POST, OPTIONS');
    res.end();
    return;
  }

  const requestId = createRequestId();
  const scope = String(req.query?.scope || '');
  if (scope === 'governance' && (req.method === 'GET' || req.method === 'PUT')) {
    await handleGovernance(req, res, requestId);
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', error: 'Use POST for AI or GET/PUT with scope=governance.', requestId });
    return;
  }

  const body = parseBody(req);
  if (!body) {
    sendJson(res, 400, { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON body.', requestId });
    return;
  }

  let context;
  let reservation = null;
  let outputReserve = 0;
  try {
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    const { settings, databaseBacked } = await readServerAiSettings(context);
    if (!settings.enabled) {
      const paused = new Error('Brian AI đang được Admin tạm dừng.');
      paused.status = 503;
      paused.code = 'AI_DISABLED_BY_ADMIN';
      throw paused;
    }

    await enforceRateLimit(context, {
      feature: 'openrouter_gateway',
      perMinute: settings.perMinuteLimit,
      perDay: settings.dailyRequestLimit,
    });

    const normalized = normalizeRequest(body);
    if (!normalized.prompt.trim()) {
      sendJson(res, 400, { ok: false, code: 'EMPTY_PROMPT', error: 'AI prompt is empty.', requestId });
      return;
    }
    if (normalized.prompt.length > MAX_PROMPT_CHARS) {
      sendJson(res, 413, { ok: false, code: 'PROMPT_TOO_LARGE', error: 'The AI request is too large.', requestId });
      return;
    }

    const inputTokens = estimateTokens(`${normalized.systemInstruction}\n${normalized.prompt}`);
    outputReserve = resolveOutputLimit(settings, normalized.profile, normalized.requestedMaxOutputTokens);
    reservation = await reserveServerAiQuota(context, settings, { inputTokens, outputReserve });

    await appendApiAudit(context, {
      endpoint: '/api/ai',
      action: normalized.action,
      status: 'started',
      requestId,
      details: {
        provider: 'openrouter',
        model: settings.model,
        profile: normalized.profile,
        inputTokensEstimated: inputTokens,
        outputReserve,
        clientLabel: normalized.clientLabel,
        settingsSource: databaseBacked ? 'supabase' : 'environment',
      },
    });

    const result = await callOpenRouter({
      settings,
      prompt: normalized.prompt,
      systemInstruction: normalized.systemInstruction,
      attachments: normalized.attachments,
      temperature: normalized.temperature,
      responseMimeType: normalized.responseMimeType,
      maxOutputTokens: outputReserve,
      requestId,
      profile: normalized.profile,
      action: normalized.action,
    });

    const outputTokens = result.usage.outputTokens || estimateTokens(result.text);
    await settleServerAiQuota(context, { outputReserve, outputTokens, success: true });
    reservation = null;

    await appendApiAudit(context, {
      endpoint: '/api/ai',
      action: normalized.action,
      status: 'ok',
      requestId,
      details: {
        provider: 'openrouter',
        model: result.model,
        generationId: result.generationId,
        inputTokens: result.usage.inputTokens || inputTokens,
        outputTokens,
        totalTokens: result.usage.totalTokens || inputTokens + outputTokens,
        configuredModel: result.configuredModel,
        attempts: result.attempts,
        durationMs: result.durationMs,
      },
    });

    sendJson(res, 200, {
      ok: true,
      text: result.text,
      provider: 'openrouter',
      model: result.model,
      usage: result.usage,
      attempts: result.attempts?.length || 1,
      durationMs: result.durationMs || 0,
      requestId,
    });
  } catch (error) {
    if (context && reservation) {
      await settleServerAiQuota(context, { outputReserve, outputTokens: 0, success: false });
    }
    if (context) {
      await appendApiAudit(context, {
        endpoint: '/api/ai',
        action: String(body?.task || body?.mode || 'completion').slice(0, 80),
        status: error?.status === 429 ? 'blocked' : 'error',
        requestId,
        details: {
          provider: 'openrouter',
          code: String(error?.code || ''),
          error: String(error?.message || error).slice(0, 500),
          attempts: error?.attempts || [],
          durationMs: Number(error?.durationMs || 0),
          configuredModel: String(error?.configuredModel || ''),
        },
      });
    }
    if (error?.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
    sendJson(res, error?.status || 500, {
      ok: false,
      code: error?.code || 'AI_GATEWAY_ERROR',
      error: error?.message || 'AI request failed.',
      requestId,
    });
  }
}
