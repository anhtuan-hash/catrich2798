import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from './_security.js';
import { handleLessonAiRequest } from '../server/lessonAiHandler.js';
import { callServerAI, callServerImageAI, getServerAiReadiness, resolveServerAiProvider, streamServerAI } from '../server/unifiedAiProviderAdapter.js';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const MAX_TEXT = 12000;

function clip(value, max = MAX_TEXT) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '', null, 2);
  return text.length > max ? `${text.slice(0, max)}\n\n[Content truncated for safety.]` : text;
}

function send(res, status, payload) {
  res.statusCode = status;
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function buildPrompt(mode, payload = {}) {
  const sharedStyle = `Write in clear, practical English for a high-school English teacher. Keep formatting clean with Markdown headings and bullet points. Avoid vague advice. Give classroom-ready output, not a description of what you would do. Include answer keys, teacher notes, scoring rubrics, owners/deadlines, or student-facing feedback whenever relevant. Make the result complete enough to copy into class materials.`;

  if (mode === 'health') {
    return `${sharedStyle}\n\nReturn exactly: AI backend is ready.`;
  }

  if (mode === 'lessonBrief') {
    return `${sharedStyle}\n\nCreate a complete one-page lesson brief. Include: lesson snapshot, outcomes, materials, staged procedure with timing, teacher language, differentiation, assessment, homework, and follow-up.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'diagnostic') {
    return `${sharedStyle}\n\nAnalyze this class diagnostic data and produce: class profile, key weaknesses, likely causes, intervention groups, 3 follow-up activities, homework, and a short teacher action plan. Use the calculated summary when available.\n\nDiagnostic input:\n${clip(payload)}`;
  }

  if (mode === 'vault') {
    return `${sharedStyle}\n\nProcess this teaching resource. Return: 1) short summary, 2) suggested tags, 3) possible classroom use, 4) adaptation ideas for B2-C1 learners, 5) one quick activity based on it.\n\nResource:\n${clip(payload)}`;
  }

  if (mode === 'classInsight') {
    return `${sharedStyle}\n\nCreate a class insight report from this task/submission data. Include: completion summary, students needing attention, possible interventions, one message to the class, and next lesson priorities.\n\nClass task data:\n${clip(payload)}`;
  }

  if (mode === 'presentation') {
    return `${sharedStyle}\n\nCreate a concise slide deck for classroom presentation. Format strictly as slides separated by a line containing only --- . Each slide should have a title on the first line and short classroom-ready content after it. Include 7-10 slides, teacher-friendly tasks, and an exit ticket.\n\nPresentation input:\n${clip(payload)}`;
  }

  if (mode === 'template') {
    return `${sharedStyle}\n\nExpand this reusable template into a complete classroom-ready output. Preserve the teacher's original intention, make it practical, and include answer key or teacher notes when relevant.\n\nTemplate input:\n${clip(payload)}`;
  }


  if (mode === 'exam-builder-pro') {
    return `${sharedStyle}\n\nCreate a professional English test paper. Include a blueprint, sections, question items, answer key, short explanations, and notes for creating multiple test codes. Make the output suitable for THPT/B2-C1 use.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'worksheet-studio') {
    return `${sharedStyle}\n\nCreate a detailed worksheet with multiple activity types. Include clear instructions, at least several sample items per activity, answer key, and teacher notes. Use the requested level and number of items when provided.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'cloze-test-generator') {
    return `${sharedStyle}\n\nCreate cloze-test materials. Include passages, numbered gaps, four options when appropriate, answer key, and brief explanations. Focus on grammar, vocabulary, word form, collocation and discourse markers.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'word-formation-lab') {
    return `${sharedStyle}\n\nCreate high-level word formation practice. Avoid repeated content words when possible. Include word family awareness, MCQ or gap-fill items, answer key and explanations.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'interactive-game-factory') {
    return `${sharedStyle}\n\nDesign a classroom game from the teacher input. Include gameplay, teacher setup, student rules, scoring, timer, power-ups, question cards and a short debrief.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'presentation-builder') {
    return `${sharedStyle}\n\nCreate a slide deck and teacher script. Format slides separated by a line containing only --- . Include classroom interaction, clear slide titles, simple presenter language and an exit ticket.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'lesson-to-activity-converter') {
    return `${sharedStyle}\n\nConvert lesson notes into an interactive lesson flow. Include warm-up, input, controlled practice, freer practice, game idea, checking task, exit ticket and teacher language.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'teacher-workload-planner') {
    return `${sharedStyle}\n\nCreate a practical workload plan for a teacher. Prioritize tasks, split them by day/time block, mark urgent work, and suggest what can be postponed.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'class-performance-analyzer') {
    return `${sharedStyle}\n\nAnalyze score data fairly. Include class size, average, weak areas, support groups, fair interpretation, and next teaching actions. Avoid judging teachers by average alone.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'student-support-tracker') {
    return `${sharedStyle}\n\nCreate a student support plan. Include student groups, error patterns, interventions, short practice tasks, feedback notes and progress-check schedule.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'department-document-hub') {
    return `${sharedStyle}\n\nProcess department document notes. Return a summary, action checklist, owners/deadlines if present, suggested tags and follow-up tasks.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'student-practice-portal') {
    return `${sharedStyle}\n\nCreate a student practice set with instructions, questions, feedback for wrong answers, score guide and follow-up practice recommendations.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'vocabulary-mastery-app') {
    return `${sharedStyle}\n\nCreate a vocabulary mastery plan. Include flashcards, word families, example sentences, cloze practice, retrieval practice and spaced review schedule.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'speaking-practice-room') {
    return `${sharedStyle}\n\nCreate speaking practice materials. Include speaking cards, follow-up questions, model answer frames, timing, teacher prompts and optional challenge tasks.\n\nTeacher input:\n${clip(payload)}`;
  }

  if (mode === 'meeting-minutes-assistant') {
    return `${sharedStyle}\n\nTurn rough meeting notes into formal meeting minutes. Include agenda, discussion summary, decisions, action items, owners, deadlines and next steps.\n\nTeacher input:\n${clip(payload)}`;
  }

  return `${sharedStyle}\n\nHelp the teacher with this request:\n${clip(payload)}`;
}

function isUnifiedContract(body = {}) {
  return String(body?.contract || '').startsWith('bes-ai-core/') || typeof body?.prompt === 'string';
}

function anonymousContext(req) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return { user: { id: `anonymous:${ip}` }, role: 'teacher', ip, client: {}, adminClient: {} };
}

async function authorizeAi(req) {
  const mode = String(process.env.AI_AUTH_MODE || '').trim().toLowerCase();
  if (mode === 'none') return anonymousContext(req);
  return requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
}

function sseHeaders(res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

function sse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req, res) {
  let routedBody = req.body;
  if (typeof routedBody === 'string') {
    try { routedBody = JSON.parse(routedBody || '{}'); } catch { routedBody = null; }
  }
  const lessonTask = String(routedBody?.task || '');
  if (req.method === 'OPTIONS' || (!isUnifiedContract(routedBody) && ['rewrite', 'generate-resource', 'lesson-assistant', 'health'].includes(lessonTask))) {
    return handleLessonAiRequest(req, res);
  }

  const requestId = createRequestId();
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed. Use POST.', requestId });

  let body = routedBody;
  if (!body || typeof body !== 'object') return sendJson(res, 400, { ok: false, error: 'Invalid JSON body.', requestId });
  const rawLength = JSON.stringify(body).length;
  if (rawLength > 4_200_000) return sendJson(res, 413, { ok: false, error: 'The AI request is too large.', code: 'AI_REQUEST_TOO_LARGE', requestId });

  let context;
  try {
    context = await authorizeAi(req);
    await enforceRateLimit(context, { feature: 'ai_gateway_v1240', perMinute: 18, perDay: 300 });
  } catch (error) {
    if (error?.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
    return sendJson(res, error?.status || 401, { ok: false, error: error?.message || 'Authentication failed.', code: error?.code || 'AI_AUTH_ERROR', requestId });
  }

  const readiness = getServerAiReadiness();
  const operation = String(body.operation || (body.mode === 'health' ? 'health' : 'chat'));
  if (operation === 'health') {
    await appendApiAudit(context, { endpoint: '/api/ai', action: 'health', status: readiness.configured ? 'ok' : 'error', requestId, details: readiness });
    return sendJson(res, readiness.configured ? 200 : 503, { ok: readiness.configured, ...readiness, requestId, error: readiness.configured ? '' : 'OPENROUTER_API_KEY is not configured on Vercel.' });
  }
  if (!readiness.configured) return sendJson(res, 503, { ok: false, error: 'OPENROUTER_API_KEY is not configured on Vercel.', code: 'OPENROUTER_SERVER_KEY_MISSING', requestId, ...readiness });

  if (operation === 'image') {
    try {
      await appendApiAudit(context, { endpoint: '/api/ai', action: 'image', status: 'started', requestId, details: { taskId: body.taskId || 'image-edit' } });
      const result = await callServerImageAI({ prompt: body.prompt, imageDataUrl: body.imageDataUrl, requestId });
      await appendApiAudit(context, { endpoint: '/api/ai', action: 'image', status: 'ok', requestId, details: { model: result.model, durationMs: result.durationMs } });
      return sendJson(res, 200, { ok: true, ...result, requestId, contract: 'bes-ai-core/1.3' });
    } catch (error) {
      await appendApiAudit(context, { endpoint: '/api/ai', action: 'image', status: 'error', requestId, details: { error: String(error?.message || error).slice(0, 300) } });
      return sendJson(res, Number(error?.status || 500), { ok: false, error: error?.message || 'Image generation failed.', code: error?.code || 'OPENROUTER_IMAGE_ERROR', requestId });
    }
  }

  const unified = isUnifiedContract(body);
  const mode = unified ? 'unified' : String(body?.mode || 'general');
  const payload = body?.payload ?? {};
  const prompt = unified ? String(body.prompt || '').trim() : buildPrompt(mode, payload);
  if (!prompt) return sendJson(res, 400, { ok: false, error: 'AI prompt is empty.', code: 'AI_PROMPT_EMPTY', requestId });
  const options = {
    prompt,
    systemInstruction: String(body.systemInstruction || ''),
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    responseMimeType: String(body.responseMimeType || ''),
    maxOutputTokens: Math.max(16, Math.min(12_000, Number(body.maxOutputTokens) || 3600)),
    temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.25,
    taskId: String(body.taskId || body.registryTaskId || mode || 'default'),
    routingHint: String(body.routingHint || 'smart'),
    requestedModel: String(body.requestedModel || ''),
    requestId,
    sessionId: String(body.sessionId || body.operationId || ''),
  };
  const wantsStream = Boolean(body.stream) && options.responseMimeType !== 'application/json';
  await appendApiAudit(context, { endpoint: '/api/ai', action: options.taskId, status: 'started', requestId, details: { promptCharacters: prompt.length, maxOutputTokens: options.maxOutputTokens, responseMimeType: options.responseMimeType, streaming: wantsStream } });

  if (wantsStream) {
    sseHeaders(res);
    sse(res, 'status', { phase: 'connecting', requestId, provider: 'openrouter', transport: 'server-gateway-stream' });
    try {
      const result = await streamServerAI(options, {
        onToken: (delta) => sse(res, 'token', { delta }),
        onUsage: (usage) => sse(res, 'status', { phase: 'usage', usage }),
      });
      sse(res, 'done', { ok: true, ...result, requestId, contract: 'bes-ai-core/1.3' });
      res.end();
      await appendApiAudit(context, { endpoint: '/api/ai', action: options.taskId, status: 'ok', requestId, details: { model: result.model, durationMs: result.durationMs, streaming: true, fallbackUsed: result.fallbackUsed, creditFallback: result.creditFallback, actualMaxTokens: result.actualMaxTokens } });
      return;
    } catch (error) {
      sse(res, 'error', { ok: false, error: error?.message || 'AI stream failed.', code: error?.code || 'OPENROUTER_STREAM_ERROR', status: Number(error?.status || 500), requestId });
      res.end();
      await appendApiAudit(context, { endpoint: '/api/ai', action: options.taskId, status: 'error', requestId, details: { error: String(error?.message || error).slice(0, 300), streaming: true } });
      return;
    }
  }

  try {
    const result = await callServerAI(options);
    await appendApiAudit(context, { endpoint: '/api/ai', action: options.taskId, status: 'ok', requestId, details: { model: result.model, requestedModel: result.requestedModel, profile: result.profile, durationMs: result.durationMs, providerAttempts: result.providerAttempts, fallbackUsed: result.fallbackUsed, creditFallback: result.creditFallback, actualMaxTokens: result.actualMaxTokens } });
    return sendJson(res, 200, { ok: true, ...result, requestId, contract: 'bes-ai-core/1.3' });
  } catch (error) {
    await appendApiAudit(context, { endpoint: '/api/ai', action: options.taskId, status: 'error', requestId, details: { error: String(error?.message || error).slice(0, 300), code: error?.code || '' } });
    const status = Number(error?.status || 500);
    return sendJson(res, status, { ok: false, error: error?.message || 'AI request failed.', code: error?.code || 'OPENROUTER_REQUEST_FAILED', requestId, retryAfterMs: Math.max(0, Number(error?.retryAfter || 0) * 1000) });
  }
}
