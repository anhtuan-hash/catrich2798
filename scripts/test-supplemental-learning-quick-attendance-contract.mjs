import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const quick=await readFile(new URL('../src/supplementalAttendanceQuickBootstrap.js',import.meta.url),'utf8');
const shell=await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx',import.meta.url),'utf8');
const api=await readFile(new URL('../src/attendance/supplementalLearningApi.js',import.meta.url),'utf8');
const dailyScheduleSource=await readFile(new URL('../src/components/attendance/AttendanceDailySchedule.jsx',import.meta.url),'utf8');

for(const call of ['beginSupplementalAttendance','confirmSupplementalAttendance','attachSupplementalProof']){
  assert.ok(api.includes(`export async function ${call}`),`missing supplemental API client ${call}`);
  assert.ok(shell.includes(call),`native attendance surface must use ${call}`);
}
assert.match(shell,/canManageSupplementalLearning\(runtime\)/,'native supplemental rollcall must use the dedicated access guard');
assert.match(shell,/bes-open-supplemental-attendance/,'native daily row must launch the supplemental rollcall flow');
assert.match(shell,/bes-supplemental-open-rollcall/,'class management action must launch the same supplemental rollcall flow');
assert.match(shell,/beginSupplementalAttendance\(client\s*,\s*sessionId\)/,'begin/freeze must be server-authoritative');
assert.match(shell,/confirmSupplementalAttendance\(client\s*,/,'confirmation must be server-authoritative');
assert.match(shell,/ATTENDANCE_PROOF_BUCKET/,'proof uploads must reuse the canonical attendance proof bucket');
assert.match(shell,/attachSupplementalProof\(client\s*,\s*session\.id\s*,\s*proofPath\)/,'supplemental proof must be attached through the hardened supplemental API');
assert.match(shell,/bes-supplemental-attendance-changed/,'rollcall must refresh supplemental schedule/history after confirmation');
assert.match(shell,/ATTENDANCE_STATUS\.PRESENT[\s\S]*ATTENDANCE_STATUS\.LATE[\s\S]*ATTENDANCE_STATUS\.ABSENT|ATTENDANCE_STATUS\.ABSENT[\s\S]*ATTENDANCE_STATUS\.LATE/,'native rollcall must preserve present, late, and absent states');
assert.doesNotMatch(shell,/teacher.*===.*runtime|runtime.*===.*teacher/i,'operator identity must not be matched to the instructional teacher');

assert.match(dailyScheduleSource,/data-bes-attendance-source=["']supplemental["']/,'native Attendance daily schedule owns supplemental row rendering');
assert.match(dailyScheduleSource,/new CustomEvent\(SUPPLEMENTAL_OPEN_EVENT/,'supplemental daily rows must dispatch the native rollcall launch event');
assert.match(dailyScheduleSource,/canManageSupplementalLearning\(runtime\)/,'supplemental daily rows must be loaded only for the dedicated supplemental manager');

assert.doesNotMatch(quick,/beginSupplementalAttendance|confirmSupplementalAttendance|attachSupplementalProof/,'retired quick bootstrap must not own supplemental RPC calls');
assert.doesNotMatch(quick,/addEventListener|createElement|role="dialog"|bes-supplemental-rollcall/,'retired quick bootstrap must remain an inert compatibility module');

console.log('supplemental learning quick attendance contract: ok');
