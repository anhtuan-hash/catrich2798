// Display-only Gradebook roster helpers.
// Never remove records or mutate score storage; all score calculations and
// Excel/PDF exports must continue using the full unfiltered student roster.
export function normalizeStudentSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (letter) => letter === 'Đ' ? 'D' : 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

export function isGradebookScoreBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

export function hasMissingRegularScore(studentId, round) {
  return Array.isArray(round?.columns)
    && round.columns.some((column) => isGradebookScoreBlank(round?.scores?.[studentId]?.[column.id]));
}


export function missingScoreCount(studentId, { view = '', activeRound, semester, mockExams = [] } = {}) {
  const countRound = (round) => (round?.columns || []).reduce((total, column) =>
    total + Number(isGradebookScoreBlank(round?.scores?.[studentId]?.[column.id])), 0);
  if (view === 'mock') return mockExams.reduce((sum, exam) => sum + Number(isGradebookScoreBlank(exam?.scores?.[studentId])), 0);
  if (view.startsWith('regular-')) return countRound(activeRound);
  if (view === 'midterm' || view === 'final') {
    return Number(isGradebookScoreBlank(semester?.[view]?.scores?.[studentId]));
  }
  if (view === 'summary') {
    return (semester?.regular || []).reduce((sum, round) => sum + countRound(round), 0)
      + Number(isGradebookScoreBlank(semester?.midterm?.scores?.[studentId]))
      + Number(isGradebookScoreBlank(semester?.final?.scores?.[studentId]));
  }
  return 0;
}

export function gradebookColumnProgress(students, round) {
  return (round?.columns || []).map((column, index) => {
    const entered = (students || []).filter((student) =>
      !isGradebookScoreBlank(round?.scores?.[student.id]?.[column.id])).length;
    const total = (students || []).length;
    return {
      id: column.id,
      label: column.label || `Lần ${index + 1}`,
      index,
      entered,
      total,
      missing: Math.max(0, total - entered),
      percent: total ? Math.round(entered * 100 / total) : 0,
    };
  });
}

export function filterGradebookStudentView({ students, search = '', missingOnly = false, view = '', activeRound, semester, mockExams = [], sortBy = 'original' }) {
  const query = normalizeStudentSearch(search);
  const matching = (Array.isArray(students) ? students : []).filter((student) => {
    if (query && !normalizeStudentSearch(`${student?.fullName || ''} ${student?.code || ''}`).includes(query)) return false;
    if (!missingOnly) return true;
    if (view === 'mock') return mockExams.length > 0 && mockExams.some((exam) => isGradebookScoreBlank(exam?.scores?.[student.id]));
    if (view.startsWith('regular-')) return hasMissingRegularScore(student.id, activeRound);
    if (view === 'midterm' || view === 'final') return isGradebookScoreBlank(semester?.[view]?.scores?.[student.id]);
    if (view === 'summary') {
      return (semester?.regular || []).some((round) => hasMissingRegularScore(student.id, round))
        || isGradebookScoreBlank(semester?.midterm?.scores?.[student.id])
        || isGradebookScoreBlank(semester?.final?.scores?.[student.id]);
    }
    return false;
  });
  if (sortBy === 'name') return matching.sort((a, b) =>
    String(a.fullName || '').localeCompare(String(b.fullName || ''), 'vi', { sensitivity: 'base' }));
  if (sortBy === 'missing-first') return matching.sort((a, b) =>
    missingScoreCount(b.id, { view, activeRound, semester, mockExams }) -
    missingScoreCount(a.id, { view, activeRound, semester, mockExams }));
  return matching;
}
