import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
const css = fs.readFileSync('src/pages/QuestionBank.css', 'utf8');

for (const token of [
  'openBundle',
  'closeBundle',
  'openBundleExam',
  'Mở chi tiết',
  'SHARED TEXT / FULL CONTEXT',
  'Đề thi đang sử dụng chùm này',
  'Toàn bộ câu hỏi trong chùm',
  'Hiện đáp án',
  'Tất cả chùm bài',
]) {
  assert.ok(page.includes(token), 'Bundle Reader missing UI/logic: ' + token);
}

assert.ok(page.includes('role="button"'), 'bundle cards must be keyboard/click openable');
assert.ok(page.includes("tabIndex={0}"), 'bundle cards must be keyboard focusable');
assert.ok(page.includes("assessment_test_items"), 'bundle reader must resolve related exams');
assert.ok(page.includes("questions.filter((item) => item.bundle_id === selectedBundle.id)"), 'bundle reader must render only bundle items');
assert.ok(css.includes('.qb-bundle-card.is-openable'));
assert.ok(css.includes('.qb-bundle-reader'));
assert.ok(css.includes('.qb-bundle-full-context'));

console.log('PASS: Question Bank Bundle Reader contract is intact.');
