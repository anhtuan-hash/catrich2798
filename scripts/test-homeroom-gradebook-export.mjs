import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {
  buildClassGradebookWorkbook,
  buildGradeExportColumns,
  buildStudentGradeReportWorkbook,
  gradeExportValue,
  gradeRoundScore,
} from '../src/utils/homeroomGradebookExport.js';
import { createXlsxBlob } from '../src/utils/xlsxExport.js';

const students = [
  { id: 'student-1', code: '11A4-01', fullName: 'Nguyễn Minh Anh', active: true },
  { id: 'student-2', code: '11A4-02', fullName: 'Trần Gia Bảo', active: true },
];

const makeRound = (index) => ({
  id: `round-${index}`,
  columns: [
    { id: `r${index}-a`, label: 'Lần 1' },
    { id: `r${index}-b`, label: 'Lần 2' },
  ],
  scores: {
    'student-1': { [`r${index}-a`]: 7 + index / 10, [`r${index}-b`]: 8 + index / 10 },
    'student-2': { [`r${index}-a`]: 6 + index / 10 },
  },
  bonus: { 'student-1': index === 1 ? 0.5 : 0 },
});

const semester = {
  regular: [1, 2, 3, 4].map(makeRound),
  midterm: { scores: { 'student-1': 8.25, 'student-2': 7 } },
  final: { scores: { 'student-1': 9, 'student-2': 7.5 } },
};

const workspace = {
  classProfile: {
    className: '11A4',
    schoolYear: '2026-2027',
    adviserName: 'Tuấn Nguyễn Anh',
  },
};

assert.equal(gradeRoundScore(semester.regular[0], 'student-1'), 8.1, 'round average and bonus should match the gradebook formula');
assert.equal(gradeRoundScore({ ...semester.regular[0], bonus: { 'student-1': 5 } }, 'student-1'), 10, 'round score should be capped at 10');

const columns = buildGradeExportColumns(semester);
assert.equal(columns.length, 18, 'four rounds with two attempts, bonus, result plus two exams should produce 18 columns');
assert.equal(gradeExportValue(semester, columns.find((column) => column.id === 'midterm'), 'student-1'), 8.25);

const common = {
  workspace,
  students,
  subjectName: 'Tiếng Anh',
  semesterId: 'semester1',
  semester,
  currentUser: { name: 'Tuấn Nguyễn Anh', email: 'anhtuan@pek.edu.vn' },
};

const classWorkbook = buildClassGradebookWorkbook(common);
assert.match(classWorkbook.fileName, /^So-diem-11A4-Tieng-Anh-Hoc-ky-I\.xlsx$/);
assert.equal(classWorkbook.sheets[0].rows.length, 11, 'class workbook should include two student rows');
assert.equal(classWorkbook.sheets[0].rows[8].length, 21, 'class export remains backward-compatible when no selection is provided');

const selectedClassWorkbook = buildClassGradebookWorkbook({
  ...common,
  selectedColumnIds: ['final', 'regular.0.result', 'midterm'],
});
assert.deepEqual(
  selectedClassWorkbook.sheets[0].rows[8].map((cell) => cell.value),
  ['STT', 'Mã học sinh', 'Họ và tên', 'TX1 · Kết quả', 'Giữa kỳ', 'Cuối kỳ'],
  'class export should contain only selected grade columns in gradebook order',
);
assert.deepEqual(
  selectedClassWorkbook.sheets[0].rows[9].map((cell) => cell.value),
  [1, '11A4-01', 'Nguyễn Minh Anh', 8.1, 8.25, 9],
  'selected class columns should retain numeric scores for every student row',
);
assert.throws(
  () => buildClassGradebookWorkbook({ ...common, selectedColumnIds: [] }),
  /ít nhất một cột điểm/,
  'class export should reject an empty column selection',
);

const classBlob = await createXlsxBlob(selectedClassWorkbook);
assert.ok(classBlob.size > 2500, 'class workbook should contain a non-empty XLSX package');
const classZip = await JSZip.loadAsync(await classBlob.arrayBuffer());
for (const path of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
  assert.ok(classZip.file(path), `missing XLSX part: ${path}`);
}
const classSheetXml = await classZip.file('xl/worksheets/sheet1.xml').async('string');
assert.match(classSheetXml, /SỔ ĐIỂM THEO LỚP/);
assert.match(classSheetXml, /<pane ySplit="9"/);
assert.match(classSheetXml, /<v>8\.25<\/v>/, 'scores must be numeric cells, not localized text');
assert.match(classSheetXml, /<autoFilter/);
assert.match(classSheetXml, /<mergeCells/);
assert.ok(
  classSheetXml.indexOf('<autoFilter') < classSheetXml.indexOf('<mergeCells'),
  'autoFilter must precede mergeCells for strict Excel-compatible OOXML',
);

const selectedColumnIds = columns.filter((column) => column.defaultSelected).map((column) => column.id);
const personalWorkbook = buildStudentGradeReportWorkbook({
  ...common,
  student: students[0],
  selectedColumnIds,
});
assert.equal(personalWorkbook.sheets[0].rows.length, 16, 'default personal report should include four round results and two exam scores');
assert.match(personalWorkbook.fileName, /^Phieu-diem-Nguyen-Minh-Anh-Tieng-Anh-Hoc-ky-I\.xlsx$/);

const personalBlob = await createXlsxBlob(personalWorkbook);
const personalZip = await JSZip.loadAsync(await personalBlob.arrayBuffer());
const personalSheetXml = await personalZip.file('xl/worksheets/sheet1.xml').async('string');
assert.match(personalSheetXml, /PHIẾU ĐIỂM CÁ NHÂN/);
assert.match(personalSheetXml, /Nguyễn Minh Anh/);
assert.match(personalSheetXml, /Kết quả đợt 1/);

const outputDirectory = process.env.BES_EXPORT_TEST_OUTPUT;
if (outputDirectory) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(`${outputDirectory}/so-diem-lop-mau.xlsx`, new Uint8Array(await classBlob.arrayBuffer()));
  await fs.writeFile(`${outputDirectory}/phieu-diem-ca-nhan-mau.xlsx`, new Uint8Array(await personalBlob.arrayBuffer()));
}

console.log('Homeroom gradebook Excel export checks passed.');
