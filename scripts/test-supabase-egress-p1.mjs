import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const classStore = read('src/utils/homeroomClassWorkspaceStore.js');
const supabase = read('src/utils/supabase.js');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(classStore.includes("source: 'cloud-minimal-return'"), 'Homeroom saves must use a minimal-return cloud write.');
check(!classStore.includes('saveHomeroomWorkspace as saveBaseWorkspace'), 'Frequent homeroom saves must not use the payload-returning base save.');
check(classStore.includes(".upsert({\n    owner_id: user.id"), 'Direct homeroom upsert contract is missing.');
check(!classStore.includes(".select('workspace_id,payload,updated_at')"), 'Homeroom save must not request payload back.');
check(supabase.includes("'/rest/v1/collaboration_comments', 'id,space_id,thread_id"), 'Collaboration comment projection is missing.');
check(supabase.includes("'/rest/v1/audit_events', 'id,actor_id,actor_email"), 'Audit projection is missing.');
check(supabase.includes('const READ_LIMIT_CAPS = ['), 'Read limit caps are missing.');
check(supabase.includes("['/rest/v1/backup_snapshots', 10]"), 'Snapshot list cap is missing.');
check(supabase.includes("['/rest/v1/deleted_items', 100]"), 'Deleted-items list cap is missing.');
check(supabase.includes('applyReadLimitCap(applySelectProjection(originalRequest))'), 'Egress policies must run before cached REST reads.');

if (failures.length) {
  console.error('\nSupabase egress P1 guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Supabase egress P1 guard passed.');
console.log('Homeroom save response payload: removed.');
console.log('Collaboration and audit projections: active.');
console.log('Large list read caps: active.');
