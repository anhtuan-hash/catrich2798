import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectServerAssignedHomeroom } from '../src/utils/homeroomAssignmentSelection.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bootstrap = read('src/applicationBootstrap.jsx');
const preferred = read('src/preferredHomeroomEntry.js');
const sql = read('supabase/migrations/20261012182500_fast_assigned_homeroom_entry.sql');

assert.deepEqual(
  selectServerAssignedHomeroom([{ workspace_id: 'school-12-6-2026-2027', class_name: '12.6' }]),
  { id: 'school-12-6-2026-2027', className: '12.6', source: 'server-assignment' },
  'The explicitly assigned 12.6 homeroom should win instead of cached 10.5',
);
assert.equal(selectServerAssignedHomeroom([]), null, 'No GVCN assignment must not manufacture one');
assert.equal(selectServerAssignedHomeroom([{ workspace_id: ' ', class_name: '10.5' }]), null, 'Empty workspace IDs are invalid');
assert.match(preferred, /const ASSIGNED_HOMEROOM_RPC = 'bes_get_my_assigned_homeroom'/);
assert.match(preferred, /supabase\.rpc\(ASSIGNED_HOMEROOM_RPC\)/);
assert.match(preferred, /selectServerAssignedHomeroom/);
assert.match(preferred, /await loadServerPreferredWorkspace\(user\)/);
const start = bootstrap.split('async function startApplication() {')[1] || '';
assert.match(start, /void preparePreferredHomeroomBeforeMain\(\)/, 'Background server verification must not block first paint');
assert.doesNotMatch(start, /await preparePreferredHomeroomBeforeMain\(\)/, 'Do not wait up to 5.5 seconds to render the app');
assert.doesNotMatch(start, /await startAssignedClassSync\(\)/, 'Never block first paint on all class roster hydrations');
assert.match(sql, /auth\.uid\(\)/, 'The source must use the logged-in identity');
assert.match(sql, /homeroomTeacherId/, 'Select only the directly assigned GVCN');
assert.match(sql, /workspace\.owner_id = assigned\.teacher_id/, 'Only this teacher\'s workspace can be selected');
assert.match(sql, /grant execute on function .* to authenticated/);
console.log('Fast assigned homeroom entry regression checks passed.');
