import { useEffect, useMemo, useState } from 'react';
import GradebookEngine from './GradebookEngine.jsx';
import './GradebookPlusCount.css';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';
import heroCss from '../../styles/GradebookMaterialHeroRuntime.css?inline';
import { exportStudentGradeReportPdf } from '../../utils/homeroomGradeReportPdf.js';
import { installGradebookMaterialHero } from '../../utils/gradebookMaterialHeroRuntime.js';
import { buildStudentSupportHash, normalizeStudentRef } from '../../studentSupport/studentSupportIdentity.js';

// Keep the PDF exporter in the same production bundle as the Gradebook route.
// GradebookEngine still calls the module through dynamic import, but because this
// boundary imports the exporter statically, Vite/Rollup can no longer split it
// into a late-loaded chunk that may resolve to an empty module on production.
void exportStudentGradeReportPdf;

// GradebookWorkspace has one hero visual authority only. GradebookEditorialV2
// continues to style the records workspace below, while the route-local hero
// stylesheet owns the interactive top spread. The former polish override layer
// is intentionally not loaded so future hero edits happen in one source file.
export default function GradebookWorkspace(props) {
  useEffect(() => installGradebookMaterialHero(), [props.workspace?.id]);
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
    <style>{editorialCss}</style>
    <style>{heroCss}</style>
    {students.length ? <section className="hr-panel" aria-label="Mở hồ sơ hỗ trợ từ sổ điểm">
      <div className="hr-panel-head">
        <div><small>Student Support</small><h2>Mở hồ sơ học sinh</h2></div>
        <div className="hr-head-actions">
          <select aria-label="Chọn học sinh để mở hồ sơ hỗ trợ" value={supportStudentId} onChange={(event) => setSupportStudentId(event.target.value)}>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || student.code || 'Học sinh'}</option>)}
          </select>
          <button type="button" className="secondary" disabled={!supportStudentRef} onClick={openStudentSupport}>Xem hồ sơ hỗ trợ</button>
        </div>
      </div>
    </section> : null}
    <GradebookEngine {...props} />
  </>;
}
