import assert from 'node:assert/strict';
import fs from 'node:fs';

const sprintA = fs.readFileSync('supabase/app_wide_security_hardening_sprint_a_v11_9_0.sql','utf8');
const initplan = fs.readFileSync('supabase/app_wide_rls_initplan_optimization_v11_9_0.sql','utf8');
const fkIndexes = fs.readFileSync('supabase/app_wide_foreign_key_indexes_v11_9_0.sql','utf8');
const triggerLock = fs.readFileSync('supabase/app_wide_trigger_rpc_lockdown_v11_9_0.sql','utf8');
const anonLock = fs.readFileSync('supabase/app_wide_anon_security_definer_lockdown_v11_9_0.sql','utf8');
const rpcLock = fs.readFileSync('supabase/app_wide_rpc_surface_hardening_v11_9_0.sql','utf8');
const splitAll = fs.readFileSync('supabase/app_wide_split_all_rls_policies_v11_9_0.sql','utf8');
const consolidate = fs.readFileSync('supabase/app_wide_consolidate_permissive_rls_v11_9_0.sql','utf8');
const finishSelect = fs.readFileSync('supabase/app_wide_finish_duplicate_select_policies_v11_9_0.sql','utf8');
const authScope = fs.readFileSync('supabase/app_wide_authenticated_policy_scope_v11_9_0.sql','utf8');
const customGames = fs.readFileSync('supabase/custom_games_auth_scope_v11_9_0.sql','utf8');
const anonAllowlist = fs.readFileSync('supabase/app_wide_anon_rpc_allowlist_v11_9_0.sql','utf8');
const vite = fs.readFileSync('vite.config.js','utf8');
const main = fs.readFileSync('src/main.jsx','utf8');
const pwa = fs.readFileSync('src/utils/pwa.js','utf8');

for (const token of [
  'create table if not exists public.app_admin_allowlist',
  'allowed_emails is intentionally ignored',
  'revoke execute on function public.bes_admin_claim_configured_admin(text[]) from anon',
  'deny_direct_client_v1190',
]) assert.ok(sprintA.includes(token), 'Sprint A hardening missing: '+token);

assert.ok(initplan.includes("replace(v_qual,'auth.uid()','(select auth.uid())')"), 'RLS initplan optimizer missing.');
assert.ok(fkIndexes.includes('create index if not exists'), 'Foreign-key covering-index migration missing.');
assert.ok(triggerLock.includes("p.prorettype='pg_catalog.trigger'::regtype"), 'Trigger RPC lockdown missing.');
assert.ok(anonLock.includes("auth\\.uid"), 'Anonymous auth-only definer lockdown missing.');
assert.ok(rpcLock.includes('Cannot sync another user department workspace.'), 'Department sync actor binding missing.');
assert.ok(splitAll.includes("p.cmd='ALL'"), 'Broad ALL policy split migration missing.');
assert.ok(consolidate.includes("string_agg('(' || coalesce(p.qual,'true') || ')'"), 'Permissive policy consolidation missing.');
assert.ok(finishSelect.includes('weekly_practice_authenticated_read_v1190'), 'Final duplicate SELECT consolidation missing.');
assert.ok(authScope.includes("roles=array['public']::name[]"), 'Legacy PUBLIC policy retargeting missing.');
assert.ok(customGames.includes('custom_games_anon_read_v1190'), 'Custom games public/auth separation missing.');
assert.ok(anonAllowlist.includes('public_rpc_names text[]'), 'Explicit anonymous RPC allowlist missing.');

for (const deadToken of [
  'conductPeriodEvaluationPlugin',
  'attendanceConductLinkPlugin',
  'conductAttendanceIdentityRepairPlugin',
  'conductBulkActionsPlugin',
  "@vitejs/plugin-react",
]) assert.ok(!vite.includes(deadToken), 'Inactive build-time source rewrite remains: '+deadToken);

assert.ok(!main.includes('PwaUpdateBanner'), 'Retired no-op PWA banner should not be mounted.');
assert.ok(main.includes('registerBrianPwa()'), 'PWA retirement cleanup must still run.');
assert.ok(pwa.includes('await registration.unregister()'), 'Legacy service workers must be unregistered.');
assert.ok(pwa.includes('await clearPwaCaches()'), 'Legacy Brian caches must be cleared.');

console.log('PASS: v11.9.0 app-wide security, RLS, database, build and retired-PWA hardening contracts are present.');
