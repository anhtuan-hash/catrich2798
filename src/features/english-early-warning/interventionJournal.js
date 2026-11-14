import { SKILLS, toCsv } from './earlyWarningEngine.js';

export const INTERVENTION_WEEKS = 8;
export const JOURNAL_VERSION = '1.0';
const CODED_ID = /^P[0-9]{3,6}$/;
const NOTES_LIMIT = 280;

function wholeNumber(value, field, min, max) {
  const string = String(value ?? '').trim();
  if (!/^\d+$/.test(string)) throw new Error(field + ' must be a whole number.');
  const number = Number(string);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(field + ' must be between ' + min + ' and ' + max + '.');
  return number;
}

export function isCodedId(value) {
  return CODED_ID.test(String(value ?? ''));
}

export function validateJournalNote(value) {
  const note = String(value ?? '').trim();
  if (note.length > NOTES_LIMIT) throw new Error('Notes must not exceed ' + NOTES_LIMIT + ' characters.');
  // This cannot reliably recognize real names. Institutional instructions remain mandatory.
  if (/(?:https?:\/\/|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i.test(note)) {
    throw new Error('Do not include links, emails or telephone numbers.');
  }
  return note;
}

function validDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Date must have YYYY-MM-DD format.');
  const date = new Date(text + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error('Date is not valid.');
  }
  return text;
}

export function validateWeeklyEntry(input, allowedIds = []) {
  const studentId = String(input?.studentId || '').trim();
  if (!isCodedId(studentId)) throw new Error('Use a coded learner ID (P001, etc.).');
  if (!allowedIds.includes(studentId)) throw new Error('This code is not in the current cohort.');
  const week = wholeNumber(input?.week, 'Week', 1, INTERVENTION_WEEKS);
  const skill = String(input?.skill || '').trim().toLowerCase();
  if (!SKILLS.includes(skill)) throw new Error('Choose one of the four English skills.');
  const assigned = wholeNumber(input?.assigned, 'Assigned tasks', 1, 20);
  const completed = wholeNumber(input?.completed, 'Completed tasks', 0, assigned);
  const rawScore = input?.checkpointScore;
  let checkpointScore = null;
  if (rawScore !== '' && rawScore !== null && rawScore !== undefined) {
    if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(String(rawScore))) throw new Error('Checkpoint score must be 0–100 with at most two decimal places.');
    checkpointScore = Number(rawScore);
    if (checkpointScore < 0 || checkpointScore > 100) throw new Error('Checkpoint score must be 0–100.');
  }
  const observedOn = validDate(input?.observedOn);
  const note = validateJournalNote(input?.note);
  return { studentId, week, skill, assigned, completed, checkpointScore, observedOn, note };
}

export function addJournalEntry(entries, draft, codedLearners, now = new Date().toISOString()) {
  const value = validateWeeklyEntry(draft, codedLearners);
  if (typeof now !== 'string' || !Number.isFinite(Date.parse(now))) throw new Error('Invalid record timestamp.');
  if (!Array.isArray(entries)) throw new Error('Journal must be an array.');
  if (entries.length >= 960) throw new Error('The study has reached the journal entry limit.');
  const event = { ...value, recordedAt: now, sequence: entries.length + 1 };
  return [...entries, event];
}

export function summarizeJournal(entries = [], codedLearners = []) {
  const learnerIds = new Set(codedLearners);
  const used = entries.filter(row => learnerIds.has(row.studentId));
  const activeLearners = new Set(used.map(row => row.studentId)).size;
  const totalAssigned = used.reduce((sum, row) => sum + row.assigned, 0);
  const totalCompleted = used.reduce((sum, row) => sum + row.completed, 0);
  const checkpoints = used.map(row => row.checkpointScore).filter(Number.isFinite);
  const weeksDocumented = new Set(used.map(row => row.week)).size;
  return {
    events: used.length, activeLearners, weeksDocumented,
    completedTasks: totalCompleted, assignedTasks: totalAssigned,
    completionPct: totalAssigned ? Math.round(10000 * totalCompleted / totalAssigned) / 100 : null,
    meanCheckpoint: checkpoints.length ? Math.round(100 * checkpoints.reduce((a,b) => a+b, 0) / checkpoints.length) / 100 : null,
    checkpoints: checkpoints.length,
  };
}

export function learnerWeekTimeline(entries, studentId) {
  const matches = entries.filter(row => row.studentId === studentId);
  const timeline = Array.from({length: INTERVENTION_WEEKS}, (_, index) => ({
    week: index + 1, entries: [], count: 0, latestScore: null, completedTasks: 0, assignedTasks: 0,
  }));
  matches.forEach(entry => {
    const bucket = timeline[entry.week - 1];
    if (!bucket) return;
    bucket.entries.push(entry);
    bucket.count++;
    bucket.completedTasks += entry.completed;
    bucket.assignedTasks += entry.assigned;
    if (entry.checkpointScore !== null) bucket.latestScore = entry.checkpointScore;
  });
  return timeline;
}

export function journalToCsv(entries) {
  const columns = [
    'student_id','week','skill','assigned_tasks','completed_tasks',
    'checkpoint_score','observed_on','teacher_note','recorded_at','sequence','journal_version',
  ];
  const rows = entries.map(row => ({
    student_id: row.studentId, week: row.week, skill: row.skill,
    assigned_tasks: row.assigned, completed_tasks: row.completed,
    checkpoint_score: row.checkpointScore, observed_on: row.observedOn,
    teacher_note: row.note, recorded_at: row.recordedAt, sequence: row.sequence,
    journal_version: JOURNAL_VERSION,
  }));
  return toCsv(columns, rows);
}

export function weeklyCoverage(entries, studentId) {
  return learnerWeekTimeline(entries, studentId).filter(row => row.count > 0).length;
}
