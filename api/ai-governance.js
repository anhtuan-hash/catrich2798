import { appendApiAudit, createRequestId, requireApprovedUser, sendJson } from './_security.js';
import { readServerAiSettings, writeServerAiSettings } from '../server/openrouterGateway.js';

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

export default async function handler(req, res) {
  const requestId = createRequestId();
  if (!['GET', 'PUT'].includes(req.method)) {
    sendJson(res, 405, { ok: false, error: 'Method not allowed.', requestId });
    return;
  }

  try {
    const context = await requireApprovedUser(req, { roles: ['admin'] });
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const settings = await writeServerAiSettings(context, body.settings || body);
      await appendApiAudit(context, {
        endpoint: '/api/ai-governance',
        action: 'update_settings',
        status: 'ok',
        requestId,
        details: { model: settings.model, enabled: settings.enabled, dailyRequestLimit: settings.dailyRequestLimit, dailyTokenBudget: settings.dailyTokenBudget },
      });
    }

    const config = await readServerAiSettings(context);
    const runtime = await usageAndAudit(context);
    sendJson(res, 200, {
      ok: true,
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      provider: 'openrouter',
      settings: config.settings,
      settingsSource: config.databaseBacked ? 'supabase' : 'environment',
      ...runtime,
      requestId,
    });
  } catch (error) {
    sendJson(res, error?.status || 500, {
      ok: false,
      code: error?.code || 'AI_GOVERNANCE_ERROR',
      error: error?.message || 'Unable to load AI Governance.',
      requestId,
    });
  }
}
