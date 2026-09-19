import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildExamExportHtml,
  buildExamSections,
  createVariantOptionOrder,
  effectiveAnswer,
  nextExamCode,
  splitExamStem,
  visibleOptions,
} from '../src/utils/questionBankExamManager.js';

const item = (position, tag, stem = `Question ${position}. Sample question?`) => ({
  id: `q-${position}`,
  position,
  stem,
  options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
  correct_answer: 'B',
  tags: ['TNTHPT2025-2026', tag],
  skill: tag === 'reading-8' || tag === 'reading-10' ? 'Reading' : 'Use of English',
  cefr: 'B1',
  cognitive_level: 'comprehension',
  difficulty: 2,
});

const items = [
  ...Array.from({ length: 5 }, (_, i) => item(i + 1, 'arrangement')),
  ...Array.from({ length: 5 }, (_, i) => item(i + 6, 'discourse-cloze', i === 0
    ? 'Questions 6–10: Read the passage and choose the option that best completes each blank.\n\nPASSAGE A\n\nQuestion 6. Which option fits blank (6)?'
    : `Question ${i + 6}. Which option fits blank (${i + 6})?`)),
  ...Array.from({ length: 10 }, (_, i) => item(i + 11, 'reading-10', i === 0
    ? 'Questions 11–20: Read the passage.\n\nREADING TEN PASSAGE\n\nQuestion 11. What is the closest meaning?'
    : `Question ${i + 11}. Reading 10 question?`)),
  ...Array.from({ length: 8 }, (_, i) => item(i + 21, 'reading-8', i === 0
    ? 'Questions 21–28: Read the passage.\n\nREADING EIGHT PASSAGE\n\nQuestion 21. What is the writer purpose?'
    : `Question ${i + 21}. Reading 8 question?`)),
  ...Array.from({ length: 6 }, (_, i) => item(i + 29, 'functional-cloze', i === 0
    ? 'Questions 29–34: Read the announcement.\n\nOPEN DAY\nText with blank (29).\n\nQuestion 29. Choose the best option for blank (29).'
    : `Question ${i + 29}. Choose the best option for blank (${i + 29}).`)),
  ...Array.from({ length: 6 }, (_, i) => item(i + 35, 'functional-cloze', i === 0
    ? 'Questions 35–40: Read the notice.\n\nREPAIR CAFE\nText with blank (35).\n\nQuestion 35. Choose the best option for blank (35).'
    : `Question ${i + 35}. Choose the best option for blank (${i + 35}).`)),
];

const sections = buildExamSections(items);
assert.equal(sections.length, 6, 'full TN THPT exam must resolve into six content blocks');
assert.deepEqual(sections.map((section) => section.type), [
  'arrangement_5',
  'discourse_cloze_5',
  'reading_10',
  'reading_8',
  'functional_cloze_6',
  'functional_cloze_6',
]);
assert.deepEqual(sections.map((section) => section.items.length), [5, 5, 10, 8, 6, 6]);
assert.match(sections[1].context, /PASSAGE A/);
assert.match(sections[4].context, /OPEN DAY/);
assert.match(sections[5].context, /REPAIR CAFE/);

const split = splitExamStem(items[5].stem, 6);
assert.match(split.context, /Questions 6–10/);
assert.equal(split.question, 'Which option fits blank (6)?');

const variantOrder = createVariantOptionOrder(items[0], '101');
assert.equal(variantOrder.length, 4);
assert.equal(new Set(variantOrder).size, 4);
assert.ok(!variantOrder.every((value, index) => value === index), 'variant must not keep identity option order');

const variantItem = { ...items[0], option_order: variantOrder };
const visible = visibleOptions(variantItem);
assert.equal(visible.length, 4);
const sourceCorrectIndex = 1;
const expectedVisibleAnswer = String.fromCharCode(65 + variantOrder.indexOf(sourceCorrectIndex));
assert.equal(effectiveAnswer(variantItem), expectedVisibleAnswer, 'visible answer letter must follow shuffled options');

assert.equal(nextExamCode([{ settings: {} }]), '101');
assert.equal(nextExamCode([{ settings: { examCode: '101' } }, { settings: { examCode: '103' } }]), '104');

const test = {
  title: 'Đề luyện TN THPT 40 câu',
  grade: 12,
  school_year: '2026-2027',
  settings: { durationMinutes: 50 },
};
const studentHtml = buildExamExportHtml({ test, items, teacherMode: false });
const teacherHtml = buildExamExportHtml({ test, items, teacherMode: true });
assert.match(studentHtml, /Part 1/);
assert.doesNotMatch(studentHtml, /<b>Answer:<\/b>/);
assert.match(teacherHtml, /<b>Answer:<\/b>/);
assert.match(teacherHtml, /Teacher version/);

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
for (const token of ['ASSESSMENT MANAGER', 'Xuất Word', 'Xuất PDF', 'Nhân bản', 'Tạo mã đề mới']) {
  assert.ok(page.includes(token), `Question Bank exam manager missing UI: ${token}`);
}
assert.ok(page.includes("createExamCopy({ variant: true })"), 'variant action must be wired');
assert.ok(page.includes("createExamCopy({ variant: false })"), 'duplicate action must be wired');
assert.ok(page.includes("effectiveAnswer(item)"), 'teacher answer display must respect option order');

console.log('PASS: Question Bank full exam manager contract is intact.');
