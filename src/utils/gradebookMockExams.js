// Grade 12 mock-exam ledgers are independent of regular/semester scoring.
// Never feed mock exam scores into any bonus, weighted grade, or average.
export const MAX_MOCK_EXAMS = 40;

function normalizedLabel(value) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function isGrade12Class(profile = {}) {
  // An explicit grade always wins over a class-name guess (e.g. 112A).
  const grade = normalizedLabel(profile?.grade);
  const matches12 = (text) => /^(?:(?:khoi|lop|grade)\s*)?12(?=$|[\s.\/-]|[a-z])/i.test(text);
  if (grade) return matches12(grade);
  return matches12(normalizedLabel(profile?.className));
}

export function normalizeMockExams(value) {
  if (!Array.isArray(value)) return [];
  const used = new Set();
  return value.slice(0, MAX_MOCK_EXAMS).map((exam, index) => {
    const raw = exam && typeof exam === 'object' ? exam : {};
    let id = String(raw.id || `mock-exam-${index + 1}`).trim();
    if (used.has(id)) id = `${id}-${index + 1}`;
    used.add(id);
    return {
      id,
      label: String(raw.label ?? `Thi thử lần ${index + 1}`),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? raw.date : '',
      scores: raw.scores && typeof raw.scores === 'object' && !Array.isArray(raw.scores) ? { ...raw.scores } : {},
    };
  });
}

export function mockExamScoreNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const input = String(value).trim().replace(',', '.');
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(input)) return null;
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
}

export function mockExamMissingCount(studentId, exams = []) {
  return exams.reduce((total, exam) =>
    total + Number(mockExamScoreNumber(exam?.scores?.[studentId]) == null), 0);
}

export function mockExamProgress(students = [], exam = {}) {
  const count = students.filter((student) => mockExamScoreNumber(exam?.scores?.[student.id]) !== null).length;
  return { entered: count, total: students.length, missing: students.length - count };
}

export function createMockExam(index, id) {
  return { id, label: `Thi thử lần ${index}`, date: '', scores: {} };
}

function csvCell(value) {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ');
  // Prevent spreadsheet formula injection from user-entered student names/IDs.
  const safe = /^[\s]*[=+@\-\t]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildMockExamCsv({ students = [], exams = [], className = '', subjectName = '' } = {}) {
  const lines = [
    ['SỔ ĐIỂM THI THỬ - LỚP 12', className, subjectName],
    ['STT', 'Mã học sinh', 'Họ và tên', ...exams.map((exam) =>
      `${exam.label || 'Thi thử'}${exam.date ? ` (${exam.date})` : ''}`)],
    ...students.map((student, index) => [
      index + 1,
      student.code || '',
      student.fullName || student.name || '',
      ...exams.map((exam) => {
        const value = exam?.scores?.[student.id];
        return mockExamScoreNumber(value) === null ? '' : String(mockExamScoreNumber(value));
      }),
    ]),
  ];
  return '\uFEFF' + lines.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
