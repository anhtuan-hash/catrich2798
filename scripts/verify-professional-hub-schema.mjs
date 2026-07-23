import fs from 'node:fs';
import path from 'node:path';

const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('Usage: node scripts/verify-professional-hub-schema.mjs <migration.sql>');
  process.exit(1);
}

const absolutePath = path.resolve(migrationPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Migration not found: ${absolutePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(absolutePath, 'utf8');

const requiredTables = [
  'professional_hubs',
  'professional_hub_members',
  'professional_hub_tasks',
  'professional_hub_task_assignees',
  'professional_hub_plans',
  'professional_hub_records',
  'professional_hub_meetings',
  'professional_hub_evidence',
  'professional_hub_notifications',
];

const requiredFragments = [
  'enable row level security',
  'is_professional_hub_member',
  'has_professional_hub_role',
  'recipient_id = auth.uid()',
  "role in ('leader', 'teacher')",
  'unique (hub_id, user_id)',
  'foreign key (task_id, hub_id)',
  'begin;',
  'commit;',
];

const failures = [];

for (const table of requiredTables) {
  if (!sql.includes(`public.${table}`)) {
    failures.push(`Missing table reference: ${table}`);
  }
}

for (const fragment of requiredFragments) {
  if (!sql.toLowerCase().includes(fragment.toLowerCase())) {
    failures.push(`Missing required fragment: ${fragment}`);
  }
}

const forbiddenFragments = [
  'DepartmentWorkspace',
  'DepartmentMicrofrontend',
  'to-chuyen-mon',
  'Nguyễn Thị Mai',
  'Trần Minh Đức',
  'Phạm Thu Hà',
  'Lê Hoàng Nam',
  'Đỗ Thị Hương',
];

for (const fragment of forbiddenFragments) {
  if (sql.includes(fragment)) {
    failures.push(`Forbidden legacy/mock fragment: ${fragment}`);
  }
}

const createTableCount = (
  sql.match(/create table if not exists public\.professional_/gi) || []
).length;

if (createTableCount !== requiredTables.length) {
  failures.push(
    `Expected ${requiredTables.length} Professional Hub tables, found ${createTableCount}`,
  );
}

const rlsCount = (
  sql.match(/enable row level security/gi) || []
).length;

if (rlsCount !== requiredTables.length) {
  failures.push(
    `Expected ${requiredTables.length} RLS declarations, found ${rlsCount}`,
  );
}

if (failures.length) {
  console.error('Professional Hub schema verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Professional Hub schema verification passed.');
console.log(`Tables: ${createTableCount}`);
console.log(`RLS declarations: ${rlsCount}`);
console.log('Legacy/mock references: 0');
