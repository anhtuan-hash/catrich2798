import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isGrade12Class, normalizeMockExams, mockExamScoreNumber,
  previewMockExamPaste, compareMockExamAttempts, buildMockExamCsv,
  buildMockExamComparisonCsv,
} from '../src/utils/gradebookMockExams.js';
import { gradebookAuditChanges } from '../src/utils/gradebookProductivity.js';

const students = [
  { id: 'a', code: 'HS001', fullName: 'Nguyễn A' },
  { id: 'b', code: 'HS002', fullName: '=HYPERLINK("x")' },
  { id: 'c', code: 'HS003', fullName: 'Trần C' },
];
assert.equal(isGrade12Class({ grade: '12', className: '11.2' }), true);
assert.equal(isGrade12Class({ grade: '11', className: '12A' }), false);
assert.equal(mockExamScoreNumber('0'), 0);
assert.equal(mockExamScoreNumber(''), null);
assert.equal(mockExamScoreNumber('10.25'), null);
assert.equal(mockExamScoreNumber('9,5'), 9.5);
assert.equal(normalizeMockExams([{ id: 'one', label: 'A', locked: true, scores: { a: 0 } }])[0].locked, true);
assert.equal(normalizeMockExams([{ id: 'one', label: 'B', scores: {} }])[0].locked, false);

const batch = previewMockExamPaste({
  text: 'Mã học sinh\tĐiểm\nHS002\t0\nHS001\t8.5\nHS003\t9,75',
  students, scores: {},
});
assert.equal(batch.totalRows, 3);
assert.deepEqual(batch.entries.map((x) => [x.studentId, x.value]), [['b', '0'], ['a', '8.5'], ['c', '9.75']]);
assert.equal(batch.issues.length, 0);
assert.equal(batch.conflicts.length, 0);
assert.equal(batch.skipped.length, 0);

const four = previewMockExamPaste({
  text: 'STT\tMã HS\tHọ tên\tĐiểm\n3\tHS003\tTrần C\t5\n1\tHS001\tNguyễn A\t6',
  students,
});
assert.deepEqual(four.entries.map((x) => x.studentId), ['c', 'a']);
assert.deepEqual(previewMockExamPaste({
  text: 'Điểm\tMã học sinh\n10\tHS002', students,
}).entries.map(x => x.studentId), ['b']);
const noHeader = previewMockExamPaste({ text: 'HS001\t10\nHS002\t0', students });
assert.equal(noHeader.entries.length, 2);

const overwrites = previewMockExamPaste({
  text: 'HS001\t9\nHS002\t0\nHS003\t8',
  students, scores: { a: '5.5', b: '0' },
});
assert.equal(overwrites.entries.length, 1);
assert.equal(overwrites.entries[0].studentId, 'c');
assert.equal(overwrites.conflicts.length, 1);
assert.equal(overwrites.conflicts[0].previous, '5.5');
assert.equal(overwrites.skipped.length, 1);
const accepted = previewMockExamPaste({
  text: 'HS001\t9\nHS002\t0\nHS003\t8',
  students, scores: { a: '5.5', b: 0 }, allowOverwrite: true,
});
assert.equal(accepted.entries.length, 2);
assert.equal(accepted.entries[0].overwrite, true);
assert.equal(accepted.conflicts.length, 0);
const dup = previewMockExamPaste({ text: 'HS001\t5\nHS001\t7', students });
assert.equal(dup.entries.length, 0);
assert.equal(dup.issues.length, 2);
const bad = previewMockExamPaste({
  text: 'Mã HS\tĐiểm\nUNKNOWN\t9\nHS001\t11\nHS003\t\nHS002\t0', students,
});
assert.equal(bad.issues.length, 2);
assert.equal(bad.entries.length, 1);
assert.equal(bad.skipped.length, 1);
const dupRoster = previewMockExamPaste({
  text: 'HS001\t5', students: [...students,{id:'d',code:'hs001'}],
});
assert.equal(dupRoster.entries.length,0);
assert.equal(dupRoster.issues.length,1);
const oversized = previewMockExamPaste({ text: Array.from({length: 2001},()=> 'HS001\t5').join('\n'), students });
assert.equal(oversized.entries.length, 0);
assert.ok(oversized.issues.some(issue => issue.reason.includes('2.000')));
assert.equal(previewMockExamPaste({ text: 'HS001', students }).entries.length, 0);

const exams = [
  { id: 'x1', label: 'Lần 1', locked: true, scores: { a:'0', b:'8', c:'9' } },
  { id: 'x2', label: 'Lần 2', locked: false, scores: { a:'2', b:'8', c:'' } },
];
const trend = compareMockExamAttempts(students, exams);
assert.equal(trend.ready,true);
assert.deepEqual([trend.improved, trend.declined, trend.unchanged, trend.incomparable],[1,0,1,1]);
assert.equal(trend.differences.a,2);
assert.equal(trend.differences.b,0);
assert.equal(trend.differences.c,undefined);
assert.equal(compareMockExamAttempts(students,exams.slice(0,1)).ready,false);
const csv = buildMockExamComparisonCsv({ students, exams, className:'12.1', subjectName:'Tiếng Anh' });
assert.ok(csv.startsWith('\uFEFF'));
assert.match(csv, /"2"/);
assert.match(csv, /"0"/);
assert.match(csv, /"'=HYPERLINK/); // Escape cells that could become formulas.
assert.doesNotMatch(csv, /Điểm cộng|TX Đợt/);
assert.match(buildMockExamCsv({ students, exams }), /Lần 2/);

const before = { subjects:{ english:{ mockExams: [{id:'x1',label:'Lần 1',locked:false,scores:{a:'7'}}], semesters:{} } } };
const after = { subjects:{ english:{ mockExams: [{id:'x1',label:'Lần 1',locked:true,scores:{a:'7'}}], semesters:{} } } };
assert.ok(gradebookAuditChanges(before,after).some(x=>x.field==='locked' && x.kind==='mock-exam'));

const engine = readFileSync(new URL('../src/components/gradebook/GradebookEngine.jsx', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/components/gradebook/GradebookMockExams.jsx', import.meta.url), 'utf8');
assert.match(engine,/if \(exam && !exam.locked\)/);
assert.match(engine,/if \(!exam \|\| exam.locked\) return;/);
assert.match(engine,/onBulkPaste=\{bulkPasteMockExam\} onSetLock=\{setMockExamLock\}/);
assert.match(ui,/previewMockExamPaste/);
assert.match(ui,/compareMockExamAttempts/);
assert.match(ui,/\[workspaceId, subjectKey\]/);
assert.match(ui,/onBulkPaste\(targetExam.id, preview.entries\)/);
assert.match(ui,/disabled=\{disabled \|\| exam.locked\}/);
assert.match(ui,/Không thể áp dụng khi còn dữ liệu không hợp lệ/);
assert.doesNotMatch(engine,/gradeRoundBonus\(mockExams|gradeRoundScore\(mockExams/);
console.log('PASS mock exams v2: import, preview, code matching, zero, overwrite, locks, trend, audit, security and isolation');
