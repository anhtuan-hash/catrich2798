import fs from 'node:fs';

const componentPath = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssPath = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);

let component = fs.readFileSync(componentPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const importNeedle = "} from '../utils/extraClassAttendance.js';\nimport {\n  giftedAssignmentForClass,";
const importReplacement = "} from '../utils/extraClassAttendance.js';\nimport { isExtraClassScheduledOnDate } from '../utils/extraClassSchedule2026.js';\nimport {\n  giftedAssignmentForClass,";
if (!component.includes("from '../utils/extraClassSchedule2026.js'")) {
  if (!component.includes(importNeedle)) throw new Error('Attendance schedule import anchor not found.');
  component = component.replace(importNeedle, importReplacement);
}

const mapNeedle = "                  const last = lastSessionByClass.get(String(classRow.id));\n                  return <button key={classRow.id} type=\"button\" className={String(selectedClassId) === String(classRow.id) ? 'is-selected' : ''} onClick={() => setSelectedClassId(classRow.id)}>";
const mapReplacement = "                  const last = lastSessionByClass.get(String(classRow.id));\n                  const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);\n                  return <button key={classRow.id} type=\"button\" className={`${String(selectedClassId) === String(classRow.id) ? 'is-selected ' : ''}${scheduledForDate ? '' : 'is-off-schedule'}`.trim()} title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}>";
if (!component.includes('const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);')) {
  if (!component.includes(mapNeedle)) throw new Error('Quick-attendance class-list anchor not found.');
  component = component.replace(mapNeedle, mapReplacement);
}

const dimmingCss = ".attendance-class-list button.is-off-schedule{opacity:.48;filter:saturate(.55);transition:opacity .16s ease,filter .16s ease}.attendance-class-list button.is-off-schedule:hover{opacity:.64;filter:saturate(.72)}.attendance-class-list button.is-off-schedule.is-selected{opacity:.56}";
if (!css.includes('.attendance-class-list button.is-off-schedule{')) {
  css = `${css.trim()}\n${dimmingCss}\n`;
}

fs.writeFileSync(componentPath, component);
fs.writeFileSync(cssPath, css);
console.log('Applied attendance schedule dimming patch.');
