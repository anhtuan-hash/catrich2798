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

export function filterGradebookStudentView({ students, search = '', missingOnly = false, view = '', activeRound, semester }) {
  const query = normalizeStudentSearch(search);
  return (Array.isArray(students) ? students : []).filter((student) => {
    if (query && !normalizeStudentSearch(`${student?.fullName || ''} ${student?.code || ''}`).includes(query)) return false;
    if (!missingOnly) return true;
    if (view.startsWith('regular-')) return hasMissingRegularScore(student.id, activeRound);
    if (view === 'midterm' || view === 'final') return isGradebookScoreBlank(semester?.[view]?.scores?.[student.id]);
    if (view === 'summary') {
      return (semester?.regular || []).some((round) => hasMissingRegularScore(student.id, round))
        || isGradebookScoreBlank(semester?.midterm?.scores?.[student.id])
        || isGradebookScoreBlank(semester?.final?.scores?.[student.id]);
    }
    return false;
  });
}
