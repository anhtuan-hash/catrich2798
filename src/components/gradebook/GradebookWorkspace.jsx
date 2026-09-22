import { useEffect, useMemo, useState } from 'react';
import GradebookEngine from './GradebookEngine.jsx';
import './GradebookPlusCount.css';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';
import heroCss from '../../styles/GradebookMaterialHeroRuntime.css?inline';
import workspaceColorCss from '../../styles/GradebookColorfulWorkspace.css?inline';
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
    <style>{workspaceColorCss}</style>
    {students.length ? <section className="hr-panel gradebook-student-support" aria-label="Mở hồ sơ hỗ trợ từ sổ điểm">
      <div className="hr-panel-head">
        <div className="gradebook-student-support-copy">
          <span className="gradebook-student-support-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false">
              <circle cx="18" cy="17" r="7" />
              <circle cx="31" cy="18" r="6" />
              <path d="M7 38c1-9 5-13 11-13s10 4 11 13" />
              <path d="M25 38c1-7 4-11 9-11s8 4 9 11" />
            </svg>
          </span>
          <div><small>STUDENT SUPPORT</small><h2>Hỗ trợ &amp; tra cứu học sinh</h2><p>Mở nhanh hồ sơ học sinh, ghi chú đặc biệt và danh sách cần quan tâm.</p></div>
        </div>
        <div className="hr-head-actions">
          <select aria-label="Chọn học sinh để mở hồ sơ hỗ trợ" value={supportStudentId} onChange={(event) => setSupportStudentId(event.target.value)}>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName || student.code || 'Học sinh'}</option>)}
          </select>
          <button type="button" className="secondary" disabled={!supportStudentRef} onClick={openStudentSupport}>Xem hồ sơ hỗ trợ <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    </section> : null}
    <GradebookEngine {...props} />
  </>;
}
