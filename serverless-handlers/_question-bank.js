import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const MAX_BATCH = 200;
const MAX_SEARCH = 100;
const RATE_WINDOWS = new Map();

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(payload);
}

function serverClient() {
  const url = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    const error = new Error('Brian server is missing its Supabase service configuration.');
    error.status = 503;
    throw error;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function cleanText(value, max = 20000) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanInline(value, max = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanArray(value, maxItems = 24, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((entry) => cleanInline(entry, maxLength)).filter(Boolean);
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function gradeValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const grade = clampInt(value, 1, 12, 0);
  return grade || null;
}

function visibilityValue(value) {
  return cleanInline(value, 32).toLowerCase() === 'department' ? 'department' : 'private';
}

function statusValue(value) {
  const status = cleanInline(value, 32).toLowerCase();
  return ['draft', 'approved', 'archived', 'review'].includes(status) ? status : 'draft';
}

function cognitiveValue(value) {
  const raw = cleanInline(value, 80).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (raw.includes('nhan biet') || raw.includes('recognition') || raw.includes('remember')) return 'recognition';
  if (raw.includes('thong hieu') || raw.includes('comprehension') || raw.includes('understand')) return 'comprehension';
  if (raw.includes('van dung') || raw.includes('application') || raw.includes('apply')) return 'application';
  return raw || 'recognition';
}

function normalizeOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((option) => {
    if (option && typeof option === 'object') {
      return cleanText(option.text ?? option.value ?? option.label ?? '', 4000);
    }
    return cleanText(option, 4000);
  }).filter(Boolean);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function questionFingerprint(question, bundleFingerprint = '') {
  const normalized = {
    bundle: bundleFingerprint,
    stem: cleanText(question.stem || question.question || '', 30000).replace(/\s+/g, ' ').toLowerCase(),
    options: normalizeOptions(question.options || question.choices).map((item) => item.replace(/\s+/g, ' ').toLowerCase()),
    correct: cleanInline(question.correctAnswer ?? question.correct_answer ?? question.answer ?? '', 500).toLowerCase(),
  };
  return sha256(JSON.stringify(normalized));
}

function bundleFingerprint(bundle = {}) {
  return sha256(JSON.stringify({
    title: cleanInline(bundle.title || '', 500).toLowerCase(),
    context: cleanText(bundle.contextText ?? bundle.context_text ?? bundle.passage ?? bundle.text ?? '', 80000)
      .replace(/\s+/g, ' ').toLowerCase(),
    instructions: cleanText(bundle.instructions || '', 10000).replace(/\s+/g, ' ').toLowerCase(),
  }));
}

function bearer(req) {
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || cleanInline(req.headers['x-brian-question-bank-key'], 500);
}

function rateLimit(key) {
  const now = Date.now();
  const windowMs = 60_000;
  const current = RATE_WINDOWS.get(key);
  if (!current || now >= current.resetAt) {
    RATE_WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  RATE_WINDOWS.set(key, current);
  if (current.count > 60) {
    const error = new Error('Too many Question Bank requests. Please retry shortly.');
    error.status = 429;
    throw error;
  }
}

async function authorize(req) {
  const token = bearer(req);
  if (!token || token.length < 24) {
    const error = new Error('Missing or invalid Brian Question Bank connection key.');
    error.status = 401;
    throw error;
  }
  rateLimit(sha256(token));
  const db = serverClient();
  const tokenHash = sha256(token);
  const { data, error } = await db
    .from('question_bank_integrations')
    .select('id,owner_id,provider,label,active')
    .eq('token_hash', tokenHash)
    .eq('active', true)
    .maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data?.owner_id) {
    const authError = new Error('This Brian Question Bank connection is not active.');
    authError.status = 401;
    throw authError;
  }
  await db.from('question_bank_integrations')
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', data.id);
  return { db, integration: data, ownerId: data.owner_id };
}

async function findByFingerprints(db, ownerId, fingerprints = []) {
  const result = new Map();
  for (let offset = 0; offset < fingerprints.length; offset += 40) {
    const chunk = fingerprints.slice(offset, offset + 40);
    if (!chunk.length) continue;
    const { data, error } = await db
      .from('assessment_items')
      .select('id,fingerprint,stem,options,correct_answer')
      .eq('owner_id', ownerId)
      .in('fingerprint', chunk);
    if (error) throw new Error(error.message);
    (data || []).forEach((row) => result.set(row.fingerprint, row));
  }
  return result;
}

async function saveBundle(session, bundle, payloadMeta) {
  if (!bundle || typeof bundle !== 'object') return { row: null, created: false, fingerprint: '' };
  const contextText = cleanText(bundle.contextText ?? bundle.context_text ?? bundle.passage ?? bundle.text ?? '', 80000);
  const title = cleanInline(bundle.title || 'Question bundle', 500);
  if (!contextText && !title) return { row: null, created: false, fingerprint: '' };
  const fingerprint = bundleFingerprint(bundle);
  const { data: existing, error: findError } = await session.db
    .from('assessment_bundles')
    .select('*')
    .eq('owner_id', session.ownerId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return { row: existing, created: false, fingerprint };

  const row = {
    owner_id: session.ownerId,
    visibility: visibilityValue(bundle.visibility),
    title,
    bundle_type: cleanInline(bundle.bundleType ?? bundle.bundle_type ?? 'passage', 80) || 'passage',
    context_text: contextText,
    instructions: cleanText(bundle.instructions || '', 10000),
    topic: cleanInline(bundle.topic || '', 240),
    skill: cleanInline(bundle.skill || '', 120),
    grade: gradeValue(bundle.grade),
    unit_name: cleanInline(bundle.unitName ?? bundle.unit_name ?? '', 120),
    school_year: cleanInline(bundle.schoolYear ?? bundle.school_year ?? payloadMeta.schoolYear ?? '', 40),
    source: cleanInline(bundle.source ?? payloadMeta.source ?? 'ChatGPT', 500),
    source_kind: 'chatgpt',
    source_reference: cleanText(bundle.sourceReference ?? bundle.source_reference ?? payloadMeta.sourceReference ?? '', 1000),
    status: statusValue(bundle.status),
    fingerprint,
    metadata: {
      ...(bundle.metadata && typeof bundle.metadata === 'object' ? bundle.metadata : {}),
      generator: 'ChatGPT',
      conversationRef: cleanInline(payloadMeta.conversationRef || '', 300),
      importedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await session.db.from('assessment_bundles').insert(row).select('*').single();
  if (error) {
    if (String(error.code || '') === '23505') {
      const { data: raced, error: racedError } = await session.db
        .from('assessment_bundles')
        .select('*')
        .eq('owner_id', session.ownerId)
        .eq('fingerprint', fingerprint)
        .maybeSingle();
      if (!racedError && raced) return { row: raced, created: false, fingerprint };
    }
    throw new Error(error.message);
  }
  return { row: data, created: true, fingerprint };
}

function questionRow(question, session, bundleInfo, payloadMeta, index) {
  const options = normalizeOptions(question.options || question.choices);
  const fingerprint = questionFingerprint(question, bundleInfo.fingerprint);
  return {
    owner_id: session.ownerId,
    bundle_id: bundleInfo.row?.id || null,
    bundle_position: bundleInfo.row ? (clampInt(question.bundlePosition ?? question.bundle_position, 1, 999, index + 1)) : null,
    visibility: visibilityValue(question.visibility ?? payloadMeta.visibility),
    status: statusValue(question.status ?? payloadMeta.status),
    question_type: cleanInline(question.questionType ?? question.question_type ?? 'mcq', 80) || 'mcq',
    stem: cleanText(question.stem ?? question.question ?? '', 30000),
    options,
    correct_answer: cleanText(question.correctAnswer ?? question.correct_answer ?? question.answer ?? '', 4000),
    explanation: cleanText(question.explanation ?? question.rationale ?? '', 12000),
    skill: cleanInline(question.skill ?? payloadMeta.skill ?? 'Use of English', 120) || 'Use of English',
    cefr: cleanInline(question.cefr ?? payloadMeta.cefr ?? 'B1', 20) || 'B1',
    topic: cleanInline(question.topic ?? payloadMeta.topic ?? '', 240),
    cognitive_level: cognitiveValue(question.cognitiveLevel ?? question.cognitive_level ?? payloadMeta.cognitiveLevel),
    difficulty: clampInt(question.difficulty ?? payloadMeta.difficulty, 1, 5, 2),
    source: cleanInline(question.source ?? payloadMeta.source ?? 'ChatGPT', 500),
    grade: gradeValue(question.grade ?? payloadMeta.grade),
    unit_name: cleanInline(question.unitName ?? question.unit_name ?? payloadMeta.unitName ?? '', 120),
    school_year: cleanInline(question.schoolYear ?? question.school_year ?? payloadMeta.schoolYear ?? '', 40),
    grammar_point: cleanInline(question.grammarPoint ?? question.grammar_point ?? '', 240),
    tags: cleanArray(question.tags, 24, 120),
    source_kind: 'chatgpt',
    source_reference: cleanText(question.sourceReference ?? question.source_reference ?? payloadMeta.sourceReference ?? '', 1000),
    fingerprint,
    import_metadata: {
      generator: 'ChatGPT',
      conversationRef: cleanInline(payloadMeta.conversationRef || '', 300),
      model: cleanInline(payloadMeta.model || '', 120),
      importedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

async function saveQuestions(session, payload, { recordEvent = true } = {}) {
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (!questions.length) throw Object.assign(new Error('No questions were supplied.'), { status: 400 });
  if (questions.length > MAX_BATCH) {
    throw Object.assign(new Error(`A single import may contain at most ${MAX_BATCH} questions.`), { status: 400 });
  }
  const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : payload;
  const bundleInfo = await saveBundle(session, payload.bundle, meta);
  const rows = questions.map((question, index) => questionRow(question || {}, session, bundleInfo, meta, index));
  if (rows.some((row) => !row.stem)) {
    throw Object.assign(new Error('Every question must include a non-empty stem/question field.'), { status: 400 });
  }

  const existing = await findByFingerprints(session.db, session.ownerId, rows.map((row) => row.fingerprint));
  const freshByFingerprint = new Map();
  rows.forEach((row) => {
    if (!existing.has(row.fingerprint) && !freshByFingerprint.has(row.fingerprint)) {
      freshByFingerprint.set(row.fingerprint, row);
    }
  });
  const freshRows = [...freshByFingerprint.values()];
  let inserted = [];
  if (freshRows.length) {
    const { data, error } = await session.db.from('assessment_items').insert(freshRows).select('id,fingerprint,stem');
    if (error) {
      if (String(error.code || '') !== '23505') throw new Error(error.message);
    } else {
      inserted = data || [];
    }
  }

  const allKnown = await findByFingerprints(session.db, session.ownerId, rows.map((row) => row.fingerprint));
  inserted.forEach((row) => allKnown.set(row.fingerprint, row));
  const ordered = rows.map((row) => allKnown.get(row.fingerprint)).filter(Boolean);
  const importedCount = inserted.length;
  const reusedCount = Math.max(0, rows.length - importedCount);

  if (recordEvent) {
    await recordImport(session, payload, {
      importedItems: importedCount,
      reusedItems: reusedCount,
      importedBundles: bundleInfo.created ? 1 : 0,
      importedTests: 0,
      title: cleanInline(meta.title || payload.bundle?.title || '', 300),
    });
  }

  return {
    items: ordered,
    itemIds: ordered.map((row) => row.id),
    importedCount,
    reusedCount,
    bundle: bundleInfo.row,
    bundleCreated: bundleInfo.created,
  };
}

async function saveExam(session, payload) {
  const exam = payload.exam && typeof payload.exam === 'object' ? payload.exam : payload;
  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  if (!questions.length) throw Object.assign(new Error('The exam must contain questions.'), { status: 400 });
  const meta = {
    ...(payload.meta && typeof payload.meta === 'object' ? payload.meta : {}),
    ...(exam.meta && typeof exam.meta === 'object' ? exam.meta : {}),
    title: exam.title,
    grade: exam.grade,
    schoolYear: exam.schoolYear ?? exam.school_year,
    source: exam.source ?? 'ChatGPT',
    sourceReference: exam.sourceReference ?? exam.source_reference,
    visibility: exam.visibility,
    status: exam.questionStatus ?? 'draft',
  };
  const savedQuestions = await saveQuestions(session, {
    questions,
    bundle: exam.bundle || payload.bundle,
    meta,
  }, { recordEvent: false });

  let blueprintId = null;
  const blueprint = exam.blueprint && typeof exam.blueprint === 'object' ? exam.blueprint : null;
  if (blueprint) {
    const { data, error } = await session.db.from('assessment_blueprints').insert({
      owner_id: session.ownerId,
      visibility: visibilityValue(blueprint.visibility ?? exam.visibility),
      title: cleanInline(blueprint.title || `${exam.title || 'Exam'} blueprint`, 500),
      total_items: savedQuestions.itemIds.length,
      criteria: blueprint.criteria && typeof blueprint.criteria === 'object' ? blueprint.criteria : blueprint,
      updated_at: new Date().toISOString(),
    }).select('id').single();
    if (error) throw new Error(error.message);
    blueprintId = data?.id || null;
  }

  const testRow = {
    owner_id: session.ownerId,
    blueprint_id: blueprintId,
    visibility: visibilityValue(exam.visibility),
    title: cleanInline(exam.title || 'ChatGPT exam', 500),
    status: statusValue(exam.status),
    grade: gradeValue(exam.grade),
    school_year: cleanInline(exam.schoolYear ?? exam.school_year ?? '', 40),
    tags: cleanArray(exam.tags, 24, 120),
    source_kind: 'chatgpt',
    source_reference: cleanText(exam.sourceReference ?? exam.source_reference ?? '', 1000),
    import_metadata: {
      generator: 'ChatGPT',
      conversationRef: cleanInline(meta.conversationRef || '', 300),
      model: cleanInline(meta.model || '', 120),
      importedAt: new Date().toISOString(),
    },
    settings: {
      ...(exam.settings && typeof exam.settings === 'object' ? exam.settings : {}),
      durationMinutes: clampInt(exam.durationMinutes ?? exam.duration_minutes, 1, 600, 50),
      instructions: cleanText(exam.instructions || '', 10000),
    },
    updated_at: new Date().toISOString(),
  };
  const { data: test, error: testError } = await session.db
    .from('assessment_tests')
    .insert(testRow)
    .select('*')
    .single();
  if (testError) throw new Error(testError.message);

  const joinRows = savedQuestions.itemIds.map((itemId, index) => ({
    test_id: test.id,
    item_id: itemId,
    position: index + 1,
    option_order: [],
    points: Number(questions[index]?.points || 1) || 1,
  }));
  if (joinRows.length) {
    const { error } = await session.db.from('assessment_test_items').insert(joinRows);
    if (error) throw new Error(error.message);
  }

  await recordImport(session, payload, {
    importedItems: savedQuestions.importedCount,
    reusedItems: savedQuestions.reusedCount,
    importedBundles: savedQuestions.bundleCreated ? 1 : 0,
    importedTests: 1,
    title: test.title,
    testId: test.id,
  });

  return { test, questionIds: savedQuestions.itemIds, bundle: savedQuestions.bundle };
}

async function searchQuestions(session, payload) {
  const filters = payload.filters && typeof payload.filters === 'object' ? payload.filters : payload;
  const limit = clampInt(payload.limit ?? filters.limit, 1, MAX_SEARCH, 30);
  let query = session.db
    .from('assessment_items')
    .select('id,bundle_id,bundle_position,status,question_type,stem,options,correct_answer,explanation,skill,cefr,topic,cognitive_level,difficulty,source,usage_count,grade,unit_name,school_year,grammar_point,tags,source_kind,source_reference,created_at,updated_at')
    .eq('owner_id', session.ownerId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (filters.grade) query = query.eq('grade', gradeValue(filters.grade));
  if (filters.cefr) query = query.eq('cefr', cleanInline(filters.cefr, 20));
  if (filters.skill) query = query.eq('skill', cleanInline(filters.skill, 120));
  if (filters.questionType || filters.question_type) query = query.eq('question_type', cleanInline(filters.questionType ?? filters.question_type, 80));
  if (filters.cognitiveLevel || filters.cognitive_level) query = query.eq('cognitive_level', cognitiveValue(filters.cognitiveLevel ?? filters.cognitive_level));
  if (filters.status) query = query.eq('status', statusValue(filters.status));
  if (filters.topic) query = query.ilike('topic', `%${cleanInline(filters.topic, 120)}%`);
  if (filters.grammarPoint || filters.grammar_point) query = query.ilike('grammar_point', `%${cleanInline(filters.grammarPoint ?? filters.grammar_point, 120)}%`);
  const term = cleanInline(filters.query ?? filters.search ?? '', 160).replace(/[%_]/g, '');
  if (term) query = query.ilike('stem', `%${term}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { items: data || [], count: (data || []).length };
}

async function getExam(session, payload) {
  const id = cleanInline(payload.testId ?? payload.test_id ?? payload.id, 80);
  if (!id) throw Object.assign(new Error('testId is required.'), { status: 400 });
  const { data: test, error } = await session.db
    .from('assessment_tests')
    .select('*')
    .eq('owner_id', session.ownerId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!test) throw Object.assign(new Error('Exam not found in this Question Bank.'), { status: 404 });

  const { data: joins, error: joinError } = await session.db
    .from('assessment_test_items')
    .select('item_id,position,option_order,points')
    .eq('test_id', id)
    .order('position', { ascending: true });
  if (joinError) throw new Error(joinError.message);
  const ids = (joins || []).map((row) => row.item_id);
  let items = [];
  if (ids.length) {
    const { data, error: itemsError } = await session.db.from('assessment_items').select('*').in('id', ids);
    if (itemsError) throw new Error(itemsError.message);
    const map = new Map((data || []).map((item) => [item.id, item]));
    items = (joins || []).map((join) => ({ ...map.get(join.item_id), position: join.position, points: join.points, option_order: join.option_order }));
  }
  return { test, items };
}

async function recordImport(session, payload, counts) {
  const bodyHash = sha256(JSON.stringify(payload || {}));
  const { error } = await session.db.from('assessment_import_events').insert({
    owner_id: session.ownerId,
    integration_id: session.integration.id,
    request_id: cleanInline(payload.requestId ?? payload.request_id ?? crypto.randomUUID(), 120),
    source_kind: 'chatgpt',
    imported_items: Number(counts.importedItems || 0),
    reused_items: Number(counts.reusedItems || 0),
    imported_bundles: Number(counts.importedBundles || 0),
    imported_tests: Number(counts.importedTests || 0),
    payload_hash: bodyHash,
    details: {
      title: cleanInline(counts.title || '', 300),
      testId: cleanInline(counts.testId || '', 80),
    },
  });
  if (error) console.error('[question-bank] import audit failed', error.message);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });

  try {
    const session = await authorize(req);
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const action = cleanInline(payload.action, 60).toLowerCase();

    if (action === 'save_questions') {
      const result = await saveQuestions(session, payload);
      return send(res, 200, { ok: true, action, ...result });
    }
    if (action === 'save_exam') {
      const result = await saveExam(session, payload);
      return send(res, 200, { ok: true, action, ...result });
    }
    if (action === 'search_questions') {
      const result = await searchQuestions(session, payload);
      return send(res, 200, { ok: true, action, ...result });
    }
    if (action === 'get_exam') {
      const result = await getExam(session, payload);
      return send(res, 200, { ok: true, action, ...result });
    }
    return send(res, 400, {
      ok: false,
      error: 'Unknown action. Use save_questions, save_exam, search_questions, or get_exam.',
    });
  } catch (error) {
    console.error('[question-bank]', error);
    return send(res, Number(error?.status) || 500, {
      ok: false,
      error: error?.message || 'Question Bank request failed.',
    });
  }
}
