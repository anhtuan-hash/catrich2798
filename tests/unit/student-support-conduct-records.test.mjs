import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../../supabase/migrations/20260915134500_student_support_conduct_records.sql', import.meta.url);
const sourcesUrl = new URL('../../src/studentSupport/studentSupportSources.js', import.meta.url);
const profileUrl = new URL('../../src/components/studentSupport/StudentSupportStudentProfile.jsx', import.meta.url);

test('Student 360 live-source RPC exposes canonical non-cancelled Homeroom violations', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'conduct-record bridge migration must exist');
  if (!fs.existsSync(migrationUrl)) return;
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /payload\s*->\s*'conductRecords'/i);
  assert.match(sql, /studentId/i);
  assert.match(sql, /entryType[\s\S]*violation/i);
  assert.match(sql, /status[\s\S]*cancelled/i);
  assert.match(sql, /'conduct_records'/i);
});

test('Student Support source adapter maps live conduct records without copying them into Student Support tables', () => {
  const sources = fs.readFileSync(sourcesUrl, 'utf8');
  assert.match(sources, /live\.conduct_records/);
  assert.match(sources, /conductRecords:/);
  assert.doesNotMatch(sources, /student_support_teacher_observations[\s\S]*(insert|upsert)/i);
});

test('Student 360 renders factual Homeroom conduct violations alongside Student Support observations', () => {
  const profile = fs.readFileSync(profileUrl, 'utf8');
  assert.match(profile, /facts\.conductRecords/);
  assert.match(profile, /Rèn luyện|Conduct/i);
  assert.match(profile, /deduction|Điểm trừ/i);
});
