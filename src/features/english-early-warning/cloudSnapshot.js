/**
 * A cloud snapshot intentionally contains no personal data, teacher free-text,
 * or student-to-code lookup table. It is optional and never autosaved.
 */
import { importCodedCohort, CSV_COLUMNS, SKILLS } from './earlyWarningEngine.js';
import { validateWeeklyEntry } from './interventionJournal.js';

export const CLOUD_SCHEMA_VERSION = 1;
export const CLOUD_SCHOOL_YEAR = '2026-2027';
const REVIEW_DECISIONS = new Set(['confirmed', 'not_confirmed']);
const CODED_ID = /^P[0-9]{3,6}$/;

export function buildCloudSnapshot(cohort, reviews, journal) {
  if (!Array.isArray(cohort) || !cohort.length || cohort.length > 120) throw new Error('Import 1–120 coded learners before saving.');
  const ids = cohort.map(x => x.studentId);
  if (new Set(ids).size !== ids.length || ids.some(x => !CODED_ID.test(x))) throw new Error('Invalid or duplicate learner code.');
  const learners = cohort.map(row => ({
    studentId: row.studentId,
    scores: Object.fromEntries(SKILLS.map(skill => [skill, row.scores[skill]])),
    post: Object.fromEntries(SKILLS.map(skill => [skill, row.post[skill]])),
    recent1: row.recent1, recent2: row.recent2, missing14d: row.missing14d,
  }));
  const decisionRows = Object.entries(reviews || {}).filter(([id, entry]) => ids.includes(id) && REVIEW_DECISIONS.has(entry?.decision)).map(([studentId, entry]) => ({
    studentId, decision: entry.decision, reviewedAt: entry.reviewedAt,
  }));
  const entries = (journal || []).map(row => {
    const valid = validateWeeklyEntry({ ...row, note: '' }, ids);
    if (!Number.isFinite(Date.parse(String(row.recordedAt || '')))) throw new Error('Invalid journal timestamp.');
    return {
      studentId: valid.studentId, week: valid.week, skill: valid.skill,
      assigned: valid.assigned, completed: valid.completed,
      checkpointScore: valid.checkpointScore, observedOn: valid.observedOn,
      recordedAt: row.recordedAt, sequence: row.sequence,
    };
  });
  return { schemaVersion: CLOUD_SCHEMA_VERSION, learners, reviews: decisionRows, entries };
}

export function restoreCloudSnapshot(payload) {
  if (!payload || payload.schemaVersion !== CLOUD_SCHEMA_VERSION) throw new Error('Unsupported cloud snapshot version.');
  if (!Array.isArray(payload.learners) || !Array.isArray(payload.reviews) || !Array.isArray(payload.entries)) throw new Error('Corrupt study snapshot.');
  if (payload.learners.length < 1 || payload.learners.length > 120 || payload.entries.length > 960) throw new Error('Snapshot size out of bounds.');
  const header = CSV_COLUMNS.join(',');
  const body = payload.learners.map(row => {
    if (!CODED_ID.test(row?.studentId || '')) throw new Error('Invalid coded learner in snapshot.');
    return CSV_COLUMNS.map(field => {
      const value = field === 'student_id' ? row.studentId
        : field.startsWith('post_') ? row.post?.[field.slice(5)]
        : SKILLS.includes(field) ? row.scores?.[field] : row[field];
      if (value === null || value === undefined) return '';
      const raw = String(value);
      if (raw.includes(',') || raw.includes('\r') || raw.includes('\n')) throw new Error('Invalid stored score field.');
      return raw;
    }).join(',');
  });
  const learners = importCodedCohort([header, ...body].join('\n'));
  const ids = learners.map(row => row.studentId);
  const reviews = {};
  for (const row of payload.reviews) {
    if (!ids.includes(row.studentId) || !REVIEW_DECISIONS.has(row.decision) || !Number.isFinite(Date.parse(row.reviewedAt)) || reviews[row.studentId]) throw new Error('Invalid teacher review in snapshot.');
    reviews[row.studentId] = { decision: row.decision, reviewedAt: row.reviewedAt, notes: '' };
  }
  const entries = payload.entries.map((row, index) => {
    const value = validateWeeklyEntry({ ...row, note: '' }, ids);
    if (!Number.isFinite(Date.parse(row.recordedAt))) throw new Error('Invalid journal date in snapshot.');
    if (!Number.isInteger(row.sequence) || row.sequence < 1 || row.sequence > 960) throw new Error('Invalid journal sequence.');
    return { ...value, recordedAt: row.recordedAt, sequence: row.sequence, note: '' };
  });
  return { learners, reviews, entries };
}
