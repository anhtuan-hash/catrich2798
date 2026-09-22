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
  context_text: 'Shared passage <with> characters & symbols. Students read this before answering. Tiếng Việt: giáo dục, kỹ năng, đánh giá.',
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
    options: ['Một', 'Hai', 'Ba', 'Bốn'],
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

const payload = buildInteractiveExamPayload({
  test: sampleTest,
  items,
  options: {
    durationMinutes: 35,
    shuffleOptions: true,
    showExplanation: false,
    sound: false,
    motion: 'none',
  },
});

assert.equal(payload.schema, 'brian-interactive-assessment/v1');
assert.equal(payload.playerVersion, '3.2-safe');
assert.equal(payload.test.title, sampleTest.title);
assert.equal(payload.defaults.durationMinutes, 35);
assert.equal(payload.defaults.shuffleOptions, true);
assert.equal(payload.defaults.showExplanation, false);
assert.equal(payload.defaults.sound, false);
assert.equal(payload.defaults.motion, 'none');
assert.equal(payload.questions.length, 2);
assert.equal(payload.questions[0].ctx, sharedBundle.context_text, 'shared bundle context must survive export');
assert.deepEqual(payload.questions[0].o, ['Beta', 'Alpha', 'Gamma', 'Delta'], 'visible option order must match the stored exam variant');
assert.equal(payload.questions[0].a, 0, 'correct answer must follow the visible option order');
assert.equal(payload.questions[0].section.instructions, sharedBundle.instructions);

const validation = validateInteractiveExamPayload(payload);
assert.equal(validation.valid, true, validation.errors.join('\n'));

const safeJson = scriptSafeJson(payload);
assert.equal(safeJson.includes('</script>'), false, 'serialized payload must not close the JSON script tag');
assert.equal(safeJson.includes('\\u003c/script\\u003e'), true, 'angle brackets must be script-safe escaped');

const templatePath = new URL('../public/templates/brian-interactive-exam-v3.2-safe.html', import.meta.url);
const template = fs.readFileSync(templatePath, 'utf8');

for (const contract of [
  '<meta charset="UTF-8">',
  'charset=UTF-8',
  'data-interactive-export="brian-v3.2-safe"',
  'default-src \'none\'',
  '"Noto Sans"',
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
  'Xáo trộn thứ tự phương án khi bắt đầu',
]) {
  assert.equal(template.includes(contract), true, `missing interactive player contract: ${contract}`);
}

assert.equal(template.includes('__BRIAN_EXAM_DATA__'), true, 'template data marker is required');
assert.equal(/<script\s+src=/i.test(template), false, 'interactive export must not depend on external scripts');
assert.equal(/<link\s+[^>]*rel=["']stylesheet/i.test(template), false, 'interactive export must not depend on external stylesheets');
assert.equal(/https?:\/\//i.test(template), false, 'interactive export must not contact external URLs');
assert.equal(/@font-face/i.test(template), false, 'interactive export must not embed or override Brian custom fonts');
assert.equal(template.includes('GlobalFontSystem'), false);
assert.equal(template.includes('GlobalRegionalFontSystem'), false);
assert.equal(template.includes('font-family:Inter'), false, 'offline player must not rely on Inter being installed');
assert.match(template, /font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",Arial,sans-serif/);
assert.match(template, /grid-template-columns:minmax\(0,1\.08fr\) minmax\(0,1fr\)/);
assert.match(template, /@media\(max-width:1020px\).*grid-template-columns:1fr/s);
assert.match(template, /overflow-wrap:anywhere/);
assert.match(template, /var mixed=\$\('shuffle'\)\.checked\?mix\(pack\):pack/);
assert.match(template, /var answer=mixed\.findIndex\(function\(x\)\{return x\.correct;\}\)/);

const rendered = template.replace('__BRIAN_EXAM_DATA__', safeJson);
assert.equal(rendered.includes('__BRIAN_EXAM_DATA__'), false);
assert.equal(rendered.includes('TN THPT Interactive <Demo>'), false, 'unsafe title must stay encoded inside JSON');
assert.equal(rendered.includes('\\u003cDemo\\u003e'), true);
assert.equal(rendered.includes('Tiếng Việt: giáo dục, kỹ năng, đánh giá.'), true, 'UTF-8 Vietnamese content must survive serialization');

const pageSource = fs.readFileSync(new URL('../src/pages/QuestionBank.jsx', import.meta.url), 'utf8');
assert.match(pageSource, /buildInteractiveExamHtml/);
assert.match(pageSource, /openInteractiveExport/);
assert.match(pageSource, /Xem trước trước khi tải/);
assert.match(pageSource, /Tải file HTML/);
assert.match(pageSource, /sandbox="allow-scripts"/);
assert.match(pageSource, /text\/html;charset=utf-8/);
assert.equal(pageSource.includes("from '../utils/globalFontSystem.js'"), false, 'Question Bank exporter must not import global font runtime');
assert.equal(pageSource.includes("from '../utils/globalRegionalFontSystem.js'"), false, 'Question Bank exporter must not import regional font runtime');

const exporterSource = fs.readFileSync(new URL('../src/utils/questionBankInteractiveExport.js', import.meta.url), 'utf8');
assert.equal(exporterSource.includes('globalFontSystem'), false);
assert.equal(exporterSource.includes('globalRegionalFontSystem'), false);
assert.match(exporterSource, /brian-interactive-exam-v3\.2-safe\.html/);

console.log('PASS: Question Bank interactive HTML V3.2 SAFE + font isolation contract.');
