import assert from 'node:assert/strict';
import { buildExamBatch, batchAnswerKeyCsv, summarizeExamBatch } from '../src/utils/questionBankExamFactory.js';
import { TNTHPT_40_BLUEPRINT } from '../src/utils/questionBankExamBuilder.js';

const options = ['Option A','Option B','Option C','Option D'];
const answerCycle = ['A','B','C','D'];

function item(id, type, extra = {}) {
  const tags = {
    arrangement_5: ['TNTHPT2025-2026','arrangement'],
    discourse_cloze_5: ['TNTHPT2025-2026','discourse-cloze'],
    reading_10: ['TNTHPT2025-2026','reading-10'],
    reading_8: ['TNTHPT2025-2026','reading-8'],
    functional_cloze_6: ['TNTHPT2025-2026','functional-cloze'],
  }[type] || [];
  return {
    id,
    stem: type === 'arrangement_5'
      ? `Choose the correct order of the following sentences to make a coherent paragraph. ${id}`
      : `Question ${id}. Choose the best answer.`,
    options: [...options],
    correct_answer: answerCycle[Math.abs(id.split('').reduce((s,c)=>s+c.charCodeAt(0),0)) % 4],
    explanation: 'The keyed answer is supported by the supplied context.',
    skill: type.startsWith('reading') ? 'Reading' : type === 'arrangement_5' ? 'Discourse' : 'Use of English',
    cefr: Number(id.match(/\d+/)?.[0] || 0) % 3 === 0 ? 'B2' : 'B1',
    topic: 'factory fixture ' + id,
    cognitive_level: Number(id.match(/\d+/)?.[0] || 0) % 5 === 0 ? 'application' : 'comprehension',
    difficulty: 2,
    tags,
    status: 'approved',
    grade: 12,
    usage_count: 0,
    fingerprint: 'fp-' + id,
    ...extra,
  };
}

const questions = [];
const bundles = [];

for (let i = 1; i <= 50; i += 1) questions.push(item(`arr-${i}`, 'arrangement_5'));

function addBundle(type, bundleIndex, itemCount) {
  const bundleId = `${type}-bundle-${bundleIndex}`;
  const bundle = {
    id: bundleId,
    bundle_type: type,
    title: `${type} fixture ${bundleIndex}`,
    context_text: `Shared context for ${type} bundle ${bundleIndex}. This passage is intentionally long enough to satisfy the audit context requirement and acts as shared stimulus for all questions in this bundle.`,
    status: 'approved',
    grade: 12,
    topic: `${type} topic ${bundleIndex}`,
  };
  bundles.push(bundle);
  for (let pos = 1; pos <= itemCount; pos += 1) {
    questions.push(item(`${type}-${bundleIndex}-${pos}`, type, {
      bundle_id: bundleId,
      bundle_position: pos,
      topic: bundle.topic,
    }));
  }
}

for (let i = 1; i <= 10; i += 1) addBundle('discourse_cloze_5', i, 5);
for (let i = 1; i <= 10; i += 1) addBundle('reading_10', i, 10);
for (let i = 1; i <= 10; i += 1) addBundle('reading_8', i, 8);
for (let i = 1; i <= 20; i += 1) addBundle('functional_cloze_6', i, 6);

assert.equal(questions.length, 400);
assert.equal(bundles.length, 50);

const zeroOverlap = buildExamBatch({
  questions,
  bundles,
  blueprint: TNTHPT_40_BLUEPRINT,
  filters: {
    grade: '12',
    approvedOnly: true,
    cognitiveTargets: { recognition: 0, comprehension: 80, application: 20 },
    totalItems: 40,
  },
  count: 10,
  maxOverlap: 0,
  difficultyTolerance: 0,
  seedBase: 20260924,
  maxAttemptsPerExam: 20,
  auditOptions: { isTnThpt: true },
});

assert.equal(zeroOverlap.complete, true, zeroOverlap.rejected?.[0]?.reason || 'Factory did not complete');
assert.equal(zeroOverlap.exams.length, 10);
assert.ok(zeroOverlap.exams.every((exam) => exam.items.length === 40));
assert.ok(zeroOverlap.exams.every((exam) => exam.audit.ready));
assert.equal(zeroOverlap.summary.maxOverlap, 0);
assert.equal(zeroOverlap.summary.totalUniqueItems, 400);
assert.equal(zeroOverlap.summary.difficultySpread, 0);

const allIds = zeroOverlap.exams.flatMap((exam) => exam.items.map((entry) => entry.id));
assert.equal(new Set(allIds).size, 400);

for (const exam of zeroOverlap.exams) {
  const counts = exam.audit.distributions.types;
  assert.equal(counts.arrangement_5, 5);
  assert.equal(counts.discourse_cloze_5, 5);
  assert.equal(counts.reading_10, 10);
  assert.equal(counts.reading_8, 8);
  assert.equal(counts.functional_cloze_6, 12);
  assert.equal(exam.optionOrders.length, 40);
  assert.ok(exam.optionOrders.every((order) => order.length === 4 && new Set(order).size === 4));
}

const summary = summarizeExamBatch(zeroOverlap.exams);
assert.equal(summary.count, 10);
assert.equal(summary.maxOverlap, 0);
assert.equal(summary.totalUniqueItems, 400);

const csv = batchAnswerKeyCsv(zeroOverlap.exams);
const rows = csv.trim().split('\n');
assert.equal(rows.length, 41);
assert.ok(rows[0].includes('Set 01'));
assert.ok(rows[0].includes('Set 10'));

console.log('PASS: Exam Factory creates 10 complete TN THPT sets with 400/400 unique items and zero overlap.');
