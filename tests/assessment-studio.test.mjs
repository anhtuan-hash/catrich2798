import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, parseQuestions, gradeObjective, gradeSpeaking, summarizeResults, comparePairedOutcomes, csvEscape } from '../src/features/assessmentStudio/assessmentMath.js';

const quiz = [
  'She enjoys ___ books. | read | reading | to read | reads | B | Gerund',
  'He decided ___ abroad. | study | studying | to study | studied | C | Infinitive',
].join('\n');

test('catalog exposes 12 items but marks only the delivered 3 as ready', () => {
  assert.equal(MODULES.length, 12);
  assert.deepEqual(MODULES.filter(x => x.status === 'ready').map(x=>x.id), ['speaking','diagnostic','exit']);
});

test('question import validates correct column count and answer key', () => {
  const questions = parseQuestions(quiz);
  assert.equal(questions.length, 2);
  assert.equal(questions[1].correct,'C');
  assert.throws(() => parseQuestions('Missing fields | A | B'), /Dòng 1/);
  assert.throws(() => parseQuestions('Question | A | B | C | D | E | Topic'), /Dòng 1/);
});

test('objective scoring returns the correct score and per-topic breakdown', () => {
  const result = gradeObjective(parseQuestions(quiz),'BA');
  assert.equal(result.score,1);
  assert.equal(result.maxScore,2);
  assert.deepEqual(result.topics.Gerund,{achieved:1,total:1});
  assert.deepEqual(result.topics.Infinitive,{achieved:0,total:1});
  assert.throws(()=>gradeObjective(parseQuestions(quiz),'B'),/chính xác 2/);
});

test('speaking rubric rejects out-of-range and fractional values', () => {
  assert.equal(gradeSpeaking({Pronunciation:3,Fluency:2,Vocabulary:4,Grammar:3,Content:4}).score,16);
  assert.throws(()=>gradeSpeaking({Pronunciation:5,Fluency:2,Vocabulary:4,Grammar:3,Content:4}),/0 đến 4/);
  assert.throws(()=>gradeSpeaking({Pronunciation:1.5,Fluency:2,Vocabulary:4,Grammar:3,Content:4}),/0 đến 4/);
});

test('analytics uses actual saved responses only', () => {
  const summary = summarizeResults([
    {score:1,max_score:2,breakdown:{topics:{Gerund:{achieved:1,total:1}}}},
    {score:2,max_score:2,breakdown:{topics:{Gerund:{achieved:1,total:1}}}},
  ]);
  assert.equal(summary.count,2);
  assert.equal(summary.average,75);
  assert.deepEqual(summary.topics.Gerund,{achieved:2,total:2});
  assert.equal(summarizeResults([]).average,0);
});

test('CSV escaping prevents spreadsheet formula injection', () => {
  assert.equal(csvEscape('=HYPERLINK("test")'),'"\'=HYPERLINK(""test"")"');
  assert.equal(csvEscape('An Tuấn'),'"An Tuấn"');
});

test('pre/post comparison only pairs matching student codes', () => {
  const before = [
    {student_code:'A01',score:6,max_score:10},
    {student_code:'A02',score:8,max_score:10},
    {student_code:'',score:2,max_score:10},
  ];
  const after = [
    {student_code:'A01',score:8,max_score:10},
    {student_code:'A02',score:9,max_score:10},
    {student_code:'A03',score:10,max_score:10},
  ];
  const comparison = comparePairedOutcomes(before,after);
  assert.equal(comparison.pairs,2);
  assert.equal(comparison.beforeAverage,70);
  assert.equal(comparison.afterAverage,85);
  assert.equal(comparison.change,15);
  assert.equal(comparePairedOutcomes(before,[]).pairs,0);
});
