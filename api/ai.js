const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const MAX_TEXT = 12000;

const MAX_BODY_BYTES = 180000;
const MAX_OUTPUT_TOKENS = Math.max(256, Math.min(6000, Number(process.env.AI_MAX_OUTPUT_TOKENS || 3600)));
const REQUEST_TIMEOUT_MS = Math.max(8000, Math.min(90000, Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000)));
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = Math.max(3, Math.min(120, Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 24)));
const rateBuckets = globalThis.__besAiRateBuckets || (globalThis.__besAiRateBuckets = new Map());
const ALLOWED_MODES = new Set([
  'general', 'health', 'lessonBrief', 'diagnostic', 'vault', 'classInsight', 'presentation', 'template',
  'exam-builder-pro', 'worksheet-studio', 'cloze-test-generator', 'word-formation-lab', 'interactive-game-factory',
  'presentation-builder', 'lesson-to-activity-converter', 'teacher-workload-planner', 'class-performance-analyzer',
  'student-support-tracker', 'department-document-hub', 'student-practice-portal', 'vocabulary-mastery-app',
  'speaking-practice-room', 'meeting-minutes-assistant',
]);

function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function enforceRateLimit(req) {
  const now = Date.now();
  const key = requestIp(req);
  const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= RATE_WINDOW_MS) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 2000) {
    for (const [ip, item] of rateBuckets) if (now - item.start > RATE_WINDOW_MS * 2) rateBuckets.delete(ip);
  }
  return { ok: bucket.count <= RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - bucket.count), resetAt: bucket.start + RATE_WINDOW_MS };
}

function requestId() {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSameOrigin(req) {
  const origin = String(req.headers.origin || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}


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
  const id = requestId();
  res.setHeader('X-Request-Id', id);
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed. Use POST.', requestId: id });
    return;
  }
  if (!isSameOrigin(req)) {
    send(res, 403, { ok: false, error: 'Cross-origin AI requests are not allowed.', requestId: id });
    return;
  }
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    send(res, 413, { ok: false, error: 'AI request payload is too large.', requestId: id });
    return;
  }
  const rate = enforceRateLimit(req);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)));
  if (!rate.ok) {
    send(res, 429, { ok: false, error: 'Too many AI requests. Please wait before trying again.', requestId: id });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    send(res, 500, {
      ok: false,
      error: 'OPENAI_API_KEY is not configured on the server. Add it in Vercel Environment Variables, then redeploy.',
      requestId: id,
    });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      if (typeof body === 'string' && Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw new Error('Request body too large.');
      body = JSON.parse(body || '{}');
    } catch (error) {
      send(res, error?.message?.includes('large') ? 413 : 400, { ok: false, error: error?.message || 'Invalid JSON body.', requestId: id });
      return;
    }
  }

  const { mode = 'general', payload = {} } = body || {};
  if (!ALLOWED_MODES.has(mode)) {
    send(res, 400, { ok: false, error: 'Unsupported AI task mode.', requestId: id });
    return;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const allowedModels = String(process.env.OPENAI_ALLOWED_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (allowedModels.length && !allowedModels.includes(model)) {
    send(res, 500, { ok: false, error: 'Configured AI model is not in OPENAI_ALLOWED_MODELS.', requestId: id });
    return;
  }
  const prompt = buildPrompt(mode, payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Client-Request-Id': id,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: MAX_OUTPUT_TOKENS,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      send(res, response.status, {
        ok: false,
        error: data?.error?.message || `OpenAI request failed with status ${response.status}.`,
        requestId: id,
      });
      return;
    }

    const text = extractOutputText(data);
    if (!text) {
      send(res, 502, { ok: false, error: 'AI returned no text output.', requestId: id });
      return;
    }

    send(res, 200, { ok: true, text, model, requestId: id });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    send(res, timedOut ? 504 : 500, { ok: false, error: timedOut ? 'AI request timed out.' : (error?.message || 'AI request failed.'), requestId: id });
  } finally {
    clearTimeout(timer);
  }
}
