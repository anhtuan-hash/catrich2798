import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const bootstrap = read('src/applicationBootstrap.jsx');
const classStore = read('src/utils/homeroomClassWorkspaceStore.js');
const external = read('src/externalAppsBootstrap.jsx');
const guard = read('src/utils/brianTeamEgressGuard.js');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(bootstrap.includes('if (!isAssignedClassRoute()) return Promise.resolve({ skipped: true })'), 'Assigned-class sync must be route-gated.');
check(!bootstrap.includes('installRouteModuleLoader();\n  startAssignedClassSync();'), 'Assigned-class sync must not run unconditionally at startup.');
check(classStore.includes(".select('workspace_id,class_name,school_year,status,semester,archived_at,updated_at')"), 'Catalog must query metadata only.');
check(!classStore.includes('listHomeroomWorkspaces as listBaseWorkspaces'), 'Catalog must not call the payload-heavy base list.');
check(classStore.includes('load at most the currently selected class'), 'Catalog wrapper must not download every workspace payload.');
check(external.includes('brianTeamDataActive ? ('), 'Brian Team bridges must be route-gated.');
check(external.includes('/work-hub|brian-team|personnel-hub/i'), 'Brian Team route contract is missing.');
check(!guard.includes(".channel('bes-brian-team-egress-guard"), 'Egress guard must not open an unfiltered Realtime channel.');
check(guard.includes("mode: 'interval-throttle-only'"), 'Interval-only guard mode is missing.');
check(!guard.toLowerCase().includes('supabase'), 'Egress guard must not import or reference Supabase.');

if (failures.length) {
  console.error('\nSupabase egress P0 guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Supabase egress P0 guard passed.');
console.log('Global assigned-class sync: disabled outside relevant routes.');
console.log('Homeroom catalog payload downloads: removed.');
console.log('Brian Team global heavy bridges: route-gated.');
console.log('Duplicate unfiltered Realtime channel: removed.');
