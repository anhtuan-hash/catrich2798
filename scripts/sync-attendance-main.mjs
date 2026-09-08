import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Không tìm thấy vùng đồng bộ: ${label}`);
  return source.replace(before, after);
}

const componentPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
let component = fs.readFileSync(componentPath, 'utf8');

component = replaceOnce(
  component,
  "} from '../utils/extraClassAttendance.js';\nimport {\n  giftedAssignmentForClass,",
  "} from '../utils/extraClassAttendance.js';\nimport { isExtraClassScheduledOnDate, roomForExtraClass } from '../utils/extraClassSchedule2026.js';\nimport {\n  giftedAssignmentForClass,",
  'schedule import',
);

const oldClassRender = `                <div>{filteredActiveClasses.map((classRow) => {\n                  const last = lastSessionByClass.get(String(classRow.id));\n                  const subjectKey = attendanceSubjectKey(classRow.subject);\n                  return <button key={classRow.id} type="button" className={\`is-subject-\${subjectKey} \${String(selectedClassId) === String(classRow.id) ? 'is-selected' : ''}\`} onClick={() => setSelectedClassId(classRow.id)}><span className={\`attendance-type-dot is-\${classRow.class_type}\`} /><div><b>{classRow.class_name}</b><small>{extraClassTypeLabel(classRow.class_type)} · <span className="attendance-subject-chip">{classRow.subject || 'Chưa ghi môn'}</span></small><em>{teachersForClass(classRow)}</em></div><span className="attendance-count">{memberCounts.get(String(classRow.id)) || 0}</span>{last ? <time>{formatDate(last.attendance_date)}</time> : <time>Chưa điểm danh</time>}</button>;\n                })}`;
const newClassRender = `                <div>{filteredActiveClasses.map((classRow) => {\n                  const last = lastSessionByClass.get(String(classRow.id));\n                  const subjectKey = attendanceSubjectKey(classRow.subject);\n                  const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);\n                  const room = roomForExtraClass(classRow);\n                  return <button key={classRow.id} type="button" className={\`is-subject-\${subjectKey} \${String(selectedClassId) === String(classRow.id) ? 'is-selected ' : ''}\${scheduledForDate ? '' : 'is-off-schedule'}\`.trim()} title={scheduledForDate ? undefined : \`Không có lịch học ngày \${formatDate(attendanceDate)}\`} onClick={() => setSelectedClassId(classRow.id)}><span className={\`attendance-type-dot is-\${classRow.class_type}\`} /><div><div className="attendance-class-name-row"><b>{classRow.class_name}</b>{room ? <span className="attendance-room-chip">{room}</span> : null}</div><small>{extraClassTypeLabel(classRow.class_type)} · <span className="attendance-subject-chip">{classRow.subject || 'Chưa ghi môn'}</span></small><em>{teachersForClass(classRow)}</em></div><span className="attendance-count">{memberCounts.get(String(classRow.id)) || 0}</span>{last ? <time>{formatDate(last.attendance_date)}</time> : <time>Chưa điểm danh</time>}</button>;\n                })}`;
component = replaceOnce(component, oldClassRender, newClassRender, 'quick class schedule rendering');

const oldHeader = `<header className="attendance-rollcall-head"><div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><h2>{selectedClass.class_name}</h2><p>{selectedClass.subject || 'Chưa ghi môn'} · GV phân công: {teachersForClass(selectedClass)}</p></div><div className="attendance-summary">`;
const newHeader = `<header className="attendance-rollcall-head"><div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><div className="attendance-rollcall-title-row"><h2>{selectedClass.class_name}</h2>{roomForExtraClass(selectedClass) ? <span className="attendance-room-chip is-large">{roomForExtraClass(selectedClass)}</span> : null}</div><p>{selectedClass.subject || 'Chưa ghi môn'} · GV phân công: {teachersForClass(selectedClass)}</p></div><div className="attendance-summary">`;
component = replaceOnce(component, oldHeader, newHeader, 'room chip header');
fs.writeFileSync(componentPath, component);

const cssPath = 'src/components/attendance/AttendanceMaterial3.css';
let css = fs.readFileSync(cssPath, 'utf8');
const scheduleCss = `\n.attendance-class-list button.is-off-schedule{opacity:.48;filter:saturate(.55);transition:opacity .16s ease,filter .16s ease}.attendance-class-list button.is-off-schedule:hover{opacity:.64;filter:saturate(.72)}.attendance-class-list button.is-off-schedule.is-selected{opacity:.56}\n.attendance-class-name-row{display:flex;align-items:center;gap:6px;min-width:0}.attendance-class-name-row>b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attendance-room-chip{display:inline-flex;align-items:center;justify-content:center;flex:none;min-height:20px;padding:2px 7px;border-radius:999px;background:var(--att-m3-primary-container);color:var(--att-m3-primary);font-size:9px;font-weight:900;letter-spacing:.04em;line-height:1}.attendance-room-chip.is-large{min-height:24px;padding:3px 9px;font-size:10px}.attendance-rollcall-title-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.attendance-rollcall-title-row h2{margin-right:0!important}\n`;
if (!css.includes('.attendance-class-list button.is-off-schedule{')) css += scheduleCss;
fs.writeFileSync(cssPath, css);

console.log('Synced schedule dimming and room chip into attendance feature branch.');
