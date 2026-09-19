import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  auditExamQuality,
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

const audit = auditExamQuality(items);
assert.equal(audit.ready, true, 'valid 40-question TN THPT structure should pass hard quality gates');
assert.equal(audit.structureOk, true);
assert.equal(audit.totalQuestions, 40);
assert.equal(audit.totalSections, 6);
assert.equal(audit.errors.length, 0);
assert.equal(audit.distributions.answers.B, 40);
assert.ok(audit.warnings.length > 0, 'imbalanced answers / missing optional metadata should be warnings, not hard failures');

const brokenAudit = auditExamQuality(items.map((entry, index) => (
  index === 0 ? { ...entry, options: ['A', 'B', 'C'] } : entry
)));
assert.equal(brokenAudit.ready, false, 'question with fewer than four options must block publishing');
assert.ok(brokenAudit.errors.some((message) => /đúng 4 phương án/.test(message)));

const sameTypeBundledSections = buildExamSections([
  { ...item(1, 'functional-cloze'), _bundle: { id: 'bundle-a', bundle_type: 'functional_cloze_6', context_text: 'A' } },
  { ...item(2, 'functional-cloze'), _bundle: { id: 'bundle-a', bundle_type: 'functional_cloze_6', context_text: 'A' } },
  { ...item(3, 'functional-cloze'), _bundle: { id: 'bundle-b', bundle_type: 'functional_cloze_6', context_text: 'B' } },
  { ...item(4, 'functional-cloze'), _bundle: { id: 'bundle-b', bundle_type: 'functional_cloze_6', context_text: 'B' } },
]);
assert.equal(sameTypeBundledSections.length, 2, 'consecutive bundles of the same type must remain separate sections');

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
for (const token of [
  'ASSESSMENT MANAGER',
  'Xuất Word',
  'Xuất PDF',
  'Nhân bản',
  'Tạo 1 mã',
  'Tạo 4 mã đề',
  'Sửa thông tin',
  'Đáp án nhanh',
  'Xóa đề',
  'EXAM QUALITY AUDIT',
  'Kiểm tra & phát hành',
  'Phân bố đáp án',
  'Mức nhận thức',
  'Tập trung 1 phần',
  'Thu gọn tất cả',
  'Mở ngữ liệu',
  'Thu phần',
]) {
  assert.ok(page.includes(token), `Question Bank exam manager missing UI: ${token}`);
}
assert.ok(page.includes("createExamCopy({ variant: true })"), 'single variant action must be wired');
assert.ok(page.includes("createExamCopy({ variant: false })"), 'duplicate action must be wired');
assert.ok(page.includes("createVariantBatch(4)"), 'four-variant action must be wired');
assert.ok(page.includes("saveExamMetadata"), 'exam metadata editor must be wired');
assert.ok(page.includes("deleteSelectedExam"), 'safe exam delete must be wired');
assert.ok(page.includes("publishSelectedExam"), 'quality-gated publish action must be wired');
assert.ok(page.includes("selectedExamAudit.ready"), 'publish UI must be gated by deterministic quality audit');
assert.ok(page.includes("auditExamQuality(selectedTestItems)"), 'Assessment Manager must audit the selected exam');
assert.ok(page.includes("visibleExamSections"), 'Exam Navigator must support focused section rendering');
assert.ok(page.includes("scrollIntoView({ behavior: 'smooth'"), 'Exam Navigator must support smooth section jumps');
assert.ok(page.includes("collapsedExamContexts"), 'Exam Navigator must support compact shared-text previews');
assert.ok(page.includes("collapsedExamSections"), 'Exam Navigator must support collapsing full blocks');
assert.ok(page.includes("assessment_test_items').delete().eq('test_id', selectedTest.id)"), 'exam delete must remove joins first');
assert.ok(page.includes("assessment_tests').delete().eq('id', selectedTest.id)"), 'exam delete must remove only the test after joins');
assert.ok(!/assessment_items'\)\.delete\(\)/.test(page), 'deleting an exam must never delete bank questions');
assert.ok(page.includes("effectiveAnswer(item)"), 'teacher answer display must respect option order');

console.log('PASS: Question Bank full exam manager contract is intact.');
