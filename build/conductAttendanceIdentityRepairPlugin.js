import class126RecoveryIdentityPlugin from './class126RecoveryIdentityPlugin.js';
import studentBulkDeletePlugin from './studentBulkDeletePlugin.js';

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

const STUDENT_DELETE_HANDLERS = `  const isDeletedStudent = (student) => student?.lifecycleStatus === 'deleted' || Boolean(student?.deletedAt);
  const countStudentGradebookScores = (studentId) => {
    let count = 0;
    const isScore = (value) => value !== '' && value != null && Number.isFinite(Number(String(value).replace(',', '.')));
    const visit = (value) => {
      if (!value || typeof value !== 'object') return;
      Object.entries(value).forEach(([key, item]) => {
        if (key === studentId) {
          if (item && typeof item === 'object') {
            Object.values(item).forEach((cell) => { if (isScore(cell)) count += 1; });
          } else if (isScore(item)) count += 1;
          return;
        }
        visit(item);
      });
    };
    visit(workspace.learningGradebook);
    return count;
  };
  const studentLinkedData = (studentId) => ({
    gradebookScores: countStudentGradebookScores(studentId),
    learningRecords: (workspace.learningRecords || []).filter((item) => item.studentId === studentId).length,
    conductRecords: (workspace.conductRecords || []).filter((item) => item.studentId === studentId).length,
    attendanceSessions: Object.values(workspace.attendance || {}).filter((rows) => Boolean(rows?.[studentId])).length,
  });
  const deleteStudentFromRoster = async (student) => {
    const linked = studentLinkedData(student.id);
    const linkedTotal = linked.gradebookScores + linked.learningRecords + linked.conductRecords + linked.attendanceSessions;
    const details = linkedTotal
      ? ' Hệ thống sẽ ẩn học sinh khỏi lớp nhưng vẫn giữ ' + linked.gradebookScores + ' ô điểm, ' + linked.conductRecords + ' ghi nhận rèn luyện và ' + linked.attendanceSessions + ' phiên điểm danh để có thể khôi phục.'
      : ' Hồ sơ sẽ được chuyển vào mục Đã xóa và có thể khôi phục.';
    if (!window.confirm('Xóa ' + student.fullName + ' khỏi danh sách lớp?' + details)) return;
    const confirmation = window.prompt('Để xác nhận, nhập chính xác họ tên học sinh:', '');
    if (confirmation === null) return;
    if (safeText(confirmation).toLowerCase() !== safeText(student.fullName).toLowerCase()) {
      window.alert('Họ tên xác nhận không khớp. Học sinh chưa bị xóa.');
      return;
    }
    const now = new Date().toISOString();
    const next = {
      ...workspace,
      students: (workspace.students || []).map((item) => item.id === student.id ? {
        ...item,
        active: false,
        lifecycleStatus: 'deleted',
        deletedAt: now,
        deletedReason: 'Xóa khỏi danh sách lớp',
        updatedAt: now,
      } : item),
      studentDeletionAudit: [
        ...(workspace.studentDeletionAudit || []),
        {
          id: 'student-delete-' + Date.now(),
          studentId: student.id,
          studentCode: student.code || '',
          studentName: student.fullName,
          deletedAt: now,
          linkedData: linked,
        },
      ],
    };
    await onCommit(next, 'Đã xóa ' + student.fullName + ' khỏi lớp. Dữ liệu liên quan vẫn được giữ và có thể khôi phục.');
    if (editingId === student.id) {
      setDraft(EMPTY_STUDENT);
      setEditingId('');
    }
  };
  const restoreDeletedStudent = async (student) => {
    const now = new Date().toISOString();
    const next = {
      ...workspace,
      students: (workspace.students || []).map((item) => item.id === student.id ? {
        ...item,
        active: true,
        lifecycleStatus: 'active',
        deletedAt: '',
        deletedReason: '',
        inactiveAt: '',
        inactiveReason: '',
        updatedAt: now,
      } : item),
      studentDeletionAudit: [
        ...(workspace.studentDeletionAudit || []),
        {
          id: 'student-restore-' + Date.now(),
          studentId: student.id,
          studentCode: student.code || '',
          studentName: student.fullName,
          restoredAt: now,
        },
      ],
    };
    await onCommit(next, 'Đã khôi phục ' + student.fullName + ' cùng toàn bộ điểm, rèn luyện và điểm danh liên quan.');
  };
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

function addSafeStudentDeleteFeature(code) {
  if (code.includes('deleteStudentFromRoster')) return code;
  let next = code;
  next = next.replace(
    "  const students = useMemo(() => (workspace.students || []).filter((student) => {\n    const match = `${student.fullName} ${student.code} ${student.parentName} ${student.parentPhone}`.toLowerCase().includes(query.toLowerCase());\n    if (!match) return false;\n    if (filter === 'inactive') return student.active === false;\n    if (filter === 'attention') return student.active !== false && student.supportLevel !== 'normal';\n    return student.active !== false;\n  }), [workspace.students, query, filter]);",
    "  const students = useMemo(() => (workspace.students || []).filter((student) => {\n    const match = `${student.fullName} ${student.code} ${student.parentName} ${student.parentPhone}`.toLowerCase().includes(query.toLowerCase());\n    if (!match) return false;\n    const deleted = student.lifecycleStatus === 'deleted' || Boolean(student.deletedAt);\n    if (filter === 'deleted') return deleted;\n    if (filter === 'inactive') return student.active === false && !deleted;\n    if (filter === 'attention') return student.active !== false && !deleted && student.supportLevel !== 'normal';\n    return student.active !== false && !deleted;\n  }), [workspace.students, query, filter]);",
  );
  next = next.replace(
    '  const save = async () => {',
    STUDENT_DELETE_HANDLERS + '\n  const save = async () => {',
  );
  next = next.replace(
    '<option value="inactive">Đã lưu trữ / chuyển lớp</option>',
    '<option value="inactive">Đã lưu trữ / chuyển lớp</option><option value="deleted">Đã xóa</option>',
  );
  next = next.replace(
    '<small>{workspace.students?.length || 0} hồ sơ</small><h2>Danh sách lớp</h2>',
    '<small>{(workspace.students || []).filter((item) => !isDeletedStudent(item)).length} hồ sơ · {(workspace.students || []).filter(isDeletedStudent).length} đã xóa</small><h2>Danh sách lớp</h2>',
  );
  next = next.replace(
    "<div className=\"hr-row-actions\"><button type=\"button\" onClick={() => edit(student)}>Sửa</button>{student.active === false ? <button type=\"button\" onClick={() => onCommit(restoreStudent(workspace, student.id), 'Đã khôi phục học sinh.')}>Khôi phục</button> : <><button type=\"button\" onClick={() => transfer(student)}>Chuyển lớp</button><button type=\"button\" className=\"danger\" onClick={() => archive(student)}>Lưu trữ</button></>}</div>",
    "<div className=\"hr-row-actions\">{isDeletedStudent(student) ? <button type=\"button\" onClick={() => restoreDeletedStudent(student)}>Khôi phục</button> : <><button type=\"button\" onClick={() => edit(student)}>Sửa</button>{student.active === false ? <><button type=\"button\" onClick={() => onCommit(restoreStudent(workspace, student.id), 'Đã khôi phục học sinh.')}>Khôi phục</button><button type=\"button\" className=\"danger\" onClick={() => deleteStudentFromRoster(student)}>Xóa</button></> : <><button type=\"button\" onClick={() => transfer(student)}>Chuyển lớp</button><button type=\"button\" className=\"danger\" onClick={() => archive(student)}>Lưu trữ</button><button type=\"button\" className=\"danger\" onClick={() => deleteStudentFromRoster(student)}>Xóa</button></>}</>}</div>",
  );
  return next;
}

export default function conductAttendanceIdentityRepairPlugin() {
  const class126RecoveryPlugin = class126RecoveryIdentityPlugin();
  const bulkDeletePlugin = studentBulkDeletePlugin();
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

      if (cleanId.endsWith('/src/components/homeroom/HomeroomCoreTabs.jsx')) {
        const withSafeDelete = addSafeStudentDeleteFeature(code);
        return bulkDeletePlugin.transform(withSafeDelete, id);
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
