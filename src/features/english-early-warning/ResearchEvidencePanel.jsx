import React, { useMemo } from 'react';
import { buildResearchEvidence, researchReportMarkdown, PUBLIC_MIN_COHORT_SIZE } from './researchEvidence.js';
import { SKILLS } from './earlyWarningEngine.js';
import './ResearchEvidencePanel.css';

const show = value => value === null || value === undefined ? '—' : String(value);
function interval(stats) {
  return stats.lower95 === null ? 'Insufficient pairs' : '[' + stats.lower95 + ', ' + stats.upper95 + ']';
}
export default function ResearchEvidencePanel({results,reviews,journal,onExport}) {
  const report = useMemo(() => buildResearchEvidence(results,reviews,journal),[results,reviews,journal]);
  const coverage = report.sample.codedLearners > 0
    ? 100 * report.sample.completePaired / report.sample.codedLearners : 0;
  function download() {
    try {
      const text = researchReportMarkdown(report,new Date().toISOString());
      onExport(text,'brian-english-city-level-aggregate-report-'+new Date().toISOString().slice(0,10)+'.md','text/markdown;charset=utf-8');
    } catch (e) { /* Fail closed if safety requirements are not met. */ }
  }
  return (
    <section className="bew-research" aria-labelledby="bew-research-title">
      <div className="bew-research-head">
        <div>
          <span className="bew-eyebrow">RESEARCH DOSSIER · VERIFIED DATA ONLY</span>
          <h3 id="bew-research-title">Study evidence & data quality</h3>
          <p>Aggregate, paired analysis for the city-level innovation dossier. The software does not claim a treatment effect or certified B1 proficiency.</p>
        </div>
        <button type="button" onClick={download} disabled={!report.sample.exportPermitted}>
          Export aggregate dossier draft
        </button>
      </div>
      {!report.sample.exportPermitted && (
        <p className="bew-research-warning" role="status">
          Dossier export requires at least {PUBLIC_MIN_COHORT_SIZE} coded learners with complete paired pre/post scores. Smaller subgroups are suppressed in exported tables. Import only approved, real results; individual coded CSV is strictly for internal use.
        </p>
      )}
      <div className="bew-research-kpis">
        <article><span>Coded learners</span><strong>{report.sample.codedLearners}</strong><small>Imported, not automatically recruited</small></article>
        <article><span>Complete paired tests</span><strong>{report.sample.completePaired}</strong><small>{report.sample.missingPost} without full post-test</small></article>
        <article><span>Paired mean change</span><strong>{report.outcomes.overall.meanChange === null ? '—' : (report.outcomes.overall.meanChange > 0 ? '+' : '') + report.outcomes.overall.meanChange}</strong><small>Raw score points, not causal</small></article>
        <article><span>Recorded interventions</span><strong>{report.delivery.events}</strong><small>{report.delivery.activeLearners} learners with activity logs</small></article>
      </div>
      <div className="bew-research-coverage">
        <div><strong>Paired-data coverage</strong><span>{report.sample.completePaired} / {report.sample.codedLearners || '—'}</span></div>
        <div className="bew-research-bar" role="progressbar" aria-label="Paired data completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(coverage)}>
          <span style={{width:coverage+'%'}}/>
        </div>
      </div>
      <div className="bew-research-matrix">
        <h4>Observed changes · matched learners only</h4>
        <div className="bew-research-table-scroll">
          <table>
            <thead><tr><th scope="col">Measure</th><th scope="col">Paired n</th><th scope="col">Mean difference</th><th scope="col">95% paired-t interval</th><th scope="col">Median</th></tr></thead>
            <tbody>
              <tr><th scope="row">Four-skill average</th><td>{report.outcomes.overall.n}</td><td>{show(report.outcomes.overall.meanChange)}</td><td>{interval(report.outcomes.overall)}</td><td>{show(report.outcomes.overall.medianChange)}</td></tr>
              {SKILLS.map(skill => <tr key={skill}>
                <th scope="row">{skill[0].toUpperCase()+skill.slice(1)}</th>
                <td>{report.outcomes.skillChanges[skill].n}</td>
                <td>{show(report.outcomes.skillChanges[skill].meanChange)}</td>
                <td>{interval(report.outcomes.skillChanges[skill])}</td>
                <td>{show(report.outcomes.skillChanges[skill].medianChange)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bew-research-method">
        <div><strong>Teacher confirmation</strong><span>{report.teacherReviews.confirmed} confirmed · {report.teacherReviews.notConfirmed} not confirmed · {report.teacherReviews.pending} pending</span></div>
        <div><strong>Eight-week adherence</strong><span>{report.delivery.confirmedWithEightWeeks} confirmed learners with all 8 weeks logged</span></div>
        <div><strong>Task completion</strong><span>{report.delivery.completionPct === null ? '—' : report.delivery.completionPct+'%'} ({report.delivery.completedTasks}/{report.delivery.assignedTasks} tasks)</span></div>
      </div>
      <p className="bew-research-caveat">95% intervals are descriptive paired-t intervals under statistical assumptions, not causal-effect intervals. The two test forms and risk thresholds have not been independently validated. No fabricated samples are included.</p>
    </section>
  );
}
