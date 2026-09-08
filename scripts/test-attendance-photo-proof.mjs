import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const proofUtilityUrl = new URL('../src/utils/attendanceProofImage.js', import.meta.url);
const proofMigrationUrl = new URL('../supabase/migrations/20260908_attendance_photo_proof.sql', import.meta.url);
const proofAclMigrationUrl = new URL('../supabase/migrations/20260908_attendance_photo_proof_acl_hardening.sql', import.meta.url);

const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');

assert.ok(fs.existsSync(proofUtilityUrl), 'Attendance proof image utility must exist');
assert.ok(fs.existsSync(proofMigrationUrl), 'Attendance photo proof migration must exist');
assert.ok(fs.existsSync(proofAclMigrationUrl), 'Attendance photo proof ACL hardening migration must exist');

const proofUtility = fs.readFileSync(proofUtilityUrl, 'utf8');
const proofMigration = fs.readFileSync(proofMigrationUrl, 'utf8');
const proofAclMigration = fs.readFileSync(proofAclMigrationUrl, 'utf8');

assert.match(attendance, /proof_path/, 'Attendance sessions must load proof_path');
assert.match(attendance, /Minh chứng hình ảnh/, 'Quick attendance and History must label photo evidence clearly');
assert.match(attendance, /Không bắt buộc/, 'Photo evidence must be explicitly optional');
assert.match(attendance, /accept=["']image\/\*["']/, 'Photo picker must accept images');
assert.match(attendance, /capture=["']environment["']/, 'Mobile photo picker must request the rear camera');
assert.match(attendance, /prepareAttendanceProofImage/, 'Quick attendance must compress the selected image before upload');
assert.match(attendance, /ATTENDANCE_PROOF_BUCKET/, 'Attendance UI must use the dedicated private proof bucket');
assert.match(attendance, /bes_set_extra_attendance_proof/, 'Attendance UI must attach uploaded proof to its session through the secure RPC');
assert.match(attendance, /createSignedUrl/, 'History must use a short-lived signed URL for private proof images');
assert.match(attendance, /\.remove\(/, 'Delete flows must remove stored proof objects');

assert.match(proofUtility, /ATTENDANCE_PROOF_BUCKET\s*=\s*['"]attendance-session-proofs['"]/, 'Proof utility must name the private bucket');
assert.match(proofUtility, /ATTENDANCE_PROOF_MAX_EDGE\s*=\s*1600/, 'Proof utility must cap image dimensions at 1600px');
assert.match(proofUtility, /ATTENDANCE_PROOF_MAX_BYTES\s*=\s*1_500_000/, 'Proof utility must target at most 1.5 MiB before upload');
assert.match(proofUtility, /image\/jpeg/, 'Proof utility must encode compressed JPEG images');

assert.match(proofMigration, /add column if not exists proof_path\s+text/i, 'Attendance session schema must have nullable proof_path');
assert.match(proofMigration, /attendance-session-proofs/, 'Migration must create the attendance proof bucket');
assert.match(proofMigration, /public\s*,\s*file_size_limit[\s\S]*false\s*,\s*2097152/i, 'Attendance proof bucket must remain private with a 2 MiB limit');
assert.match(proofMigration, /can_take_extra_class_attendance\(\)/, 'Storage insert/attach policy must require Quick Attendance permission');
assert.match(proofMigration, /can_view_extra_attendance_proof\(\)/, 'Private proof reads must use the History-specific permission helper');
assert.match(proofMigration, /attendance:history/, 'History proof access must require the explicit History permission');
assert.match(proofMigration, /bes_set_extra_attendance_proof/, 'Migration must expose the secure proof attachment RPC');
assert.match(proofMigration, /session_status\s*=\s*'completed'/, 'Proof attachment must only target completed attendance sessions');

assert.match(proofAclMigration, /revoke\s+execute\s+on\s+function\s+public\.can_view_extra_attendance_proof\(\)\s+from\s+anon/i, 'History proof helper must explicitly revoke anon execution');
assert.match(proofAclMigration, /revoke\s+execute\s+on\s+function\s+public\.bes_set_extra_attendance_proof\(uuid\s*,\s*text\)\s+from\s+anon/i, 'Proof attachment RPC must explicitly revoke anon execution');
assert.match(proofAclMigration, /grant\s+execute\s+on\s+function\s+public\.can_view_extra_attendance_proof\(\)\s+to\s+authenticated/i, 'History proof helper must remain executable by signed-in users');
assert.match(proofAclMigration, /grant\s+execute\s+on\s+function\s+public\.bes_set_extra_attendance_proof\(uuid\s*,\s*text\)\s+to\s+authenticated/i, 'Proof attachment RPC must remain executable by signed-in users');

assert.match(css, /att-m3-proof-card/, 'Quick attendance proof card must have dedicated Material 3 styling');
assert.match(css, /attendance-history-proof/, 'History proof viewer must have dedicated styling');

console.log('Attendance optional private photo-proof contract OK');
