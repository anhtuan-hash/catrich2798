import { blockTypeForItem } from './questionBankExamManager.js';

export function qbText(value) {
  return String(value ?? '').trim();
}

export function qbNorm(value) {
  return qbText(value).toLowerCase().replace(/\s+/g, ' ');
}

export function questionSearchHaystack(item = {}) {
  return [
    item.stem,
    item.topic,
    item.grammar_point,
    item.skill,
    item.question_type,
    item.source,
    item.source_reference,
    ...(item.tags || []),
    ...(Array.isArray(item.options) ? item.options : []),
  ].map(qbNorm).join(' ');
}

export function advancedFilterQuestions(questions = [], filters = {}) {
  const needle = qbNorm(filters.query);
  return questions.filter((item) => {
    if (filters.grade && String(item.grade || '') !== String(filters.grade)) return false;
    if (filters.cefr && qbText(item.cefr).toUpperCase() !== String(filters.cefr).toUpperCase()) return false;
    if (filters.cognitive && qbNorm(item.cognitive_level) !== qbNorm(filters.cognitive)) return false;
    if (filters.status && qbNorm(item.status) !== qbNorm(filters.status)) return false;
    if (filters.visibility && qbNorm(item.visibility) !== qbNorm(filters.visibility)) return false;
    if (filters.skill && qbNorm(item.skill) !== qbNorm(filters.skill)) return false;
    if (filters.questionType && qbNorm(item.question_type) !== qbNorm(filters.questionType)) return false;
    if (filters.sourceKind && qbNorm(item.source_kind) !== qbNorm(filters.sourceKind)) return false;
    if (filters.difficulty && Number(item.difficulty || 0) !== Number(filters.difficulty)) return false;
    if (filters.usage === 'unused' && Number(item.usage_count || 0) !== 0) return false;
    if (filters.usage === 'used' && Number(item.usage_count || 0) <= 0) return false;
    if (filters.usage === 'heavy' && Number(item.usage_count || 0) < 4) return false;
    if (filters.bundle === 'standalone' && item.bundle_id) return false;
    if (filters.bundle === 'bundled' && !item.bundle_id) return false;
    if (filters.topic && !qbNorm(item.topic).includes(qbNorm(filters.topic))) return false;
    if (filters.grammar && !qbNorm(item.grammar_point).includes(qbNorm(filters.grammar))) return false;
    if (filters.tag) {
      const tagNeedle = qbNorm(filters.tag);
      if (!(item.tags || []).some((tag) => qbNorm(tag).includes(tagNeedle))) return false;
    }
    if (needle && !questionSearchHaystack(item).includes(needle)) return false;
    return true;
  });
}

function tokenSet(value) {
  return new Set(qbNorm(value)
    .replace(/[^a-z0-9à-ỹ]+/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3));
}

export function textSimilarity(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  A.forEach((token) => { if (B.has(token)) intersection += 1; });
  const union = A.size + B.size - intersection;
  return union ? intersection / union : 0;
}

export function findDuplicateGroups(questions = [], threshold = 0.72) {
  const exact = new Map();
  questions.forEach((item) => {
    const key = qbText(item.fingerprint) || qbNorm(item.stem);
    if (!exact.has(key)) exact.set(key, []);
    exact.get(key).push(item);
  });
  const exactGroups = [...exact.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ kind: 'exact', key, similarity: 1, items }));

  const exactIds = new Set(exactGroups.flatMap((group) => group.items.map((item) => item.id)));
  const candidates = questions.filter((item) => !exactIds.has(item.id));
  const near = [];
  const seen = new Set();
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.id === b.id) continue;
      if (String(a.grade || '') !== String(b.grade || '')) continue;
      const similarity = textSimilarity(a.stem, b.stem);
      if (similarity < threshold) continue;
      const key = [a.id, b.id].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      near.push({ kind: 'near', key, similarity, items: [a, b] });
    }
  }
  return [...exactGroups, ...near].sort((a, b) => b.similarity - a.similarity);
}

export function smartReplacementCandidates(item, questions = [], excludedIds = [], limit = 12) {
  const excluded = new Set([item?.id, ...excludedIds].filter(Boolean));
  const type = blockTypeForItem(item || {});
  const scored = questions
    .filter((candidate) => !excluded.has(candidate.id))
    .filter((candidate) => qbNorm(candidate.status || 'draft') !== 'archived')
    .map((candidate) => {
      let score = 0;
      if (blockTypeForItem(candidate) === type) score += 8;
      if (candidate.grade && item?.grade && String(candidate.grade) === String(item.grade)) score += 4;
      if (qbNorm(candidate.cefr) === qbNorm(item?.cefr)) score += 3;
      if (qbNorm(candidate.cognitive_level) === qbNorm(item?.cognitive_level)) score += 3;
      if (Number(candidate.difficulty || 0) === Number(item?.difficulty || 0)) score += 2;
      if (qbNorm(candidate.skill) === qbNorm(item?.skill)) score += 2;
      if (qbNorm(candidate.topic) === qbNorm(item?.topic)) score += 2;
      if (qbNorm(candidate.grammar_point) && qbNorm(candidate.grammar_point) === qbNorm(item?.grammar_point)) score += 2;
      score -= Math.min(5, Number(candidate.usage_count || 0)) * 0.25;
      return { item: candidate, score };
    })
    .filter((entry) => entry.score >= 8)
    .sort((a, b) => b.score - a.score || Number(a.item.usage_count || 0) - Number(b.item.usage_count || 0));
  return scored.slice(0, limit);
}

function seededRank(seed) {
  let x = 2166136261;
  for (const ch of String(seed)) {
    x ^= ch.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

function sourceAnswerIndex(item) {
  const answer = qbText(item?.correct_answer).toUpperCase();
  if (/^[A-D]$/.test(answer)) return answer.charCodeAt(0) - 65;
  const numeric = Number(answer);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 3 ? numeric : 0;
}

export function balancedOptionOrders(items = [], seed = 'brian') {
  const targetCounts = [0, 0, 0, 0];
  return items.map((item, index) => {
    const sourceCorrect = sourceAnswerIndex(item);
    const minCount = Math.min(...targetCounts);
    const candidates = [0,1,2,3].filter((position) => targetCounts[position] === minCount);
    const targetCorrect = candidates[seededRank(`${seed}:${item.id}:${index}`) % candidates.length];
    targetCounts[targetCorrect] += 1;
    const remainingSources = [0,1,2,3].filter((value) => value !== sourceCorrect)
      .sort((a, b) => seededRank(`${seed}:${item.id}:${a}`) - seededRank(`${seed}:${item.id}:${b}`));
    const order = new Array(4);
    order[targetCorrect] = sourceCorrect;
    let cursor = 0;
    for (let visible = 0; visible < 4; visible += 1) {
      if (visible === targetCorrect) continue;
      order[visible] = remainingSources[cursor++];
    }
    return order;
  });
}

function csvEscape(value) {
  const raw = Array.isArray(value) ? value.join('|') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function questionsToCsv(questions = []) {
  const headers = ['id','stem','A','B','C','D','correct_answer','explanation','grade','cefr','skill','topic','cognitive_level','difficulty','grammar_point','tags','status','visibility','source_kind','usage_count'];
  const rows = questions.map((item) => {
    const options = Array.isArray(item.options) ? item.options : [];
    return [
      item.id,item.stem,options[0],options[1],options[2],options[3],item.correct_answer,item.explanation,item.grade,item.cefr,item.skill,item.topic,
      item.cognitive_level,item.difficulty,item.grammar_point,item.tags,item.status,item.visibility,item.source_kind,item.usage_count,
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function parseCsv(textValue = '') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const raw = String(textValue || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (quoted) {
      if (ch === '"' && raw[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

export function spreadsheetRowsToQuestions(rows = []) {
  if (!rows.length) return [];
  const headers = rows[0].map((value) => qbNorm(value).replace(/\s+/g, '_'));
  const get = (row, ...keys) => {
    for (const key of keys) {
      const index = headers.indexOf(key);
      if (index >= 0) return row[index];
    }
    return '';
  };
  return rows.slice(1).filter((row) => row.some((value) => qbText(value))).map((row) => ({
    stem: qbText(get(row,'stem','question','câu_hỏi','cau_hoi')),
    options: ['a','b','c','d'].map((key) => qbText(get(row,key,`option_${key}`,`phương_án_${key}`,`phuong_an_${key}`))),
    correct_answer: qbText(get(row,'correct_answer','answer','đáp_án','dap_an')).toUpperCase(),
    explanation: qbText(get(row,'explanation','giải_thích','giai_thich')),
    grade: Number(get(row,'grade','khối','khoi')) || null,
    cefr: qbText(get(row,'cefr')) || 'B1',
    skill: qbText(get(row,'skill','kỹ_năng','ky_nang')) || 'Use of English',
    topic: qbText(get(row,'topic','chủ_đề','chu_de')),
    cognitive_level: qbText(get(row,'cognitive_level','cognitive','mức_nhận_thức','muc_nhan_thuc')) || 'recognition',
    difficulty: Number(get(row,'difficulty','độ_khó','do_kho')) || 2,
    grammar_point: qbText(get(row,'grammar_point','grammar')),
    tags: qbText(get(row,'tags')).split(/[|,]/).map(qbText).filter(Boolean),
  })).filter((item) => item.stem);
}

export function managementDashboard(questions = [], bundles = [], tests = []) {
  const statuses = {};
  const visibility = {};
  questions.forEach((item) => {
    const status = qbNorm(item.status || 'draft');
    statuses[status] = Number(statuses[status] || 0) + 1;
    const scope = qbNorm(item.visibility || 'personal');
    visibility[scope] = Number(visibility[scope] || 0) + 1;
  });
  const duplicates = findDuplicateGroups(questions, 0.78);
  const unused = questions.filter((item) => Number(item.usage_count || 0) === 0).length;
  const heavy = questions.filter((item) => Number(item.usage_count || 0) >= 4).length;
  const missingMetadata = questions.filter((item) => !qbText(item.topic) || !qbText(item.cefr) || !qbText(item.cognitive_level) || item.difficulty == null).length;
  return {
    total: questions.length,
    bundles: bundles.length,
    tests: tests.length,
    statuses,
    visibility,
    duplicateGroups: duplicates.length,
    unused,
    heavy,
    missingMetadata,
    approvedPercent: questions.length ? Math.round((Number(statuses.approved || 0) / questions.length) * 100) : 0,
  };
}

export function taxonomySuggestions(questions = [], kind = 'topic') {
  const counts = new Map();
  questions.forEach((item) => {
    const values = kind === 'tag'
      ? (item.tags || [])
      : [kind === 'grammar_point' ? item.grammar_point : kind === 'question_type' ? item.question_type : item[kind]];
    values.map(qbText).filter(Boolean).forEach((value) => {
      const key = qbNorm(value);
      if (!counts.has(key)) counts.set(key, { value, count: 0 });
      counts.get(key).count += 1;
    });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
