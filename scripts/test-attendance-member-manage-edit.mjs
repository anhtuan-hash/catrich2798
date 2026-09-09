import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const component = fs.readFileSync('src/components/attendance/AttendanceClassEditor.jsx', 'utf8');
const parent = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const migrationsDir = 'supabase/migrations';
const attendanceMemberMigrations = fs.readdirSync(migrationsDir)
  .filter((name) => /attendance.*member.*status/i.test(name))
  .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
  .join('\n');

assert.match(parent, /canManageMembers=\{canAccessAttendanceView\('manage'\)\}/, 'Parent must pass Manage-tab capability to member editor');
assert.match(component, /canManageMembers\s*=\s*false/, 'Member editor must accept a Manage-tab capability prop');
assert.match(component, /active:\s*member\?\.active\s*!==\s*false/, 'Member edit form must carry the current active status');
assert.match(component, /<select[^>]*value=\{memberForm\.active\s*\?\s*'active'\s*:\s*'inactive'\}/, 'Member edit UI must expose a status selector');
assert.match(component, />Đang học<\/option>/, 'Status selector must include Đang học');
assert.match(component, />Đã nghỉ<\/option>/, 'Status selector must include Đã nghỉ');
assert.match(component, /client\.rpc\('bes_update_extra_class_member'/, 'Member editor must use the Manage-authorized RPC');
assert.match(component, /p_active:\s*Boolean\(memberForm\.active\)/, 'Member RPC call must persist status');
assert.match(component, /canManageMembers\s*\?\s*<button[^>]*onClick=\{\(\)\s*=>\s*startEditMember\(member\)\}/s, 'Every Manage-authorized user must see Edit student');
assert.doesNotMatch(component, /if \(!isAdmin \|\| !member \|\| member\.active === false/, 'Inactive students must remain editable so they can be reactivated');

assert.match(attendanceMemberMigrations, /create\s+or\s+replace\s+function\s+public\.bes_update_extra_class_member\s*\([\s\S]*?p_active\s+boolean/i, 'Migration must define the status-aware member update RPC');
assert.match(attendanceMemberMigrations, /attendance:manage/, 'RPC permission check must recognize the Manage attendance grant');
assert.match(attendanceMemberMigrations, /route:attendance/, 'RPC permission check must preserve legacy Attendance grants');
assert.match(attendanceMemberMigrations, /grant\s+execute\s+on\s+function\s+public\.bes_update_extra_class_member[\s\S]*?to\s+authenticated/i, 'RPC must be executable by authenticated users after its own permission check');
assert.match(attendanceMemberMigrations, /left_at\s*=\s*case[\s\S]*?p_active[\s\S]*?clock_timestamp\(\)/i, 'Changing to Đã nghỉ must timestamp the leave event');

console.log('PASS: Manage-tab users can edit student identity and active status.');
