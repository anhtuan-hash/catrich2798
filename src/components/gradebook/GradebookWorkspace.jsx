import { useEffect, useMemo, useState } from 'react';
import GradebookMacEngine from './GradebookMacEngine.jsx';
import { exportStudentGradeReportPdf } from '../../utils/homeroomGradeReportPdf.js';
import { buildStudentSupportHash, normalizeStudentRef } from '../../studentSupport/studentSupportIdentity.js';

// Keep the PDF exporter in the same production bundle as the Gradebook route.
// GradebookEngine still calls the module through dynamic import, but because this
// boundary imports the exporter statically, Vite/Rollup can no longer split it
// into a late-loaded chunk that may resolve to an empty module on production.
void exportStudentGradeReportPdf;

// The parent route renders the header natively and supplies its single scoped
// stylesheet. This component owns the scoring UI and optional student support only.
export default function GradebookWorkspace(props) {
  const students = useMemo(
    () => (props.workspace?.students || []).filter((student) => student.active !== false),
    [props.workspace?.students],
  );
  const [supportStudentId, setSupportStudentId] = useState(() => students[0]?.id || '');

  useEffect(() => {
    if (!students.some((student) => student.id === supportStudentId)) {
      setSupportStudentId(students[0]?.id || '');
    }
  }, [students, supportStudentId]);

  const supportStudent = students.find((student) => student.id === supportStudentId) || null;
  const supportStudentRef = normalizeStudentRef(supportStudent || {});
  const openStudentSupport = () => {
    if (!supportStudentRef) return;
    window.location.hash = buildStudentSupportHash({
      studentRef: supportStudentRef,
      workspaceId: props.workspace?.id || props.workspace?.workspaceId || '',
      tab: 'student',
    }).replace(/^#/, '');
  };

  const supportPanel = students.length ? (
    <section className="gbmac-support-tools" aria-label="Hồ sơ hỗ trợ học sinh">
      <p>Chọn học sinh để mở hồ sơ hỗ trợ trong phân hệ chuyên trách.</p>
      <label htmlFor="gbmac-support-student">Học sinh</label>
      <div>
        <select id="gbmac-support-student" value={supportStudentId}
          onChange={(event) => setSupportStudentId(event.target.value)}>
          {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || student.code || 'Học sinh'}</option>)}
        </select>
        <button type="button" disabled={!supportStudentRef} onClick={openStudentSupport}>Mở hồ sơ ↗</button>
      </div>
    </section>
  ) : null;

  return <GradebookMacEngine key={props.workspace?.id} {...props} supportPanel={supportPanel} />;
}
