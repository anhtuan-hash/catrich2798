import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import * as gradebookExport from '../src/utils/homeroomGradebookExport.js';
import {
  buildClassGradebookWorkbook,
  buildGradeExportColumns,
  buildStudentGradeReportWorkbook,
  gradeExportValue,
  gradePlusCountNumber,
  gradeRoundBonus,
  gradeRoundMaxPlusCount,
  gradeRoundScore,
} from '../src/utils/homeroomGradebookExport.js';
import { createXlsxBlob } from '../src/utils/xlsxExport.js';
import { buildStudentGradeReportPdf } from '../src/utils/homeroomGradeReportPdf.js';

const students = [
  { id: 'student-1', code: '11A4-01', fullName: 'Nguyễn Minh Anh', dateOfBirth: '10/09/2010', active: true },
  { id: 'student-2', code: '11A4-02', fullName: 'Trần Gia Bảo', dateOfBirth: '21/09/2010', active: true },
];
const studentIds = students.map((student) => student.id);

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
  plusCounts: index === 1
    ? { 'student-1': 45, 'student-2': 30 }
    : { 'student-1': 0, 'student-2': 0 },
  // Legacy manual bonus data may still exist in old saved workspaces, but the
  // new formula must derive bonus exclusively from plusCounts.
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
    grade: '11',
    adviserName: 'Tuấn Nguyễn Anh',
  },
};

assert.equal(gradePlusCountNumber('45'), 45, 'plus count should accept a non-negative integer');
assert.equal(gradePlusCountNumber('3.9'), 3, 'plus count normalization should discard a fractional tail defensively');
assert.equal(gradePlusCountNumber(-1), null, 'negative plus counts are invalid');
assert.equal(gradeRoundMaxPlusCount(semester.regular[0], studentIds), 45, 'class maximum plus count should be detected');
assert.equal(gradeRoundBonus(semester.regular[0], 'student-1', studentIds), 1, 'student with the class maximum should receive 1 bonus point');
assert.equal(gradeRoundBonus(semester.regular[0], 'student-2', studentIds), 0.67, 'other students should receive a proportional bonus rounded to two decimals');
assert.equal(gradeRoundBonus({ plusCounts: {} }, 'student-1', studentIds), 0, 'an all-zero class must produce zero bonus without division by zero');
assert.equal(
  gradeRoundScore({ ...semester.regular[0], plusCounts: undefined, bonus: { 'student-1': 5 } }, 'student-1', studentIds),
  7.6,
  'legacy workspaces without plus counts should treat the new derived bonus as zero',
);
assert.equal(gradeRoundScore(semester.regular[0], 'student-1', studentIds), 8.6, 'round average should include the derived plus-count bonus');
assert.equal(
  gradeRoundScore({
    ...semester.regular[0],
    scores: { 'student-1': { 'r1-a': 10, 'r1-b': 10 } },
    plusCounts: { 'student-1': 45 },
  }, 'student-1', ['student-1']),
  10,
  'round score should still be capped at 10',
);

const columns = buildGradeExportColumns(semester);
assert.equal(columns.length, 22, 'four rounds with two attempts, plus count, derived bonus, result plus two exams should produce 22 columns');
assert.equal(gradeExportValue(semester, columns.find((column) => column.id === 'regular.0.plus-count'), 'student-1', studentIds), 45);
assert.equal(gradeExportValue(semester, columns.find((column) => column.id === 'regular.0.bonus'), 'student-2', studentIds), 0.67);
assert.equal(gradeExportValue(semester, columns.find((column) => column.id === 'midterm'), 'student-1', studentIds), 8.25);

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
assert.equal(classWorkbook.sheets[0].rows[8].length, 25, 'class export remains backward-compatible while adding plus-count columns');

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
  [1, '11A4-01', 'Nguyễn Minh Anh', 8.6, 8.25, 9],
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

assert.equal(
  typeof gradebookExport.buildOfficialClassGradebookWorkbook,
  'function',
  'official school-format class export should be implemented',
);
assert.equal(
  typeof gradebookExport.gradeSemesterAverage,
  'function',
  'official export should expose the school weighted semester-average calculation',
);

const officialWorkbook = gradebookExport.buildOfficialClassGradebookWorkbook(common);
assert.match(officialWorkbook.fileName, /^so_diem_chi_tiet_lop_11A4_mon_ngoai_ngu\.xlsx$/i);
assert.equal(officialWorkbook.sheets[0].name, 'ngoai_ngu_11A4');
assert.deepEqual(
  officialWorkbook.sheets[0].rows[0].map((cell) => cell?.value ?? cell),
  ['SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HỒ CHÍ MINH'],
  'official export should preserve the uploaded template authority line',
);
assert.equal(
  officialWorkbook.sheets[0].rows[2][0].value,
  'BẢNG ĐIỂM CHI TIẾT - MÔN NGOẠI NGỮ - HỌC KỲ 1 - NĂM HỌC 2026-2027',
  'official export title should follow the uploaded template wording',
);
assert.equal(officialWorkbook.sheets[0].rows[3][0].value, 'Khối 11 - Lớp 11A4');
assert.deepEqual(
  officialWorkbook.sheets[0].rows[5].map((cell) => cell?.value ?? cell),
  ['STT', 'Mã học sinh', 'Họ và tên', '', 'Ngày sinh', 'ĐĐGtx', '', '', '', 'ĐĐGgk', 'ĐĐGck', 'ĐTB \nmhk', 'Nhận xét'],
  'first header row should match the uploaded gradebook structure',
);
assert.deepEqual(
  officialWorkbook.sheets[0].rows[6].map((cell) => cell?.value ?? cell),
  ['', '', '', '', '', 'TX1', 'TX2', 'TX3', 'TX4', 'GK1', 'CK1', '', ''],
  'second header row should expose exactly four TX rounds plus GK1 and CK1',
);
assert.deepEqual(
  officialWorkbook.sheets[0].rows[7].map((cell) => cell?.value ?? cell),
  [1, '11A4-01', 'Nguyễn Minh', 'Anh', '10/09/2010', 8.6, 7.7, 7.8, 7.9, 8.25, 9, 8.4, ''],
  'official export should map round results, split the final name token, and calculate the weighted semester average',
);
assert.equal(
  gradebookExport.gradeSemesterAverage(semester, 'student-1', studentIds),
  8.4,
  'semester average should use TX weight 1, midterm weight 2, and final weight 3, rounded to one decimal',
);
assert.equal(
  gradebookExport.gradeSemesterAverage({ regular: [], midterm: { scores: {} }, final: { scores: {} } }, 'student-1', studentIds),
  null,
  'semester average should stay blank when the student has no entered scores',
);
assert.ok(officialWorkbook.sheets[0].merges.includes('F6:I6'), 'ĐĐGtx header should span TX1-TX4');
assert.ok(officialWorkbook.sheets[0].merges.includes('C6:D7'), 'student name header should span the two name columns');
const officialRows = officialWorkbook.sheets[0].rows;
assert.equal(officialRows[11][3].value, 'Tốt');
assert.equal(officialRows[11][5].value, '01');
assert.equal(officialRows[11][8].value, '50%');
assert.equal(officialRows[12][3].value, 'Khá');
assert.equal(officialRows[12][5].value, '01');
assert.equal(officialRows[12][8].value, '50%');
assert.equal(officialRows[13][5].value, '00');
assert.equal(officialRows[14][5].value, '00');

const officialBlob = await createXlsxBlob(officialWorkbook);
assert.ok(officialBlob.size > 2500, 'official school workbook should produce a non-empty XLSX package');
const officialZip = await JSZip.loadAsync(await officialBlob.arrayBuffer());
const officialSheetXml = await officialZip.file('xl/worksheets/sheet1.xml').async('string');
assert.match(officialSheetXml, /BẢNG ĐIỂM CHI TIẾT - MÔN NGOẠI NGỮ/);
assert.match(officialSheetXml, /TX1/);
assert.match(officialSheetXml, /THỐNG KÊ HỌC KỲ 1/);
assert.doesNotMatch(officialSheetXml, /Dấu \+/);
assert.doesNotMatch(officialSheetXml, /Điểm cộng/);

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

const [fontBytes, logoBytes] = await Promise.all([
  fs.readFile(new URL('../public/bes-fonts/brian-personal-font.ttf', import.meta.url)),
  fs.readFile(new URL('../public/footer-pek-logo.png', import.meta.url)),
]);
const personalPdf = await buildStudentGradeReportPdf({
  ...common,
  student: students[0],
  selectedColumnIds,
  fontBytes,
  logoBytes,
});
assert.match(personalPdf.fileName, /^Phieu-diem-Nguyen-Minh-Anh-Tieng-Anh-Hoc-ky-I\.pdf$/);
assert.ok(personalPdf.bytes.length > 25000, 'personal PDF should contain fonts, school logo, signature, and grade data');
const parsedPdf = await PDFDocument.load(personalPdf.bytes);
assert.equal(parsedPdf.getPageCount(), 1, 'default personal report should fit on one A4 page');
assert.match(parsedPdf.getTitle(), /Nguyễn Minh Anh/);
assert.equal(parsedPdf.getAuthor(), 'Tuấn Nguyễn Anh');

const paginationSemester = {
  ...semester,
  regular: semester.regular.map((round, index) => ({
    ...round,
    columns: [...round.columns, { id: `r${index + 1}-c`, label: 'Lần bổ sung' }],
  })),
};
const paginationColumnIds = buildGradeExportColumns(paginationSemester).map((column) => column.id);
const paginatedPdf = await buildStudentGradeReportPdf({
  ...common,
  student: students[0],
  semester: paginationSemester,
  selectedColumnIds: paginationColumnIds,
  fontBytes,
  logoBytes,
});
assert.equal(paginatedPdf.pageCount, 2, 'personal PDF should paginate when more than 18 grade columns are selected');
assert.equal((await PDFDocument.load(paginatedPdf.bytes)).getPageCount(), 2);

const outputDirectory = process.env.BES_EXPORT_TEST_OUTPUT;
if (outputDirectory) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(`${outputDirectory}/so-diem-lop-mau.xlsx`, new Uint8Array(await classBlob.arrayBuffer()));
  await fs.writeFile(`${outputDirectory}/so-diem-chuan-nha-truong.xlsx`, new Uint8Array(await officialBlob.arrayBuffer()));
  await fs.writeFile(`${outputDirectory}/phieu-diem-ca-nhan-mau.xlsx`, new Uint8Array(await personalBlob.arrayBuffer()));
  await fs.writeFile(`${outputDirectory}/phieu-diem-ca-nhan-mau.pdf`, personalPdf.bytes);
  await fs.writeFile(`${outputDirectory}/phieu-diem-ca-nhan-nhieu-cot-mau.pdf`, paginatedPdf.bytes);
}

console.log('Homeroom gradebook Excel export checks passed.');