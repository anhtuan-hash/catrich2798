import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sqlPath = path.join(root, 'supabase', 'resource_library_v10_88_1_access_sync_fix.sql');
const required = [
  'resource_sync_identity_fields',
  'resource_is_leader',
  'resource_is_drive_owner',
  'resource_items_read_v10881',
  'resource_items_insert_v10881',
  'resource_items_update_v10881',
  'resource_items_delete_v10881',
  'resource_approvals_read_v10881',
  "notify pgrst, 'reload schema'",
];

if (!fs.existsSync(sqlPath)) {
  console.error('FAIL: Missing Supabase migration:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const missing = required.filter((marker) => !sql.includes(marker));
if (missing.length) {
  console.error('FAIL: Migration is incomplete:', missing.join(', '));
  process.exit(1);
}

if (/delete\s+from\s+public\.resource_items/i.test(sql)) {
  console.error('FAIL: Migration must not delete resource rows.');
  process.exit(1);
}

console.log('PASS: V10.88.1 resource-library migration contains all required guards.');
console.log('NEXT: Run the SQL file once in Supabase SQL Editor, then sign out/in on both accounts.');
