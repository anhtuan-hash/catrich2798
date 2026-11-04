import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStudentAttendanceReport } from '../src/utils/studentAttendanceReport.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const report = read('src/components/attendance/StudentAttendanceReport.jsx');
const profile = read('src/components/attendance/StudentAttendanceProfile.jsx');
const css = read('src/components/attendance/StudentAttendanceProfile.css');
const parent = read('src/components/attendance/AttendanceMonthlyReport.jsx');
const translations = read('src/utils/legacySiteTranslations.js');

function check(name, callback) { callback(); console.log('✓ '+name); }

check('Student View uses a full-page profile instead of the old modal', () => {
  assert.match(report, /import StudentAttendanceProfile/);
  assert.match(report, /<StudentAttendanceProfile student=\{selected\}/);
  assert.match(report, /onClick=\{\(\)=>openProfile\(s\)\}/);
  assert.doesNotMatch(report, /stud-att__overlay/);
  assert.doesNotMatch(report, /stud-att__dialog/);
  assert.doesNotMatch(report, /aria-modal="true"/);
  assert.match(profile, /<main className="stud-att-profile"/);
  assert.doesNotMatch(profile, /role="dialog"|aria-modal/);
  assert.match(css, /position:relative/);
  assert.doesNotMatch(css, /\.stud-att-profile\s*\{[^}]*position:\s*fixed/);
});

check('Existing privacy-scoped data aggregation and exporters are preserved', () => {
  assert.match(report, /buildStudentAttendanceReport/);
  assert.match(report, /downloadStudentAttendanceExcel\(\[selected\],params\)/);
  assert.match(report, /printStudentAttendancePdf\(\[selected\],params\)/);
  assert.match(parent, /<StudentAttendanceReport client=\{client\}/);
  assert.match(profile, /from, to, loading=false/);
  assert.match(profile, /student\.subjectRows/);
  assert.match(profile, /student\.monthRows/);
  assert.match(profile, /student\.details/);
  assert.match(profile, /student\.excusedCount/);
  assert.match(profile, /student\.unexcusedCount/);
});

check('Back navigation preserves report filters and scroll position', () => {
  assert.match(report, /reportScrollY\.current=window\.scrollY/);
  assert.match(report, /setSelectedStudent\(''\)/);
  assert.match(report, /window\.scrollTo\(\{top:reportScrollY\.current/);
  assert.match(report, /window\.addEventListener\('popstate'/);
  assert.match(report, /window\.addEventListener\('hashchange'/);
  assert.match(report, /function changeProfileMonth/);
  assert.match(profile, /type="month"/);
  assert.match(profile, /onBack/);
});

check('Display matches collage layout with usable actions and responsive states', () => {
  for (const selector of ['sap-paper-head','sap-avatar','sap-metrics','sap-charts','sap-absence',
    'sap-history','sap-note','sap-export','sap-backline']) {
    assert.ok(css.includes('.'+selector), 'Missing CSS '+selector);
    assert.ok(profile.includes(selector), 'Missing markup '+selector);
  }
  assert.match(css, /@media\(max-width:750px\)/);
  assert.match(css, /@media\(max-width:1070px\)/);
  assert.match(css, /@media print/);
  assert.match(profile, /onExcel/);
  assert.match(profile, /onPdf/);
  assert.match(profile, /navigator\.share/);
  assert.match(profile, /navigator\.clipboard/);
  assert.match(profile, /aria-label/);
});

check('Totals are derived from completed sessions without fabricated attendance', () => {
  const fixtures = [
    {id:'s1',class_id:'x',class_name:'Bồi dưỡng Hóa học 11',class_type:'gifted',subject:'Hóa học',teacher_name:'GV A',attendance_date:'2026-11-02',lesson_periods:2,session_status:'completed'},
    {id:'s2',class_id:'x',class_name:'Bồi dưỡng Hóa học 11',class_type:'gifted',subject:'Hóa học',teacher_name:'GV A',attendance_date:'2026-11-03',lesson_periods:2,session_status:'cancelled'},
  ];
  const records = [
    {id:'r1',session_id:'s1',student_full_name:'Sample Student',school_class_name:'11.2',status:'absent',absence_reason_code:'unexcused'},
    {id:'r2',session_id:'s2',student_full_name:'Sample Student',school_class_name:'11.2',status:'present'},
  ];
  const student = buildStudentAttendanceReport({sessions:fixtures,records}).students[0];
  assert.equal(student.totalPeriods,2);
  assert.equal(student.presentPeriods,0);
  assert.equal(student.absentPeriods,2);
  assert.equal(student.rate,0);
  assert.equal(student.details.length,1);
  assert.equal(student.subjectRows.length,1);
});

check('Language audit includes required student profile strings', () => {
  for (const label of ['Quay lại báo cáo điểm danh','Mã học sinh:','Chuyên cần theo môn học','Lý do / Ghi chú','Chia sẻ bản tóm tắt']) {
    assert.ok(translations.includes('"'+label+'"'), 'Missing translation for '+label);
  }
});

console.log('PASS: full-page attendance profile design, navigation, data integrity and exporter contracts.');
