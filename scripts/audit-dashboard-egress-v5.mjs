import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/utils/dashboardAggregator.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260730143000_dashboard_compact_egress_v5.sql', import.meta.url), 'utf8');

assert.match(source, /bes_dashboard_work_hub_v2/);
assert.match(source, /client\.rpc\(WORK_DASHBOARD_RPC/);
assert.match(source, /from\('work_hub_items'\)/, 'Legacy fallback must remain available.');
assert.match(source, /cloud-compact/);
assert.match(source, /cloud-fallback/);
assert.match(source, /schedule_start_at/);
assert.match(source, /rememberWorkHubItem/);

assert.match(migration, /security invoker/i);
assert.match(migration, /schedule_start_at/);
assert.match(migration, /item\.due_at/);
assert.match(migration, /schedule_notify_all/);
assert.match(migration, /assignment_scope/);
assert.match(migration, /schedule_note/);
assert.match(migration, /schedule_owner_text/);
assert.doesNotMatch(migration, /select\s+item\.\*/i);

console.log('Dashboard compact egress v5 audit passed.');
