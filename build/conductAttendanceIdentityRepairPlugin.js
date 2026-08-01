const STUDENT_RESOLVER_SOURCE = `function normalizeAttendanceStudentCode(value) {
  const raw = safeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!raw) return '';
  return /^\\d+$/.test(raw) ? raw.replace(/^0+(?=\\d)/, '') : raw;
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

function resolveAttendanceStudentId(current, attendanceStudentId) {
  const students = Array.isArray(current.students) ? current.students : [];
  const exact = students.find((student) => student.id === attendanceStudentId) || null;
  if (exact && exact.active !== false) return exact.id;

  const activeStudents = students.filter((student) => student.active !== false);
  const sourceCode = normalizeAttendanceStudentCode(exact?.code || attendanceStudentId);
  if (sourceCode) {
    const byCode = activeStudents.find((student) => normalizeAttendanceStudentCode(student.code) === sourceCode);
    if (byCode?.id) return byCode.id;
  }

  if (exact) {
    const sourceName = normalizeAttendanceStudentName(exact.fullName);
    const sourceBirthDate = safeText(exact.birthDate);
    const byIdentity = activeStudents.find((student) => (
      normalizeAttendanceStudentName(student.fullName) === sourceName
      && (!sourceBirthDate || safeText(student.birthDate) === sourceBirthDate)
    ));
    if (byIdentity?.id) return byIdentity.id;
  }

  return attendanceStudentId;
}

`;

export default function conductAttendanceIdentityRepairPlugin() {
  return {
    name: 'brian-conduct-attendance-identity-repair',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');

      if (cleanId.endsWith('/src/utils/homeroomConduct.js')) {
        let next = code;
        if (!next.includes('resolveAttendanceStudentId')) {
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
