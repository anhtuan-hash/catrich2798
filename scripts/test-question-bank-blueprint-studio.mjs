import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareCognitiveTargets,
  defaultBlueprintCriteria,
  normalizeBlueprintCriteria,
  validateBlueprint,
} from '../src/utils/questionBankBlueprints.js';
import { selectExamFromBank } from '../src/utils/questionBankExamBuilder.js';

const defaults = defaultBlueprintCriteria();
const valid = validateBlueprint(defaults);
assert.equal(valid.valid, true);
assert.equal(valid.total, 40);
assert.equal(valid.cognitiveTotal, 100);

const badTargets = validateBlueprint({
  ...defaults,
  cognitiveTargets: { recognition: 60, comprehension: 30, application: 20 },
});
assert.equal(badTargets.valid, false);
assert.ok(badTargets.errors.some((message) => /100%/.test(message)));

const custom = normalizeBlueprintCriteria({
  preset: 'custom',
  grade: '11',
  cefr: 'B1',
  tolerance: 5,
  enforceCognitive: true,
  cognitiveTargets: { recognition: 60, comprehension: 30, application: 10 },
  parts: [
    { type: 'arrangement_5', mode: 'items', count: 3 },
    { type: 'functional_cloze_6', mode: 'bundles', bundleCount: 1, itemCount: 6 },
  ],
});
assert.equal(custom.grade, '11');
assert.equal(custom.enforceCognitive, true);
assert.equal(validateBlueprint(custom).total, 9);

const cognitiveFit = compareCognitiveTargets({
  totalQuestions: 10,
  distributions: { cognitive: { recognition: 6, comprehension: 3, application: 1 } },
}, { recognition: 60, comprehension: 30, application: 10 }, 0);
assert.equal(cognitiveFit.withinTolerance, true);

let n = 0;
const arrangement = Array.from({ length: 5 }, () => {
  n += 1;
  return {
    id: 'a-' + n,
    grade: 11,
    stem: 'Choose the correct order.',
    options: ['A','B','C','D'],
    correct_answer: 'A',
    explanation: 'ok',
    skill: 'Discourse',
    cefr: 'B1',
    topic: 'school',
    cognitive_level: n <= 3 ? 'recognition' : 'comprehension',
    difficulty: 2,
    tags: ['arrangement'],
    fingerprint: 'fa-' + n,
  };
});
const bundle = {
  id: 'f-1',
  bundle_type: 'functional_cloze_6',
  title: 'School notice',
  context_text: 'Shared notice for six items.',
  instructions: 'Choose the best option.',
  topic: 'school',
  grade: 11,
};
const cloze = Array.from({ length: 6 }, (_, index) => ({
  id: 'f-q-' + (index + 1),
  bundle_id: 'f-1',
  bundle_position: index + 1,
  grade: 11,
  stem: 'Choose the best option for blank.',
  options: ['A','B','C','D'],
  correct_answer: 'B',
  explanation: 'ok',
  skill: 'Use of English',
  cefr: 'B1',
  topic: 'school',
  cognitive_level: index < 3 ? 'recognition' : index < 5 ? 'comprehension' : 'application',
  difficulty: 2,
  tags: ['functional-cloze'],
  fingerprint: 'ff-' + index,
}));

const selection = selectExamFromBank({
  questions: [...arrangement, ...cloze],
  bundles: [bundle],
  blueprint: custom.parts,
  filters: {
    grade: '11',
    cefr: 'B1',
    cognitiveTargets: custom.cognitiveTargets,
    totalItems: 9,
  },
  seed: 2,
  auditOptions: { isTnThpt: false },
});
assert.equal(selection.complete, true);
assert.equal(selection.items.length, 9);
assert.equal(selection.audit.ready, true);
assert.equal(selection.audit.isTnThpt, false);

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
for (const token of [
  "['blueprints', 'Ma trận']",
  'ASSESSMENT BLUEPRINT STUDIO',
  'Bắt buộc tỉ lệ khi tạo đề',
  "from('assessment_blueprints')",
  'useBlueprintInBuilder',
  'activeBuilderBlueprint',
  'builderCognitiveFit',
]) {
  assert.ok(page.includes(token), 'Blueprint Studio missing: ' + token);
}
assert.ok(page.includes("blueprint_id: activeBuilderBlueprint.id === 'builtin-tnthpt-40' ? null : activeBuilderBlueprint.id"));

console.log('PASS: Question Bank Blueprint Studio contract is intact.');
