import fs from 'node:fs';
import assert from 'node:assert/strict';

function read(path, { optional = false } = {}) {
  if (!fs.existsSync(path)) {
    if (optional) return '';
    assert.fail(`Missing required file: ${path}`);
  }
  return fs.readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260914182000_extra_class_archive_governance.sql', { optional: true });
const api = read('src/attendance/extraClassArchiveApi.js', { optional: true });
const navigation = read('src/components/GlobalAttendanceNavigationTab.jsx');
const workspace = read('src/components/attendance/AttendanceClassManagementWorkspace.jsx');
const panel = read('src/components/attendance/AttendanceArchivePanel.jsx');

for (const token of [
  'bes_extra_class_archive',
  'bes_archive_extra_class',
  'bes_list_extra_class_archive',
  'bes_restore_extra_class_archive',
  'bes_request_extra_class_archive_delete',
  'bes_review_extra_class_archive_delete',
  'bes_finalize_extra_class_archive_delete',
  'class_snapshot',
  'members_snapshot',
  'teachers_snapshot',
  'sessions_snapshot',
  'records_snapshot',
  'proof_paths',
]) {
  assert.ok(migration.includes(token), `Missing database contract: ${token}`);
}

assert.match(migration, /create\s+unique\s+index[\s\S]*bes_extra_class_archive[\s\S]*source_class_id/i,
  'Only one live archive package may exist for one original class id.');
assert.match(migration, /bes_archive_extra_class[\s\S]*can_manage_extra_class_roster\(\)/i,
  'Archive must require Admin/attendance:manage server capability.');
assert.match(migration, /bes_restore_extra_class_archive[\s\S]*can_manage_extra_class_roster\(\)/i,
  'Restore must require Admin/attendance:manage server capability.');
assert.match(migration, /bes_request_extra_class_archive_delete[\s\S]*can_manage_extra_class_roster\(\)/i,
  'Permanent-delete request must require Admin/attendance:manage server capability.');
assert.match(migration, /bes_review_extra_class_archive_delete[\s\S]*public\.is_admin\(\)/i,
  'Review must be Admin-only.');
assert.match(migration, /bes_finalize_extra_class_archive_delete[\s\S]*public\.is_admin\(\)/i,
  'Finalize must be Admin-only.');
assert.match(migration, /delete_request_status[\s\S]*'none'[\s\S]*'pending'[\s\S]*'approved'[\s\S]*'rejected'/i,
  'Archive must model the approved state machine.');
assert.match(migration, /bes_restore_extra_class_archive[\s\S]*not\s+in\s*\(\s*'none'\s*,\s*'rejected'\s*\)/i,
  'Restore must be blocked while purge is pending or approved.');
assert.match(migration, /attendance_class_purge_approval/i,
  'Permanent-delete requests must create a dedicated Admin notification.');
assert.match(migration, /work_hub_notifications[\s\S]*null::uuid[\s\S]*attendance_class_purge_approval/i,
  'Class archive notification must keep item_id NULL.');

for (const action of [
  'attendance.class_archive',
  'attendance.class_archive_restore',
  'attendance.class_purge_requested',
  'attendance.class_purge_approved',
  'attendance.class_purge_rejected',
  'attendance.class_purge_finalized',
]) {
  assert.ok(migration.includes(action), `Missing audit action: ${action}`);
}
assert.match(migration, /insert\s+into\s+public\.audit_events/i,
  'Class archive lifecycle must write durable audit events.');
assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i,
  'Database code must not delete Storage metadata directly.');
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.bes_delete_extra_class[\s\S]*bes_archive_extra_class/i,
  'Legacy class delete must delegate to archive-first behavior instead of hard deleting.');
assert.doesNotMatch(migration, /bes_delete_extra_class[\s\S]*delete\s+from\s+public\.bes_extra_classes/i,
  'Legacy authenticated class delete must not retain a direct hard-delete body.');

for (const name of [
  'archiveExtraClass',
  'listExtraClassArchive',
  'restoreExtraClassArchive',
  'requestExtraClassArchiveDelete',
  'reviewExtraClassArchiveDelete',
  'finalizeExtraClassArchiveDelete',
]) {
  assert.ok(api.includes(name), `Missing client adapter: ${name}`);
}
assert.match(api, /storage\.from\(ATTENDANCE_PROOF_BUCKET\)\.remove\(proofPaths\)/,
  'Approved permanent deletion must remove all proof paths through Storage before finalize.');
assert.match(api, /finalizeExtraClassArchiveDelete\(client,\s*archiveId\)/,
  'Archive row finalization must happen only after proof cleanup.');

assert.match(navigation, /archiveExtraClass/,
  'Class delete UI must use archive RPC.');
assert.doesNotMatch(navigation, /client\.rpc\(['"]bes_delete_extra_class['"]/,
  'UI must not call the legacy destructive class RPC directly.');
assert.match(navigation, /hasAttendanceTabAccess\(currentUser,\s*['"]manage['"]\)/,
  'Class archive UI must recognize attendance:manage.');
assert.match(navigation, /canUseClassArchive/,
  'Class archive visibility must be modeled separately from attendance-history archive visibility.');
assert.match(navigation, /canUseAttendanceHistoryArchive/,
  'Existing attendance-history archive visibility must stay separate.');
assert.match(workspace, /canArchiveClass/,
  'Workspace must receive an explicit class-archive capability.');
assert.match(workspace, /canArchiveClass\s*\?\s*\(/,
  'Class delete action must be hidden for users without manage capability.');

assert.ok(panel.includes('Lớp học'), 'Archive UI must distinguish whole-class archive cards.');
assert.match(panel, /classItems\s*=\s*\[\]/,
  'Archive panel must accept whole-class items as a separate collection.');
assert.match(panel, /archive_kind:\s*['"]class['"]/,
  'Whole-class cards must have an explicit archive kind.');
assert.match(panel, /canManageClasses/,
  'Class archive mutations must be gated separately from attendance-history actions.');
assert.match(panel, /member_count[\s\S]*teacher_count[\s\S]*session_count/i,
  'Class cards must expose saved student, teacher and session counts.');

console.log('Extra-class archive governance contract: PASS');
