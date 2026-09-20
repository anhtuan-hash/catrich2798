import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExamBatch, batchAnswerKeyCsv } from '../src/utils/questionBankExamFactory.js';
import { TNTHPT_40_BLUEPRINT } from '../src/utils/questionBankExamBuilder.js';

let seq = 0;
const questions = [];
const bundles = [];

function makeItem(type, bundleId = null, bundlePosition = null) {
  seq += 1;
  const tags = {
    arrangement_5: ['TNTHPT2025-2026','arrangement'],
    discourse_cloze_5: ['TNTHPT2025-2026','discourse-cloze'],
    reading_10: ['TNTHPT2025-2026','reading-10'],
    reading_8: ['TNTHPT2025-2026','reading-8'],
    functional_cloze_6: ['TNTHPT2025-2026','functional-cloze'],
  }[type];
  return {
    id: 'q-' + seq,
    bundle_id: bundleId,
    bundle_position: bundlePosition,
    grade: 12,
    stem: type === 'arrangement_5' ? 'Choose the correct order for arrangement ' + seq + '.' : 'Question ' + seq + '. Choose the best answer.',
    options: ['Option one','Option two','Option three','Option four'],
    correct_answer: ['A','B','C','D'][seq % 4],
    explanation: 'The passage or discourse supports this answer.',
    skill: type.startsWith('reading') ? 'Reading' : type === 'discourse_cloze_5' ? 'Discourse' : 'Use of English',
    cefr: seq % 5 === 0 ? 'B2' : 'B1',
    topic: 'topic-' + seq,
    cognitive_level: seq % 5 === 0 ? 'application' : seq % 2 === 0 ? 'comprehension' : 'recognition',
    difficulty: 2,
    grammar_point: type === 'functional_cloze_6' ? 'collocation' : '',
    tags,
    status: 'approved',
    visibility: 'personal',
    usage_count: 0,
    fingerprint: 'fp-' + seq,
  };
}

function addBundle(type, size, index) {
  const id = `${type}-${index}`;
  bundles.push({
    id,
    bundle_type: type,
    title: `${type} bundle ${index}`,
    context_text: `Shared context for ${type} bundle ${index}. This is long enough for the audit and represents a complete passage.`,
    instructions: 'Read the shared text and choose the best answer.',
    topic: 'school',
    grade: 12,
    status: 'approved',
  });
  for (let pos = 1; pos <= size; pos += 1) questions.push(makeItem(type, id, pos));
}

for (let i = 0; i < 50; i += 1) questions.push(makeItem('arrangement_5'));
for (let i = 1; i <= 10; i += 1) addBundle('discourse_cloze_5',5,i);
for (let i = 1; i <= 10; i += 1) addBundle('reading_10',10,i);
for (let i = 1; i <= 10; i += 1) addBundle('reading_8',8,i);
for (let i = 1; i <= 20; i += 1) addBundle('functional_cloze_6',6,i);

assert.equal(questions.length,400);

const batch = buildExamBatch({
  questions,
  bundles,
  blueprint: TNTHPT_40_BLUEPRINT,
  filters: { grade:'12', cefr:'B1-B2', approvedOnly:true },
  count:10,
  maxOverlap:0,
  difficultyTolerance:0,
  seedBase:20260920,
  maxAttemptsPerExam:20,
  auditOptions:{ isTnThpt:true },
});

assert.equal(batch.complete,true);
assert.equal(batch.exams.length,10);
assert.equal(batch.summary.totalUniqueItems,400);
assert.equal(batch.summary.maxOverlap,0);
assert.equal(batch.summary.difficultySpread,0);

const globalIds = batch.exams.flatMap((exam)=>exam.items.map((item)=>item.id));
assert.equal(new Set(globalIds).size,400);

for (const exam of batch.exams) {
  assert.equal(exam.items.length,40);
  assert.equal(exam.audit.ready,true);
  assert.equal(exam.audit.structureOk,true);
  assert.deepEqual(exam.audit.sections.map((section)=>section.items.length),[5,5,10,8,6,6]);

  const visible = [0,0,0,0];
  exam.items.forEach((item,index)=>{
    const source = item.correct_answer.charCodeAt(0)-65;
    const order = exam.optionOrders[index];
    const target = order.indexOf(source);
    assert.ok(target>=0 && target<4);
    visible[target] += 1;
  });
  assert.deepEqual(visible,[10,10,10,10]);
}

const csv = batchAnswerKeyCsv(batch.exams);
assert.equal(csv.split('\n').length,41);
assert.match(csv,/Set 01/);
assert.match(csv,/Set 10/);

const suite = fs.readFileSync('src/pages/question-bank/QuestionBankManagementSuite.jsx','utf8');
const main = fs.readFileSync('src/main.jsx','utf8');
const publicPractice = fs.readFileSync('src/pages/QuestionBankPractice.jsx','utf8');
const builder = fs.readFileSync('src/utils/questionBankExamBuilder.js','utf8');

for (const token of [
  "['factory', 'Exam Factory']",
  'EXAM FACTORY',
  'buildExamBatch',
  'Lưu toàn bộ batch',
  'Answer key CSV',
  "['department', 'TTCM']",
  'DEPARTMENT QUESTION BANK',
  'qb_department_contributor_stats',
  'Tạo link học sinh',
  'qb_create_practice_share',
]) assert.ok(suite.includes(token),'Management UI missing: '+token);

assert.ok(main.includes("'practice'"));
assert.ok(main.includes('QuestionBankPractice'));
assert.ok(publicPractice.includes('qb_public_practice_get'));
assert.ok(publicPractice.includes('qb_public_practice_submit'));
assert.ok(builder.includes('excludeIds'));
assert.ok(builder.includes("part.type === 'standalone_mcq'"));

console.log('PASS: Golden Bank, zero-overlap Exam Factory, TTCM and public Practice contracts are intact.');
