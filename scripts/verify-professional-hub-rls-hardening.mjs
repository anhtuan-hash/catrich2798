import fs from 'node:fs';
import path from 'node:path';

const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error(
    'Usage: node scripts/verify-professional-hub-rls-hardening.mjs <migration.sql>',
  );
  process.exit(1);
}

const absolutePath = path.resolve(migrationPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Migration not found: ${absolutePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(absolutePath, 'utf8');
const lower = sql.toLowerCase();
const failures = [];

const requiredFragments = [
  'professional_hub_audit_log',
  'professional_hub_guard_membership',
  'professional_hub_validate_member_links',
  'professional_hub_guard_task_assignee_update',
  'professional_hub_guard_reviewable_update',
  'professional_hub_guard_notification_update',
  'professional_hub_guard_task_identity',
  'professional_hub_task_assignees_select_self_or_leader',
  'professional_hub_plans_select_owner_or_leader',
  'professional_hub_records_select_owner_or_leader',
  'professional_hub_evidence_select_owner_or_leader',
  'a professional hub must retain at least one active leader',
  'notification recipients may update read_at only',
  'owner may only save or submit the item',
  'leader may review only submitted items',
  'drop policy if exists professional_hub_members_delete_leader',
  'drop policy if exists professional_hub_plans_delete_owner_or_leader',
  'drop policy if exists professional_hub_records_delete_owner_or_leader',
  'drop policy if exists professional_hub_evidence_delete_owner_or_leader',
  'begin;',
  'commit;',
];

for (const fragment of requiredFragments) {
  if (!lower.includes(fragment.toLowerCase())) {
    failures.push(`Missing required fragment: ${fragment}`);
  }
}

const forbiddenFragments = [
  'DepartmentWorkspace',
  'DepartmentMicrofrontend',
  'to-chuyen-mon',
  'department-app',
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

const auditTriggers = (
  sql.match(
    /execute function public\.professional_hub_write_audit_log\(\)/gi,
  ) || []
).length;

if (auditTriggers < 7) {
  failures.push(`Expected at least 7 audit triggers, found ${auditTriggers}`);
}

const guardTriggers = (
  sql.match(/create trigger professional_hub_[a-z0-9_]+_guard/gi) || []
).length;

if (guardTriggers < 7) {
  failures.push(`Expected at least 7 guard triggers, found ${guardTriggers}`);
}

if (lower.includes('to anon')) {
  failures.push('Anonymous policy or grant detected');
}

if (failures.length) {
  console.error('Professional Hub Phase 2.1B verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Professional Hub Phase 2.1B verification passed.');
console.log(`Audit triggers: ${auditTriggers}`);
console.log(`Guard triggers: ${guardTriggers}`);
console.log('Anonymous access: 0');
console.log('Legacy/mock references: 0');
