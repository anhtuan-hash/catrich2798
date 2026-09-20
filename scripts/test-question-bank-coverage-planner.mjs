import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analyzeBankHealth,
  analyzeBlueprintCoverage,
  buildCoverageGapPrompt,
} from '../src/utils/questionBankCoverage.js';
import { defaultBlueprintCriteria } from '../src/utils/questionBankBlueprints.js';

let n = 0;
function item(type, bundleId = null, pos = null, usage = 0) {
  n += 1;
  const tagMap = {
    arrangement_5: 'arrangement',
    discourse_cloze_5: 'discourse-cloze',
    reading_10: 'reading-10',
    reading_8: 'reading-8',
    functional_cloze_6: 'functional-cloze',
  };
  return {
    id: 'q-' + n,
    bundle_id: bundleId,
    bundle_position: pos,
    grade: 12,
    stem: 'Sample question ' + n,
    options: ['A','B','C','D'],
    correct_answer: ['A','B','C','D'][n % 4],
    explanation: 'Explanation',
    skill: type.startsWith('reading') ? 'Reading' : 'Use of English',
    cefr: n % 4 === 0 ? 'B2' : 'B1',
    topic: 'school',
    cognitive_level: n % 5 === 0 ? 'application' : n % 2 === 0 ? 'comprehension' : 'recognition',
    difficulty: 2 + (n % 2),
    tags: ['TNTHPT2025-2026', tagMap[type]],
    usage_count: usage,
    fingerprint: 'fp-' + n,
    status: 'draft',
  };
}

const questions = [];
const bundles = [];
for (let i = 0; i < 5; i += 1) questions.push(item('arrangement_5', null, null, i === 0 ? 2 : 0));

function addBundle(id, type, size) {
  bundles.push({
    id,
    bundle_type: type,
    title: id,
    context_text: 'Shared context ' + id,
    instructions: 'Read and answer.',
    topic: 'school',
    grade: 12,
  });
  for (let i = 1; i <= size; i += 1) questions.push(item(type, id, i, 0));
}

addBundle('d1', 'discourse_cloze_5', 5);
addBundle('r10a', 'reading_10', 10);
addBundle('r10b', 'reading_10', 10);
addBundle('r8a', 'reading_8', 8);
addBundle('r8b', 'reading_8', 8);
for (let i = 1; i <= 13; i += 1) addBundle('f' + i, 'functional_cloze_6', 6);

const health = analyzeBankHealth(questions, bundles);
assert.equal(health.total, questions.length);
assert.ok(health.neverUsed > 0);
assert.equal(health.metadataMissing, 0);
assert.equal(health.missingExplanation, 0);
assert.equal(health.duplicateFingerprints, 0);

const blueprint = {
  title: 'TN THPT 40 câu',
  criteria: defaultBlueprintCriteria(),
};
const coverage = analyzeBlueprintCoverage({
  questions,
  bundles,
  blueprint,
  targetSets: 5,
});

assert.equal(coverage.readyForOneSet, true);
assert.equal(coverage.readyForTarget, false);
assert.equal(coverage.maxUniqueSets, 1);
assert.equal(coverage.bottleneck.type, 'arrangement_5');

const byType = Object.fromEntries(coverage.rows.map((row) => [row.type, row]));
assert.equal(byType.arrangement_5.deficit, 20);
assert.equal(byType.discourse_cloze_5.deficit, 4);
assert.equal(byType.reading_10.deficit, 3);
assert.equal(byType.reading_8.deficit, 3);
assert.equal(byType.functional_cloze_6.deficit, 0);
assert.equal(byType.functional_cloze_6.maxUniqueSets, 6);

const prompt = buildCoverageGapPrompt({
  blueprintTitle: 'TN THPT 40 câu',
  coverage,
  schoolYear: '2026-2027',
});
assert.match(prompt, /20 câu độc lập/);
assert.match(prompt, /4 chùm/);
assert.match(prompt, /Reading 10/);
assert.match(prompt, /Brian Question Bank Action/);

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
for (const token of [
  "['coverage', 'Phủ ma trận']",
  'BANK COVERAGE PLANNER',
  'Mục tiêu đề không trùng',
  'Khả năng hiện tại',
  'GAP PLANNER',
  'Sao chép yêu cầu bổ sung',
  'analyzeBlueprintCoverage',
  'buildCoverageGapPrompt',
]) {
  assert.ok(page.includes(token), 'Coverage Planner missing: ' + token);
}

console.log('PASS: Question Bank Coverage Planner contract is intact.');
