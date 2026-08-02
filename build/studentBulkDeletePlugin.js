const BULK_HANDLERS = `  const visibleSelectableStudents = students.filter((student) => !isDeletedStudent(student));
  const selectedStudents = (workspace.students || []).filter((student) => selectedStudentIds.includes(student.id));
  const deletableSelectedStudents = selectedStudents.filter((student) => !isDeletedStudent(student));
  const allVisibleStudentsSelected = visibleSelectableStudents.length > 0
    && visibleSelectableStudents.every((student) => selectedStudentIds.includes(student.id));

  useEffect(() => {
    const validIds = new Set((workspace.students || []).map((student) => student.id));
    setSelectedStudentIds((current) => current.filter((id) => validIds.has(id)));
  }, [workspace.students]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [filter]);

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  };

  const toggleAllVisibleStudents = () => {
    const visibleIds = visibleSelectableStudents.map((student) => student.id);
    setSelectedStudentIds((current) => {
      if (visibleIds.length && visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  };

  const bulkDeleteSelectedStudents = async () => {
    if (!deletableSelectedStudents.length) return;
    const totals = deletableSelectedStudents.reduce((acc, student) => {
      const linked = studentLinkedData(student.id);
      acc.gradebookScores += linked.gradebookScores;
      acc.learningRecords += linked.learningRecords;
      acc.conductRecords += linked.conductRecords;
      acc.attendanceSessions += linked.attendanceSessions;
      return acc;
    }, { gradebookScores: 0, learningRecords: 0, conductRecords: 0, attendanceSessions: 0 });

    const names = deletableSelectedStudents.slice(0, 5).map((student) => student.fullName).join(', ');
    const remaining = Math.max(0, deletableSelectedStudents.length - 5);
    const confirmed = window.confirm(
      'Xóa nhanh ' + deletableSelectedStudents.length + ' học sinh khỏi danh sách lớp?\n\n'
      + names + (remaining ? ' và ' + remaining + ' học sinh khác' : '') + '.\n\n'
      + 'Dữ liệu vẫn được giữ để khôi phục: ' + totals.gradebookScores + ' ô điểm, '
      + totals.conductRecords + ' ghi nhận rèn luyện và ' + totals.attendanceSessions + ' phiên điểm danh.'
    );
    if (!confirmed) return;

    const now = new Date().toISOString();
    const selectedIds = new Set(deletableSelectedStudents.map((student) => student.id));
    const auditRows = deletableSelectedStudents.map((student, index) => ({
      id: 'student-bulk-delete-' + Date.now() + '-' + index,
      studentId: student.id,
      studentCode: student.code || '',
      studentName: student.fullName,
      deletedAt: now,
      linkedData: studentLinkedData(student.id),
      mode: 'bulk',
    }));
    const next = {
      ...workspace,
      students: (workspace.students || []).map((student) => selectedIds.has(student.id) ? {
        ...student,
        active: false,
        lifecycleStatus: 'deleted',
        deletedAt: now,
        deletedReason: 'Xóa nhanh khỏi danh sách lớp',
        updatedAt: now,
      } : student),
      studentDeletionAudit: [
        ...(workspace.studentDeletionAudit || []),
        ...auditRows,
      ],
    };

    await onCommit(
      next,
      'Đã xóa nhanh ' + deletableSelectedStudents.length + ' học sinh khỏi lớp. Điểm, rèn luyện và điểm danh vẫn được giữ để khôi phục.',
    );
    setSelectedStudentIds([]);
    if (deletableSelectedStudents.some((student) => student.id === editingId)) {
      setDraft(EMPTY_STUDENT);
      setEditingId('');
    }
  };

`;

const BULK_TOOLBAR = `<div className="hr-student-bulk-toolbar">
        <label className="hr-student-select-all"><input type="checkbox" checked={allVisibleStudentsSelected} disabled={!visibleSelectableStudents.length} onChange={toggleAllVisibleStudents} /><span>Chọn tất cả đang hiển thị</span></label>
        <span className="hr-student-selected-count">Đã chọn <b>{deletableSelectedStudents.length}</b> học sinh</span>
        <div className="hr-student-bulk-buttons"><button type="button" className="secondary" disabled={!selectedStudentIds.length} onClick={() => setSelectedStudentIds([])}>Bỏ chọn</button><button type="button" className="danger" disabled={!deletableSelectedStudents.length} onClick={bulkDeleteSelectedStudents}>Xóa nhanh {deletableSelectedStudents.length ? '(' + deletableSelectedStudents.length + ')' : ''}</button></div>
      </div>`;

export default function studentBulkDeletePlugin() {
  return {
    name: 'brian-student-bulk-delete',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (!cleanId.endsWith('/src/components/homeroom/HomeroomCoreTabs.jsx')) return null;
      if (code.includes('bulkDeleteSelectedStudents')) return code;

      let next = code;
      next = next.replace(
        "import StudentRosterImportPanel from '../StudentRosterImportPanel.jsx';",
        "import StudentRosterImportPanel from '../StudentRosterImportPanel.jsx';\nimport './StudentBulkDelete.css';",
      );
      next = next.replace(
        "  const [showImporter, setShowImporter] = useState(false);",
        "  const [showImporter, setShowImporter] = useState(false);\n  const [selectedStudentIds, setSelectedStudentIds] = useState([]);",
      );
      next = next.replace(
        '  const save = async () => {',
        BULK_HANDLERS + '  const save = async () => {',
      );
      next = next.replace(
        '<option value="deleted">Đã xóa</option></select></div></div>\n      {students.length ?',
        '<option value="deleted">Đã xóa</option></select></div></div>\n      ' + BULK_TOOLBAR + '\n      {students.length ?',
      );
      next = next.replace(
        '<thead><tr><th>Học sinh</th><th>Liên hệ</th><th>Phụ huynh</th><th>Theo dõi</th><th /></tr></thead>',
        '<thead><tr><th className="hr-student-select-column"><input type="checkbox" aria-label="Chọn tất cả học sinh đang hiển thị" checked={allVisibleStudentsSelected} disabled={!visibleSelectableStudents.length} onChange={toggleAllVisibleStudents} /></th><th>Học sinh</th><th>Liên hệ</th><th>Phụ huynh</th><th>Theo dõi</th><th /></tr></thead>',
      );
      next = next.replace(
        '<tbody>{students.map((student, index) => <tr key={student.id}><td><div className="hr-person-cell">',
        '<tbody>{students.map((student, index) => <tr key={student.id} className={selectedStudentIds.includes(student.id) ? \'is-selected-student\' : \'\'}><td className="hr-student-select-column"><input type="checkbox" aria-label={`Chọn ${student.fullName}`} checked={selectedStudentIds.includes(student.id)} disabled={isDeletedStudent(student)} onChange={() => toggleStudentSelection(student.id)} /></td><td><div className="hr-person-cell">',
      );

      return next;
    },
  };
}
