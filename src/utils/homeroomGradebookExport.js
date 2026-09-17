import { downloadXlsx, xlsxCell, xlsxColumnName } from './xlsxExport.js';

const SEMESTER_LABELS = {
  semester1: 'Học kỳ I',
  semester2: 'Học kỳ II',
};

export function gradeScoreNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? Math.max(0, Math.min(10, number)) : null;
}

export function gradePlusCountNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.floor(number);
}

function gradeRoundStudentIds(round, studentIds) {
  if (Array.isArray(studentIds)) return studentIds;
  return Object.keys(round?.plusCounts || {});
}

export function gradeRoundMaxPlusCount(round, studentIds = null) {
  return gradeRoundStudentIds(round, studentIds).reduce((maximum, studentId) => {
    const count = gradePlusCountNumber(round?.plusCounts?.[studentId]) || 0;
    return Math.max(maximum, count);
  }, 0);
}

export function gradeRoundBonus(round, studentId, studentIds = null) {
  const maximum = gradeRoundMaxPlusCount(round, studentIds);
  if (maximum <= 0) return 0;
  const count = gradePlusCountNumber(round?.plusCounts?.[studentId]) || 0;
  return Math.round(Math.min(1, count / maximum) * 100) / 100;
}

export function gradeRoundScore(round, studentId, studentIds = null) {
  const row = round?.scores?.[studentId] || {};
  const scores = (round?.columns || [])
    .map((column) => gradeScoreNumber(row[column.id]))
    .filter((value) => value != null);
  if (!scores.length) return null;
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const bonus = gradeRoundBonus(round, studentId, studentIds);
  return Math.round(Math.min(10, average + bonus) * 100) / 100;
}

export function gradeSemesterAverage(semester, studentId, studentIds = null) {
  const regularScores = (semester?.regular || [])
    .map((round) => gradeRoundScore(round, studentId, studentIds))
    .filter((value) => value != null);
  const midterm = gradeScoreNumber(semester?.midterm?.scores?.[studentId]);
  const final = gradeScoreNumber(semester?.final?.scores?.[studentId]);

  let weightedTotal = regularScores.reduce((sum, value) => sum + value, 0);
  let weight = regularScores.length;
  if (midterm != null) {
    weightedTotal += midterm * 2;
    weight += 2;
  }
  if (final != null) {
    weightedTotal += final * 3;
    weight += 3;
  }
  if (!weight) return null;
  return Math.round((weightedTotal / weight) * 10) / 10;
}

function gradeSemesterBand(value) {
  if (value == null || !Number.isFinite(value)) return '';
  if (value >= 8) return 'Tốt';
  if (value >= 6.5) return 'Khá';
  if (value >= 5) return 'Đạt';
  return 'Chưa Đạt';
}

function semesterNumber(semesterId) {
  return String(semesterId || '').toLowerCase().includes('2') ? 2 : 1;
}

function normalizedAscii(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function officialSubjectLabel(subjectName) {
  const normalized = normalizedAscii(subjectName).trim().toLowerCase();
  if (normalized.includes('tieng anh') || normalized.includes('english') || normalized.includes('ngoai ngu')) {
    return 'NGOẠI NGỮ';
  }
  return String(subjectName || 'Môn học').trim().toLocaleUpperCase('vi-VN');
}

function officialSubjectFilePart(subjectName) {
  const label = officialSubjectLabel(subjectName);
  if (label === 'NGOẠI NGỮ') return 'ngoai_ngu';
  return normalizedAscii(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'mon_hoc';
}

function officialClassFilePart(className) {
  return normalizedAscii(className)
    .replace(/[^a-zA-Z0-9.]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'lop';
}

function gradeLevel(profile, className) {
  const configured = String(profile?.grade || '').trim();
  if (configured) return configured.replace(/^Khối\s*/i, '').trim();
  const match = String(className || '').match(/\d{1,2}/);
  return match?.[0] || '';
}

function splitStudentName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return ['', ''];
  if (parts.length === 1) return ['', parts[0]];
  return [parts.slice(0, -1).join(' '), parts.at(-1)];
}

function studentBirthDate(student) {
  const value = student?.dateOfBirth
    || student?.birthDate
    || student?.birthdate
    || student?.birthday
    || student?.dob
    || student?.ngaySinh
    || '';
  if (!value) return '';
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : text;
}

function studentRemark(student) {
  return String(student?.gradeRemark || student?.remark || student?.comment || '').trim();
}

function percentageText(count, total) {
  if (!total || !count) return '0%';
  const percentage = Math.round((count / total) * 1000) / 10;
  return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%`;
}

function twoDigitCount(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, '0');
}

function officialScoreCell(value) {
  return xlsxCell(value == null ? '' : value, 'score', value == null ? undefined : 'number');
}

export function buildOfficialClassGradebookWorkbook({
  workspace,
  students,
  subjectName,
  semesterId,
  semester,
  currentUser,
}) {
  const profile = workspace?.classProfile || {};
  const activeStudents = (Array.isArray(students) ? students : (workspace?.students || []))
    .filter((student) => student?.active !== false);
  const studentIds = activeStudents.map((student) => student.id).filter(Boolean);
  const className = String(profile.className || 'Chưa thiết lập').trim() || 'Chưa thiết lập';
  const schoolYear = String(profile.schoolYear || '').trim() || '—';
  const grade = gradeLevel(profile, className);
  const termNumber = semesterNumber(semesterId);
  const officialSubject = officialSubjectLabel(subjectName);
  const subjectPart = officialSubjectFilePart(subjectName);
  const classPart = officialClassFilePart(className);
  const adviserName = profile.adviserName || currentUser?.name || currentUser?.email || 'Giáo viên';

  const studentRows = activeStudents.map((student, index) => {
    const [familyName, givenName] = splitStudentName(student.fullName || '');
    const tx = Array.from({ length: 4 }, (_, roundIndex) => (
      gradeRoundScore(semester?.regular?.[roundIndex], student.id, studentIds)
    ));
    const midterm = gradeScoreNumber(semester?.midterm?.scores?.[student.id]);
    const final = gradeScoreNumber(semester?.final?.scores?.[student.id]);
    const average = gradeSemesterAverage(semester, student.id, studentIds);
    return [
      xlsxCell(index + 1, 'centered'),
      xlsxCell(String(student.code || ''), 'centered', 'text'),
      xlsxCell(familyName, 'text'),
      xlsxCell(givenName, 'text'),
      xlsxCell(studentBirthDate(student), 'centered', 'text'),
      ...tx.map(officialScoreCell),
      officialScoreCell(midterm),
      officialScoreCell(final),
      officialScoreCell(average),
      xlsxCell(studentRemark(student), 'text'),
    ];
  });

  const averages = activeStudents
    .map((student) => gradeSemesterAverage(semester, student.id, studentIds))
    .filter((value) => value != null);
  const bandCounts = {
    Tốt: 0,
    Khá: 0,
    Đạt: 0,
    'Chưa Đạt': 0,
  };
  averages.forEach((value) => {
    const band = gradeSemesterBand(value);
    if (band) bandCounts[band] += 1;
  });
  const gradedCount = averages.length;
  const statistics = [
    ['Tốt', bandCounts.Tốt],
    ['Khá', bandCounts.Khá],
    ['Đạt', bandCounts.Đạt],
    ['Chưa Đạt', bandCounts['Chưa Đạt']],
  ];

  const rows = [
    [xlsxCell('SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HỒ CHÍ MINH', 'subtitle')],
    [xlsxCell('TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ', 'subtitle')],
    [xlsxCell(`BẢNG ĐIỂM CHI TIẾT - MÔN ${officialSubject} - HỌC KỲ ${termNumber} - NĂM HỌC ${schoolYear}`, 'subtitle')],
    [xlsxCell(`${grade ? `Khối ${grade} - ` : ''}Lớp ${className}`, 'subtitle')],
    [],
    [
      xlsxCell('STT', 'header'),
      xlsxCell('Mã học sinh', 'header'),
      xlsxCell('Họ và tên', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('Ngày sinh', 'header'),
      xlsxCell('ĐĐGtx', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('ĐĐGgk', 'header'),
      xlsxCell('ĐĐGck', 'header'),
      xlsxCell('ĐTB \nmhk', 'header'),
      xlsxCell('Nhận xét', 'header'),
    ],
    [
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('TX1', 'header'),
      xlsxCell('TX2', 'header'),
      xlsxCell('TX3', 'header'),
      xlsxCell('TX4', 'header'),
      xlsxCell('GK1', 'header'),
      xlsxCell('CK1', 'header'),
      xlsxCell('', 'header'),
      xlsxCell('', 'header'),
    ],
    ...studentRows,
  ];

  const statisticsTitleRow = rows.length + 1;
  rows.push(
    [xlsxCell(`THỐNG KÊ HỌC KỲ ${termNumber}`, 'section')],
    [],
  );
  const statisticsStartRow = rows.length + 1;
  statistics.forEach(([label, count], index) => {
    rows.push([
      xlsxCell(index === 0 ? 'Số học sinh đạt' : index === 1 ? 'Số lượng - Tỉ lệ (%)' : '', index <= 1 ? 'metaLabel' : 'plain'),
      xlsxCell('', 'plain'),
      xlsxCell('', 'plain'),
      xlsxCell(label, index === 3 ? 'text' : 'metaLabel'),
      xlsxCell('', 'plain'),
      xlsxCell(twoDigitCount(count), 'centered', 'text'),
      xlsxCell('', 'plain'),
      xlsxCell('-', 'centered', 'text'),
      xlsxCell(percentageText(count, gradedCount), 'centered', 'text'),
      xlsxCell('', 'plain'),
    ]);
  });

  const merges = [
    'A1:L1',
    'A2:L2',
    'A3:L3',
    'A4:J4',
    'A6:A7',
    'B6:B7',
    'C6:D7',
    'E6:E7',
    'F6:I6',
    'J6:J7',
    'K6:K7',
    'L6:L7',
    'M6:M7',
    `A${statisticsTitleRow}:J${statisticsTitleRow + 1}`,
    `A${statisticsStartRow}:C${statisticsStartRow}`,
    `D${statisticsStartRow}:E${statisticsStartRow}`,
    `F${statisticsStartRow}:G${statisticsStartRow}`,
    `I${statisticsStartRow}:J${statisticsStartRow}`,
    `A${statisticsStartRow + 1}:C${statisticsStartRow + 1}`,
    `D${statisticsStartRow + 1}:E${statisticsStartRow + 1}`,
    `F${statisticsStartRow + 1}:G${statisticsStartRow + 1}`,
    `I${statisticsStartRow + 1}:J${statisticsStartRow + 1}`,
    `D${statisticsStartRow + 2}:E${statisticsStartRow + 2}`,
    `F${statisticsStartRow + 2}:G${statisticsStartRow + 2}`,
    `I${statisticsStartRow + 2}:J${statisticsStartRow + 2}`,
    `D${statisticsStartRow + 3}:E${statisticsStartRow + 3}`,
    `F${statisticsStartRow + 3}:G${statisticsStartRow + 3}`,
    `I${statisticsStartRow + 3}:J${statisticsStartRow + 3}`,
  ];

  return {
    fileName: `so_diem_chi_tiet_lop_${classPart}_mon_${subjectPart}.xlsx`,
    creator: adviserName,
    sheets: [{
      name: `${subjectPart}_${className}`.slice(0, 31),
      rows,
      merges,
      columnWidths: [5, 5.86, 22, 7, 10.14, 6.43, 6.43, 6.43, 6.43, 6.43, 6.43, 6, 9.14],
      rowHeights: [17.25, 17.25, 20, 12.75, 12.75, 30, 12.75, ...activeStudents.map(() => 12.75), 12.75, 12.75, 12.75, 12.75, 12.75, 12.75],
      landscape: true,
    }],
  };
}

export function buildGradeExportColumns(semester) {
  const regular = (semester?.regular || []).flatMap((round, roundIndex) => {
    const roundNumber = roundIndex + 1;
    const group = `TX · Đợt ${roundNumber}`;
    return [
      ...(round?.columns || []).map((column, columnIndex) => ({
        id: `regular.${roundIndex}.score.${column.id}`,
        label: `TX${roundNumber} · ${column.label || `Lần ${columnIndex + 1}`}`,
        dialogLabel: column.label || `Lần ${columnIndex + 1}`,
        group,
        kind: 'regular-score',
        roundIndex,
        columnId: column.id,
        defaultSelected: false,
      })),
      {
        id: `regular.${roundIndex}.plus-count`,
        label: `TX${roundNumber} · Dấu +`,
        dialogLabel: 'Dấu +',
        group,
        kind: 'regular-plus-count',
        roundIndex,
        defaultSelected: false,
      },
      {
        id: `regular.${roundIndex}.bonus`,
        label: `TX${roundNumber} · Điểm cộng`,
        dialogLabel: 'Điểm cộng',
        group,
        kind: 'regular-bonus',
        roundIndex,
        defaultSelected: false,
      },
      {
        id: `regular.${roundIndex}.result`,
        label: `TX${roundNumber} · Kết quả`,
        dialogLabel: `Kết quả đợt ${roundNumber}`,
        group,
        kind: 'regular-result',
        roundIndex,
        defaultSelected: true,
      },
    ];
  });

  return [
    ...regular,
    {
      id: 'midterm',
      label: 'Giữa kỳ',
      dialogLabel: 'Điểm giữa kỳ',
      group: 'Điểm định kỳ',
      kind: 'midterm',
      defaultSelected: true,
    },
    {
      id: 'final',
      label: 'Cuối kỳ',
      dialogLabel: 'Điểm cuối kỳ',
      group: 'Điểm định kỳ',
      kind: 'final',
      defaultSelected: true,
    },
  ];
}

export function gradeExportValue(semester, column, studentId, studentIds = null) {
  if (!column || !studentId) return null;
  if (column.kind === 'regular-score') {
    const round = semester?.regular?.[column.roundIndex];
    return gradeScoreNumber(round?.scores?.[studentId]?.[column.columnId]);
  }
  if (column.kind === 'regular-plus-count') {
    return gradePlusCountNumber(semester?.regular?.[column.roundIndex]?.plusCounts?.[studentId]);
  }
  if (column.kind === 'regular-bonus') {
    return gradeRoundBonus(semester?.regular?.[column.roundIndex], studentId, studentIds);
  }
  if (column.kind === 'regular-result') {
    return gradeRoundScore(semester?.regular?.[column.roundIndex], studentId, studentIds);
  }
  if (column.kind === 'midterm') return gradeScoreNumber(semester?.midterm?.scores?.[studentId]);
  if (column.kind === 'final') return gradeScoreNumber(semester?.final?.scores?.[studentId]);
  return null;
}

function reportDate() {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function filePart(value, fallback) {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function classMetadata(workspace, subjectName, semesterId, currentUser) {
  const profile = workspace?.classProfile || {};
  return {
    className: profile.className || 'Chưa thiết lập',
    schoolYear: profile.schoolYear || '—',
    subjectName: subjectName || 'Môn học',
    semesterLabel: SEMESTER_LABELS[semesterId] || semesterId || 'Học kỳ',
    adviserName: profile.adviserName || currentUser?.name || currentUser?.email || 'Giáo viên',
    exportedAt: reportDate(),
  };
}

function activeStudentIds(students, workspace) {
  const source = Array.isArray(students) && students.length
    ? students
    : (workspace?.students || []).filter((student) => student.active !== false);
  return source.map((student) => student.id).filter(Boolean);
}

export function buildClassGradebookWorkbook({
  workspace,
  students,
  subjectName,
  semesterId,
  semester,
  selectedColumnIds,
  currentUser,
}) {
  const availableColumns = buildGradeExportColumns(semester);
  const selected = Array.isArray(selectedColumnIds) ? new Set(selectedColumnIds) : null;
  const columns = selected ? availableColumns.filter((column) => selected.has(column.id)) : availableColumns;
  if (!columns.length) throw new Error('Hãy chọn ít nhất một cột điểm.');
  const meta = classMetadata(workspace, subjectName, semesterId, currentUser);
  const studentIds = activeStudentIds(students, workspace);
  const totalColumns = 3 + columns.length;
  const lastColumn = xlsxColumnName(totalColumns);
  const headerRow = 9;
  const rows = [
    [xlsxCell('SỔ ĐIỂM THEO LỚP', 'title')],
    [xlsxCell(`${meta.subjectName} · ${meta.semesterLabel}`, 'subtitle')],
    [],
    [xlsxCell('Lớp', 'metaLabel'), xlsxCell(meta.className, 'metaValue'), '', xlsxCell('Năm học', 'metaLabel'), xlsxCell(meta.schoolYear, 'metaValue')],
    [xlsxCell('Môn học', 'metaLabel'), xlsxCell(meta.subjectName, 'metaValue'), '', xlsxCell('Học kỳ', 'metaLabel'), xlsxCell(meta.semesterLabel, 'metaValue')],
    [xlsxCell('Giáo viên', 'metaLabel'), xlsxCell(meta.adviserName, 'metaValue'), '', xlsxCell('Ngày xuất', 'metaLabel'), xlsxCell(meta.exportedAt, 'metaValue')],
    [xlsxCell('Sổ điểm chỉ gồm các cột giáo viên đã lựa chọn. Điểm cộng = số dấu + của học sinh / số dấu + cao nhất lớp (tối đa 1). Điểm TX từng đợt = min(10, trung bình các lần nhập + điểm cộng).', 'note')],
    [],
    [
      xlsxCell('STT', 'header'),
      xlsxCell('Mã học sinh', 'header'),
      xlsxCell('Họ và tên', 'header'),
      ...columns.map((column) => xlsxCell(column.label, 'header')),
    ],
    ...(students || []).map((student, index) => [
      xlsxCell(index + 1, 'centered'),
      xlsxCell(student.code || '', 'centered', 'text'),
      xlsxCell(student.fullName || 'Chưa có tên', 'text'),
      ...columns.map((column) => {
        const value = gradeExportValue(semester, column, student.id, studentIds);
        return xlsxCell(value, column.kind === 'regular-result' ? 'score' : 'number', 'number');
      }),
    ]),
  ];

  return {
    fileName: `So-diem-${filePart(meta.className, 'lop')}-${filePart(meta.subjectName, 'mon-hoc')}-${filePart(meta.semesterLabel, 'hoc-ky')}.xlsx`,
    creator: meta.adviserName,
    sheets: [{
      name: `Sổ điểm ${meta.className}`,
      rows,
      merges: [
        `A1:${lastColumn}1`,
        `A2:${lastColumn}2`,
        'B4:C4',
        'E4:F4',
        'B5:C5',
        'E5:F5',
        'B6:C6',
        'E6:F6',
        `A7:${lastColumn}7`,
      ],
      columnWidths: [12, 17, 30, ...columns.map((column) => column.kind === 'regular-score' ? 16 : column.kind === 'regular-plus-count' ? 12 : 14)],
      rowHeights: [32, 24, 8, 24, 24, 24, 30, 8, 38],
      freezeRows: headerRow,
      autoFilter: `A${headerRow}:${lastColumn}${headerRow + (students || []).length}`,
      landscape: true,
    }],
  };
}

export function buildStudentGradeReportWorkbook({
  workspace,
  students,
  student,
  subjectName,
  semesterId,
  semester,
  selectedColumnIds,
  currentUser,
}) {
  const meta = classMetadata(workspace, subjectName, semesterId, currentUser);
  const selected = new Set(selectedColumnIds || []);
  const columns = buildGradeExportColumns(semester).filter((column) => selected.has(column.id));
  if (!student) throw new Error('Hãy chọn học sinh cần xuất phiếu điểm.');
  if (!columns.length) throw new Error('Hãy chọn ít nhất một cột điểm.');
  const studentIds = activeStudentIds(students, workspace);

  const tableRow = 10;
  const rows = [
    [xlsxCell('PHIẾU ĐIỂM CÁ NHÂN', 'title')],
    [xlsxCell(`${meta.subjectName} · ${meta.semesterLabel}`, 'subtitle')],
    [],
    [xlsxCell('Họ và tên', 'metaLabel'), xlsxCell(student.fullName || 'Chưa có tên', 'metaValue'), '', xlsxCell('Mã học sinh', 'metaLabel'), xlsxCell(student.code || '—', 'metaValue')],
    [xlsxCell('Lớp', 'metaLabel'), xlsxCell(meta.className, 'metaValue'), '', xlsxCell('Năm học', 'metaLabel'), xlsxCell(meta.schoolYear, 'metaValue')],
    [xlsxCell('Môn học', 'metaLabel'), xlsxCell(meta.subjectName, 'metaValue'), '', xlsxCell('Học kỳ', 'metaLabel'), xlsxCell(meta.semesterLabel, 'metaValue')],
    [xlsxCell('Giáo viên', 'metaLabel'), xlsxCell(meta.adviserName, 'metaValue'), '', xlsxCell('Ngày xuất', 'metaLabel'), xlsxCell(meta.exportedAt, 'metaValue')],
    [xlsxCell('Phiếu chỉ gồm các cột điểm giáo viên đã lựa chọn. Ô trống là điểm chưa nhập.', 'note')],
    [],
    [
      xlsxCell('STT', 'header'),
      xlsxCell('Thành phần điểm', 'header'),
      xlsxCell('Nhóm điểm', 'header'),
      xlsxCell('Kết quả', 'header'),
      xlsxCell('Trạng thái', 'header'),
    ],
    ...columns.map((column, index) => {
      const value = gradeExportValue(semester, column, student.id, studentIds);
      return [
        xlsxCell(index + 1, 'centered'),
        xlsxCell(column.dialogLabel, 'text'),
        xlsxCell(column.group, 'centered'),
        xlsxCell(value, column.kind === 'regular-result' ? 'score' : 'number', 'number'),
        xlsxCell(value == null ? 'Chưa nhập' : 'Đã nhập', 'centered'),
      ];
    }),
  ];

  return {
    fileName: `Phieu-diem-${filePart(student.fullName, 'hoc-sinh')}-${filePart(meta.subjectName, 'mon-hoc')}-${filePart(meta.semesterLabel, 'hoc-ky')}.xlsx`,
    creator: meta.adviserName,
    sheets: [{
      name: 'Phiếu điểm',
      rows,
      merges: ['A1:E1', 'A2:E2', 'B4:C4', 'B5:C5', 'B6:C6', 'B7:C7', 'A8:E8'],
      columnWidths: [16, 34, 21, 16, 18],
      rowHeights: [32, 24, 8, 24, 24, 24, 24, 30, 8, 34],
      freezeRows: tableRow,
      autoFilter: `A${tableRow}:E${tableRow + columns.length}`,
      landscape: false,
    }],
  };
}

export async function exportClassGradebookXlsx(input) {
  return downloadXlsx(buildOfficialClassGradebookWorkbook(input));
}

export async function exportStudentGradeReportXlsx(input) {
  return downloadXlsx(buildStudentGradeReportWorkbook(input));
}
