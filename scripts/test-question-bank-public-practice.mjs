import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/QuestionBankPractice.jsx', 'utf8');
const css = fs.readFileSync('src/pages/QuestionBankPractice.css', 'utf8');
const main = fs.readFileSync('src/main.jsx', 'utf8');
const sql = fs.readFileSync('supabase/question_bank_public_practice_v11_8_0.sql', 'utf8');
const balancedSql = fs.readFileSync('supabase/question_bank_public_practice_balanced_options_v11_8_3.sql', 'utf8');
const inheritSql = fs.readFileSync('supabase/question_bank_practice_option_order_trigger_v11_8_4.sql', 'utf8');

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


for (const token of [
  'add column if not exists option_order jsonb',
  "ps.settings->>'sourceTestId'",
  "jsonb_array_length(pi.option_order)=4",
  "'answerSpace','canonical-source-option'",
  "mapped.source_answer=upper(left(i.correct_answer,1))",
  "'correctAnswer'",
]) assert.ok(balancedSql.includes(token), 'Balanced public practice SQL contract missing: ' + token);

assert.ok(
  balancedSql.includes("select jsonb_agg(i.options -> (x.src::int) order by x.ord)"),
  'Public practice must render options in the stored balanced order.',
);

for (const token of [
  'qb_practice_item_inherit_option_order',
  "ps.settings->>'sourceTestId'",
  'trg_qb_practice_item_inherit_option_order',
  'new.option_order := v_order',
]) assert.ok(inheritSql.includes(token), 'Future practice option-order inheritance missing: ' + token);

assert.ok(!page.includes('Math.random('), 'Public practice must not synthesize fake telemetry.');
assert.ok(!page.includes('mockData'), 'Public practice must not use mock student data.');

console.log('PASS: public Question Bank practice route, countdown timer, timeout auto-submit, and real telemetry contract are intact.');
