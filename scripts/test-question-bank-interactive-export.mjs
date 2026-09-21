import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildInteractiveExamPayload,
  scriptSafeJson,
  validateInteractiveExamPayload,
} from '../src/utils/questionBankInteractiveExport.js';

const sampleTest = {
  id: 'test-interactive',
  title: 'TN THPT Interactive <Demo>',
  grade: '12',
  school_year: '2026-2027',
  settings: { durationMinutes: 50, examCode: '108' },
};

const sharedBundle = {
  id: 'bundle-reading',
  bundle_type: 'reading_8',
  title: 'Reading passage',
  context_text: 'Shared passage <with> characters & symbols. Students read this before answering.',
  instructions: 'Read the passage and choose the best answer.',
};

const items = [
  {
    id: 'q1',
    position: 1,
    stem: 'Question 1. Which option is correct?',
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    correct_answer: 'B',
    option_order: [1, 0, 2, 3],
    explanation: 'Beta is correct.',
    topic: 'Education',
    skill: 'Reading',
    cefr: 'B1',
    cognitive_level: 'comprehension',
    difficulty: 2,
    bundle_id: sharedBundle.id,
    bundle_type: 'reading_8',
    _bundle: sharedBundle,
  },
  {
    id: 'q2',
    position: 2,
    stem: 'Question 2. Choose the safest text: </script><script>alert(1)</script>',
    options: ['One', 'Two', 'Three', 'Four'],
    correct_answer: 'A',
    option_order: [],
    explanation: 'Safe serialization must keep this as text.',
    topic: 'Digital safety',
    skill: 'Use of English',
    cefr: 'B1',
    cognitive_level: 'recognition',
    difficulty: 1,
    bundle_id: sharedBundle.id,
    bundle_type: 'reading_8',
    _bundle: sharedBundle,
  },
];

const payload = buildInteractiveExamPayload({ test: sampleTest, items });
assert.equal(payload.schema, 'brian-interactive-assessment/v1');
assert.equal(payload.test.title, sampleTest.title);
assert.equal(payload.defaults.durationMinutes, 50);
assert.equal(payload.questions.length, 2);
assert.equal(payload.questions[0].ctx, sharedBundle.context_text, 'shared bundle context must survive export');
assert.deepEqual(payload.questions[0].o, ['Beta', 'Alpha', 'Gamma', 'Delta'], 'visible option order must match the stored exam variant');
assert.equal(payload.questions[0].a, 0, 'correct answer must follow the visible option order');
assert.equal(payload.questions[0].section.instructions, sharedBundle.instructions);

const validation = validateInteractiveExamPayload(payload);
assert.equal(validation.valid, true, validation.errors.join('\n'));

const unsafeJson = scriptSafeJson(payload);
assert.equal(unsafeJson.includes('</script>'), false, 'serialized payload must not be able to close the JSON script tag');
assert.equal(unsafeJson.includes('\\u003c/script\\u003e'), true, 'angle brackets must be script-safe escaped');

const templatePath = new URL('../public/templates/brian-interactive-exam-v3.1.html', import.meta.url);
const template = fs.readFileSync(templatePath, 'utf8');
assert.equal(template.includes('__BRIAN_EXAM_DATA__'), true, 'template data marker is required');
assert.equal(/<script\s+src=/i.test(template), false, 'interactive export must not depend on external scripts');
assert.equal(/<link\s+[^>]*rel=["']stylesheet/i.test(template), false, 'interactive export must not depend on external stylesheets');

for (const contract of [
  'data-interactive-export="brian-v3.1"',
  'id="fontMinus"',
  'id="fontPlus"',
  'id="explainToggle"',
  'id="soundToggle"',
  'id="motionButton"',
  'id="flagBtn"',
  'id="contextMore"',
  'id="fullscreen"',
  'id="reviewList"',
  'data-filter="unanswered"',
  'role="status"',
]) {
  assert.equal(template.includes(contract), true, `missing interactive player contract: ${contract}`);
}

const rendered = template.replace('__BRIAN_EXAM_DATA__', unsafeJson);
assert.equal(rendered.includes('__BRIAN_EXAM_DATA__'), false);
assert.equal(rendered.includes('TN THPT Interactive <Demo>'), false, 'unsafe title should remain encoded inside JSON');
assert.equal(rendered.includes('\\u003cDemo\\u003e'), true);
assert.equal(rendered.includes('Shared passage \\u003cwith\\u003e characters \\u0026 symbols.'), true);

const pageSource = fs.readFileSync(new URL('../src/pages/QuestionBank.jsx', import.meta.url), 'utf8');
assert.match(pageSource, /buildInteractiveExamHtml/);
assert.match(pageSource, /exportSelectedExam\('interactive'\)/);
assert.match(pageSource, /Xuất HTML tương tác/);
assert.match(pageSource, /text\/html;charset=utf-8/);

console.log('Question Bank interactive HTML export contract: PASS');
