import { useEffect } from 'react';
import GradebookEngine from './GradebookEngine.jsx';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';
import heroCss from '../../styles/GradebookMaterialHeroRuntime.css?inline';
import { exportStudentGradeReportPdf } from '../../utils/homeroomGradeReportPdf.js';
import { installGradebookMaterialHero } from '../../utils/gradebookMaterialHeroRuntime.js';

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

  return <>
    <style>{editorialCss}</style>
    <style>{heroCss}</style>
    <GradebookEngine {...props} />
  </>;
}
