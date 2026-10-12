// Read-only completeness metrics for six semester scoring components.
// Never mutates rosters, computes grade averages, or includes mock-exam scores.
import { numericGrade } from './gradebookProductivity.js';

export const GRADEBOOK_PROGRESS_LABELS = Object.freeze([
  { id:'regular-0', title:'Thường xuyên 1', short:'TX 1', color:'blue' },
  { id:'regular-1', title:'Thường xuyên 2', short:'TX 2', color:'coral' },
  { id:'regular-2', title:'Thường xuyên 3', short:'TX 3', color:'amber' },
  { id:'regular-3', title:'Thường xuyên 4', short:'TX 4', color:'green' },
  { id:'midterm', title:'Giữa kỳ', short:'GK', color:'purple' },
  { id:'final', title:'Cuối kỳ', short:'CK', color:'teal' },
]);

export function summarizeGradebookProgress(students = [], semester = {}) {
  const roster = (Array.isArray(students) ? students : []).filter((student) => student?.active !== false);
  const sections = GRADEBOOK_PROGRESS_LABELS.map((item, index) => {
    const isRegular = index < 4;
    const round = isRegular ? semester?.regular?.[index] : null;
    const columns = isRegular ? (Array.isArray(round?.columns) ? round.columns : []) : [{ id: item.id }];
    const total = roster.length * columns.length;
    let filled = 0;
    let completedStudents = 0;
    for (const student of roster) {
      let studentEntered = 0;
      for (const column of columns) {
        const value = isRegular ? round?.scores?.[student.id]?.[column.id] : semester?.[item.id]?.scores?.[student.id];
        if (numericGrade(value) !== null) {
          filled++;
          studentEntered++;
        }
      }
      if (columns.length && studentEntered === columns.length) completedStudents++;
    }
    return {
      ...item, total, filled, missing: Math.max(total - filled, 0),
      completedStudents,
      percent: total ? Math.round(filled * 100 / total) : 0,
    };
  });
  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const filled = sections.reduce((sum, section) => sum + section.filled, 0);
  const missing = Math.max(0, total - filled);
  const next = sections.find((section) => section.missing > 0) || null;
  return {
    students: roster.length, sections, total, filled, missing,
    percent: total ? Math.round(filled * 100 / total) : 0,
    completedSections: sections.filter((section) => section.total > 0 && section.missing === 0).length,
    nextView: next?.id || '',
  };
}
