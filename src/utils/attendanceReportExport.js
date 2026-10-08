import { createXlsxBlob } from './simpleXlsx.js';
import PETRUS_KY_SCHOOL_LOGO_DATA_URI from '../assets/petrus-ky-school-logo.png?inline';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function percent(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1).replace('.', ',')}%`;
}

function periods(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value);
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

function formatCheckedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function auditActor(value, time = '') {
  const name = String(value || '').trim();
  if (!name) return '—';
  return time ? `${name} · ${formatCheckedTime(time)}` : name;
}

function latestAdjustment(row = {}) {
  return row.latest_changed_by_name
    ? auditActor(row.latest_changed_by_name, row.latest_changed_at)
    : 'Chưa điều chỉnh';
}

function classTypeLabel(value) {
  if (value === 'gifted') return 'Bồi dưỡng HSG';
  if (value === 'remedial') return 'Phụ đạo';
  return '—';
}

function reportTitle(filters = {}) {
  return filters.mode === 'day' ? 'BÁO CÁO ĐIỂM DANH THEO NGÀY' : 'BÁO CÁO ĐIỂM DANH THEO THÁNG';
}

function periodText(filters = {}) {
  if (filters.periodLabel) return filters.periodLabel;
  return filters.mode === 'day' ? formatDate(filters.date) : String(filters.month || '');
}

function exportStem(filters = {}) {
  const raw = filters.mode === 'day' ? filters.date : filters.month;
  return String(raw || 'bao-cao').replace(/[^0-9-]/g, '') || 'bao-cao';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function buildRowStyles(start, count, style) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [start + index, style]));
}

function buildColumnCellStyles(column, start, count, style) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [`${column}${start + index}`, style]));
}

export function downloadAttendanceReportXlsx(report, filters = {}) {
  const title = reportTitle(filters);
  const period = periodText(filters);
  const reporter = filters.reporterName || 'Chưa ghi';
  const reporterTitle = filters.reporterTitle || 'Chưa ghi';
  const remarks = filters.generalRemarks || 'Không có nhận xét chung.';

  const overview = [
    ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH'],
    ['TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ'],
    [title],
    ['Kỳ báo cáo', period],
    ['Bộ lọc', `${filters.classLabel || 'Tất cả lớp'} · ${filters.teacherLabel || 'Tất cả giáo viên'}`],
    ['Người báo cáo', reporter, 'Chức vụ', reporterTitle],
    [],
    ['CHỈ SỐ TỔNG QUAN', 'GIÁ TRỊ'],
    ['Buổi đã dạy', report.metrics.completedSessions],
    ['Buổi đã hủy', report.metrics.cancelledSessions],
    ['Tổng số tiết', report.metrics.totalPeriods],
    ['Lượt học sinh có mặt', report.metrics.presentInstances],
    ['Lượt học sinh vắng', report.metrics.absentInstances],
    ['Tỷ lệ chuyên cần', Number(report.metrics.attendanceRate || 0)],
    [],
    ['NHẬN XÉT CHUNG'],
    [remarks],
  ];

  const teacherData = report.teacherRows.map((row) => [
    row.teacher_name,
    row.completed_sessions,
    row.gifted_periods,
    row.remedial_periods,
    row.supplemental_periods,
    row.distinct_classes,
    row.present_instances,
    row.absent_instances,
    Number(row.attendance_rate || 0),
  ]);
  const teacherRows = [
    ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH'],
    ['TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ'],
    [`${title} · ${period}`],
    [],
    ['Giáo viên', 'Số buổi đã dạy', 'Tổng số tiết bồi dưỡng', 'Tổng số tiết phụ đạo', 'Tổng số tiết bù bài', 'Số lớp', 'Lượt có mặt', 'Lượt vắng', 'Tỷ lệ chuyên cần'],
    ...teacherData,
  ];

  const sessionData = report.sessionRows.map((row) => [
    formatDate(row.attendance_date),
    row.teaching_time_range || 'Chưa ghi',
    formatCheckedTime(row.checked_at),
    row.class_name,
    classTypeLabel(row.class_type),
    row.subject || '',
    row.teaching_room || 'Chưa ghi',
    row.teacher_name || '—',
    auditActor(row.checked_by_name, row.checked_at),
    latestAdjustment(row),
    Number(row.change_count || 0),
    periods(row.lesson_periods),
    row.total_students ?? '—',
    row.present_count ?? '—',
    row.absent_count ?? '—',
    row.attendance_rate === null ? '—' : Number(row.attendance_rate || 0),
    row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh',
    row.note || '',
  ]);
  const sessionRows = [
    ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH'],
    ['TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ'],
    [`${title} · ${period}`],
    [],
    ['Ngày', 'Giờ dạy', 'Giờ chốt', 'Lớp', 'Loại lớp', 'Môn', 'Phòng học', 'Giáo viên thực dạy', 'Người điểm danh', 'Người điều chỉnh gần nhất', 'Số lần điều chỉnh', 'Số tiết', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ chuyên cần', 'Trạng thái', 'Ghi chú / lý do hủy'],
    ...sessionData,
  ];

  const absenceData = report.absenceRows.map((row) => [
    formatDate(row.attendance_date),
    row.student_code || '',
    row.student_full_name,
    row.school_class_name || '',
    row.reason_label || 'Chưa ghi lý do',
    row.absence_note || '',
    row.class_name,
    row.subject || '',
    row.teacher_name || '',
    row.teaching_time_range || 'Chưa ghi',
    formatCheckedTime(row.checked_at),
    row.teaching_room || 'Chưa ghi',
  ]);
  const absenceRows = [
    ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH'],
    ['TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ'],
    [`${title} · ${period}`],
    [],
    ['Ngày', 'Mã HS', 'Họ và tên', 'Lớp chính khóa', 'Lý do vắng', 'Ghi chú lý do', 'Lớp phụ đạo/bồi dưỡng', 'Môn', 'Giáo viên dạy', 'Giờ dạy', 'Giờ chốt', 'Phòng học'],
    ...absenceData,
  ];

  const teacherBodyCount = Math.max(teacherData.length, 1);
  const sessionBodyCount = Math.max(sessionData.length, 1);
  const absenceBodyCount = Math.max(absenceData.length, 1);

  const blob = createXlsxBlob([
    {
      name: 'Tong quan',
      rows: overview,
      merges: ['A1:F1', 'A2:F2', 'A3:F3', 'A16:F16', 'A17:F17'],
      columnWidths: [27, 23, 20, 23, 21, 20],
      rowHeights: { 1: 22, 2: 22, 3: 30, 6: 22, 8: 22, 16: 22, 17: 42 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 8: 4, 16: 7, 17: 6 },
      cellStyles: { A4: 7, A5: 7, A6: 7, C6: 7, A14: 5, B14: 8 },
      freezeRows: 3,
    },
    {
      name: 'Theo giao vien',
      rows: teacherRows,
      merges: ['A1:I1', 'A2:I2', 'A3:I3'],
      columnWidths: [31, 16, 24, 22, 22, 12, 15, 15, 18],
      rowHeights: { 1: 22, 2: 22, 3: 28, 5: 28 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 5: 4, ...buildRowStyles(6, teacherData.length, 5) },
      cellStyles: buildColumnCellStyles('I', 6, teacherData.length, 8),
      freezeRows: 5,
      autoFilter: `A5:I${5 + teacherBodyCount}`,
    },
    {
      name: 'Chi tiet buoi hoc',
      rows: sessionRows,
      merges: ['A1:R1', 'A2:R2', 'A3:R3'],
      columnWidths: [12, 17, 13, 25, 17, 18, 14, 25, 28, 30, 15, 10, 10, 10, 10, 16, 15, 35],
      rowHeights: { 1: 22, 2: 22, 3: 28, 5: 38 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 5: 4, ...buildRowStyles(6, sessionData.length, 6) },
      cellStyles: buildColumnCellStyles('P', 6, sessionData.length, 8),
      freezeRows: 5,
      autoFilter: `A5:R${5 + sessionBodyCount}`,
    },
    {
      name: 'Chi tiet vang',
      rows: absenceRows,
      merges: ['A1:L1', 'A2:L2', 'A3:L3'],
      columnWidths: [12, 12, 28, 16, 20, 32, 28, 18, 27, 17, 13, 14],
      rowHeights: { 1: 22, 2: 22, 3: 28, 5: 34 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 5: 4, ...buildRowStyles(6, absenceData.length, 6) },
      freezeRows: 5,
      autoFilter: `A5:L${5 + absenceBodyCount}`,
    },
  ]);
  downloadBlob(blob, `bao-cao-diem-danh-${exportStem(filters)}.xlsx`);
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function vietnamReportDate() {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: 'numeric', month: 'numeric', year: 'numeric',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `Thành phố Hồ Chí Minh, ngày ${map.day} tháng ${map.month} năm ${map.year}`;
}

function reportExportTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${value.day}/${value.month}/${value.year} ${value.hour}:${value.minute}`;
}

function waitForPrintWindowLoad(popup) {
  if (popup.document?.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => popup.addEventListener('load', resolve, { once: true }));
}

async function waitForReportImages(popup) {
  const images = [...(popup.document?.images || [])];
  await Promise.all(images.map(async (image) => {
    try {
      if (typeof image.decode === 'function') await image.decode();
      else if (!image.complete) await new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    } catch {
      // Printing must remain available even if a non-essential image cannot decode.
    }
  }));
}

export async function printAttendanceReportPdf(report, filters = {}) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* Browser may already isolate the popup. */ }
  const title = reportTitle(filters);
  const exportedAt = reportExportTimestamp();
  const sessionHtml = report.sessionRows.map((row) => `
    <tr class="${row.session_status === 'cancelled' ? 'cancelled' : ''}">
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(classTypeLabel(row.class_type))} · ${htmlEscape(row.subject || '—')}</small></td>
      <td><b>${htmlEscape(row.teacher_name || '—')}</b><small>Phòng: ${htmlEscape(row.teaching_room || 'Chưa ghi')}</small></td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${row.session_status === 'cancelled' ? '0' : htmlEscape(String(row.lesson_periods).replace('.', ','))}</td>
      <td>${row.total_students ?? '—'}</td>
      <td>${row.present_count ?? '—'}</td>
      <td>${row.late_count ?? '—'}</td>
      <td>${row.absent_count ?? '—'}</td>
      <td>${row.attendance_rate === null ? '—' : percent(row.attendance_rate)}</td>
      <td><b>${htmlEscape(row.checked_by_name || '—')}</b><small>${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td><b>${htmlEscape(row.latest_changed_by_name || 'Chưa điều chỉnh')}</b><small>${row.latest_changed_at ? htmlEscape(formatCheckedTime(row.latest_changed_at)) : `${Number(row.change_count || 0)} lần`}</small></td>
      <td><b>${row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh'}</b><small>${htmlEscape(row.note || '—')}</small></td>
    </tr>
  `).join('');
  const absenceHtml = report.absenceRows.map((row) => `
    <tr>
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.student_full_name)}</b><small>${htmlEscape(row.student_code || 'Không có mã HS')} · Lớp ${htmlEscape(row.school_class_name || '—')}</small></td>
      <td><b>${htmlEscape(row.reason_label || 'Chưa ghi lý do')}</b><small>${htmlEscape(row.absence_note || '—')}</small></td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(row.subject || '—')}</small></td>
      <td>${htmlEscape(row.teacher_name || '—')}</td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${htmlEscape(row.teaching_room || 'Chưa ghi')}</td>
    </tr>
  `).join('');
  const lateHtml = report.lateRows.map((row) => `
    <tr>
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.student_full_name)}</b><small>${htmlEscape(row.student_code || 'Không có mã HS')} · Lớp ${htmlEscape(row.school_class_name || '—')}</small></td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(row.subject || '—')}</small></td>
      <td>${htmlEscape(row.teacher_name || '—')}</td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${htmlEscape(row.teaching_room || 'Chưa ghi')}</td>
    </tr>
  `).join('');

  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)} ${htmlEscape(periodText(filters))}</title><style>
    /* Approved footer mockup: rich fixed signature + page counter in the page margin. */
    @page{
      size:A4 landscape;
      margin:12mm 10mm 23mm;
      @bottom-right{
        content:"${htmlEscape(exportedAt)}\\A Trang " counter(page) "/" counter(pages);
        white-space:pre;
        font:500 6.8pt/1.42 Arial,"Helvetica Neue",sans-serif;
        color:#65786f;
        text-align:right;
        vertical-align:top;
        padding-top:3.2mm;
      }
    }
    *{box-sizing:border-box}
    html,body{width:100%;max-width:100%}
    body{margin:0;overflow:visible;font-family:Arial,"Helvetica Neue",sans-serif;color:#183229;font-size:8.4px;line-height:1.35;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-page{width:100%;max-width:100%;margin:0 auto;overflow:visible}
    .school-head{display:grid;grid-template-columns:72px 1fr 72px;align-items:center;gap:12px;padding:0 0 4mm;border-bottom:2.4px solid #08783f;break-inside:avoid}
    .school-logo{width:68px;height:68px;display:block;object-fit:contain;object-position:center}
    .school-head__text{text-align:center;min-width:0}
    .school-head__text b{display:block;font-size:10.2px;letter-spacing:.025em;color:#33483f}
    .school-head__text strong{display:block;margin-top:3px;font-size:12.4px;letter-spacing:.02em;color:#08783f}
    .school-head__spacer{width:72px;height:1px}
    .report-title{text-align:center;margin:4mm 0 1.5mm;font-size:17px;letter-spacing:.04em;color:#08783f;text-transform:uppercase}
    .report-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:0 auto 4mm;padding:7px 10px;border:1px solid #cfdfd6;border-radius:7px;background:#f8fbf9;max-width:760px}
    .report-scope span{display:block;color:#53645d}
    .report-scope b{color:#183229}
    .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 4mm}
    .metric{border:1px solid #cfe0d6;border-radius:7px;padding:7px 9px;background:#f5faf7;min-height:47px}
    .metric span{display:block;color:#557066;font-size:7.6px;text-transform:uppercase;font-weight:700;letter-spacing:.03em}
    .metric b{display:block;font-size:15px;color:#08783f;margin-top:3px}
    .section{margin-top:4mm;break-inside:auto}
    .section h2{font-size:10.5px;color:#075f34;margin:0 0 5px;padding:5px 8px;background:#e9f4ed;border-left:3px solid #08783f;break-after:avoid;letter-spacing:.015em}
    .section p.empty{margin:6px 0;padding:8px;background:#f7f9f8;color:#64736e;border-radius:5px}
    table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}
    thead{display:table-header-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    th,td{border:1px solid #c7d5ce;padding:3.5px 3.5px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:normal;font-variant-numeric:tabular-nums}
    th{background:#08783f;color:#fff;font-size:7.1px;font-weight:700;line-height:1.25}
    tbody tr:nth-child(even) td{background:#fbfdfc}
    td b{display:block;font-weight:700}
    td small{display:block;color:#65756d;margin-top:1px;font-size:7.2px;line-height:1.25}
    .cancelled td{background:#fff4df!important}
    .remarks{margin-top:4mm;padding:8px 10px;border:1px solid #c8ddd0;border-radius:7px;background:#f5faf7;break-inside:avoid}
    .remarks b{display:block;margin-bottom:3px;color:#075f34;font-size:8.2px;letter-spacing:.025em}
    .remarks p{margin:0;color:#33483f}
    .reporter{margin:5mm 0 0 auto;width:42%;text-align:center;break-inside:avoid;min-height:31mm}
    .reporter .date{font-style:italic;margin-bottom:10px;color:#4f5f58}
    .reporter strong{display:block;font-size:9.2px}
    .reporter b{display:block;margin-top:17mm;font-size:10px;color:#075f34;min-height:12px}
    .reporter span{display:block;margin-top:2px;min-height:10px}
    .footer{margin-top:5mm;padding:2.8mm 2mm 1mm;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12mm;align-items:center;border-top:1px solid #c9dcd0;color:#52665a;break-inside:avoid}
    .footer__brand{display:flex;align-items:center;gap:3mm;min-width:0}
    .footer__mark{width:24px;height:24px;flex:none;stroke:#08783f}
    .footer__title{font-weight:800;font-size:8.6px;letter-spacing:.025em;color:#145d42}
    .footer__credit{margin-top:1px;font-size:8.1px}
    .footer__credit strong{font-size:8.6px;color:#08783f}
    .footer__purpose{margin-top:1px;font-size:7.2px;font-style:italic;color:#71857a}
    .footer__stamp{text-align:right;white-space:nowrap;font-size:7.8px;color:#697d71}
    .print-footer{display:none}
    @media print{
      html,body,.report-page{width:100%;max-width:100%}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .school-head,.report-scope,.metrics,.remarks,.reporter{break-inside:avoid}
      .section{break-inside:auto}
      .footer{display:none!important}
      .print-footer{
        display:flex!important;
        position:fixed;
        left:0;
        right:0;
        bottom:-18.4mm;
        height:15.3mm;
        padding-top:3mm;
        border-top:.55pt solid #c9dcd0;
        align-items:flex-start;
        color:#52665a;
        background:#fff;
        z-index:20;
      }
      .print-footer__brand{display:flex;align-items:center;gap:2.8mm;max-width:74%;min-width:0}
      .print-footer__mark{width:6.6mm;height:6.6mm;flex:none;stroke:#08783f}
      .print-footer__title{font-weight:800;font-size:7.45pt;line-height:1.12;letter-spacing:.018em;color:#145d42}
      .print-footer__credit{margin-top:.75mm;font-size:6.75pt;line-height:1.14;color:#53665d}
      .print-footer__credit strong{font-size:7pt;color:#08783f;font-weight:800}
      .print-footer__purpose{margin-top:.65mm;font-size:6.25pt;line-height:1.1;font-style:italic;color:#71857a}
    }
  </style></head><body><main class="report-page">
    <div class="school-head">
      <img class="school-logo" src="${PETRUS_KY_SCHOOL_LOGO_DATA_URI}" alt="Logo Trường Pétrus Ký" />
      <div class="school-head__text"><b>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</b><strong>TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ</strong></div>
      <div class="school-head__spacer" aria-hidden="true"></div>
    </div>
    <h1 class="report-title">${htmlEscape(title)}</h1>
    <div class="report-scope">
      <span><b>Kỳ báo cáo:</b> ${htmlEscape(periodText(filters))}</span>
      <span><b>Phạm vi:</b> ${htmlEscape(filters.classLabel || 'Tất cả lớp')} · ${htmlEscape(filters.teacherLabel || 'Tất cả giáo viên')}</span>
    </div>
    <div class="metrics">
      <div class="metric"><span>Buổi đã dạy</span><b>${report.metrics.completedSessions}</b></div>
      <div class="metric"><span>Buổi đã hủy</span><b>${report.metrics.cancelledSessions}</b></div>
      <div class="metric"><span>Tổng số tiết</span><b>${String(report.metrics.totalPeriods).replace('.', ',')}</b></div>
      <div class="metric"><span>Tỷ lệ chuyên cần</span><b>${percent(report.metrics.attendanceRate)}</b></div>
    </div>
    <section class="section"><h2>1. CHI TIẾT BUỔI HỌC</h2><table><thead><tr><th style="width:7%">Ngày</th><th style="width:14%">Lớp / môn</th><th style="width:10%">GV / phòng</th><th style="width:10%">Giờ dạy / chốt</th><th style="width:4%">Tiết</th><th style="width:5%">Sĩ số</th><th style="width:5%">Có mặt</th><th style="width:4%">Đi trễ</th><th style="width:4%">Vắng</th><th style="width:6%">Tỷ lệ</th><th style="width:9%">Người điểm danh</th><th style="width:11%">Người điều chỉnh gần nhất</th><th style="width:11%">Trạng thái / ghi chú</th></tr></thead><tbody>${sessionHtml || '<tr><td colspan="13">Không có dữ liệu phù hợp bộ lọc.</td></tr>'}</tbody></table></section>
    <section class="section"><h2>2. CHI TIẾT HỌC SINH VẮNG</h2>${absenceHtml ? `<table><thead><tr><th style="width:9%">Ngày</th><th style="width:22%">Học sinh</th><th style="width:18%">Lý do / ghi chú</th><th style="width:18%">Lớp / môn</th><th style="width:15%">Giáo viên</th><th style="width:12%">Giờ dạy / chốt</th><th>Phòng</th></tr></thead><tbody>${absenceHtml}</tbody></table>` : '<p class="empty">Không có học sinh vắng trong dữ liệu phù hợp bộ lọc.</p>'}</section>
    <section class="section"><h2>3. CHI TIẾT HỌC SINH ĐI TRỄ</h2>${lateHtml ? `<table><thead><tr><th style="width:10%">Ngày</th><th style="width:26%">Học sinh</th><th style="width:22%">Lớp / môn</th><th style="width:18%">Giáo viên</th><th style="width:16%">Giờ dạy / chốt</th><th>Phòng</th></tr></thead><tbody>${lateHtml}</tbody></table>` : '<p class="empty">Không có học sinh đi trễ trong dữ liệu phù hợp bộ lọc.</p>'}</section>
    <div class="remarks"><b>NHẬN XÉT CHUNG</b><p>${htmlEscape(filters.generalRemarks || 'Không có nhận xét chung.')}</p></div>
    <div class="reporter"><div class="date">${htmlEscape(vietnamReportDate())}</div><strong>NGƯỜI BÁO CÁO</strong><b>${filters.reporterName ? htmlEscape(filters.reporterName) : '&nbsp;'}</b><span>${filters.reporterTitle ? htmlEscape(filters.reporterTitle) : '&nbsp;'}</span></div>
    <footer class="footer" aria-label="Đơn vị thiết kế hệ thống báo cáo">
      <div class="footer__brand">
        <svg class="footer__mark" viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9.8 3h4.4l.8 2 2.1.8 1.9-1 3 3-1 1.9.9 2.1L24 12v4l-2.1.8-.9 2.1 1 1.9-3 3-1.9-1-2.1.8-.8 2H9.8l-.8-2-2.1-.8-1.9 1-3-3 1-1.9-.9-2.1L0 16v-4l2.1-.8.9-2.1-1-1.9 3-3 1.9 1L9 5Z" transform="translate(0 -1.5)"/>
          <circle cx="12" cy="12" r="3.2"/>
        </svg>
        <div>
          <div class="footer__title">HỆ THỐNG BÁO CÁO ĐIỂM DANH SỐ · PÉTRUS KÝ</div>
          <div class="footer__credit">Thiết kế &amp; phát triển: <strong>Nguyễn Anh Tuấn</strong> · Tổ trưởng chuyên môn Tiếng Anh</div>
          <div class="footer__purpose">Phục vụ công tác quản lý và theo dõi chuyên cần nội bộ</div>
        </div>
      </div>
      <div class="footer__stamp">${htmlEscape(exportedAt)}</div>
    </footer>
  </main>
  <div class="print-footer" aria-hidden="true">
    <div class="print-footer__brand">
      <svg class="print-footer__mark" viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.8 3h4.4l.8 2 2.1.8 1.9-1 3 3-1 1.9.9 2.1L24 12v4l-2.1.8-.9 2.1 1 1.9-3 3-1.9-1-2.1.8-.8 2H9.8l-.8-2-2.1-.8-1.9 1-3-3 1-1.9-.9-2.1L0 16v-4l2.1-.8.9-2.1-1-1.9 3-3 1.9 1L9 5Z" transform="translate(0 -1.5)"/>
        <circle cx="12" cy="12" r="3.2"/>
      </svg>
      <div>
        <div class="print-footer__title">HỆ THỐNG BÁO CÁO ĐIỂM DANH SỐ · PÉTRUS KÝ</div>
        <div class="print-footer__credit">Thiết kế &amp; phát triển: <strong>Nguyễn Anh Tuấn</strong> · Tổ trưởng chuyên môn Tiếng Anh</div>
        <div class="print-footer__purpose">Phục vụ công tác quản lý và theo dõi chuyên cần nội bộ</div>
      </div>
    </div>
  </div>
  </body></html>`);
  popup.document.close();
  await waitForPrintWindowLoad(popup);
  await waitForReportImages(popup);
  if (typeof popup.requestAnimationFrame === 'function') {
    await new Promise((resolve) => popup.requestAnimationFrame(() => popup.requestAnimationFrame(resolve)));
  }
  popup.focus();
  popup.print();
}