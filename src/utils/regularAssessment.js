const ROUND_COUNT = 4;
export const REGULAR_ASSESSMENT_MAX_COLUMNS = 10;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = 'regular') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function regularScoreKey(round, studentId, columnId) {
  return `${Number(round)}:${String(studentId)}:${String(columnId)}`;
}

export function parseRegularScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(number) || number < 0 || number > 10) return null;
  return Math.round(number * 100) / 100;
}

function defaultColumns(round) {
  return [1, 2].map((index) => ({
    id: `regular-r${round}-c${index}`,
    label: `Cột ${index}`,
  }));
}

function normalizeColumns(round, rawColumns) {
  const source = Array.isArray(rawColumns) && rawColumns.length ? rawColumns : defaultColumns(round);
  const seen = new Set();
  const columns = [];
  source.slice(0, REGULAR_ASSESSMENT_MAX_COLUMNS).forEach((column, index) => {
    let id = safeText(column?.id, `regular-r${round}-c${index + 1}`);
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    columns.push({
      id,
      label: safeText(column?.label, `Cột ${index + 1}`).slice(0, 40),
    });
  });
  return columns.length ? columns : defaultColumns(round);
}

export function normalizeRegularAssessmentRounds(rawRounds) {
  const source = Array.isArray(rawRounds) ? rawRounds : [];
  return Array.from({ length: ROUND_COUNT }, (_, index) => {
    const round = index + 1;
    const existing = source.find((item) => Number(item?.round) === round) || source[index] || {};
    return {
      round,
      name: `Đợt ${round}`,
      columns: normalizeColumns(round, existing?.columns),
    };
  });
}

export function getRegularAssessmentRounds(workspace) {
  return normalizeRegularAssessmentRounds(workspace?.gradeSettings?.regularAssessmentRounds);
}

function legacyRound(record) {
  const match = safeText(record?.assessment).match(/Điểm thường xuyên\s*[·-]\s*Đợt\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function legacyColumnLabel(record) {
  const match = safeText(record?.assessment).match(/Đợt\s*\d+\s*[·-]\s*(.+)$/i);
  return match ? safeText(match[1]) : '';
}

export function isRegularAssessmentRecord(record) {
  return record?.assessmentType === 'regular'
    || record?.regularAssessment === true
    || /Điểm thường xuyên\s*[·-]\s*Đợt\s*\d+/i.test(safeText(record?.assessment));
}

export function getRegularRecordRound(record) {
  const round = Number(record?.assessmentRound);
  return round >= 1 && round <= ROUND_COUNT ? round : legacyRound(record);
}

export function buildRegularAssessmentScoreMap(workspace, { subject, period, rounds } = {}) {
  const normalizedRounds = normalizeRegularAssessmentRounds(rounds || getRegularAssessmentRounds(workspace));
  const subjectKey = safeText(subject).toLowerCase();
  const periodKey = safeText(period);
  const map = {};

  (workspace?.learningRecords || []).forEach((record) => {
    if (!isRegularAssessmentRecord(record)) return;
    if (safeText(record.subject).toLowerCase() !== subjectKey || safeText(record.period) !== periodKey) return;
    const round = getRegularRecordRound(record);
    if (!round) return;
    const roundConfig = normalizedRounds.find((item) => item.round === round);
    if (!roundConfig) return;
    const legacyLabel = legacyColumnLabel(record).toLowerCase();
    const column = roundConfig.columns.find((item) => item.id === record.assessmentColumnId)
      || roundConfig.columns.find((item) => item.label.toLowerCase() === legacyLabel);
    if (!column || !record.studentId) return;
    const score = parseRegularScore(record.score);
    if (score === null) return;
    map[regularScoreKey(round, record.studentId, column.id)] = String(score);
  });

  return map;
}

export function calculateRegularStudentAverage(scoreMap, round, studentId, columns) {
  const values = (columns || [])
    .map((column) => parseRegularScore(scoreMap?.[regularScoreKey(round, studentId, column.id)]))
    .filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateRegularRoundClassAverage(scoreMap, round, students, columns) {
  const values = (students || [])
    .map((student) => calculateRegularStudentAverage(scoreMap, round, student.id, columns))
    .filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recordMatchesContext(record, subjectKey, period, round) {
  return isRegularAssessmentRecord(record)
    && safeText(record.subject).toLowerCase() === subjectKey
    && safeText(record.period) === period
    && getRegularRecordRound(record) === round;
}

export function saveRegularAssessmentRound(workspace, input = {}) {
  const round = Math.min(ROUND_COUNT, Math.max(1, Number(input.round) || 1));
  const subject = safeText(input.subject, 'Tiếng Anh');
  const subjectKey = subject.toLowerCase();
  const period = safeText(input.period, workspace?.semester || 'Học kỳ I');
  const teacherName = safeText(input.teacherName);
  const recordedAt = safeText(input.recordedAt, new Date().toISOString().slice(0, 10));
  const rounds = normalizeRegularAssessmentRounds(input.rounds || getRegularAssessmentRounds(workspace));
  const roundConfig = rounds.find((item) => item.round === round);
  const students = (input.students || workspace?.students || []).filter((student) => student?.active !== false);
  const scoreMap = input.scoreMap || {};
  const currentRecords = Array.isArray(workspace?.learningRecords) ? workspace.learningRecords : [];
  const existing = new Map();

  currentRecords.forEach((record) => {
    if (!recordMatchesContext(record, subjectKey, period, round)) return;
    const columnId = safeText(record.assessmentColumnId);
    if (record.studentId && columnId) existing.set(`${record.studentId}:${columnId}`, record);
  });

  const kept = currentRecords.filter((record) => !recordMatchesContext(record, subjectKey, period, round));
  const savedAt = nowIso();
  const nextRecords = [];

  students.forEach((student) => {
    roundConfig.columns.forEach((column) => {
      const score = parseRegularScore(scoreMap[regularScoreKey(round, student.id, column.id)]);
      if (score === null) return;
      const previous = existing.get(`${student.id}:${column.id}`);
      nextRecords.push({
        id: previous?.id || makeId('learning-regular'),
        studentId: student.id,
        subject,
        period,
        assessment: `Điểm thường xuyên · Đợt ${round} · ${column.label}`,
        assessmentType: 'regular',
        regularAssessment: true,
        assessmentRound: round,
        assessmentRoundName: `Đợt ${round}`,
        assessmentColumnId: column.id,
        assessmentColumnLabel: column.label,
        score,
        maxScore: 10,
        teacherName,
        note: '',
        recordedAt,
        createdAt: previous?.createdAt || savedAt,
        updatedAt: savedAt,
      });
    });
  });

  return {
    ...workspace,
    learningRecords: [...nextRecords, ...kept],
    gradeSettings: {
      ...(workspace?.gradeSettings || {}),
      regularAssessmentRounds: rounds,
    },
    updatedAt: savedAt,
  };
}
