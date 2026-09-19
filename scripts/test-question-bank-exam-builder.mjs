import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  builderAvailability,
  selectExamFromBank,
  TNTHPT_40_BLUEPRINT,
} from '../src/utils/questionBankExamBuilder.js';

let idCounter = 0;
function q(type, bundleId = null, bundlePosition = null, cognitive = 'comprehension') {
  idCounter += 1;
  const tagMap = {
    arrangement_5: 'arrangement',
    discourse_cloze_5: 'discourse-cloze',
    reading_10: 'reading-10',
    reading_8: 'reading-8',
    functional_cloze_6: 'functional-cloze',
  };
  return {
    id: `q-${idCounter}`,
    bundle_id: bundleId,
    bundle_position: bundlePosition,
    grade: 12,
    stem: type === 'arrangement_5' ? `Question ${idCounter}. Choose the correct order.` : `Question ${idCounter}. Sample item?`,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    correct_answer: ['A','B','C','D'][idCounter % 4],
    explanation: 'Supported by the text.',
    skill: type.startsWith('reading') ? 'Reading' : type === 'discourse_cloze_5' ? 'Discourse' : 'Use of English',
    cefr: idCounter % 3 === 0 ? 'B2' : 'B1',
    topic: 'education',
    cognitive_level: cognitive,
    difficulty: 2 + (idCounter % 2),
    grammar_point: type === 'functional_cloze_6' ? 'collocation' : '',
    tags: ['TNTHPT2025-2026', tagMap[type]],
    usage_count: idCounter % 3,
    fingerprint: `fp-${idCounter}`,
  };
}

const bundles = [];
const questions = [];
function addBundle(id, type, size, title) {
  bundles.push({
    id,
    bundle_type: type,
    title,
    context_text: `${title} shared passage with enough context.`,
    instructions: 'Read the text and choose the best answer.',
    topic: 'education',
    grade: 12,
  });
  for (let i = 1; i <= size; i += 1) questions.push(q(type, id, i, i % 4 === 0 ? 'application' : 'comprehension'));
}

for (let i = 0; i < 7; i += 1) questions.push(q('arrangement_5', null, null, i < 2 ? 'recognition' : 'comprehension'));
addBundle('d1', 'discourse_cloze_5', 5, 'Discourse One');
addBundle('r10a', 'reading_10', 10, 'Reading Ten A');
addBundle('r10b', 'reading_10', 10, 'Reading Ten B');
addBundle('r8a', 'reading_8', 8, 'Reading Eight A');
addBundle('r8b', 'reading_8', 8, 'Reading Eight B');
addBundle('f1', 'functional_cloze_6', 6, 'Functional One');
addBundle('f2', 'functional_cloze_6', 6, 'Functional Two');
addBundle('f3', 'functional_cloze_6', 6, 'Functional Three');

const stock = builderAvailability(questions, bundles);
assert.equal(stock.arrangement_5.items, 7);
assert.equal(stock.discourse_cloze_5.bundles, 1);
assert.equal(stock.reading_10.bundles, 2);
assert.equal(stock.reading_8.bundles, 2);
assert.equal(stock.functional_cloze_6.bundles, 3);

const selection = selectExamFromBank({
  questions,
  bundles,
  blueprint: TNTHPT_40_BLUEPRINT,
  filters: { grade: '12', cefr: 'B1-B2', cognitiveLevel: '', topic: '' },
  seed: 11,
});
assert.equal(selection.complete, true);
assert.equal(selection.items.length, 40);
assert.equal(selection.missing.length, 0);
assert.equal(selection.audit.structureOk, true);
assert.equal(selection.audit.totalSections, 6);
assert.equal(new Set(selection.items.map((item) => item.id)).size, 40);
assert.deepEqual(selection.audit.sections.map((section) => section.items.length), [5,5,10,8,6,6]);

const reshuffled = selectExamFromBank({
  questions,
  bundles,
  filters: { grade: '12', cefr: 'B1-B2', cognitiveLevel: '', topic: '' },
  seed: 99,
});
assert.equal(reshuffled.complete, true);
assert.equal(reshuffled.items.length, 40);

const filtered = selectExamFromBank({
  questions,
  bundles,
  filters: { grade: '12', cefr: 'B1-B2', cognitiveLevel: '', topic: 'nonexistent-topic' },
  seed: 1,
});
assert.equal(filtered.complete, false);
assert.ok(filtered.missing.length >= 4);

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
for (const token of [
  "['builder', 'Tạo đề']",
  'ZERO-COST TEST BUILDER',
  'Tạo đề ',
  'Xáo lựa chọn',
  'Tồn kho phù hợp',
  'LIVE BLUEPRINT',
  'bes_assessment_increment_usage',
]) {
  assert.ok(page.includes(token), `Question Bank builder missing: ${token}`);
}
assert.ok(page.includes("source_reference: 'Brian Question Bank Builder'"));
assert.ok(page.includes("tags: ['TNTHPT2025-2026', 'bank-builder', 'no-ai-cost']"));

console.log('PASS: zero-cost Question Bank Exam Builder contract is intact.');
