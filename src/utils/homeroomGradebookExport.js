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

export function gradeRoundScore(round, studentId) {
  const row = round?.scores?.[studentId] || {};
  const scores = (round?.columns || [])
    .map((column) => gradeScoreNumber(row[column.id]))
    .filter((value) => value != null);
  if (!scores.length) return null;
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const bonus = gradeScoreNumber(round?.bonus?.[studentId]) || 0;
  return Math.round(Math.min(10, average + bonus) * 100) / 100;
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

export function gradeExportValue(semester, column, studentId) {
  if (!column || !studentId) return null;
  if (column.kind === 'regular-score') {
    const round = semester?.regular?.[column.roundIndex];
    return gradeScoreNumber(round?.scores?.[studentId]?.[column.columnId]);
  }
  if (column.kind === 'regular-bonus') {
    return gradeScoreNumber(semester?.regular?.[column.roundIndex]?.bonus?.[studentId]);
  }
  if (column.kind === 'regular-result') {
    return gradeRoundScore(semester?.regular?.[column.roundIndex], studentId);
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

export function buildClassGradebookWorkbook({
  workspace,
  students,
  subjectName,
  semesterId,
  semester,
  currentUser,
}) {
  const columns = buildGradeExportColumns(semester);
  const meta = classMetadata(workspace, subjectName, semesterId, currentUser);
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
    [xlsxCell('Điểm đợt thường xuyên = min(10, trung bình các lần nhập trong đợt + điểm cộng). Ô trống là điểm chưa nhập.', 'note')],
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
        const value = gradeExportValue(semester, column, student.id);
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
      columnWidths: [12, 17, 30, ...columns.map((column) => column.kind === 'regular-score' ? 16 : 14)],
      rowHeights: [32, 24, 8, 24, 24, 24, 30, 8, 38],
      freezeRows: headerRow,
      autoFilter: `A${headerRow}:${lastColumn}${headerRow + (students || []).length}`,
      landscape: true,
    }],
  };
}

export function buildStudentGradeReportWorkbook({
  workspace,
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
      const value = gradeExportValue(semester, column, student.id);
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
  return downloadXlsx(buildClassGradebookWorkbook(input));
}

export async function exportStudentGradeReportXlsx(input) {
  return downloadXlsx(buildStudentGradeReportWorkbook(input));
}
