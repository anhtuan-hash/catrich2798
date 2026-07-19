import fs from 'node:fs';
import {
  buildRegularAssessmentScoreMap,
  calculateRegularStudentAverage,
  getRegularAssessmentRounds,
  regularScoreKey,
  saveRegularAssessmentRound,
} from '../src/utils/regularAssessment.js';

const component = fs.readFileSync('src/components/RegularAssessmentGradebook.jsx', 'utf8');
const host = fs.readFileSync('src/components/HomeroomPhase2Tabs.jsx', 'utf8');
const css = fs.readFileSync('src/styles/homeroom-regular-gradebook-v1167.css', 'utf8');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const workspace = {
  semester: 'Học kỳ I',
  students: [
    { id: 's1', code: '01', fullName: 'Nguyễn An', active: true },
    { id: 's2', code: '02', fullName: 'Trần Bình', active: true },
  ],
  learningRecords: [],
  gradeSettings: { lockedPeriods: [] },
};
const rounds = getRegularAssessmentRounds(workspace);
add('Có đúng bốn đợt', rounds.length === 4 && rounds.every((round, index) => round.name === `Đợt ${index + 1}`));
add('Mỗi đợt có nhiều cột mặc định', rounds.every((round) => round.columns.length >= 2));

const scoreMap = {
  [regularScoreKey(1, 's1', rounds[0].columns[0].id)]: '8',
  [regularScoreKey(1, 's1', rounds[0].columns[1].id)]: '6',
  [regularScoreKey(1, 's2', rounds[0].columns[0].id)]: '9',
  [regularScoreKey(1, 's2', rounds[0].columns[1].id)]: '7',
};
const saved = saveRegularAssessmentRound(workspace, {
  round: 1,
  rounds,
  students: workspace.students,
  scoreMap,
  subject: 'Tiếng Anh',
  period: 'Học kỳ I',
  teacherName: 'Tuấn Nguyễn Anh',
  recordedAt: '2026-07-19',
});
add('Lưu hàng loạt toàn lớp', saved.learningRecords.length === 4);
add('Lưu metadata đợt và cột', saved.learningRecords.every((record) => record.assessmentType === 'regular' && record.assessmentRound === 1 && record.assessmentColumnId));
const loadedMap = buildRegularAssessmentScoreMap(saved, { subject: 'Tiếng Anh', period: 'Học kỳ I', rounds });
add('Nạp lại đúng điểm đã lưu', loadedMap[regularScoreKey(1, 's1', rounds[0].columns[0].id)] === '8');
add('Trung bình cộng các cột đúng', calculateRegularStudentAverage(loadedMap, 1, 's1', rounds[0].columns) === 7);
const clearedMap = { ...loadedMap, [regularScoreKey(1, 's1', rounds[0].columns[0].id)]: '' };
const cleared = saveRegularAssessmentRound(saved, { round: 1, rounds, students: workspace.students, scoreMap: clearedMap, subject: 'Tiếng Anh', period: 'Học kỳ I' });
add('Xóa ô rồi lưu sẽ xóa bản ghi tương ứng', cleared.learningRecords.length === 3);

add('Form cũ đã được thay bằng sổ điểm', host.includes('<RegularAssessmentGradebook') && !host.includes('<h2>Thêm kết quả đánh giá</h2>'));
add('Bảng hiển thị toàn bộ danh sách lớp', component.includes('students.map((student, index)') && component.includes('hr-regular-table'));
add('Có thêm và xóa cột động', component.includes('addColumn') && component.includes('removeColumn'));
add('Có lưu đợt và lưu cả bốn đợt', component.includes('Lưu Đợt') && component.includes('Lưu cả 4 đợt'));
add('Có trung bình học sinh và trung bình lớp', component.includes('calculateRegularStudentAverage') && component.includes('columnAverages'));
add('Có bảng cuộn và header/cột cố định', css.includes('overflow:auto') && css.includes('position:sticky'));
add('Có dark mode và responsive', css.includes('html[data-theme="dark"]') && css.includes('@media(max-width:760px)'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));
if (failed.length) {
  console.error(`\n❌ Regular gradebook audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Regular gradebook audit PASS (${checks.length}/${checks.length})`);
