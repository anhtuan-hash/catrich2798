import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx');
const indexPath = path.join(root, 'index.html');
const contractPath = path.join(root, 'scripts/test-attendance-history-visual-redesign.mjs');

let component = fs.readFileSync(componentPath, 'utf8');

const importAnchor = "import AttendanceDailySchedule from './attendance/AttendanceDailySchedule.jsx';";
if (!component.includes(importAnchor)) throw new Error('AttendanceDailySchedule import anchor not found');
if (!component.includes("AttendanceHistoryAuditPanel from './attendance/AttendanceHistoryAuditPanel.jsx'")) {
  component = component.replace(importAnchor, `${importAnchor}\nimport AttendanceHistoryAuditPanel from './attendance/AttendanceHistoryAuditPanel.jsx';`);
}

const oldSessionColumns = "checked_at,checked_by,total_students";
if (!component.includes(oldSessionColumns) && !component.includes('checked_at,checked_by,checked_by_name,total_students')) {
  throw new Error('SESSION_COLUMNS checked_by anchor not found');
}
component = component.replace(oldSessionColumns, 'checked_at,checked_by,checked_by_name,total_students');

const auditBlock = /\s*<section className="ahv3__audit-actor-panel" aria-label="Nhật ký người thao tác">[\s\S]*?<\/section>\s*(?=\{selectedSession\.session_status === 'cancelled')/;
if (!auditBlock.test(component)) throw new Error('Current inline History audit panel not found');
component = component.replace(auditBlock, '\n                <AttendanceHistoryAuditPanel client={client} session={selectedSession} />\n                ');

if (!component.includes('<AttendanceHistoryAuditPanel client={client} session={selectedSession} />')) throw new Error('React audit component was not wired');
fs.writeFileSync(componentPath, component);

let indexHtml = fs.readFileSync(indexPath, 'utf8');
const bootstrapTag = '    <script type="module" src="/src/attendanceAuditActorsBootstrap.js"></script>\n';
if (!indexHtml.includes(bootstrapTag)) throw new Error('Audit bootstrap script tag not found');
indexHtml = indexHtml.replace(bootstrapTag, '');
if (indexHtml.includes('attendanceAuditActorsBootstrap.js')) throw new Error('Audit bootstrap still loaded from index.html');
fs.writeFileSync(indexPath, indexHtml);

let contract = fs.readFileSync(contractPath, 'utf8');
if (!contract.includes("const auditComponent = read('src/components/attendance/AttendanceHistoryAuditPanel.jsx');")) {
  contract = contract.replace(
    "const component = read('src/components/GlobalAttendanceNavigationTab.jsx');",
    "const component = read('src/components/GlobalAttendanceNavigationTab.jsx');\nconst auditComponent = read('src/components/attendance/AttendanceHistoryAuditPanel.jsx');",
  );
}
contract = contract
  .replace("assert.match(component, /className=\"ahv3__audit-actor-panel\"/, 'Audit actor panel must be React-owned');", "assert.match(component, /<AttendanceHistoryAuditPanel client=\{client\} session=\{selectedSession\} \/>/, 'History detail must render the React-owned audit panel');\nassert.match(auditComponent, /className=\{`ahv3__audit-actor-panel/, 'Audit actor panel must be React-owned and namespaced');")
  .replace("assert.match(component, /attendanceAuditForSession/, 'History React must reuse the shared audit grouping model');", "assert.match(auditComponent, /attendanceAuditForSession/, 'History React audit component must reuse the shared audit grouping model');")
  .replace("assert.match(component, /describeAttendanceAuditItem/, 'History React must reuse the shared audit item description model');", "assert.match(auditComponent, /describeAttendanceAuditItem/, 'History React audit component must reuse the shared audit item description model');")
  .replace("assert.match(component, /bes_extra_attendance_record_changes/, 'History React must query attendance record changes for the selected session');", "assert.match(auditComponent, /bes_extra_attendance_record_changes/, 'History React audit component must query attendance record changes for the selected session');")
  .replace("assert.match(component, /checked_by_name/, 'History React must render the stored check-in actor name when available');", "assert.match(component, /checked_by_name/, 'History session query must include the stored check-in actor name');\nassert.match(auditComponent, /checked_by_name/, 'History React audit component must render the stored check-in actor name when available');")
  .replace("assert.doesNotMatch(component, /attendance-audit-/, 'History React must not depend on legacy audit DOM classes');", "assert.doesNotMatch(component, /attendance-audit-/, 'History shell must not depend on legacy audit DOM classes');\nassert.doesNotMatch(auditComponent, /attendance-audit-/, 'History React audit component must not depend on legacy audit DOM classes');");
fs.writeFileSync(contractPath, contract);

console.log('Wired React-owned Attendance History audit panel and removed MutationObserver bootstrap.');
