import assert from 'node:assert/strict';
import {
  addJournalEntry, isCodedId, validateWeeklyEntry, validateJournalNote,
  summarizeJournal, learnerWeekTimeline, journalToCsv, weeklyCoverage,
} from '../src/features/english-early-warning/interventionJournal.js';
const ids = ['P001','P002'];
const draft = { studentId:'P001', week:1, skill:'listening', assigned:4, completed:3,
  checkpointScore:'72.5', observedOn:'2026-11-14', note:'Focused listening practice.' };
assert.ok(isCodedId('P001'));
assert.equal(isCodedId('A123'),false);
const a = addJournalEntry([],draft,ids,'2026-11-14T01:00:00Z');
assert.equal(a.length,1);
assert.equal(a[0].checkpointScore,72.5);
assert.equal(a[0].sequence,1);
assert.equal(summarizeJournal(a,ids).completionPct,75);
assert.equal(summarizeJournal(a,ids).activeLearners,1);
assert.equal(weeklyCoverage(a,'P001'),1);
assert.equal(learnerWeekTimeline(a,'P001').length,8);
const b = addJournalEntry(a,{...draft,week:8,completed:4,checkpointScore:''},ids,'2026-11-14T02:00:00Z');
assert.equal(summarizeJournal(b,ids).completionPct,87.5);
assert.equal(learnerWeekTimeline(b,'P001')[7].count,1);
assert.match(journalToCsv(b),/student_id,week,skill/);
assert.match(journalToCsv(b),/P001,8,listening/);
assert.throws(()=>validateWeeklyEntry({...draft,studentId:'Student1'},ids),/coded learner/);
assert.throws(()=>validateWeeklyEntry({...draft,studentId:'P999'},ids),/not in the current/);
assert.throws(()=>validateWeeklyEntry({...draft,week:9},ids),/between 1 and 8/);
assert.throws(()=>validateWeeklyEntry({...draft,completed:5},ids),/between 0 and 4/);
assert.throws(()=>validateWeeklyEntry({...draft,checkpointScore:101},ids),/0–100/);
assert.throws(()=>validateWeeklyEntry({...draft,checkpointScore:'NaN'},ids),/0–100/);
assert.throws(()=>validateWeeklyEntry({...draft,observedOn:'2026-02-30'},ids),/Date is not valid/);
assert.throws(()=>validateJournalNote('contact@example.com'),/Do not include/);
assert.throws(()=>validateJournalNote('https://abc.com'),/Do not include/);
assert.equal(validateJournalNote('No identifiers.'),'No identifiers.');
console.log('[PASS] V4 journal eight-week tracking, deterministic metrics and privacy validation');
