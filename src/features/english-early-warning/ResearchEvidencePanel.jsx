import React, { useEffect, useMemo, useState } from 'react';
import { buildResearchEvidence, researchReportMarkdown, PUBLIC_MIN_COHORT_SIZE } from './researchEvidence.js';
import { SKILLS } from './earlyWarningEngine.js';
import { createAuditManifest, researchReadiness } from './researchAudit.js';
import './ResearchEvidencePanel.css';

const show = value => value === null || value === undefined ? '—' : String(value);
function interval(stats) {
  return stats.lower95 === null ? 'Insufficient pairs' : '[' + stats.lower95 + ', ' + stats.upper95 + ']';
}
export default function ResearchEvidencePanel({results,reviews,journal,onExport}) {
  const report = useMemo(() => buildResearchEvidence(results,reviews,journal),[results,reviews,journal]);
  const readiness = useMemo(() => researchReadiness(report), [report]);
  const [lastExport, setLastExport] = useState(null);
  const [auditBusy,setAuditBusy] = useState(false);
  const [auditError,setAuditError] = useState('');
  useEffect(() => {
    setLastExport(null);
    setAuditError('');
  }, [results,reviews,journal]);
  const coverage = report.sample.codedLearners > 0
    ? 100 * report.sample.completePaired / report.sample.codedLearners : 0;
  function download() {
    try {
      const generatedAt = new Date().toISOString();
      const text = researchReportMarkdown(report,generatedAt);
      onExport(text,'brian-english-city-level-aggregate-report-'+generatedAt.slice(0,10)+'.md','text/markdown;charset=utf-8');
      setLastExport({text,generatedAt,report});
      setAuditError('');
    } catch (e) { setAuditError(e?.message || 'The aggregate report could not be exported.'); }
  }
  async function exportManifest() {
    if (!lastExport || auditBusy) return;
    setAuditBusy(true); setAuditError('');
    try {
      const manifest = await createAuditManifest(lastExport.text,lastExport.report,lastExport.generatedAt);
      onExport(JSON.stringify(manifest,null,2)+'\n',
        'brian-english-aggregate-audit-'+lastExport.generatedAt.slice(0,10)+'.json',
        'application/json;charset=utf-8');
    } catch (e) { setAuditError(e?.message || 'Unable to create SHA-256 manifest.'); }
    finally { setAuditBusy(false); }
  }
  return (
    <section className="bew-research" aria-labelledby="bew-research-title">
      <div className="bew-research-head">
        <div>
          <span className="bew-eyebrow">RESEARCH DOSSIER · VERIFIED DATA ONLY</span>
          <h3 id="bew-research-title">Study evidence & data quality</h3>
          <p>Aggregate, paired analysis for the city-level innovation dossier. The software does not claim a treatment effect or certified B1 proficiency.</p>
        </div>
        <div className="bew-research-export-actions">
          <button type="button" onClick={download} disabled={!report.sample.exportPermitted}>
            Export aggregate dossier draft
          </button>
          <button type="button" onClick={exportManifest} disabled={!lastExport || auditBusy}>
            {auditBusy ? 'Creating SHA-256…' : 'Export SHA-256 audit manifest'}
          </button>
        </div>
      </div>
      {auditError && <p className="bew-research-warning" role="alert">{auditError}</p>}
      {lastExport && <p className="bew-research-audit-note" role="status">
        Report exported. Download the matching SHA-256 manifest to detect later edits. It does not verify original scores, authorship or institutional approval.
      </p>}
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
      <div className="bew-readiness" aria-label="Implementation and study governance checklist">
        <h4>Implementation readiness <span>{readiness.completed}/{readiness.total} documented from app data</span></h4>
        <div className="bew-readiness-items">
          {readiness.tasks.map(task=><div className="bew-readiness-item" key={task.key}>
            <span aria-hidden="true">{task.done ? '✓' : '○'}</span>
            <div><strong>{task.title}</strong><small>{task.metric}</small></div>
          </div>)}
        </div>
        <h5>External sign-off still required</h5>
        <ul>{readiness.externalBlockers.map(item=><li key={item}>{item}</li>)}</ul>
        <p>This dashboard can never mark the city-level submission as approved automatically.</p>
      </div>
      <p className="bew-research-caveat">95% intervals are descriptive paired-t intervals under statistical assumptions, not causal-effect intervals. The two test forms and risk thresholds have not been independently validated. No fabricated samples are included.</p>
    </section>
  );
}
