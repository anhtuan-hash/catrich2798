import assert from 'node:assert/strict';
import { deriveExamBundlePayload } from '../serverless-handlers/_question-bank.js';

const exam = { grade: 12, schoolYear: '2026-2027', visibility: 'private' };
const questions = [
  {
    stem: 'Question 1. Choose the correct order.',
    tags: ['TNTHPT2025-2026', 'arrangement'],
    options: ['a-b-c', 'b-a-c', 'c-a-b', 'c-b-a'],
    correctAnswer: 'B',
  },
  {
    stem: 'Questions 2–6: Read the passage and choose the option that best completes each blank.\n\nCITY SCIENCE\n\nA sample passage with (2) ______ and other blanks.\n\nQuestion 2. Which option best completes blank (2)?',
    tags: ['TNTHPT2025-2026', 'discourse-cloze'],
    topic: 'science',
    skill: 'Discourse',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    stem: `Question ${index + 3}. Which option best completes blank (${index + 3})?`,
    tags: ['TNTHPT2025-2026', 'discourse-cloze'],
    topic: 'science',
    skill: 'Discourse',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  })),
  {
    stem: 'Questions 7–12: Read the announcement and choose the best option.\n\nOPEN DAY\n\nJoin us for (7) ______ activities.\n\nQuestion 7. Choose the best option for blank (7).',
    tags: ['TNTHPT2025-2026', 'functional-cloze'],
    topic: 'open day',
    skill: 'Use of English',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    stem: `Question ${index + 8}. Choose the best option for blank (${index + 8}).`,
    tags: ['TNTHPT2025-2026', 'functional-cloze'],
    topic: 'open day',
    skill: 'Use of English',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  })),
  {
    stem: 'Questions 13–18: Read the notice and choose the best option.\n\nREPAIR CAFE\n\nBring an item that (13) ______.\n\nQuestion 13. Choose the best option for blank (13).',
    tags: ['TNTHPT2025-2026', 'functional-cloze'],
    topic: 'repair',
    skill: 'Use of English',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    stem: `Question ${index + 14}. Choose the best option for blank (${index + 14}).`,
    tags: ['TNTHPT2025-2026', 'functional-cloze'],
    topic: 'repair',
    skill: 'Use of English',
    options: ['A1', 'B1', 'C1', 'D1'],
    correctAnswer: 'A',
  })),
];

const derived = deriveExamBundlePayload(questions, exam);
assert.ok(derived, 'legacy full exam should infer bundles');
assert.equal(derived.bundles.length, 3, 'two consecutive functional cloze blocks must stay separate');
assert.deepEqual(derived.bundles.map((bundle) => bundle.bundleType), [
  'discourse_cloze_5',
  'functional_cloze_6',
  'functional_cloze_6',
]);
assert.equal(derived.questions[0].bundleKey, undefined, 'arrangement remains standalone');
assert.equal(derived.questions[1].bundleKey, 'discourse_cloze_5_2');
assert.equal(derived.questions[1].bundlePosition, 1);
assert.equal(derived.questions[5].bundlePosition, 5);
assert.equal(derived.questions[6].bundleKey, 'functional_cloze_6_7');
assert.equal(derived.questions[12].bundleKey, 'functional_cloze_6_13');
assert.equal(derived.questions[1].stem, 'Which option best completes blank (2)?');
assert.match(derived.bundles[0].contextText, /CITY SCIENCE/);
assert.match(derived.bundles[1].contextText, /OPEN DAY/);
assert.match(derived.bundles[2].contextText, /REPAIR CAFE/);

const spec = JSON.parse((await import('node:fs')).readFileSync('public/brian-question-bank-openapi.json', 'utf8'));
assert.ok(spec.components.schemas.Exam.properties.bundles, 'OpenAPI must expose exam.bundles');
assert.ok(spec.components.schemas.Question.properties.bundleKey, 'OpenAPI must expose question.bundleKey');
assert.ok(spec.components.schemas.Bundle.properties.key, 'OpenAPI must expose bundle.key');

console.log('PASS: multi-bundle exam persistence contract is intact.');
