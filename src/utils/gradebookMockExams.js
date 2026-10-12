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
      locked: raw.locked === true,
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


// Compare ONLY the two most recent attempts; never calculate an average.
// Missing values and zero are treated differently throughout.
export function compareMockExamAttempts(students = [], exams = []) {
  const recent = exams.slice(-2);
  if (recent.length < 2) return { ready: false, before: null, after: null, improved: 0, unchanged: 0, declined: 0, incomparable: students.length, differences: {} };
  const [before, after] = recent;
  const result = { ready: true, before, after, improved: 0, unchanged: 0, declined: 0, incomparable: 0, differences: {} };
  for (const student of students) {
    const earlier = mockExamScoreNumber(before?.scores?.[student.id]);
    const latest = mockExamScoreNumber(after?.scores?.[student.id]);
    if (earlier == null || latest == null) {
      result.incomparable++;
      continue;
    }
    const difference = Math.round((latest - earlier) * 100) / 100;
    result.differences[student.id] = difference;
    if (difference > 0) result.improved++;
    else if (difference < 0) result.declined++;
    else result.unchanged++;
  }
  return result;
}

export function normalizeMockStudentCode(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim().toLocaleLowerCase('vi');
}

function normalizeColumnHeader(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ');
}

function splitPastedRow(line, delimiter) {
  if (delimiter === '\t') return line.split('\t').map((part) => part.trim());
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

// Two accepted clipboard shapes:
//     Mã học sinh [TAB] Điểm
//     STT [TAB] Mã học sinh [TAB] Họ tên [TAB] Điểm
// Paste matches student codes, NEVER visual row order or fuzzy student names.
export function previewMockExamPaste({ text = '', students = [], scores = {}, allowOverwrite = false } = {}) {
  const input = String(text).replace(/\r\n?/g, '\n').trim();
  const lines = input.split('\n').filter((line) => line.trim()).slice(0, 2001);
  const issues = [];
  const entries = [];
  const conflicts = [];
  const skipped = [];
  if (!input) return { entries, issues, conflicts, skipped, totalRows: 0 };
  if (input.split('\n').filter((line) => line.trim()).length > 2000) {
    issues.push({ row: 0, reason: 'Tối đa 2.000 dòng trong mỗi lần dán.' });
    return { entries, issues, conflicts, skipped, totalRows: 0 };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const matrix = lines.map((line) => splitPastedRow(line, delimiter));
  const headers = matrix[0].map(normalizeColumnHeader);
  let codeIndex = headers.findIndex((item) => /^(ma (hoc sinh|hs)|mshs|student (code|id)|studentcode)$/.test(item));
  let scoreIndex = headers.findIndex((item) => /^(diem|diem thi|diem thi thu|score|test score|mock score)$/.test(item));
  const hasHeader = codeIndex >= 0 && scoreIndex >= 0;
  if (!hasHeader) {
    const length = matrix[0].length;
    codeIndex = length >= 4 ? 1 : 0;
    scoreIndex = length - 1;
  }
  if (codeIndex === scoreIndex || scoreIndex < 1) {
    issues.push({ row: 1, reason: 'Dán ít nhất 2 cột: Mã học sinh và Điểm.' });
    return { entries, issues, conflicts, skipped, totalRows: matrix.length };
  }
  const roster = new Map();
  for (const student of students) {
    const code = normalizeMockStudentCode(student.code);
    if (!code) continue;
    const group = roster.get(code) || [];
    group.push(student);
    roster.set(code, group);
  }
  const candidates = [];
  const start = hasHeader ? 1 : 0;
  for (let row = start; row < matrix.length; row++) {
    const cells = matrix[row];
    const code = normalizeMockStudentCode(cells[codeIndex]);
    const scoreText = cells[scoreIndex]?.replace(',', '.')?.trim() ?? '';
    if (!code) { issues.push({ row: row + 1, reason: 'Thiếu mã học sinh.' }); continue; }
    const studentGroup = roster.get(code) || [];
    if (studentGroup.length !== 1) {
      issues.push({ row: row + 1, code, reason: studentGroup.length ? 'Mã học sinh trùng trong danh sách lớp.' : 'Mã học sinh không có trong lớp.' });
      continue;
    }
    if (scoreText === '') { skipped.push({ row: row + 1, code, reason: 'Ô điểm để trống, giữ nguyên dữ liệu.' }); continue; }
    const value = mockExamScoreNumber(scoreText);
    if (value == null) { issues.push({ row: row + 1, code, reason: 'Điểm không hợp lệ (phải từ 0 đến 10, tối đa 2 chữ số thập phân).' }); continue; }
    candidates.push({ row: row + 1, code, studentId: studentGroup[0].id, studentName: studentGroup[0].fullName || studentGroup[0].name || code, value: String(value) });
  }

  const duplicates = new Set();
  const seen = new Set();
  for (const entry of candidates) {
    if (seen.has(entry.studentId)) duplicates.add(entry.studentId);
    seen.add(entry.studentId);
  }
  for (const entry of candidates) {
    if (duplicates.has(entry.studentId)) {
      issues.push({ row: entry.row, code: entry.code, reason: 'Mã học sinh xuất hiện nhiều lần trong dữ liệu dán.' });
      continue;
    }
    const previous = mockExamScoreNumber(scores?.[entry.studentId]);
    if (previous === Number(entry.value)) {
      skipped.push({ row: entry.row, code: entry.code, reason: 'Điểm không thay đổi.' });
      continue;
    }
    const overwrite = previous !== null;
    const next = { ...entry, previous: previous == null ? '' : String(previous), overwrite };
    if (overwrite && !allowOverwrite) conflicts.push(next);
    else entries.push(next);
  }
  return { entries, issues, conflicts, skipped, totalRows: matrix.length - start };
}

export function buildMockExamComparisonCsv({ students = [], exams = [], className = '', subjectName = '' } = {}) {
  const comparison = compareMockExamAttempts(students, exams);
  if (!comparison.ready) return '';
  const lines = [
    ['ĐỐI CHIẾU HAI LẦN THI THỬ - KHÔNG TÍNH TRUNG BÌNH', className, subjectName],
    ['STT', 'Mã học sinh', 'Họ và tên', comparison.before.label, comparison.after.label, 'Chênh lệch (điểm)'],
    ...students.map((student, index) => {
      const oldScore = mockExamScoreNumber(comparison.before.scores?.[student.id]);
      const newScore = mockExamScoreNumber(comparison.after.scores?.[student.id]);
      const delta = comparison.differences[student.id];
      return [index + 1, student.code || '', student.fullName || student.name || '',
        oldScore ?? '', newScore ?? '', delta === undefined ? '' : delta > 0 ? `+${delta}` : delta];
    }),
  ];
  return '\uFEFF' + lines.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
