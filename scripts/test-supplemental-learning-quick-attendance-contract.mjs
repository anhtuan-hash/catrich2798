import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/supplementalAttendanceQuickBootstrap.js',import.meta.url),'utf8');
const bridge=await readFile(new URL('../src/supplementalSingleModalBridge.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/styles/SupplementalSingleModal.css',import.meta.url),'utf8');
const dailyScheduleSource=await readFile(new URL('../src/components/attendance/AttendanceDailySchedule.jsx',import.meta.url),'utf8');

for(const call of ['beginSupplementalAttendance','confirmSupplementalAttendance','attachSupplementalProof'])assert.ok(source.includes(call),`missing RPC client ${call}`);
assert.match(source,/canManageSupplementalLearning/,'supplemental rollcall must use the dedicated access guard');
assert.match(source,/bes-open-supplemental-attendance/,'native daily row must be able to launch the existing supplemental rollcall flow');
assert.match(source,/bes-supplemental-open-rollcall/,'class management action must be able to launch the same rollcall flow');
assert.doesNotMatch(source,/renderSection|bes-supplemental-daily-section|bes-supplemental-daily-card/,'quick bootstrap must no longer render a second standalone daily-card section');
assert.match(source,/attendance-session-proofs/,'proof uploads must use the existing attendance proof bucket');
assert.match(source,/present[\s\S]*tardy[\s\S]*absent/,'must expose all three attendance states');
assert.doesNotMatch(source,/teacher.*===.*runtime|runtime.*===.*teacher/i,'operator identity must not be matched to the instructional teacher');
assert.match(source,/beginSupplementalAttendance\(client\s*,\s*sessionId\)/,'begin/freeze must be server-authoritative');
assert.match(source,/confirmSupplementalAttendance\(client\s*,/,'confirmation must be server-authoritative');
const confirmAt=source.indexOf('confirmSupplementalAttendance(client');
const uploadAt=source.indexOf(".from('attendance-session-proofs').upload");
const attachAt=source.indexOf('attachSupplementalProof(client');
assert.ok(confirmAt>=0&&uploadAt>confirmAt&&attachAt>uploadAt,'proof path must be attached only after confirmation and successful object upload');
assert.match(source,/proofPath\s*:\s*''/,'confirmation must not persist a proof path before storage upload succeeds');
assert.match(source,/bes-supplemental-attendance-changed/,'rollcall must refresh the native daily schedule after confirmation');
assert.match(dailyScheduleSource,/data-bes-attendance-source=["']supplemental["']/,'native Attendance daily schedule owns supplemental row rendering');

for(const token of ['bes-supplemental-rollcall','bes-supplemental-rollcall-workspace','moveIntoAttendanceContent'])assert.ok(bridge.includes(token),`single-modal rollcall bridge missing ${token}`);
assert.match(bridge,/normalizeRollcall\(\)[\s\S]*?querySelectorAll\('\.bes-supplemental-backdrop'\)[\s\S]*?\.remove\(\)/,'rollcall bridge must remove the second backdrop');
assert.match(bridge,/normalizeRollcall\(\)[\s\S]*?stripNestedModalSemantics\(panel\)/,'rollcall bridge must strip nested dialog semantics');
assert.match(css,/#bes-supplemental-rollcall \.bes-supplemental-rollcall\.bes-supplemental-rollcall-workspace[\s\S]*?position:relative!important/,'rollcall must be inline inside Attendance content');
assert.match(css,/#bes-supplemental-rollcall\.bes-supplemental-workspace-host\{visibility:visible\}/,'rollcall host becomes visible only after it is embedded');

console.log('supplemental learning quick attendance contract: ok');
