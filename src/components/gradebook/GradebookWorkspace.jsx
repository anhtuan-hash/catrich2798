import GradebookEngine from './GradebookEngine.jsx';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';
import { exportStudentGradeReportPdf } from '../../utils/homeroomGradeReportPdf.js';

// Restoration marker: keep the exact pre-redesign Gradebook visual snapshot and
// force a fresh production deployment instead of reusing an older Vercel build.
// No visual or data behavior is changed by this marker.

// Keep the PDF exporter in the same production bundle as the Gradebook route.
// GradebookEngine still calls the module through dynamic import, but because this
// boundary imports the exporter statically, Vite/Rollup can no longer split it
// into a late-loaded chunk that may resolve to an empty module on production.
void exportStudentGradeReportPdf;

// Public Gradebook boundary. The final editorial layer is rendered after the
// app styles so the previous hero treatment cannot win the cascade again.
export default function GradebookWorkspace(props) {
  return <>
    <style>{editorialCss}</style>
    <GradebookEngine {...props} />
  </>;
}
