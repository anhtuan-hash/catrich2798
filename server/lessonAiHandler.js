import { callServerAI, fetchWithAiTimeout, getServerAiReadiness, resolveServerAiProvider } from './unifiedAiProviderAdapter.js';

const json = (res, status, payload, extraHeaders = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
};

const safeJson = (value, max = 28_000) => JSON.stringify(value || {}, null, 2).slice(0, max);

const baseRules = `You are an expert Vietnamese upper-secondary English lesson-plan editor.
The user works with Grade 10–12 English under the 2018 general education curriculum.
Use classroom-ready English unless bilingual output is explicitly requested.
Never include real student names, contact details, grades, diagnoses, photos, voiceprints, or other personal data.
Preserve the core language objective and original subject content.
Digital/AI integration must include an observable product, assessment evidence, a safety rule, and an offline/non-AI alternative.
AI must not replace independent student thinking. Treat AI output as unverified until checked.`;

const rewritePrompt = (body) => `${baseRules}

TASK: Rewrite one proposed integration.
Return only the complete replacement section content. Begin with the original section content, then add the improved integration.
The integration must be concise and realistic for the available lesson time.

USER INSTRUCTION:
${String(body.instruction || 'Improve clarity, measurability and feasibility.').slice(0, 2_000)}

LESSON METADATA:
${safeJson(body.lesson)}

SECTION:
${safeJson(body.section)}

CURRENT PROPOSAL:
${safeJson(body.proposal)}

CONSTRAINTS:
${safeJson(body.constraints)}`;

const resourcePrompt = (body) => `${baseRules}

TASK: Generate a ${String(body.resourceType || 'worksheet')} that directly matches the lesson below.
Return only the finished reusable resource text, without commentary.
Requirements:
- Match the requested CEFR difficulty and item count.
- Avoid duplicate questions and repeated answer patterns.
- Make every item answerable from the lesson content or clearly supplied input.
- Include an answer key when the resource type normally requires one.
- For AI activities, include verification and reflection rather than answer copying.
- For bilingual mode, use concise English/Vietnamese labels, but keep language-learning content in English.

OPTIONS:
${safeJson(body.options)}

LESSON METADATA:
${safeJson(body.lesson)}

LESSON SECTIONS:
${safeJson(body.sections, 45_000)}

ACCEPTED INTEGRATIONS:
${safeJson(body.acceptedIntegrations, 25_000)}

CURRENT DRAFT TO IMPROVE:
${String(body.currentDraft || '').slice(0, 35_000)}

CONSTRAINTS:
${safeJson(body.constraints)}`;


const assistantPrompt = (body) => `${baseRules}

TASK: Act as an AI Copilot inside the lesson-integration workspace.
Action: ${String(body.action || 'analyze')}
Return a classroom-ready answer in Vietnamese, while keeping examples, objectives, tasks and student-facing language in English when appropriate.
Use clear Markdown headings. Be specific and concise.
Do not invent curriculum facts not supported by the supplied lesson.
When proposing digital or AI use, include an observable product, verification step, safety rule and offline alternative.
If a selected proposal is supplied, prioritize it.

TEACHER INSTRUCTION:
${String(body.instruction || 'Analyze and improve the lesson.').slice(0, 4_000)}

LESSON METADATA:
${safeJson(body.lesson)}

LESSON SECTIONS:
${safeJson(body.sections, 58_000)}

CURRENT PROPOSALS:
${safeJson(body.proposals, 35_000)}

SELECTED PROPOSAL:
${safeJson(body.selectedProposal, 12_000)}

QUALITY AUDIT:
${safeJson(body.audit, 12_000)}

CONSTRAINTS:
${safeJson(body.constraints)}`;

const buildPrompt = (body) => body.task === 'generate-resource' ? resourcePrompt(body) : body.task === 'lesson-assistant' ? assistantPrompt(body) : rewritePrompt(body);

const authMode = () => {
  const explicit = String(process.env.AI_AUTH_MODE || '').trim().toLowerCase();
  if (explicit) return ['none', 'supabase'].includes(explicit) ? explicit : 'invalid';
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) ? 'supabase' : 'none';
};

const requestOrigin = (req) => String(req.headers?.origin || '');
const allowedOrigins = () => String(process.env.AI_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);

const validateOrigin = (req) => {
  const allowed = allowedOrigins();
  const origin = requestOrigin(req);
  if (!allowed.length || !origin) return true;
  return allowed.includes(origin);
};

const corsHeaders = (req) => {
  const origin = requestOrigin(req);
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
};

const getBearerToken = (req) => {
  const header = String(req.headers?.authorization || req.headers?.Authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
};

const verifySupabaseUser = async (req) => {
  const mode = authMode();
  if (mode === 'invalid') throw Object.assign(new Error('AI_AUTH_MODE must be either none or supabase.'), { status: 503 });
  if (mode === 'none') return { mode, userId: 'anonymous' };
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');
  if (!url || !anonKey) throw Object.assign(new Error('Supabase AI authentication is not configured.'), { status: 503 });
  const token = getBearerToken(req);
  if (!token) throw Object.assign(new Error('Authentication required.'), { status: 401 });
  const response = await fetchWithAiTimeout(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  }, 12_000);
  if (!response.ok) throw Object.assign(new Error('Invalid or expired authentication token.'), { status: 401 });
  const user = await response.json();
  if (!user?.id) throw Object.assign(new Error('Authenticated user is invalid.'), { status: 401 });
  return { mode, userId: String(user.id) };
};

const rateState = globalThis.__elisAiRateState || new Map();
globalThis.__elisAiRateState = rateState;
const enforceRateLimit = (req, identity) => {
  const limit = Math.max(1, Math.min(60, Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 10)));
  const now = Date.now();
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = `${identity}:${ip}`;
  const recent = (rateState.get(key) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((60_000 - (now - recent[0])) / 1000));
    throw Object.assign(new Error('AI request limit reached. Please try again shortly.'), { status: 429, retryAfter });
  }
  recent.push(now);
  rateState.set(key, recent);
  if (rateState.size > 2_000) {
    for (const [entryKey, values] of rateState.entries()) {
      if (!values.some((timestamp) => now - timestamp < 60_000)) rateState.delete(entryKey);
    }
  }
};

export async function handleLessonAiRequest(req, res) {
  if (!validateOrigin(req)) return json(res, 403, { error: 'Origin is not allowed.' });
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Cache-Control', 'no-store');
    Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value));
    res.end();
    return;
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' }, cors);

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (rawBody.length > 140_000) return json(res, 413, { error: 'Request is too large.' }, cors);
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return json(res, 400, { error: 'Invalid JSON body.' }, cors); }
    if (!['rewrite', 'generate-resource', 'lesson-assistant', 'health'].includes(body.task)) return json(res, 400, { error: 'Unsupported task.' }, cors);
    const provider = resolveServerAiProvider(body.provider);

    const auth = await verifySupabaseUser(req);
    enforceRateLimit(req, auth.userId);

    if (body.task === 'health') {
      const readiness = getServerAiReadiness(provider);
      return json(res, 200, { ...readiness, task: 'health', authMode: auth.mode }, cors);
    }
    const prompt = buildPrompt(body);
    const result = await callServerAI({
      provider,
      prompt,
      maxOutputTokens: 12_000,
      temperature: 0.2,
      requestId: String(body.requestId || ''),
    });
    return json(res, 200, { ...result, task: body.task }, cors);
  } catch (error) {
    const status = Number(error?.status || 500);
    const message = error?.name === 'AbortError' ? 'AI provider timed out.' : error instanceof Error ? error.message : 'Unknown server error.';
    const headers = status === 429 && error?.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {};
    return json(res, status, { error: message }, { ...cors, ...headers });
  }
}
