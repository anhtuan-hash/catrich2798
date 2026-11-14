/**
 * BRIAN English Early Warning — deterministic research pilot, rule version 0.1.
 * Matches the THAM_SO / TIN_HIEU workbook V2. Not an AI prediction or
 * certified language-proficiency decision. All user data stays in memory.
 */
export const RULE_VERSION = '0.1';
export const PILOT_THRESHOLDS = Object.freeze({
  diagnosticMeanBelow: 60, weakestSkillBelow: 50,
  bothRecentScoresBelow: 60, missingTasksAtLeast: 2,
  prioritySignalsAtLeast: 2, postMeanAtLeast: 60, postMinimumAtLeast: 50,
});
export const SKILLS = Object.freeze(['listening', 'speaking', 'reading', 'writing']);
export const CSV_COLUMNS = Object.freeze([
  'student_id', ...SKILLS, 'recent1', 'recent2', 'missing14d',
  ...SKILLS.map(skill => 'post_' + skill),
]);
const RESTRICTED_HEADER = /(?:^|_)(?:full_?name|first_?name|last_?name|name|email|phone|birth|address|national_?id|ssn|student_?code|class_?name)(?:_|$)/i;
const STUDENT_REF = /^P[0-9]{3,6}$/;
const numberIsPresent = value => value !== '' && value !== null && value !== undefined;
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => String(value).trim())) records.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV contains an unmatched quotation mark.');
  row.push(cell);
  if (row.some(value => String(value).trim())) records.push(row);
  return records;
}

function readScore(value, field, rowNo) {
  if (!numberIsPresent(value)) return null;
  const raw = String(value).trim();
  if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(raw)) throw new Error('Row ' + rowNo + ': ' + field + ' must be a number between 0 and 100.');
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('Row ' + rowNo + ': ' + field + ' must be in the range 0–100.');
  return n;
}
function readTasks(value, rowNo) {
  if (!numberIsPresent(value)) return null;
  const raw = String(value).trim();
  if (!/^\d{1,3}$/.test(raw) || Number(raw) > 100) throw new Error('Row ' + rowNo + ': missing14d must be an integer between 0 and 100.');
  return Number(raw);
}

export function importCodedCohort(text) {
  const data = parseCsv(text);
  if (data.length < 2) throw new Error('CSV must contain a header and at least one student record.');
  if (data.length > 121) throw new Error('The pilot is limited to 120 coded students per import.');
  const headers = data[0].map(x => String(x || '').trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV column names are not allowed.');
  if (headers.some(h => RESTRICTED_HEADER.test(h))) throw new Error('Personal-identification columns are not allowed. Use coded IDs P001, P002, … only.');
  const required = ['student_id', ...SKILLS];
  for (const field of required) if (!headers.includes(field)) throw new Error('Missing required column: ' + field);
  const allowed = new Set(CSV_COLUMNS);
  if (headers.some(h => !allowed.has(h))) throw new Error('Unknown column in CSV. Use the downloadable template header.');
  const seen = new Set();
  return data.slice(1).map((cells, i) => {
    const rowNo = i + 2;
    if (cells.length !== headers.length) throw new Error('Row ' + rowNo + ': column count does not match the header.');
    const raw = Object.fromEntries(headers.map((h, index) => [h, String(cells[index] || '').trim()]));
    const studentId = raw.student_id || '';
    if (!STUDENT_REF.test(studentId)) throw new Error('Row ' + rowNo + ': use coded IDs P001, P002, etc., not names or actual student codes.');
    if (seen.has(studentId)) throw new Error('Row ' + rowNo + ': duplicate coded ID.');
    seen.add(studentId);
    const scores = Object.fromEntries(SKILLS.map(field => [field, readScore(raw[field], field, rowNo)]));
    const post = Object.fromEntries(SKILLS.map(field => [field, readScore(raw['post_' + field], 'post_' + field, rowNo)]));
    return {
      studentId, scores, post,
      recent1: readScore(raw.recent1, 'recent1', rowNo),
      recent2: readScore(raw.recent2, 'recent2', rowNo),
      missing14d: readTasks(raw.missing14d, rowNo),
    };
  });
}

export function evaluateLearner(learner) {
  const baseline = SKILLS.map(skill => learner.scores?.[skill]);
  const completeBaseline = baseline.every(Number.isFinite);
  const mean = completeBaseline ? round(baseline.reduce((a, b) => a + b, 0) / 4) : null;
  const minimum = completeBaseline ? Math.min(...baseline) : null;
  const weakSkill = completeBaseline ? SKILLS[baseline.indexOf(minimum)] : null;
  const diagnostic = !completeBaseline ? null : (mean < PILOT_THRESHOLDS.diagnosticMeanBelow || minimum < PILOT_THRESHOLDS.weakestSkillBelow);
  const recent = !Number.isFinite(learner.recent1) || !Number.isFinite(learner.recent2)
    ? null : learner.recent1 < PILOT_THRESHOLDS.bothRecentScoresBelow && learner.recent2 < PILOT_THRESHOLDS.bothRecentScoresBelow;
  const missing = !Number.isInteger(learner.missing14d) ? null : learner.missing14d >= PILOT_THRESHOLDS.missingTasksAtLeast;
  const completeSignals = [diagnostic, recent, missing].every(value => value !== null);
  const flags = [diagnostic, recent, missing].filter(Boolean).length;
  const status = !completeSignals ? 'insufficient' : flags >= PILOT_THRESHOLDS.prioritySignalsAtLeast ? 'priority' : flags === 1 ? 'review' : 'no_signal';
  const postScores = SKILLS.map(skill => learner.post?.[skill]);
  const completePost = postScores.every(Number.isFinite);
  const postMean = completePost ? round(postScores.reduce((a, b) => a + b, 0) / 4) : null;
  const postMinimum = completePost ? Math.min(...postScores) : null;
  const progress = completePost && completeBaseline ? round(postMean - mean) : null;
  const rubricTarget = completePost && postMean >= PILOT_THRESHOLDS.postMeanAtLeast && postMinimum >= PILOT_THRESHOLDS.postMinimumAtLeast;
  return {
    ...learner, diagnosticMean: mean, diagnosticMinimum: minimum, weakSkill,
    signals: { diagnostic, recent, missing }, flagCount: completeSignals ? flags : null,
    status, postMean, postMinimum, progress, rubricTarget: completePost ? rubricTarget : null,
  };
}

const PLAN = Object.freeze({
  listening: { goal: 'Identify details and main ideas in short audio', activity: 'Two 10-minute guided listens per week, then an unseen 4-item comprehension check' },
  speaking: { goal: 'Give clear, relevant spoken responses', activity: 'Two short rehearsal recordings per week with rubric feedback, then one independent oral task' },
  reading: { goal: 'Retrieve meaning and infer from short texts', activity: 'Two guided reading sets per week, including evidence location and inference practice' },
  writing: { goal: 'Produce organized, accurate short texts', activity: 'One planning-and-drafting exercise plus one rubric-guided revision per week' },
});
export function suggestedIntervention(result) {
  if (!result?.weakSkill) return null;
  return { skill: result.weakSkill, ...PLAN[result.weakSkill], durationWeeks: 8, reviewWeek: 2 };
}
export function summarizeCohort(results) {
  const statuses = { priority: 0, review: 0, no_signal: 0, insufficient: 0 };
  let before = 0, after = 0, pairs = 0, rubricMet = 0;
  for (const r of results) {
    statuses[r.status] = (statuses[r.status] || 0) + 1;
    if (r.progress !== null) { before += r.diagnosticMean; after += r.postMean; pairs++; }
    if (r.rubricTarget === true) rubricMet++;
  }
  return {
    n: results.length, ...statuses, matchedPairs: pairs,
    meanBefore: pairs ? round(before / pairs) : null,
    meanAfter: pairs ? round(after / pairs) : null,
    meanChange: pairs ? round((after - before) / pairs) : null, rubricMet,
    ruleVersion: RULE_VERSION,
  };
}
export function escapeCsv(value) {
  const text = String(value ?? '');
  const trimmed = text.trimStart();
  const numeric = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed);
  const dangerous = /^[=+@\t\r]/.test(trimmed) || (/^-/.test(trimmed) && !numeric);
  const safe = dangerous ? "'" + text : text;
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}
export function toCsv(columns, rows) {
  return [columns.join(','), ...rows.map(row => columns.map(col => escapeCsv(row[col])).join(','))].join('\r\n') + '\r\n';
}
