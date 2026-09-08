import { createXlsxBlob } from './simpleXlsx.js';

function percent(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1).replace('.', ',')}%`;
}

function periods(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value);
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

export function downloadAttendanceReportXlsx(report, filters = {}) {
  const month = String(filters.month || 'thang').replace(/[^0-9-]/g, '');
  const overview = [
    ['BÁO CÁO ĐIỂM DANH THEO THÁNG'],
    ['Tháng', filters.month || ''],
    ['Lớp', filters.classLabel || 'Tất cả lớp'],
    ['Giáo viên', filters.teacherLabel || 'Tất cả giáo viên'],
    [],
    ['Chỉ số', 'Giá trị'],
    ['Tổng buổi đã dạy', report.metrics.completedSessions],
    ['Buổi đã hủy', report.metrics.cancelledSessions],
    ['Tổng số tiết', report.metrics.totalPeriods],
    ['Lượt học sinh có mặt', report.metrics.presentInstances],
    ['Lượt học sinh vắng', report.metrics.absentInstances],
    ['Tỷ lệ chuyên cần', percent(report.metrics.attendanceRate)],
  ];

  const teacherRows = [
    ['Giáo viên', 'Số buổi đã dạy', 'Tổng số tiết', 'Số lớp', 'Lượt có mặt', 'Lượt vắng', 'Tỷ lệ chuyên cần'],
    ...report.teacherRows.map((row) => [
      row.teacher_name,
      row.completed_sessions,
      row.total_periods,
      row.distinct_classes,
      row.present_instances,
      row.absent_instances,
      percent(row.attendance_rate),
    ]),
  ];

  const sessionRows = [
    ['Ngày', 'Lớp', 'Môn', 'Giáo viên', 'Trạng thái', 'Số tiết', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ', 'Ghi chú / lý do hủy'],
    ...report.sessionRows.map((row) => [
      row.attendance_date,
      row.class_name,
      row.subject,
      row.teacher_name || '',
      row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh',
      periods(row.lesson_periods),
      row.total_students ?? '—',
      row.present_count ?? '—',
      row.absent_count ?? '—',
      row.attendance_rate === null ? '—' : percent(row.attendance_rate),
      row.note || '',
    ]),
  ];

  const absenceRows = [
    ['Ngày', 'Lớp', 'Môn', 'Giáo viên', 'Mã HS', 'Họ và tên', 'Lớp chính khóa'],
    ...report.absenceRows.map((row) => [
      row.attendance_date,
      row.class_name,
      row.subject,
      row.teacher_name,
      row.student_code,
      row.student_full_name,
      row.school_class_name,
    ]),
  ];

  const blob = createXlsxBlob([
    { name: 'Tong quan', rows: overview },
    { name: 'Theo giao vien', rows: teacherRows },
    { name: 'Chi tiet buoi hoc', rows: sessionRows },
    { name: 'Chi tiet vang', rows: absenceRows },
  ]);
  downloadBlob(blob, `bao-cao-diem-danh-${month || 'thang'}.xlsx`);
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printAttendanceReportPdf(report, filters = {}) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* Browser may already isolate the popup. */ }

  const teacherHtml = report.teacherRows.map((row) => `
    <tr><td>${htmlEscape(row.teacher_name)}</td><td>${row.completed_sessions}</td><td>${row.total_periods}</td><td>${row.distinct_classes}</td><td>${percent(row.attendance_rate)}</td></tr>
  `).join('');
  const sessionHtml = report.sessionRows.map((row) => `
    <tr class="${row.session_status === 'cancelled' ? 'cancelled' : ''}"><td>${htmlEscape(row.attendance_date)}</td><td>${htmlEscape(row.class_name)}</td><td>${htmlEscape(row.teacher_name || '—')}</td><td>${row.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh'}</td><td>${row.lesson_periods}</td><td>${row.present_count ?? '—'}</td><td>${row.absent_count ?? '—'}</td><td>${htmlEscape(row.note || '')}</td></tr>
  `).join('');

  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo điểm danh ${htmlEscape(filters.month || '')}</title><style>
    @page{size:A4 landscape;margin:12mm} body{font-family:Arial,sans-serif;color:#1b1b1f;font-size:10px} h1{font-size:20px;margin:0 0 6px} .meta{margin-bottom:14px;color:#51545c}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metric{border:1px solid #d8dae4;border-radius:10px;padding:10px}.metric b{display:block;font-size:18px;margin-top:3px} h2{font-size:13px;margin:18px 0 7px} table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8dae4;padding:5px 6px;text-align:left;vertical-align:top}th{background:#eef1f8}.cancelled{background:#fff0dc} .foot{margin-top:12px;color:#666}
  </style></head><body>
    <h1>Báo cáo điểm danh theo tháng</h1>
    <div class="meta">Tháng ${htmlEscape(filters.month || '')} · ${htmlEscape(filters.classLabel || 'Tất cả lớp')} · ${htmlEscape(filters.teacherLabel || 'Tất cả giáo viên')}</div>
    <div class="metrics"><div class="metric">Buổi đã dạy<b>${report.metrics.completedSessions}</b></div><div class="metric">Buổi đã hủy<b>${report.metrics.cancelledSessions}</b></div><div class="metric">Tổng số tiết<b>${report.metrics.totalPeriods}</b></div><div class="metric">Tỷ lệ chuyên cần<b>${percent(report.metrics.attendanceRate)}</b></div></div>
    <h2>Theo giáo viên</h2><table><thead><tr><th>Giáo viên</th><th>Số buổi</th><th>Tổng số tiết</th><th>Số lớp</th><th>Chuyên cần</th></tr></thead><tbody>${teacherHtml || '<tr><td colspan="5">Không có dữ liệu.</td></tr>'}</tbody></table>
    <h2>Chi tiết buổi học</h2><table><thead><tr><th>Ngày</th><th>Lớp</th><th>Giáo viên</th><th>Trạng thái</th><th>Số tiết</th><th>Có mặt</th><th>Vắng</th><th>Ghi chú / lý do hủy</th></tr></thead><tbody>${sessionHtml || '<tr><td colspan="8">Không có dữ liệu.</td></tr>'}</tbody></table>
    <div class="foot">Xuất từ Brian English · Báo cáo điểm danh</div>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script>
  </body></html>`);
  popup.document.close();
}
