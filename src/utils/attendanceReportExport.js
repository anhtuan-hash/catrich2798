import { createXlsxBlob } from './simpleXlsx.js';

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
    row.total_periods,
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
    ['Giáo viên', 'Số buổi đã dạy', 'Tổng số tiết', 'Số lớp', 'Lượt có mặt', 'Lượt vắng', 'Tỷ lệ chuyên cần'],
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
    ['Ngày', 'Giờ dạy', 'Giờ chốt', 'Lớp', 'Loại lớp', 'Môn', 'Phòng học', 'Giáo viên thực dạy', 'Số tiết', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ chuyên cần', 'Trạng thái', 'Ghi chú / lý do hủy'],
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
      merges: ['A1:G1', 'A2:G2', 'A3:G3'],
      columnWidths: [31, 16, 16, 12, 15, 15, 18],
      rowHeights: { 1: 22, 2: 22, 3: 28, 5: 28 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 5: 4, ...buildRowStyles(6, teacherData.length, 5) },
      cellStyles: buildColumnCellStyles('G', 6, teacherData.length, 8),
      freezeRows: 5,
      autoFilter: `A5:G${5 + teacherBodyCount}`,
    },
    {
      name: 'Chi tiet buoi hoc',
      rows: sessionRows,
      merges: ['A1:O1', 'A2:O2', 'A3:O3'],
      columnWidths: [12, 17, 13, 25, 17, 18, 14, 27, 10, 10, 10, 10, 16, 15, 35],
      rowHeights: { 1: 22, 2: 22, 3: 28, 5: 34 },
      rowStyles: { 1: 1, 2: 1, 3: 2, 5: 4, ...buildRowStyles(6, sessionData.length, 6) },
      cellStyles: buildColumnCellStyles('M', 6, sessionData.length, 8),
      freezeRows: 5,
      autoFilter: `A5:O${5 + sessionBodyCount}`,
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

function waitForPrintWindowLoad(popup) {
  if (popup.document?.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => popup.addEventListener('load', resolve, { once: true }));
}

export async function printAttendanceReportPdf(report, filters = {}) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* Browser may already isolate the popup. */ }

  const title = reportTitle(filters);
  const teacherHtml = report.teacherRows.map((row) => `
    <tr><td>${htmlEscape(row.teacher_name)}</td><td>${row.completed_sessions}</td><td>${String(row.total_periods).replace('.', ',')}</td><td>${row.distinct_classes}</td><td>${row.present_instances}</td><td>${row.absent_instances}</td><td>${percent(row.attendance_rate)}</td></tr>
  `).join('');
  const sessionHtml = report.sessionRows.map((row) => `
    <tr class="${row.session_status === 'cancelled' ? 'cancelled' : ''}">
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(classTypeLabel(row.class_type))} · ${htmlEscape(row.subject || '—')}</small></td>
      <td><b>${htmlEscape(row.teacher_name || '—')}</b><small>Phòng: ${htmlEscape(row.teaching_room || 'Chưa ghi')}</small></td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${row.session_status === 'cancelled' ? '0' : htmlEscape(String(row.lesson_periods).replace('.', ','))}</td>
      <td>${row.total_students ?? '—'}</td><td>${row.present_count ?? '—'}</td><td>${row.absent_count ?? '—'}</td>
      <td>${row.attendance_rate === null ? '—' : percent(row.attendance_rate)}</td>
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

  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${htmlEscape(title)} ${htmlEscape(periodText(filters))}</title><style>
    @page{size:A4 portrait;margin:21mm 10mm 14mm}*{box-sizing:border-box}html,body{width:100%;max-width:100%}body{margin:0;overflow:visible;font-family:Arial,"Helvetica Neue",sans-serif;color:#173128;font-size:8.1px;line-height:1.35;background:#fff}.report-page{width:100%;max-width:100%;margin:0 auto;overflow:visible}.school-head{border-bottom:2px solid #0b6b3a;padding:0 0 3mm;margin-bottom:3mm;text-align:center}.school-head__text{text-align:center;min-width:0}.school-head__text b{display:block;font-size:9.7px;letter-spacing:.02em}.school-head__text strong{display:block;font-size:11.5px;margin-top:3px;color:#0b6b3a}.report-title{text-align:center;margin:10px 0 3px;font-size:16px;letter-spacing:.035em;color:#0b6b3a}.period{text-align:center;font-size:10px;font-weight:700;margin-bottom:3px}.filters{text-align:center;color:#53645d;margin-bottom:10px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:9px 0 12px}.metric{border:1px solid #d4e3da;border-radius:7px;padding:7px 8px;background:#f6faf7}.metric span{display:block;color:#557066;font-size:7.4px;text-transform:uppercase;font-weight:700}.metric b{display:block;font-size:15px;color:#0b6b3a;margin-top:2px}.section{margin-top:12px;break-inside:auto}.section h2{font-size:10.3px;color:#0b6b3a;margin:0 0 5px;padding:5px 7px;background:#e7f3eb;border-left:3px solid #0b6b3a;break-after:avoid}.section p.empty{margin:6px 0;padding:8px;background:#f7f9f8;color:#64736e;border-radius:5px}table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #d4ddd8;padding:4px 4px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word;font-variant-numeric:tabular-nums}th{background:#0b6b3a;color:#fff;font-size:7.1px;font-weight:700}td b{display:block}td small{display:block;color:#627069;margin-top:1px}.cancelled td{background:#fff4df}.remarks{margin-top:12px;padding:8px 10px;border:1px solid #c8ddd0;border-radius:7px;background:#f5faf7;break-inside:avoid}.remarks b{display:block;color:#0b6b3a;margin-bottom:3px}.reporter{margin:16px 0 0 auto;width:48%;text-align:center;break-inside:avoid}.reporter .date{font-style:italic;margin-bottom:11px}.reporter strong{display:block;font-size:9px}.reporter b{display:block;margin-top:16px;font-size:10px;color:#0b6b3a}.reporter span{display:block;margin-top:2px}.footer{margin-top:12px;border-top:1px solid #d7e1dc;padding-top:5px;color:#728079;text-align:center;font-size:7px}@media print{html,body,.report-page{width:100%;max-width:100%}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.section{break-inside:auto}.remarks,.reporter,.school-head{break-inside:avoid}}
  </style></head><body><main class="report-page">
    <div class="school-head"><div class="school-head__text"><b>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</b><strong>TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ</strong></div></div>
    <h1 class="report-title">${htmlEscape(title)}</h1><div class="period">${htmlEscape(periodText(filters))}</div><div class="filters">${htmlEscape(filters.classLabel || 'Tất cả lớp')} · ${htmlEscape(filters.teacherLabel || 'Tất cả giáo viên')}</div>
    <div class="metrics"><div class="metric"><span>Buổi đã dạy</span><b>${report.metrics.completedSessions}</b></div><div class="metric"><span>Buổi đã hủy</span><b>${report.metrics.cancelledSessions}</b></div><div class="metric"><span>Tổng số tiết</span><b>${String(report.metrics.totalPeriods).replace('.', ',')}</b></div><div class="metric"><span>Tỷ lệ chuyên cần</span><b>${percent(report.metrics.attendanceRate)}</b></div></div>
    <section class="section"><h2>1. THỐNG KÊ THEO GIÁO VIÊN</h2><table><thead><tr><th style="width:28%">Giáo viên</th><th>Buổi</th><th>Tiết</th><th>Lớp</th><th>Có mặt</th><th>Vắng</th><th>Chuyên cần</th></tr></thead><tbody>${teacherHtml || '<tr><td colspan="7">Không có dữ liệu phù hợp bộ lọc.</td></tr>'}</tbody></table></section>
    <section class="section"><h2>2. CHI TIẾT BUỔI HỌC</h2><table><thead><tr><th style="width:8%">Ngày</th><th style="width:18%">Lớp / môn</th><th style="width:16%">GV / phòng</th><th style="width:14%">Giờ dạy / chốt</th><th>Tiết</th><th>Sĩ số</th><th>Có mặt</th><th>Vắng</th><th>Tỷ lệ</th><th style="width:15%">Trạng thái / ghi chú</th></tr></thead><tbody>${sessionHtml || '<tr><td colspan="10">Không có dữ liệu phù hợp bộ lọc.</td></tr>'}</tbody></table></section>
    <section class="section"><h2>3. CHI TIẾT HỌC SINH VẮNG</h2>${absenceHtml ? `<table><thead><tr><th style="width:9%">Ngày</th><th style="width:22%">Học sinh</th><th style="width:18%">Lý do / ghi chú</th><th style="width:18%">Lớp / môn</th><th style="width:15%">Giáo viên</th><th style="width:12%">Giờ dạy / chốt</th><th>Phòng</th></tr></thead><tbody>${absenceHtml}</tbody></table>` : '<p class="empty">Không có học sinh vắng trong dữ liệu phù hợp bộ lọc.</p>'}</section>
    <div class="remarks"><b>NHẬN XÉT CHUNG</b>${htmlEscape(filters.generalRemarks || 'Không có nhận xét chung.')}</div>
    <div class="reporter"><div class="date">${htmlEscape(vietnamReportDate())}</div><strong>NGƯỜI BÁO CÁO</strong><b>${htmlEscape(filters.reporterName || 'Chưa ghi')}</b><span>${htmlEscape(filters.reporterTitle || 'Chưa ghi chức vụ')}</span></div>
    <div class="footer">Báo cáo được lập từ phân hệ Điểm danh lớp phụ đạo &amp; bồi dưỡng.</div>
  </main>
  </body></html>`);
  popup.document.close();
  await waitForPrintWindowLoad(popup);
  if (typeof popup.requestAnimationFrame === 'function') {
    await new Promise((resolve) => popup.requestAnimationFrame(() => popup.requestAnimationFrame(resolve)));
  }
  popup.focus();
  popup.print();
}
