import { useEffect, useMemo, useState } from 'react';
import GradebookEngine from './GradebookEngine.jsx';
import './GradebookPlusCount.css';
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

  return <>
    <GradebookEngine key={props.workspace?.id} {...props} />
    {students.length ? (
      <details className="gbv2-support-extra gbv13-support-compact">
        <summary>Hồ sơ &amp; hỗ trợ học sinh <span aria-hidden="true">⌄</span></summary>
        <section className="gbv13-support-controls" aria-label="Mở hồ sơ hỗ trợ học sinh">
          <p>Chọn học sinh để xem hồ sơ và thông tin hỗ trợ trong phân hệ chuyên trách.</p>
          <div>
            <label htmlFor="gbv13-support-student">Học sinh</label>
            <select id="gbv13-support-student" value={supportStudentId} onChange={(event) => setSupportStudentId(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || student.code || 'Học sinh'}</option>)}
            </select>
            <button type="button" disabled={!supportStudentRef} onClick={openStudentSupport}>Mở hồ sơ <span aria-hidden="true">↗</span></button>
          </div>
        </section>
      </details>
    ) : null}
  </>;
}
