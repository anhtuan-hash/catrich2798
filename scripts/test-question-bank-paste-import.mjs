import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseQuestionBankPaste } from '../src/utils/questionBankPasteParser.js';

const vietnamese = `
ĐỀ LUYỆN TẬP TIẾNG ANH 12
CEFR: B1
Question 1. Our school is organising ___ International Culture Day.
A. a
B. an
C. the
D. no article
Answer: B
Explanation: Use "an" before a vowel sound.

Question 2. Students should respect cultural ___.
A. differences
B. different
C. differently
D. differ

ĐÁP ÁN
1. B
2. A
`;

const parsed = parseQuestionBankPaste(vietnamese, { grade: '12', cefr: 'B1' });
assert.equal(parsed.questions.length, 2, 'must parse two numbered questions');
assert.deepEqual(parsed.questions[0].options, ['a', 'an', 'the', 'no article']);
assert.equal(parsed.questions[0].correctAnswer, 'B');
assert.equal(parsed.questions[1].correctAnswer, 'A');
assert.match(parsed.questions[0].explanation, /vowel sound/i);
assert.equal(parsed.metadata.grade, 12);

const reading = `
Read the following passage and choose the best answer.
Healthy habits can improve concentration and sleep. Students who keep a regular routine often feel more prepared for school. Drinking enough water and taking short movement breaks can also help them stay alert during long study sessions.

Question 1. What is the passage mainly about?
A. School uniforms
B. Healthy study habits
C. Travel plans
D. Sports competitions
Answer: B

Question 2. What can help students stay alert?
A. Skipping breakfast
B. Studying all night
C. Drinking enough water
D. Avoiding movement
Answer: C
`;
const parsedReading = parseQuestionBankPaste(reading, { grade: 11, cefr: 'B1', skill: 'Reading' });
assert.equal(parsedReading.questions.length, 2);
assert.ok(parsedReading.bundle, 'reading preface must be preserved as a bundle');
assert.match(parsedReading.bundle.contextText, /Healthy habits/);

const json = JSON.stringify({
  title: 'Relative Clauses 01',
  grade: 12,
  questions: [
    {
      stem: 'The teacher ___ helped me was very patient.',
      options: ['who', 'which', 'where', 'when'],
      correctAnswer: 'A',
      grammarPoint: 'Relative clauses',
    },
  ],
});
const parsedJson = parseQuestionBankPaste(json, { cefr: 'B1' });
assert.equal(parsedJson.format, 'json');
assert.equal(parsedJson.questions.length, 1);
assert.equal(parsedJson.questions[0].grammarPoint, 'Relative clauses');

const parserSource = fs.readFileSync('src/utils/questionBankPasteParser.js', 'utf8');
const pageSource = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
assert.ok(!/fetch\s*\(/.test(parserSource), 'zero-cost parser must not call external APIs');
assert.ok(!/openai|anthropic|gemini/i.test(parserSource), 'zero-cost parser must not depend on AI providers');
assert.ok(pageSource.includes('Nhập từ ChatGPT'), 'Question Bank must expose the paste-import tab');
assert.ok(pageSource.includes('Không gọi OpenAI API'), 'UI must state the zero-cost behavior');
assert.ok(pageSource.includes("source_kind: 'chatgpt_paste'"), 'paste imports must be traceable by source kind');

console.log('PASS: zero-cost Question Bank paste import parser and UI contract are intact.');
