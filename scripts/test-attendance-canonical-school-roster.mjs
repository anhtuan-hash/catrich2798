import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/components/attendance/AttendanceClassManagementRosterScroll.css',import.meta.url),'utf8');
// Extra classes must not automatically enroll the entire homeroom class.
// Staff deliberately select from the approved/assigned canonical school roster.
assert.match(source,/client\.rpc\('get_my_assigned_school_classes'\)/);
assert.match(source,/student\?\.active !== false/);
assert.match(source,/student\?\.lifecycleStatus !== 'deleted'/);
assert.match(source,/schoolStudentQuery/);
assert.match(source,/setAddForm\?\.\(\(current\) => \(\{/);
assert.match(source,/student_code: student.code/);
assert.match(source,/student_full_name: student.fullName/);
assert.match(source,/school_class_name: student.className/);
assert.match(source,/type="button" onClick=\{\(\) => \{/);
assert.match(css,/attendance-school-student-lookup__results/);
console.log('Extra class roster picker uses the authorized main-school student list: PASS');
