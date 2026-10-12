import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_MOCK_EXAMS, isGrade12Class, normalizeMockExams, mockExamScoreNumber,
  mockExamMissingCount, mockExamProgress, buildMockExamCsv,
} from '../src/utils/gradebookMockExams.js';

assert.equal(isGrade12Class({ grade: '12', className:'11.1' }), true);
assert.equal(isGrade12Class({ grade: 'Khối 12' }), true);
assert.equal(isGrade12Class({ className: '12.6' }), true);
assert.equal(isGrade12Class({ className: 'Lớp 12A1' }), true);
assert.equal(isGrade12Class({ grade: '11', className:'12A1' }), false);
assert.equal(isGrade12Class({ className: '112A1' }), false);
assert.equal(isGrade12Class({ grade: '10' }), false);
assert.equal(isGrade12Class({ grade: '11' }), false);
const normalized=normalizeMockExams([{ id:'test',label:'Đợt 1',scores:{s1:0,s2:'8.5'} },{id:'test',scores:{s1:''}}]);
assert.equal(normalized.length,2);
assert.notEqual(normalized[0].id,normalized[1].id);
assert.equal(normalized[0].scores.s1,0);
assert.equal(normalizeMockExams(null).length,0);
assert.equal(normalizeMockExams(Array.from({length:60},()=>({}))).length,MAX_MOCK_EXAMS);
assert.equal(mockExamScoreNumber(0),0);
assert.equal(mockExamScoreNumber('0'),0);
assert.equal(mockExamScoreNumber('9,75'),9.75);
assert.equal(mockExamScoreNumber(''),null);
assert.equal(mockExamScoreNumber('11'),null);
assert.equal(mockExamScoreNumber('-1'),null);
assert.equal(mockExamScoreNumber('=2+2'),null);
const exam = { id:'m1',label:'Thi thử lần 1',date:'2026-10-12',scores:{s1:0,s2:'9.25'} };
const roster = [{id:'s1',fullName:'A',code:'01'}, {id:'s2',fullName:'=EVIL()',code:'02'}, {id:'s3',fullName:'C',code:'03'}];
assert.deepEqual(mockExamProgress(roster,exam),{entered:2,total:3,missing:1});
assert.equal(mockExamMissingCount('s1',[exam]),0);
assert.equal(mockExamMissingCount('s3',[exam]),1);
const csv=buildMockExamCsv({students:roster,exams:[exam],className:'12.1',subjectName:'Tiếng Anh'});
assert.match(csv,/Thi thử lần 1 \(2026-10-12\)/);
assert.match(csv,/"0"/);
assert.match(csv,/"'=EVIL\(\)"/);
assert.doesNotMatch(csv,/Điểm trung bình|Điểm cộng/);
const engine=readFileSync(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
assert.match(engine,/isGrade12Class\(workspace\.classProfile\)/);
assert.match(engine,/view === 'mock'/);
assert.match(engine,/mockExams: normalizeMockExams\(source\.mockExams\)/);
console.log('PASS Grade 12 mock exam: gate, normalization, zero, isolation, CSV, UI contract');
