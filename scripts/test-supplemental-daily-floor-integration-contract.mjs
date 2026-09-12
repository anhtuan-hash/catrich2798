import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isExtraClassScheduledOnDate } from '../src/utils/extraClassSchedule2026.js';

const scheduleSource = await readFile(new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url), 'utf8');
const nativeRollcallSource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const quickSource = await readFile(new URL('../src/supplementalAttendanceQuickBootstrap.js', import.meta.url), 'utf8');

assert.match(scheduleSource, /loadSupplementalAttendanceActivities/, 'native daily schedule must load Học bổ sung activities for the selected day');
assert.match(scheduleSource, /supplementalActivities/, 'native daily schedule must keep Học bổ sung activities as first-class rows');
assert.match(scheduleSource, /canManageSupplementalLearning/, 'native daily schedule must hide supplemental rows from accounts outside the dedicated manager rule');
assert.match(scheduleSource, /supplementalKind\s*!==\s*['"]adhoc['"]/, 'legacy adhoc sessions must stay out of the current daily class schedule');
assert.doesNotMatch(scheduleSource, /Nhóm dài ngày|Phát sinh/, 'native daily rows must use the class-centric vocabulary');
assert.match(scheduleSource, /Lớp học bổ sung/, 'native supplemental row must identify the current class model');
assert.match(scheduleSource, /data-bes-attendance-source=["']supplemental["']/, 'Học bổ sung must render with the native row layout instead of a separate card section');
assert.match(scheduleSource, /attendanceFloorForRoom\([^)]*(?:supplemental|activity|row)[^)]*\)/i, 'Học bổ sung rooms must participate in the same floor grouping as Phụ đạo/Bồi dưỡng');
assert.match(scheduleSource, /sortAttendanceRoomLabels\([\s\S]{0,500}supplementalActivities/i, 'Học bổ sung rooms must participate in the native room filter options');
assert.match(scheduleSource, /visible(?:Rows|Activities|Items)\.length/, 'summary totals must count the combined visible daily rows');
assert.match(scheduleSource, /bes-supplemental-open-rollcall/, 'clicking a native Học bổ sung row must dispatch the native React rollcall event');
assert.doesNotMatch(scheduleSource, /bes-open-supplemental-attendance/, 'the daily Học bổ sung row must never dispatch the retired legacy rollcall event');
assert.match(scheduleSource, /bes-supplemental-attendance-changed/, 'native daily schedule must refresh after supplemental attendance/admin changes');

// Opening supplemental rollcall injects a temporary `supplemental:*` class into the shared
// classes state. AttendanceDailySchedule also loads the real supplemental activity, so the
// native extra-class scheduler must reject that temporary class or the UI shows a fake
// “Phụ đạo” row beside the real “Học bổ sung” row.
assert.equal(isExtraClassScheduledOnDate({
  id: 'supplemental:group-abc',
  class_type: 'supplemental',
  class_name: 'abc',
  subject: 'Toán',
  room: 'A101',
  active: true,
}, '2026-09-12'), false, 'synthetic supplemental rollcall classes must never enter the native extra-class daily schedule');
assert.equal(isExtraClassScheduledOnDate({
  id: 'supplemental:group-abc-without-type',
  class_name: 'abc',
  subject: 'Toán',
  room: 'A101',
  active: true,
}, '2026-09-12'), false, 'supplemental:* ids must be rejected even if class_type is missing');
assert.equal(isExtraClassScheduledOnDate({
  id: 'imported-unknown-extra-class',
  class_type: 'remedial',
  class_name: 'Lớp nhập ngoài danh mục',
  subject: 'Môn khác',
  active: true,
}, '2026-09-12'), true, 'ordinary unknown/imported extra classes must keep the existing permissive scheduling behavior');

assert.match(nativeRollcallSource, /window\.addEventListener\(['"]bes-supplemental-open-rollcall['"]\s*,\s*openSupplementalRollcall\)/, 'native React rollcall must listen for the daily supplemental row click');
assert.match(nativeRollcallSource, /canManageSupplementalLearning\(runtime\)/, 'native supplemental rollcall bridge must stay behind the dedicated manager guard');
assert.match(nativeRollcallSource, /bes-supplemental-attendance-changed/, 'native supplemental rollcall must notify the daily schedule after confirmation or cancellation');

// A confirmed/cancelled Học bổ sung session must refresh both history sources immediately.
// This protects the production flow from calling a stale/undefined `loadHistory` helper after
// the RPC already succeeded, which otherwise leaves Lịch sử empty until the whole view reloads.
assert.doesNotMatch(nativeRollcallSource, /await\s+loadHistory\s*\(\s*\)/, 'supplemental rollcall must not call the removed undefined loadHistory helper');
assert.match(nativeRollcallSource, /async function refreshHistoryData\s*\(\s*\)/, 'native attendance must define a dedicated history refresh helper');
assert.match(nativeRollcallSource, /refreshHistoryData[\s\S]{0,2600}bes_extra_attendance_sessions/, 'history refresh must reload native attendance sessions');
assert.match(nativeRollcallSource, /refreshHistoryData[\s\S]{0,2600}bes_list_supplemental_history/, 'history refresh must reload Học bổ sung history');
assert.match(nativeRollcallSource, /confirmSupplementalSharedAttendance[\s\S]{0,7000}await\s+refreshHistoryData\s*\(\s*\)/, 'confirming Học bổ sung must refresh history immediately');
assert.match(nativeRollcallSource, /if\s*\(attendanceSource\s*===\s*['"]supplemental['"]\)[\s\S]{0,2400}await\s+refreshHistoryData\s*\(\s*\)/, 'cancelling Học bổ sung must refresh history immediately');

assert.doesNotMatch(quickSource, /addEventListener|createElement|bes-supplemental-daily-section|bes-supplemental-daily-grid|bes-supplemental-daily-card/, 'retired quick bootstrap must remain inert and must not render/listen for a second supplemental flow');
assert.doesNotMatch(quickSource, /Nhóm dài ngày|Phát sinh/, 'retired bootstrap must not reintroduce supplemental legacy UI concepts');

console.log('supplemental daily floor integration contract: ok');
