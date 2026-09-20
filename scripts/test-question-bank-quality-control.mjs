import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
const quality = fs.readFileSync('src/pages/question-bank/QuestionBankQualityControl.jsx', 'utf8');
const css = fs.readFileSync('src/pages/question-bank/QuestionBankQualityControl.css', 'utf8');
const sql = fs.readFileSync('supabase/question_bank_quality_control_v11_8_1.sql', 'utf8');

for (const token of [
  "import QuestionBankQualityControl from './question-bank/QuestionBankQualityControl.jsx';",
  "['quality', 'Chất lượng']",
  "activeTab === 'quality'",
  '<QuestionBankQualityControl',
]) assert.ok(page.includes(token), 'Question Bank shell missing: ' + token);

for (const token of [
  "['golden', 'Golden Bank']",
  "['coverage', 'Coverage']",
  "['performance', 'Item Performance']",
  "['review', 'Review Queue']",
  "supabase.rpc('qb_quality_dashboard'",
  "supabase.rpc('qb_golden_bank_issues'",
  'Brian không tạo dữ liệu giả',
  'Practice telemetry',
]) assert.ok(quality.includes(token), 'Quality Control UI missing: ' + token);

for (const token of [
  'qb-quality-control',
  'qb-quality-kpis',
  'qb-quality-coverage-list',
  'qb-quality-performance',
  'qb-quality-review-list',
]) assert.ok(css.includes(token), 'Quality Control CSS missing: ' + token);

for (const token of [
  'create or replace function public.qb_golden_bank_audit()',
  'create or replace function public.qb_coverage_plan(',
  'create or replace function public.qb_item_performance(',
  'create or replace function public.qb_golden_bank_issues(',
  'create or replace function public.qb_quality_dashboard(',
  'create or replace function public.qb_refresh_stats_after_practice_responses()',
  'revoke execute on function public.qb_quality_dashboard(uuid,integer,integer) from anon;',
  'grant execute on function public.qb_quality_dashboard(uuid,integer,integer) to authenticated;',
]) assert.ok(sql.includes(token), 'Quality Control SQL missing: ' + token);

assert.ok(!quality.includes('Math.random('), 'Quality Control must not synthesize fake analytics.');
assert.ok(!quality.includes('mockData'), 'Quality Control must not use mock analytics.');

console.log('PASS: Question Bank Quality Control UI, RPC wiring, source SQL, and no-fake-data contract are intact.');
