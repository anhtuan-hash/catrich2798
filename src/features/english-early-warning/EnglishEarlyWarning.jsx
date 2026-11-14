import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CSV_COLUMNS, RULE_VERSION, PILOT_THRESHOLDS, evaluateLearner,
  importCodedCohort, suggestedIntervention, summarizeCohort, toCsv,
} from './earlyWarningEngine.js';
import './EnglishEarlyWarning.css';
import InterventionTracker from './InterventionTracker.jsx';
import ResearchEvidencePanel from './ResearchEvidencePanel.jsx';
import CloudPilotControls from './CloudPilotControls.jsx';
import './CloudPilotControls.css';
import './InterventionTracker.css';
import { journalToCsv, summarizeJournal, weeklyCoverage } from './interventionJournal.js';

const LABELS = {
  priority: 'Priority review', review: 'Review suggested',
  no_signal: 'No current signal', insufficient: 'Insufficient data',
};
const FILTERS = ['all', 'priority', 'review', 'no_signal', 'insufficient'];
const MAX_FILE_BYTES = 250 * 1024;
const formatScore = x => x === null || x === undefined ? '—' : Number(x).toFixed(1).replace(/\.0$/, '');

function downloadText(text, name, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function stamp() { return new Date().toISOString(); }
function reviewCounts(review) {
  return Object.values(review).reduce((acc, entry) => {
    if (entry.decision === 'confirmed') acc.confirmed++;
    if (entry.decision === 'not_confirmed') acc.notConfirmed++;
    return acc;
  }, { confirmed: 0, notConfirmed: 0 });
}

export default function EnglishEarlyWarning({ currentUser }) {
  const inputRef = useRef(null);
  const [cohort, setCohort] = useState([]);
  const [reviews, setReviews] = useState({});
  const [journal, setJournal] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const accountIdRef = useRef(currentUser?.id || null);
  useEffect(() => {
    const accountId = currentUser?.id || null;
    if (accountIdRef.current !== accountId) {
      // Coded records must not leak across teacher account changes.
      setCohort([]);
      setReviews({});
      setJournal([]);
      setSelectedId('');
      setNotesDraft('');
      setSearch('');
      setError('');
      setNotice('Teacher session changed. Coded working data has been cleared.');
      accountIdRef.current = accountId;
    }
  }, [currentUser?.id]);
  const analyzed = useMemo(() => cohort.map(evaluateLearner), [cohort]);
  const metrics = useMemo(() => summarizeCohort(analyzed), [analyzed]);
  const reviewMetrics = useMemo(() => reviewCounts(reviews), [reviews]);
  const journalMetrics = useMemo(() => summarizeJournal(journal, cohort.map(row => row.studentId)), [journal, cohort]);
  const selected = analyzed.find(row => row.studentId === selectedId) || null;
  const filtered = analyzed.filter(row =>
    (filter === 'all' || row.status === filter)
    && row.studentId.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setNotice('');
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('CSV file is too large (maximum 250 KB).');
      if (!/\.csv$/i.test(file.name)) throw new Error('Please select a .csv file.');
      const records = importCodedCohort(await file.text());
      setCohort(records); setReviews({}); setJournal([]); setSelectedId(records[0]?.studentId || ''); setNotesDraft(''); setFilter('all'); setSearch('');
      setNotice('Imported ' + records.length + ' coded records into this session. Nothing has been sent to the server.');
    } catch (e) { setError(e.message || 'Unable to read CSV.'); }
  }
  function choose(row) {
    setSelectedId(row.studentId);
    setNotesDraft(reviews[row.studentId]?.notes || '');
  }
  function saveReview(decision) {
    if (!selected) return;
    const notes = notesDraft.trim();
    if (notes.length > 600) return setError('Review notes must contain no more than 600 characters.');
    if (/\b(?:@|https?:|\+\d{8,})/i.test(notes)) return setError('Do not include names, email addresses, phone numbers, or links in review notes.');
    setReviews(previous => ({ ...previous, [selected.studentId]: { decision, notes, reviewedAt: stamp() } }));
    setError(''); setNotice('Teacher review recorded in this browser session; export before leaving.');
  }
  function exportDetailed() {
    const cols = ['student_id','diagnostic_mean','diagnostic_minimum','weak_skill','D','F','T','signal_count','status','teacher_decision','reviewed_at','review_notes','post_mean','post_minimum','mean_change','rubric_target','rule_version','weeks_covered','intervention_entries'];
    const rows = analyzed.map(r => ({
      student_id: r.studentId, diagnostic_mean: r.diagnosticMean, diagnostic_minimum: r.diagnosticMinimum, weak_skill: r.weakSkill,
      D: r.signals.diagnostic === null ? '' : Number(r.signals.diagnostic),
      F: r.signals.recent === null ? '' : Number(r.signals.recent),
      T: r.signals.missing === null ? '' : Number(r.signals.missing),
      signal_count: r.flagCount, status: r.status,
      teacher_decision: reviews[r.studentId]?.decision || 'pending',
      reviewed_at: reviews[r.studentId]?.reviewedAt || '', review_notes: reviews[r.studentId]?.notes || '',
      post_mean: r.postMean, post_minimum: r.postMinimum, mean_change: r.progress,
      rubric_target: r.rubricTarget === null ? '' : Number(r.rubricTarget),
      rule_version: RULE_VERSION,
      weeks_covered: weeklyCoverage(journal, r.studentId),
      intervention_entries: journal.filter(x => x.studentId === r.studentId).length,
    }));
    downloadText(toCsv(cols, rows), 'brian-english-coded-evidence-' + new Date().toISOString().slice(0,10) + '.csv');
  }
  function exportAggregate() {
    downloadText(toCsv(['metric','value'], [
      ...Object.entries(metrics).map(([metric, value]) => ({ metric, value })),
      ...Object.entries(reviewMetrics).map(([metric, value]) => ({ metric: 'teacher_' + metric, value })),
      ...Object.entries(journalMetrics).map(([metric, value]) => ({ metric: 'journal_' + metric, value })),
    ]), 'brian-english-aggregate-report-' + new Date().toISOString().slice(0,10) + '.csv');
  }
  function clearSession() {
    if (cohort.length && !window.confirm('Delete all imported records and unsaved teacher reviews from this browser session?')) return;
    setCohort([]); setReviews({}); setJournal([]); setSelectedId(''); setNotesDraft(''); setError(''); setNotice('Session data cleared.');
  }
  const plan = selected ? suggestedIntervention(selected) : null;
  function restoreCodedStudy(restored) {
    setCohort(restored.learners);
    setReviews(restored.reviews);
    setJournal(restored.entries);
    setSelectedId(restored.learners[0]?.studentId || '');
    setNotesDraft('');
    setFilter('all');
    setSearch('');
    setError('');
  }
  function exportJournal() {
    downloadText(journalToCsv(journal), 'brian-english-intervention-journal-' + new Date().toISOString().slice(0,10) + '.csv');
  }
  return (
    <section className="bew" aria-label="English Early Warning and Intervention">
      <div className="bew-head">
        <div>
          <span className="bew-eyebrow">ENGLISH LEARNING · RESEARCH PILOT V5</span>
          <h2>Early Warning & Intervention</h2>
          <p>A rule-based screening and teacher-led support workspace. Not a diagnosis, automated decision or certified proficiency test.</p>
        </div>
        <div className="bew-rule">RULES <strong>v{RULE_VERSION}</strong><small>Not validated</small></div>
      </div>
      <div className="bew-privacy" role="note">
        <strong>Privacy-first pilot.</strong> Import only coded IDs (P001, P002…). Do not upload names, original student codes or contact data. Learner records, teacher reviews and the eight-week journal remain in this browser tab until you explicitly export them. Cloud storage is disabled pending school approval, assignment verification and RLS testing.
      </div>
      <div className="bew-actions">
        <button type="button" className="bew-button bew-primary" onClick={() => inputRef.current?.click()}>Import coded CSV</button>
        <input ref={inputRef} id="bew-csv-import" className="bew-file" type="file" accept=".csv,text/csv" onChange={handleImport}/>
        <button type="button" className="bew-button" onClick={() => downloadText(CSV_COLUMNS.join(',') + '\r\n', 'brian-english-import-template.csv')}>Download CSV template</button>
        <button type="button" className="bew-button" onClick={exportDetailed} disabled={!cohort.length}>Export coded evidence</button>
        <button type="button" className="bew-button" onClick={exportAggregate} disabled={!cohort.length}>Export aggregate</button>
        <button type="button" className="bew-button" onClick={exportJournal} disabled={!journal.length}>Export 8-week journal</button>
        <button type="button" className="bew-button bew-danger" onClick={clearSession} disabled={!cohort.length}>Clear session</button>
      </div>
      {error && <div className="bew-message bew-error" role="alert">{error}</div>}
      {notice && <div className="bew-message" role="status">{notice}</div>}
      <div className="bew-metrics" aria-label="Cohort indicators">
        <article><small>Imported learners</small><strong>{metrics.n}</strong><span>Coded records only</span></article>
        <article><small>Priority review</small><strong>{metrics.priority}</strong><span>At least 2 signals</span></article>
        <article><small>Missing evidence</small><strong>{metrics.insufficient}</strong><span>Not scored as zero</span></article>
        <article><small>Teacher-confirmed</small><strong>{reviewMetrics.confirmed}</strong><span>Decision retained in session</span></article>
        <article><small>Intervention entries</small><strong>{journalMetrics.events}</strong><span>{journalMetrics.activeLearners} coded learners documented</span></article>
      </div>
      <div className="bew-method"><strong>Screening thresholds · experimental:</strong> D = baseline mean below {PILOT_THRESHOLDS.diagnosticMeanBelow} or weakest skill below {PILOT_THRESHOLDS.weakestSkillBelow}; F = both latest scores below {PILOT_THRESHOLDS.bothRecentScoresBelow}; T = at least {PILOT_THRESHOLDS.missingTasksAtLeast} missed tasks in 14 days. Two or more signals trigger priority review, not an automatic intervention.</div>
      {!cohort.length ? (
        <div className="bew-empty">
          <div className="bew-empty-icon" aria-hidden="true">01 / 04</div>
          <h3>Start with a coded assessment cohort</h3>
          <p>Download the CSV header, enter four diagnostic skills and the recent-work indicators, then import it. The post-test fields are optional. This workspace never inserts fictitious student scores.</p>
          <p><strong>Required:</strong> student_id, listening, speaking, reading, writing. <strong>Optional:</strong> recent1, recent2, missing14d and post-test skills. Missing signal inputs produce “Insufficient data”.</p>
        </div>
      ) : (
        <div className="bew-workspace">
          <div className="bew-list-panel">
            <div className="bew-list-top">
              <h3>Review queue <span>{filtered.length}/{analyzed.length}</span></h3>
              <div className="bew-filters">
                <input aria-label="Search coded ID" placeholder="Find coded ID" value={search} onChange={event => setSearch(event.target.value)}/>
                <select aria-label="Filter by screening status" value={filter} onChange={event => setFilter(event.target.value)}>
                  {FILTERS.map(value => <option key={value} value={value}>{value === 'all' ? 'All statuses' : LABELS[value]}</option>)}
                </select>
              </div>
            </div>
            <div className="bew-records">
              {filtered.map(row => (
                <button type="button" key={row.studentId} onClick={() => choose(row)} className={selectedId === row.studentId ? 'bew-record is-selected' : 'bew-record'} aria-pressed={selectedId === row.studentId}>
                  <span><strong>{row.studentId}</strong><small>{row.weakSkill ? 'Focus: ' + row.weakSkill : 'Baseline incomplete'}</small></span>
                  <span className={'bew-status bew-' + row.status}>{LABELS[row.status]}</span>
                </button>
              ))}
              {!filtered.length && <p className="bew-no-results">No matching coded records.</p>}
            </div>
          </div>
          <aside className="bew-detail" aria-label="Teacher review">
            {selected ? (
              <>
                <div className="bew-detail-top">
                  <div><small>CODED LEARNER</small><h3>{selected.studentId}</h3></div>
                  <span className={'bew-status bew-' + selected.status}>{LABELS[selected.status]}</span>
                </div>
                <div className="bew-scores">
                  {['listening','speaking','reading','writing'].map(skill => (
                    <div key={skill}><span>{skill[0].toUpperCase() + skill.slice(1)}</span><strong>{formatScore(selected.scores[skill])} <small>/100</small></strong></div>
                  ))}
                </div>
                <div className="bew-signalrow" aria-label="Screening indicators">
                  {Object.entries(selected.signals).map(([key, flag]) => <div key={key}>
                    <b>{key === 'diagnostic' ? 'D' : key === 'recent' ? 'F' : 'T'}</b><span>{flag === null ? 'Missing' : flag ? 'Triggered' : 'Clear'}</span>
                  </div>)}
                </div>
                <section className="bew-plan">
                  <h4>Suggested support plan</h4>
                  {plan ? <>
                    <p><strong>Focus:</strong> {plan.skill} · {plan.durationWeeks}-week intervention, review in week {plan.reviewWeek}</p>
                    <p><strong>Goal:</strong> {plan.goal}</p><p><strong>Activity:</strong> {plan.activity}</p>
                  </> : <p>Complete the baseline assessment before choosing an intervention.</p>}
                  <p className="bew-advisory">A teacher decides whether an intervention is appropriate. This recommendation is not automatically assigned to the learner.</p>
                </section>
                <section className="bew-post">
                  <h4>Post-assessment</h4>
                  <p>Mean: <strong>{formatScore(selected.postMean)}</strong> · Change: <strong>{selected.progress === null ? '—' : (selected.progress > 0 ? '+' : '') + selected.progress}</strong> · Provisional rubric: <strong>{selected.rubricTarget === null ? 'Awaiting data' : selected.rubricTarget ? 'Target met' : 'Below target'}</strong></p>
                  <small>Form equivalence has not yet been validated. Changes are descriptive, not causal evidence.</small>
                </section>
                <section className="bew-verification">
                  <h4>Teacher verification</h4>
                  <label htmlFor="bew-review-notes">Notes (coded references only; max 600 characters)</label>
                  <textarea id="bew-review-notes" value={notesDraft} onChange={event => setNotesDraft(event.target.value)} maxLength={600} placeholder="Record the observed learning need and next review step without identifiable details."/>
                  <div className="bew-review-actions">
                    <button type="button" onClick={() => saveReview('confirmed')}>Confirm support need</button>
                    <button type="button" onClick={() => saveReview('not_confirmed')}>Do not confirm</button>
                  </div>
                  {reviews[selected.studentId] && <small className="bew-saved">Teacher decision: {reviews[selected.studentId].decision.replace('_', ' ')} · {new Date(reviews[selected.studentId].reviewedAt).toLocaleString()}</small>}
                </section>
                <InterventionTracker
                  studentId={selected.studentId}
                  cohort={cohort}
                  reviews={reviews}
                  entries={journal}
                  onEntriesChange={setJournal}
                  onMessage={setNotice}
                />
              </>
            ) : <p>Select a coded learner to review.</p>}
          </aside>
        </div>
      )}
      <ResearchEvidencePanel
        results={analyzed}
        reviews={reviews}
        journal={journal}
        onExport={downloadText}
      />
      <CloudPilotControls
        currentUser={currentUser}
        cohort={cohort}
        reviews={reviews}
        journal={journal}
        onRestore={restoreCodedStudy}
      />
      <footer className="bew-footer">BRIAN ENGLISH · Evidence V5 pilot · Rule v{RULE_VERSION} · Coded evidence only · No AI-based risk predictions</footer>
    </section>
  );
}
