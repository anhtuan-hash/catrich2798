// Gradebook semester mission – purely derived from the active roster and raw score entries.
// Score zero is valid, while blank/missing strings count as pending.
// This never changes saved scores, weighted grade calculations, or export rows.
import { isGradebookScoreBlank } from './gradebookStudentView.js';

const safeStudents = (students) => Array.isArray(students) ? students : [];
const safeColumns = (round) => Array.isArray(round?.columns) ? round.columns : [];

export function semesterProgressSections(students, semester) {
  const roster = safeStudents(students);
  const rounds = Array.isArray(semester?.regular) ? semester.regular : [];
  const regular = rounds.map((round, index) => {
    const columns = safeColumns(round);
    const total = roster.length * columns.length;
    const entered = roster.reduce((sum, student) => sum + columns.reduce((count, column) =>
      count + Number(!isGradebookScoreBlank(round?.scores?.[student.id]?.[column.id])), 0), 0);
    const readyStudents = columns.length
      ? roster.filter((student) => columns.every((column) =>
        !isGradebookScoreBlank(round?.scores?.[student.id]?.[column.id]))).length
      : 0;
    return {
      id: `regular-${index}`,
      label: `TX · Đợt ${index + 1}`,
      kind: 'regular',
      index,
      columns: columns.length,
      total,
      entered,
      missing: total - entered,
      readyStudents,
      percent: total ? Math.round(entered / total * 100) : 0,
    };
  });
  const exams = ['midterm','final'].map((type) => {
    const total = roster.length;
    const entered = roster.filter((student) => !isGradebookScoreBlank(semester?.[type]?.scores?.[student.id])).length;
    return {
      id: type,
      label: type === 'midterm' ? 'Giữa kỳ' : 'Cuối kỳ',
      kind: 'exam',
      index: type === 'midterm' ? 0 : 1,
      columns: 1,
      total,
      entered,
      missing: total - entered,
      readyStudents: entered,
      percent: total ? Math.round(entered / total * 100) : 0,
    };
  });
  return [...regular, ...exams];
}

export function firstMissingGradeSection(studentId, semester) {
  const rounds = Array.isArray(semester?.regular) ? semester.regular : [];
  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];
    if (safeColumns(round).some((column) =>
      isGradebookScoreBlank(round?.scores?.[studentId]?.[column.id]))) return `regular-${index}`;
  }
  if (isGradebookScoreBlank(semester?.midterm?.scores?.[studentId])) return 'midterm';
  if (isGradebookScoreBlank(semester?.final?.scores?.[studentId])) return 'final';
  return null;
}

export function semesterPendingStudents(students, semester, limit = 6) {
  const roster = safeStudents(students);
  const sections = semesterProgressSections(roster, semester);
  const queue = roster.map((student, index) => {
    const missing = sections.reduce((count, section) => {
      if (section.kind === 'exam') return count + Number(isGradebookScoreBlank(semester?.[section.id]?.scores?.[student.id]));
      const round = semester?.regular?.[section.index];
      return count + safeColumns(round).reduce((sum, column) => sum + Number(
        isGradebookScoreBlank(round?.scores?.[student.id]?.[column.id])), 0);
    }, 0);
    return {
      studentId: student.id,
      name: student.fullName || 'Chưa có tên',
      code: student.code || '',
      missing,
      originalIndex: index,
      nextView: firstMissingGradeSection(student.id, semester),
    };
  }).filter((row) => row.missing > 0);
  queue.sort((a, b) => b.missing - a.missing || a.originalIndex - b.originalIndex);
  return queue.slice(0, Math.max(0, Math.floor(Number(limit) || 0)));
}

export function semesterProgressSummary(sections) {
  const list = Array.isArray(sections) ? sections : [];
  const total = list.reduce((sum, section) => sum + section.total, 0);
  const entered = list.reduce((sum, section) => sum + section.entered, 0);
  return {
    total,
    entered,
    missing: Math.max(0, total - entered),
    percent: total ? Math.round(entered * 100 / total) : 0,
    completedSections: list.filter((section) => section.total > 0 && section.missing === 0).length,
    sectionCount: list.length,
  };
}
