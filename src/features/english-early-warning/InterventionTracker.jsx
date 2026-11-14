import React, { useEffect, useMemo, useState } from 'react';
import { SKILLS } from './earlyWarningEngine.js';
import {
  addJournalEntry, INTERVENTION_WEEKS, learnerWeekTimeline,
  summarizeJournal,
} from './interventionJournal.js';

function dateToday() { return new Date().toISOString().slice(0, 10); }
const EMPTY = { week: '1', skill: 'listening', assigned: '2', completed: '0', checkpointScore: '', observedOn: dateToday(), note: '' };

export default function InterventionTracker({ studentId, cohort, reviews, entries, onEntriesChange, onMessage }) {
  const allowedIds = useMemo(() => cohort.map(row => row.studentId), [cohort]);
  const confirmed = reviews[studentId]?.decision === 'confirmed';
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const timeline = useMemo(() => learnerWeekTimeline(entries, studentId), [entries, studentId]);
  const summary = useMemo(() => summarizeJournal(entries, allowedIds), [entries, allowedIds]);

  useEffect(() => {
    setForm({ ...EMPTY, observedOn: dateToday() });
    setError('');
  }, [studentId]);

  function save(event) {
    event.preventDefault();
    setError('');
    if (!confirmed) return setError('The teacher must confirm the support need before logging an intervention.');
    try {
      const next = addJournalEntry(entries, { ...form, studentId }, allowedIds);
      onEntriesChange(next);
      onMessage('Week ' + form.week + ' entry recorded. Export the journal before leaving this tab.');
      setForm(previous => ({ ...previous, completed: '0', checkpointScore: '', note: '' }));
    } catch (problem) { setError(problem?.message || 'Could not log this entry.'); }
  }

  return (
    <section className="bew-journal" aria-label="Eight-week intervention journal">
      <div className="bew-journal-heading">
        <div><span className="bew-eyebrow">DOCUMENTED SUPPORT</span><h4>Eight-week intervention log</h4></div>
        <span>{timeline.filter(row => row.count).length}/{INTERVENTION_WEEKS} weeks logged</span>
      </div>
      <p className="bew-journal-caveat">
        A teacher-confirmed support need is required before recording activities. Progress is descriptive, not evidence of causation.
      </p>
      <div className="bew-week-grid" role="list" aria-label="Weeks with recorded interventions">
        {timeline.map(row => (
          <div role="listitem" className={row.count ? 'is-logged' : ''} key={row.week} title={'Week ' + row.week + ': ' + row.count + ' entry/entries'}>
            <strong>{String(row.week).padStart(2,'0')}</strong>
            <small>{row.count ? row.count + ' log' + (row.count === 1 ? '' : 's') : 'No entry'}</small>
          </div>
        ))}
      </div>
      <form onSubmit={save} className="bew-journal-form">
        <div>
          <label htmlFor="bew-week">Week</label>
          <select id="bew-week" value={form.week} onChange={e=>setForm({...form, week:e.target.value})}>
            {Array.from({length: INTERVENTION_WEEKS},(_,i)=><option key={i} value={String(i+1)}>Week {i+1}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bew-skill">Target skill</label>
          <select id="bew-skill" value={form.skill} onChange={e=>setForm({...form,skill:e.target.value})}>
            {SKILLS.map(skill=><option key={skill} value={skill}>{skill[0].toUpperCase()+skill.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bew-assigned">Assigned tasks</label>
          <input id="bew-assigned" type="number" min="1" max="20" step="1" required value={form.assigned} onChange={e=>setForm({...form,assigned:e.target.value})}/>
        </div>
        <div>
          <label htmlFor="bew-completed">Completed tasks</label>
          <input id="bew-completed" type="number" min="0" max="20" step="1" required value={form.completed} onChange={e=>setForm({...form,completed:e.target.value})}/>
        </div>
        <div>
          <label htmlFor="bew-checkpoint">Checkpoint /100</label>
          <input id="bew-checkpoint" type="number" min="0" max="100" step="0.01" placeholder="Optional" value={form.checkpointScore} onChange={e=>setForm({...form,checkpointScore:e.target.value})}/>
        </div>
        <div>
          <label htmlFor="bew-observed">Observed date</label>
          <input id="bew-observed" type="date" required value={form.observedOn} onChange={e=>setForm({...form,observedOn:e.target.value})}/>
        </div>
        <div className="bew-journal-note">
          <label htmlFor="bew-journal-note">Observation (coded only; max 280 characters)</label>
          <textarea id="bew-journal-note" rows={2} maxLength={280} placeholder="Describe the learning activity; no names, contact details or identifying information." value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        </div>
        <div className="bew-journal-submit">
          <button type="submit" disabled={!confirmed}>Record intervention</button>
          {!confirmed && <small>Confirm the support need in Teacher verification first.</small>}
        </div>
      </form>
      {error && <p role="alert" className="bew-journal-error">{error}</p>}
      <div className="bew-journal-totals" aria-label="Cohort intervention statistics">
        <span><strong>{summary.events}</strong> recorded events</span>
        <span><strong>{summary.activeLearners}</strong> learners with logs</span>
        <span><strong>{summary.completionPct === null ? '—' : summary.completionPct+'%'}</strong> task completion</span>
        <span><strong>{summary.checkpoints}</strong> checkpoint scores</span>
      </div>
      {timeline.some(row => row.count) && <div className="bew-journal-history">
        <h5>Recorded activities for {studentId}</h5>
        {timeline.filter(row=>row.count).map(row => (
          <div key={row.week}><strong>W{row.week}</strong><span>{row.completedTasks}/{row.assignedTasks} tasks · {row.latestScore === null ? 'no checkpoint' : row.latestScore + '/100'} · {row.count} entry/entries</span></div>
        ))}
      </div>}
    </section>
  );
}
