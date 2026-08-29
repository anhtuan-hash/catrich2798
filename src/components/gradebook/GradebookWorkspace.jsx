import { useEffect } from 'react';
import GradebookEngine from './GradebookEngine.jsx';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';
import materialHeroCss from '../../styles/GradebookMaterialHeroRuntime.css?inline';
import polishCss from '../../styles/GradebookMaterialHeroPolish.css?inline';
import { exportStudentGradeReportPdf } from '../../utils/homeroomGradeReportPdf.js';
import { installGradebookMaterialHero } from '../../utils/gradebookMaterialHeroRuntime.js';

// Keep the PDF exporter in the same production bundle as the Gradebook route.
// GradebookEngine still calls the module through dynamic import, but because this
// boundary imports the exporter statically, Vite/Rollup can no longer split it
// into a late-loaded chunk that may resolve to an empty module on production.
void exportStudentGradeReportPdf;

// GradebookWorkspace owns the final route-level visual authority. The legacy
// editorial CSS remains for the class cards/tables below, while the Material
// hero layer is rendered last and progressively enhances the existing hero with
// live class, score and navigation controls. The polish layer is intentionally
// last so it can tighten the current hero without touching Gradebook logic.
export default function GradebookWorkspace(props) {
  useEffect(() => installGradebookMaterialHero(), [props.workspace?.id]);

  return <>
    <style>{editorialCss}</style>
    <style>{materialHeroCss}</style>
    <style>{polishCss}</style>
    <GradebookEngine {...props} />
  </>;
}
