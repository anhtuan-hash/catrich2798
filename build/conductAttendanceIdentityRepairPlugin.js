import class126RecoveryIdentityPlugin from './class126RecoveryIdentityPlugin.js';

const STUDENT_RESOLVER_SOURCE = `function attendanceStudentCodeCandidates(value) {
  const raw = safeText(value).toLowerCase();
  if (!raw) return [];
  const compact = raw.replace(/[^a-z0-9]/g, '');
  const digitRuns = raw.match(/\\d{4,}/g) || [];
  return [...new Set([
    compact,
    ...digitRuns,
    ...digitRuns.map((item) => item.replace(/^0+(?=\\d)/, '')),
  ].filter(Boolean))];
}

function normalizeAttendanceStudentName(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function activeStudentByReferences(current, references = [], sourceStudent = null) {
  const students = Array.isArray(current.students) ? current.students : [];
  const activeStudents = students.filter((student) => student.active !== false);

  for (const reference of references.filter(Boolean)) {
    const exact = activeStudents.find((student) => student.id === reference);
    if (exact?.id) return exact.id;
  }

  const codes = new Set();
  references.filter(Boolean).forEach((reference) => attendanceStudentCodeCandidates(reference).forEach((code) => codes.add(code)));
  attendanceStudentCodeCandidates(sourceStudent?.code).forEach((code) => codes.add(code));
  if (codes.size) {
    const byCode = activeStudents.find((student) => attendanceStudentCodeCandidates(student.code).some((code) => codes.has(code)));
    if (byCode?.id) return byCode.id;
  }

  if (sourceStudent) {
    const sourceName = normalizeAttendanceStudentName(sourceStudent.fullName);
    const sourceBirthDate = safeText(sourceStudent.birthDate);
    const byIdentity = activeStudents.find((student) => (
      normalizeAttendanceStudentName(student.fullName) === sourceName
      && (!sourceBirthDate || safeText(student.birthDate) === sourceBirthDate)
    ));
    if (byIdentity?.id) return byIdentity.id;
  }

  return '';
}

function resolveAttendanceStudentId(current, attendanceStudentId) {
  const students = Array.isArray(current.students) ? current.students : [];
  const sourceStudent = students.find((student) => student.id === attendanceStudentId) || null;
  return activeStudentByReferences(current, [attendanceStudentId], sourceStudent) || attendanceStudentId;
}

function attendanceStudentIdFromSourceKey(sourceKey) {
  const raw = safeText(sourceKey);
  if (!raw.startsWith('attendance:')) return '';
  const separator = raw.lastIndexOf(':');
  return separator >= 0 ? raw.slice(separator + 1) : '';
}

function resolveConductRecordStudentId(current, record = {}) {
  const students = Array.isArray(current.students) ? current.students : [];
  const sourceKeyStudentId = attendanceStudentIdFromSourceKey(record.sourceKey);
  const sourceStudent = students.find((student) => (
    student.id === record.studentId || student.id === sourceKeyStudentId
  )) || null;
  return activeStudentByReferences(
    current,
    [record.studentId, sourceKeyStudentId],
    sourceStudent,
  ) || safeText(record.studentId);
}

`;

function fixClass126CloudCandidateScan(code) {
  return String(code || '').replace(
    `    collectWorkspaceAndBackups(
      workspace,
      'cloud',
      \`Cloud · \${safeText(row.workspace_id)}\`,
    );`,
    `    collectWorkspaceAndBackups(
      workspace,
      'cloud',
      candidates,
      \`Cloud · \${safeText(row.workspace_id)}\`,
    );`,
  );
}

export default function conductAttendanceIdentityRepairPlugin() {
  const class126RecoveryPlugin = class126RecoveryIdentityPlugin();
  return {
    name: 'brian-conduct-attendance-identity-repair',
    enforce: 'pre',
    transform(code, id) {
      const class126Result = class126RecoveryPlugin.transform(code, id);
      if (class126Result != null) return fixClass126CloudCandidateScan(class126Result);

      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');

      if (cleanId.endsWith('/src/utils/homeroomConduct.js')) {
        let next = code;
        if (!next.includes('resolveConductRecordStudentId')) {
          next = next.replace(
            "export function syncAttendanceToConduct(workspace, weekStart, actor = '') {",
            STUDENT_RESOLVER_SOURCE + "export function syncAttendanceToConduct(workspace, weekStart, actor = '') {",
          );
          next = next.replace(
            '    Object.entries(rows || {}).forEach(([studentId, entry]) => {',
            `    Object.entries(rows || {}).forEach(([attendanceStudentId, entry]) => {
      const studentId = resolveAttendanceStudentId(current, attendanceStudentId);`,
          );
          next = next.replace(
            '      const sourceBaseKey = attendanceSourceBaseKey(sessionKey, studentId);',
            '      const sourceBaseKey = attendanceSourceBaseKey(sessionKey, attendanceStudentId);',
          );
          next = next.replace(
            "        || existing.status !== 'confirmed'",
            "        || existing.status !== 'confirmed'\n        || existing.studentId !== studentId",
          );
          next = next.replace(
            '    const studentRecords = records.filter((item) => item.studentId === student.id);',
            '    const studentRecords = records.filter((item) => resolveConductRecordStudentId(current, item) === student.id);',
          );
        }
        return next;
      }

      if (cleanId.endsWith('/src/components/HomeroomConductTab.jsx')) {
        return code.replace(
          '  const weekRows = useMemo(() => calculateWeeklyConduct(workspace, weekStart), [workspace, weekStart]);',
          '  const weekRows = useMemo(() => calculateWeeklyConduct(workspace, weekStart, { live: true }), [workspace, weekStart]);',
        );
      }

      return null;
    },
  };
}
