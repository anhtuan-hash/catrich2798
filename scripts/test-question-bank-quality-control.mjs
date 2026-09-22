import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/QuestionBank.jsx', 'utf8');
const quality = fs.readFileSync('src/pages/question-bank/QuestionBankQualityControl.jsx', 'utf8');
const css = fs.readFileSync('src/pages/question-bank/QuestionBankQualityControl.css', 'utf8');
const sql = fs.readFileSync('supabase/question_bank_quality_control_v11_8_1.sql', 'utf8');
const hardeningSql = fs.readFileSync('supabase/question_bank_performance_security_hardening_v11_8_2.sql', 'utf8');
const auditFixSql = fs.readFileSync('supabase/question_bank_audit_bundle_ready_fix_v11_8_2.sql', 'utf8');
const departmentAccessSql = fs.readFileSync('supabase/question_bank_restore_department_rls_access_v11_8_5.sql', 'utf8');

assert.ok(
  page.includes('fetchAllOwnedRows') || page.includes('fetchAllAccessibleRows'),
  'Question Bank must page through the complete accessible bank.',
);
assert.ok(!page.includes(".limit(500)"), 'Question Bank must not truncate the item pool at 500 rows.');

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


for (const token of [
  'assessment_exam_batches_blueprint_idx',
  'assessment_practice_share_tokens_practice_idx',
  'assessment_test_items_item_idx',
  'assessment_tests_blueprint_idx',
  'owner_id = (select auth.uid())',
  'revoke execute on function public.qb_current_department_id(uuid) from authenticated;',
]) assert.ok(hardeningSql.includes(token), 'Question Bank hardening SQL missing: ' + token);

for (const token of [
  "approved_count=expected_count",
  "approvedReady requires both approved bundle status and all child items approved",
]) assert.ok(auditFixSql.includes(token), 'Golden Bank audit fix missing: ' + token);


for (const token of [
  'when auth.uid() is not null then auth.uid()',
  'revoke execute on function public.qb_current_department_id(uuid) from anon;',
  'grant execute on function public.qb_current_department_id(uuid) to authenticated;',
  'Authenticated callers cannot use p_user_id to inspect another user.',
]) assert.ok(departmentAccessSql.includes(token), 'Question Bank department access repair missing: ' + token);

assert.ok(!quality.includes('Math.random('), 'Quality Control must not synthesize fake analytics.');
assert.ok(!quality.includes('mockData'), 'Quality Control must not use mock analytics.');

console.log('PASS: Question Bank Quality Control UI, RPC wiring, source SQL, and no-fake-data contract are intact.');
