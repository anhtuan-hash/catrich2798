// Deterministic grading only: no remote services or generative systems.
export const MODULES = [
  { id: 'speaking', name: 'SpeakScale', subtitle: 'Speaking Rubric', status: 'ready' },
  { id: 'diagnostic', name: 'DiagnosticScan', subtitle: 'Diagnostic Assessment', status: 'ready' },
  { id: 'exit', name: 'ExitTicket', subtitle: 'End-of-Lesson Assessment', status: 'ready' },
  { id: 'error', name: 'ErrorClinic', subtitle: 'Error Correction', status: 'planned' },
  { id: 'vocabulary', name: 'VocabCheck', subtitle: 'Vocabulary Assessment', status: 'planned' },
  { id: 'reading', name: 'ReadProof', subtitle: 'Reading Assessment', status: 'planned' },
  { id: 'listening', name: 'ListenCheck', subtitle: 'Listening Assessment', status: 'planned' },
  { id: 'writing', name: 'WriteRubric', subtitle: 'Writing Assessment', status: 'planned' },
  { id: 'rewrite', name: 'RewriteLab', subtitle: 'Sentence Transformation', status: 'planned' },
  { id: 'self', name: 'CanDo Check', subtitle: 'Self-Assessment', status: 'planned' },
  { id: 'peer', name: 'PeerRubric', subtitle: 'Peer Assessment', status: 'planned' },
  { id: 'project', name: 'ProjectMark', subtitle: 'Performance Assessment', status: 'planned' },
];
export const SPEAKING_CRITERIA = ['Pronunciation', 'Fluency', 'Vocabulary', 'Grammar', 'Content'];
export const LETTERS = ['A', 'B', 'C', 'D'];

export function parseQuestions(raw) {
  const lines = String(raw || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Hãy nhập ít nhất một câu theo mẫu: Nội dung | A | B | C | D | Đáp án | Chủ điểm');
  if (lines.length > 50) throw new Error('Mỗi bài hỗ trợ tối đa 50 câu.');
  return lines.map((line, index) => {
    const parts = line.split('|').map(x => x.trim());
    if (parts.length !== 7 || !LETTERS.includes(parts[5].toUpperCase()) || parts.slice(0,5).some(x => !x)) {
      throw new Error('Dòng ' + (index + 1) + ' chưa đúng định dạng 7 cột hoặc đáp án A–D.');
    }
    return { stem: parts[0], options: parts.slice(1,5), correct: parts[5].toUpperCase(), topic: parts[6] || 'Chưa phân loại' };
  });
}

export function gradeObjective(questions, rawAnswers) {
  const answers = String(rawAnswers || '').toUpperCase().replace(/[\s,;|]+/g, '').split('');
  if (answers.length !== questions.length || answers.some(answer => !LETTERS.includes(answer))) {
    throw new Error('Cần nhập chính xác ' + questions.length + ' đáp án A–D, ví dụ: ABCD.');
  }
  const topics = {};
  let score = 0;
  const detail = questions.map((question, index) => {
    const correct = answers[index] === question.correct;
    if (correct) score += 1;
    const topic = question.topic || 'Chưa phân loại';
    if (!topics[topic]) topics[topic] = { achieved: 0, total: 0 };
    topics[topic].total += 1;
    if (correct) topics[topic].achieved += 1;
    return { number: index + 1, selected: answers[index], correctAnswer: question.correct, correct, topic };
  });
  return { score, maxScore: questions.length, answers, detail, topics };
}

export function gradeSpeaking(rawMarks) {
  const marks = SPEAKING_CRITERIA.map(key => Number(rawMarks?.[key]));
  if (marks.some(value => !Number.isInteger(value) || value < 0 || value > 4)) {
    throw new Error('Mỗi tiêu chí Speaking cần được chấm từ 0 đến 4.');
  }
  return { score: marks.reduce((sum, mark) => sum + mark, 0), maxScore: 20, criteria: Object.fromEntries(SPEAKING_CRITERIA.map((name, index) => [name, marks[index]])) };
}

export function summarizeResults(results) {
  const items = Array.isArray(results) ? results : [];
  const count = items.length;
  const average = count ? items.reduce((sum, item) => sum + Number(item.score || 0) / Math.max(1,Number(item.max_score||1)) * 100, 0) / count : 0;
  const topics = {};
  items.forEach(item => {
    Object.entries(item.breakdown?.topics || {}).forEach(([topic, value]) => {
      if (!topics[topic]) topics[topic] = { achieved: 0, total: 0 };
      topics[topic].achieved += Number(value.achieved || 0);
      topics[topic].total += Number(value.total || 0);
    });
  });
  return { count, average, topics };
}

export function csvEscape(value) {
  const raw = String(value ?? '');
  // Prefix potentially executable spreadsheet cell values.
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

/**
 * Compare only matching student codes. Class averages from different rosters
 * are not treated as individual improvement evidence.
 */
export function comparePairedOutcomes(before, after) {
  const indexed = new Map();
  (Array.isArray(before) ? before : []).forEach(row => {
    const code = String(row.student_code || '').trim().toUpperCase();
    if (code && !indexed.has(code)) indexed.set(code, row);
  });
  let pairs = 0;
  let beforeTotal = 0;
  let afterTotal = 0;
  const unique = new Set();
  (Array.isArray(after) ? after : []).forEach(row => {
    const code = String(row.student_code || '').trim().toUpperCase();
    if (!code || unique.has(code) || !indexed.has(code)) return;
    unique.add(code);
    const pre = indexed.get(code);
    if (!Number(pre.max_score) || !Number(row.max_score)) return;
    pairs += 1;
    beforeTotal += Number(pre.score) / Number(pre.max_score) * 100;
    afterTotal += Number(row.score) / Number(row.max_score) * 100;
  });
  return { pairs, beforeAverage: pairs ? beforeTotal / pairs : null,
    afterAverage: pairs ? afterTotal / pairs : null,
    change: pairs ? (afterTotal - beforeTotal) / pairs : null };
}
