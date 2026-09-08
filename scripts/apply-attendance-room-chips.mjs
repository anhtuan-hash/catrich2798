import fs from 'node:fs';

const componentPath = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssPath = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);

let component = fs.readFileSync(componentPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const importNeedle = "import { isExtraClassScheduledOnDate } from '../utils/extraClassSchedule2026.js';";
const importReplacement = "import { isExtraClassScheduledOnDate, roomForExtraClass } from '../utils/extraClassSchedule2026.js';";
if (!component.includes('roomForExtraClass')) {
  if (!component.includes(importNeedle)) throw new Error('Attendance room helper import anchor not found.');
  component = component.replace(importNeedle, importReplacement);
}

const listNeedle = "                  const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);\n                  return <button key={classRow.id} type=\"button\" className={`${String(selectedClassId) === String(classRow.id) ? 'is-selected ' : ''}${scheduledForDate ? '' : 'is-off-schedule'}`.trim()} title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}><span className={`attendance-type-dot is-${classRow.class_type}`} /><div><b>{classRow.class_name}</b><small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small><em>{teachersForClass(classRow)}</em></div><span className=\"attendance-count\">{memberCounts.get(String(classRow.id)) || 0}</span>{last ? <time>{formatDate(last.attendance_date)}</time> : <time>Chưa điểm danh</time>}</button>;";
const listReplacement = "                  const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);\n                  const room = roomForExtraClass(classRow);\n                  return <button key={classRow.id} type=\"button\" className={`${String(selectedClassId) === String(classRow.id) ? 'is-selected ' : ''}${scheduledForDate ? '' : 'is-off-schedule'}`.trim()} title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}><span className={`attendance-type-dot is-${classRow.class_type}`} /><div><div className=\"attendance-class-name-row\"><b>{classRow.class_name}</b>{room ? <span className=\"attendance-room-chip\">{room}</span> : null}</div><small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small><em>{teachersForClass(classRow)}</em></div><span className=\"attendance-count\">{memberCounts.get(String(classRow.id)) || 0}</span>{last ? <time>{formatDate(last.attendance_date)}</time> : <time>Chưa điểm danh</time>}</button>;";
if (!component.includes('const room = roomForExtraClass(classRow);')) {
  if (!component.includes(listNeedle)) throw new Error('Attendance class-list room chip anchor not found.');
  component = component.replace(listNeedle, listReplacement);
}

const headerNeedle = "                  <header className=\"attendance-rollcall-head\"><div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><h2>{selectedClass.class_name}</h2><p>{selectedClass.subject || 'Chưa ghi môn'} · GV phân công: {teachersForClass(selectedClass)}</p></div>";
const headerReplacement = "                  <header className=\"attendance-rollcall-head\"><div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><div className=\"attendance-rollcall-title-row\"><h2>{selectedClass.class_name}</h2>{roomForExtraClass(selectedClass) ? <span className=\"attendance-room-chip is-large\">{roomForExtraClass(selectedClass)}</span> : null}</div><p>{selectedClass.subject || 'Chưa ghi môn'} · GV phân công: {teachersForClass(selectedClass)}</p></div>";
if (!component.includes('attendance-rollcall-title-row')) {
  if (!component.includes(headerNeedle)) throw new Error('Selected attendance class room chip anchor not found.');
  component = component.replace(headerNeedle, headerReplacement);
}

const roomCss = '.attendance-class-name-row{display:flex;align-items:center;gap:6px;min-width:0}.attendance-class-name-row>b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attendance-room-chip{display:inline-flex;align-items:center;justify-content:center;flex:none;min-height:20px;padding:2px 7px;border-radius:999px;background:var(--att-m3-primary-container);color:var(--att-m3-primary);font-size:9px;font-weight:900;letter-spacing:.04em;line-height:1}.attendance-room-chip.is-large{min-height:24px;padding:3px 9px;font-size:10px}.attendance-rollcall-title-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.attendance-rollcall-title-row h2{margin-right:0!important}';
if (!css.includes('.attendance-room-chip{')) css = `${css.trim()}\n${roomCss}\n`;

fs.writeFileSync(componentPath, component);
fs.writeFileSync(cssPath, css);
console.log('Applied attendance room chips.');
