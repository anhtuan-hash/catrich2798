import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/QuestionBankPractice.jsx', 'utf8');
const css = fs.readFileSync('src/pages/QuestionBankPractice.css', 'utf8');
const main = fs.readFileSync('src/main.jsx', 'utf8');
const sql = fs.readFileSync('supabase/question_bank_public_practice_v11_8_0.sql', 'utf8');

for (const token of [
  'function formatClock(totalSeconds)',
  'const [remainingSeconds, setRemainingSeconds] = useState(null);',
  'payload?.practice?.settings?.timeLimitMinutes',
  'setRemainingSeconds(timeLimitMinutes ? timeLimitMinutes * 60 : null);',
  'void submit(true);',
  'async function submit(force = false)',
  'remainingSeconds === 0',
  'Hết thời gian · Brian đang tự động nộp bài…',
  'Bài sẽ tự nộp khi hết',
]) assert.ok(page.includes(token), 'Timed public practice contract missing: ' + token);

for (const token of [
  '.qbp-header-status',
  '.qbp-timer',
  '.qbp-timer.is-warning',
  '.qbp-timeout',
]) assert.ok(css.includes(token), 'Timed public practice CSS missing: ' + token);

assert.ok(main.includes("'qb-practice'"), 'Public practice route must remain registered.');
assert.ok(
  main.includes("const PUBLIC_ROUTES = new Set") && main.includes("'qb-practice'"),
  'Question Bank practice must remain accessible without login.',
);

for (const token of [
  'qb_public_practice_get',
  'qb_public_practice_submit',
  'assessment_practice_share_tokens',
  'assessment_practice_responses',
]) assert.ok(sql.includes(token), 'Public practice SQL contract missing: ' + token);

assert.ok(!page.includes('Math.random('), 'Public practice must not synthesize fake telemetry.');
assert.ok(!page.includes('mockData'), 'Public practice must not use mock student data.');

console.log('PASS: public Question Bank practice route, countdown timer, timeout auto-submit, and real telemetry contract are intact.');
