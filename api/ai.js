import { appendApiAudit, createRequestId, enforceRateLimit, requireApprovedUser, sendJson } from './_security.js';
import { handleLessonAiRequest } from '../server/lessonAiHandler.js';
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

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

export default async function handler(req, res) {
  let routedBody = req.body;
  if (typeof routedBody === 'string') {
    try { routedBody = JSON.parse(routedBody || '{}'); } catch { routedBody = null; }
  }
  const lessonTask = String(routedBody?.task || '');
  if (req.method === 'OPTIONS' || ['rewrite', 'generate-resource', 'lesson-assistant', 'health'].includes(lessonTask)) {
    return handleLessonAiRequest(req, res);
  }

  const requestId = createRequestId();
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed. Use POST.', requestId });
    return;
  }

  let context;
  try {
    context = await requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] });
    await enforceRateLimit(context, { feature: 'ai_gateway', perMinute: 12, perDay: 160 });
  } catch (error) {
    if (error?.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
    sendJson(res, error?.status || 401, { ok: false, error: error?.message || 'Authentication failed.', requestId });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await appendApiAudit(context, { endpoint: '/api/ai', action: 'configuration_check', status: 'error', requestId });
    sendJson(res, 503, {
      ok: false,
      error: 'The server AI provider is not configured.',
      requestId,
    });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body.', requestId });
      return;
    }
  }

  const allowedModes = new Set([
    'health','general','lessonBrief','diagnostic','vault','classInsight','presentation','template',
    'exam-builder-pro','worksheet-studio','cloze-test-generator','word-formation-lab',
    'interactive-game-factory','presentation-builder','lesson-to-activity-converter',
    'teacher-workload-planner','class-performance-analyzer','student-support-tracker',
    'department-document-hub','student-practice-portal','vocabulary-mastery-app',
    'speaking-practice-room','meeting-minutes-assistant',
  ]);
  const mode = String(body?.mode || 'general');
  if (!allowedModes.has(mode)) {
    sendJson(res, 400, { ok: false, error: 'Unsupported AI mode.', requestId });
    return;
  }
  const payload = body?.payload ?? {};
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (serialized.length > 20_000) {
    sendJson(res, 413, { ok: false, error: 'The AI request is too large.', requestId });
    return;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const prompt = buildPrompt(mode, payload);
  await appendApiAudit(context, {
    endpoint: '/api/ai', action: mode, status: 'started', requestId,
    details: { model, promptCharacters: prompt.length },
  });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Client-Request-Id': requestId,
      },
      body: JSON.stringify({ model, input: prompt, max_output_tokens: 3600 }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await appendApiAudit(context, {
        endpoint: '/api/ai', action: mode, status: 'provider_error', requestId,
        details: { providerStatus: response.status },
      });
      sendJson(res, response.status >= 500 ? 502 : response.status, {
        ok: false,
        error: data?.error?.message || `AI provider request failed with status ${response.status}.`,
        requestId,
      });
      return;
    }

    const text = extractOutputText(data);
    if (!text) {
      sendJson(res, 502, { ok: false, error: 'AI returned no text output.', requestId });
      return;
    }

    await appendApiAudit(context, {
      endpoint: '/api/ai', action: mode, status: 'ok', requestId,
      details: { model, outputCharacters: text.length },
    });
    sendJson(res, 200, { ok: true, text, model, requestId });
  } catch (error) {
    await appendApiAudit(context, {
      endpoint: '/api/ai', action: mode, status: 'error', requestId,
      details: { error: String(error?.message || error).slice(0, 300) },
    });
    sendJson(res, 500, { ok: false, error: error?.message || 'AI request failed.', requestId });
  }
}
