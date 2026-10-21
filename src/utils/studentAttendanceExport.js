import { createXlsxBlob } from './simpleXlsx.js';
import PETRUS_KY_SCHOOL_LOGO_DATA_URI from '../assets/petrus-ky-school-logo.png?inline';
import { absenceReasonLabel } from './attendanceReport.js';
import { attendanceFooterSignatureDataUri, reportExportTimestamp, vietnamReportDate, waitForPrintWindowLoad, waitForReportImages } from './attendanceReportExport.js';

const SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';
const title = 'BÁO CÁO TÌNH HÌNH THAM GIA HỌC TẬP THEO HỌC SINH';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const prettyDate = (value) => String(value || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
const statusName = (status) => status === 'late' ? 'Đi trễ' : status === 'present' ? 'Có mặt' : 'Vắng';
const levelName = (status) => ({ danger: 'Cần quan tâm', watch: 'Cần theo dõi', good: 'Tốt', unknown: 'Chưa đánh giá' }[status] || status);
const typeName = (type) => ({ gifted: 'Bồi dưỡng', remedial: 'Phụ đạo', supplemental: 'Học bổ sung' }[type] || type);
const rateText = (value) => value === null ? 'Chưa có dữ liệu' : (value * 100).toFixed(1).replace('.', ',') + '%';
const absenceReasonText = (detail) => detail.status === 'absent' ? absenceReasonLabel(detail.absenceReason) : '—';
const fileName = (opts, extension) => 'chuyen-can-hoc-sinh-' + String(opts.from || 'all') + '-' + String(opts.to || 'all') + '.' + extension;

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadStudentAttendanceExcel(students, filters = {}) {
  const allDetails = students.flatMap((student) =>
    student.details.map((detail) => ({ student, detail })));
  const summary = [
    [SCHOOL], [title], ['Thời gian', prettyDate(filters.from) + ' – ' + prettyDate(filters.to)],
    ['Loại hình', typeName(filters.activityType) || 'Tất cả'], [],
    ['Mã học sinh', 'Học sinh', 'Lớp hành chính', 'Số lớp học', 'Số buổi', 'Tổng tiết', 'Tiết có mặt', 'Tiết vắng', 'Buổi đi trễ', 'Vắng có phép', 'Vắng không phép', 'Chuyên cần (%)', 'Đánh giá'],
    ...students.map((s) => [s.studentCode, s.name, s.schoolClass, s.classCount, s.sessionCount, s.totalPeriods, s.presentPeriods, s.absentPeriods, s.lateCount, s.excusedCount, s.unexcusedCount, s.rate === null ? '' : Math.round(s.rate * 1000) / 10, levelName(s.alert)]),
  ];
  const detail = [
    [SCHOOL], ['CHI TIẾT ĐIỂM DANH HỌC SINH'], ['Thời gian', prettyDate(filters.from) + ' – ' + prettyDate(filters.to)], [],
    ['Ngày', 'Mã HS', 'Họ tên', 'Lớp hành chính', 'Lớp học', 'Loại hình', 'Môn', 'Giáo viên', 'Phòng', 'Giờ học', 'Số tiết', 'Trạng thái', 'Lý do vắng', 'Ghi chú'],
    ...allDetails.map(({student:s,detail:d})=>[prettyDate(d.date),s.studentCode,s.name,s.schoolClass,d.className,typeName(d.activityType),d.subject,d.teacher,d.room,d.timeRange,d.periods,statusName(d.status),absenceReasonText(d),d.absenceNote]),
  ];
  const byClass = new Map();
  allDetails.forEach(({student:s, detail:d}) => {
    const key = s.schoolClass || 'Chưa ghi';
    const r = byClass.get(key) || {className:key,students:new Set(),total:0,present:0,absent:0};
    r.students.add(s.key); r.total += d.periods;
    if(d.status==='absent')r.absent+=d.periods; else r.present+=d.periods;
    byClass.set(key,r);
  });
  const classes = [
    [SCHOOL], ['TỔNG HỢP THEO LỚP HÀNH CHÍNH'], [],
    ['Lớp', 'Số học sinh', 'Lượt tiết', 'Tiết có mặt', 'Tiết vắng', 'Chuyên cần (%)'],
    ...[...byClass.values()].sort((a,b)=>a.className.localeCompare(b.className,'vi')).map(c=>[c.className,c.students.size,Math.round(c.total*100)/100,Math.round(c.present*100)/100,Math.round(c.absent*100)/100,c.total?Math.round(c.present/c.total*1000)/10:'']),
  ];
  const alerts = [
    [SCHOOL], ['DANH SÁCH HỌC SINH CẦN THEO DÕI'], [],
    ['Mã HS','Họ và tên','Lớp','Chuyên cần (%)','Vắng không phép','Đi trễ','Mức cảnh báo'],
    ...students.filter(s=>s.alert==='danger'||s.alert==='watch').map(s=>[s.studentCode,s.name,s.schoolClass,s.rate===null?'':Math.round(s.rate*1000)/10,s.unexcusedCount,s.lateCount,levelName(s.alert)]),
  ];
  const blob = createXlsxBlob([
    { name:'Tong hop hoc sinh', rows:summary, merges:['A1:M1','A2:M2'], columnWidths:[16,31,17,13,12,14,14,14,15,17,19,19,20], freezeRows:6, autoFilter:'A6:M'+Math.max(7,summary.length), rowStyles:{1:1,2:2,6:4} },
    { name:'Chi tiet diem danh', rows:detail, merges:['A1:N1','A2:N2'], columnWidths:[15,16,31,18,28,19,20,29,16,19,13,16,21,37], freezeRows:5, autoFilter:'A5:N'+Math.max(6,detail.length), rowStyles:{1:1,2:2,5:4} },
    { name:'Theo lop', rows:classes, merges:['A1:F1','A2:F2'], columnWidths:[21,17,18,20,18,20], freezeRows:4, autoFilter:'A4:F'+Math.max(5,classes.length), rowStyles:{1:1,2:2,4:4} },
    { name:'Can theo doi', rows:alerts, merges:['A1:G1','A2:G2'], columnWidths:[17,33,17,19,23,14,23], freezeRows:4, autoFilter:'A4:G'+Math.max(5,alerts.length), rowStyles:{1:1,2:2,4:4} },
  ]);
  download(blob, fileName(filters,'xlsx'));
}


function reportSchoolHeading() {
  return '<div class="school-head">' +
    '<img class="school-logo" src="' + PETRUS_KY_SCHOOL_LOGO_DATA_URI + '" alt="Logo Trường Pétrus Ký" />' +
    '<div class="school-head__text"><b>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</b><strong>' + esc(SCHOOL) + '</strong></div>' +
    '<div class="school-head__spacer" aria-hidden="true"></div></div>';
}

function reportScope(filters, extra) {
  return '<div class="report-scope"><span><b>Kỳ báo cáo:</b> ' +
    esc(prettyDate(filters.from)) + ' – ' + esc(prettyDate(filters.to)) +
    '</span><span><b>Phạm vi:</b> ' + esc(extra) + '</span></div>';
}

function reportMetric(label, value) {
  return '<div class="metric"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
}

function reportAuthor(filters) {
  return '<div class="reporter"><div class="date">' + esc(vietnamReportDate()) +
    '</div><strong>NGƯỜI BÁO CÁO</strong><b>' + (esc(filters.reporterName) || '&nbsp;') +
    '</b><span>' + (esc(filters.reporterTitle) || '&nbsp;') + '</span></div>';
}

function reportSection(titleText, headings, body, emptyMessage) {
  const table = body
    ? '<table><thead><tr>' + headings.map(item => '<th>' + esc(item) + '</th>').join('') +
        '</tr></thead><tbody>' + body + '</tbody></table>'
    : '<p class="empty">' + esc(emptyMessage) + '</p>';
  return '<section class="section"><h2>' + esc(titleText) + '</h2>' + table + '</section>';
}

function reportFooterHtml(exportedAt) {
  // On screen: same brand footer as teacher report. Print: footer runs in each
  // physical page margin via the same SVG from attendanceReportExport.js.
  return '<footer class="footer" aria-label="Đơn vị thiết kế hệ thống báo cáo">' +
    '<div><strong>HỆ THỐNG BÁO CÁO ĐIỂM DANH SỐ · PÉTRUS KÝ</strong>' +
    '<div>Thiết kế &amp; phát triển: <b>Nguyễn Anh Tuấn</b> · Tổ trưởng chuyên môn Tiếng Anh</div>' +
    '<i>Phục vụ công tác quản lý và theo dõi chuyên cần nội bộ</i></div>' +
    '<span>' + esc(exportedAt) + '</span></footer>';
}

function printStyles(isIndividual, exportedAt, footerImage) {
  // Match the existing attendance teacher-report page margins, colors, A4
  // layout and bottom-margin branding; never overlay the last table row.
  const paper = isIndividual ? 'A4 portrait' : 'A4 landscape';
  return '@page{size:' + paper + ';margin:12mm 10mm 23mm;' +
    '@bottom-left{content:url("' + footerImage + '");width:76%;vertical-align:top;' +
      'padding-top:2.4mm;border-top:.55pt solid #c9dcd0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
    '@bottom-right{content:"' + esc(exportedAt) + '\\A Trang " counter(page) "/" counter(pages);' +
      'width:24%;white-space:pre;font:500 6.7pt/1.48 Arial,"Helvetica Neue",sans-serif;' +
      'color:#65786f;text-align:right;vertical-align:top;padding-top:3.7mm;border-top:.55pt solid #c9dcd0;}}' +
    '*{box-sizing:border-box}html,body{width:100%;max-width:100%}' +
    'body{margin:0;overflow:visible;font-family:Arial,"Helvetica Neue",sans-serif;color:#183229;font-size:8.4px;line-height:1.35;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.report-page{width:100%;max-width:100%;margin:0 auto;overflow:visible}' +
    '.report-sheet{break-after:page;page-break-after:always}.report-sheet:last-of-type{break-after:auto;page-break-after:auto}' +
    '.school-head{display:grid;grid-template-columns:72px 1fr 72px;align-items:center;gap:12px;padding:0 0 4mm;border-bottom:2.4px solid #08783f;break-inside:avoid}' +
    '.school-logo{width:68px;height:68px;display:block;object-fit:contain;object-position:center}' +
    '.school-head__text{text-align:center;min-width:0}' +
    '.school-head__text b{display:block;font-size:10.2px;letter-spacing:.025em;color:#33483f}' +
    '.school-head__text strong{display:block;margin-top:3px;font-size:12.4px;letter-spacing:.02em;color:#08783f}' +
    '.school-head__spacer{width:72px;height:1px}' +
    '.report-title{text-align:center;margin:4mm 0 1.5mm;font-size:17px;letter-spacing:.04em;color:#08783f;text-transform:uppercase}' +
    '.report-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:0 auto 4mm;padding:7px 10px;border:1px solid #cfdfd6;border-radius:7px;background:#f8fbf9;max-width:760px}' +
    '.report-scope span{display:block;color:#53645d}.report-scope b{color:#183229}' +
    '.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 4mm}' +
    '.metric{border:1px solid #cfe0d6;border-radius:7px;padding:7px 9px;background:#f5faf7;min-height:47px}' +
    '.metric span{display:block;color:#557066;font-size:7.6px;text-transform:uppercase;font-weight:700;letter-spacing:.03em}' +
    '.metric b{display:block;font-size:15px;color:#08783f;margin-top:3px}' +
    '.section{margin-top:4mm;break-inside:auto}.section h2{font-size:10.5px;color:#075f34;margin:0 0 5px;padding:5px 8px;background:#e9f4ed;border-left:3px solid #08783f;break-after:avoid;letter-spacing:.015em}' +
    '.section p.empty{margin:6px 0;padding:8px;background:#f7f9f8;color:#64736e;border-radius:5px}' +
    '.student-identity{border:1px solid #cfdfd6;border-radius:7px;background:#f8fbf9;padding:7px 10px;margin-bottom:4mm}' +
    '.student-identity strong{display:block;font-size:12px;color:#08783f}.student-identity small{color:#53645d}' +
    '.student-note{padding:8px 10px;border:1px solid #c8ddd0;border-radius:7px;background:#f5faf7;break-inside:avoid}' +
    'table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}' +
    'thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}' +
    'th,td{border:1px solid #c7d5ce;padding:3.5px;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:normal;font-variant-numeric:tabular-nums}' +
    'th{background:#08783f;color:#fff;font-size:7.1px;font-weight:700;line-height:1.25}' +
    'tbody tr:nth-child(even) td{background:#fbfdfc}td b{display:block;font-weight:700}' +
    'td small{display:block;color:#65756d;margin-top:1px;font-size:7.2px;line-height:1.25}' +
    '.reporter{margin:5mm 0 0 auto;width:42%;text-align:center;break-inside:avoid;min-height:31mm}' +
    '.reporter .date{font-style:italic;margin-bottom:10px;color:#4f5f58}' +
    '.reporter strong{display:block;font-size:9.2px}' +
    '.reporter b{display:block;margin-top:17mm;font-size:10px;color:#075f34;min-height:12px}' +
    '.reporter span{display:block;margin-top:2px;min-height:10px}' +
    '.footer{margin-top:5mm;padding:2.8mm 2mm 1mm;display:flex;justify-content:space-between;gap:12mm;border-top:1px solid #c9dcd0;color:#52665a;break-inside:avoid}' +
    '.footer strong{color:#145d42}.footer i{font-size:7.2px;color:#71857a}' +
    '@media print{html,body,.report-page{width:100%;max-width:100%}' +
    '.school-head,.report-scope,.metrics,.student-identity,.reporter{break-inside:avoid}' +
    '.footer{display:none!important}}';
}

function studentReportPage(student, filters, displayAuthor) {
  const name = esc(student.name || 'Chưa ghi họ tên');
  const sessionRows = student.details.map(d =>
    '<tr><td>' + esc(prettyDate(d.date)) + '</td>' +
    '<td><b>' + esc(d.className) + '</b><small>' + esc(typeName(d.activityType)) + '</small></td>' +
    '<td>' + esc(d.subject) + '</td><td>' + esc(d.teacher || '—') + '</td>' +
    '<td>' + esc(d.periods) + '</td><td>' + esc(statusName(d.status)) + '</td>' +
    '<td><b>' + esc(absenceReasonText(d)) + '</b><small>' + esc(d.absenceNote || '') + '</small></td></tr>'
  ).join('');
  const subjectRows = student.subjectRows.map(row =>
    '<tr><td>' + esc(row.subject) + '</td><td>' + esc(row.total) + '</td>' +
    '<td>' + esc(row.present) + '</td><td>' + esc(row.absent) + '</td></tr>'
  ).join('');
  const studentName = name + (student.studentCode ? ' · ' + esc(student.studentCode) : '');
  return '<section class="report-sheet">' + reportSchoolHeading() +
    '<h1 class="report-title">' + esc(title) + '</h1>' +
    reportScope(filters, escNotNeededActivity(filters.activityType)) +
    '<div class="student-identity"><strong>' + studentName + '</strong>' +
    '<small>Lớp hành chính: ' + esc(student.schoolClass || 'Chưa ghi') +
    ' · Số lớp học: ' + esc(student.classCount) +
    ' · Số buổi đã chốt: ' + esc(student.sessionCount) + '</small></div>' +
    '<div class="metrics">' + reportMetric('Tổng lượt tiết', student.totalPeriods) +
    reportMetric('Tiết có mặt', student.presentPeriods) +
    reportMetric('Tiết vắng', student.absentPeriods) +
    reportMetric('Tỷ lệ chuyên cần', rateText(student.rate)) + '</div>' +
    '<div class="student-note"><b>Đánh giá chuyên cần: ' + esc(levelName(student.alert)) +
    '</b> · Đi trễ: ' + esc(student.lateCount) +
    ' buổi · Vắng có phép: ' + esc(student.excusedCount) +
    ' buổi · Vắng không phép: ' + esc(student.unexcusedCount) + ' buổi</div>' +
    reportSection('1. THỐNG KÊ THEO MÔN HỌC', ['Môn học', 'Tổng tiết', 'Có mặt', 'Vắng'], subjectRows, 'Chưa có dữ liệu môn học.') +
    reportSection('2. CHI TIẾT LỊCH SỬ THAM GIA HỌC TẬP',
      ['Ngày', 'Lớp / hoạt động', 'Môn', 'Giáo viên', 'Tiết', 'Trạng thái', 'Lý do / ghi chú'],
      sessionRows, 'Chưa có buổi học được chốt.') +
    (displayAuthor ? reportAuthor(filters) : '') +
    '</section>';
}

function escNotNeededActivity(activity) {
  return activity === 'all' ? 'Tất cả loại hình' : (typeName(activity === 'enrichment' ? 'gifted' : activity) || 'Tất cả loại hình');
}

function summaryReportPage(students, filters) {
  const totals = students.reduce((a, student) => ({
    total: a.total + Number(student.totalPeriods || 0),
    present: a.present + Number(student.presentPeriods || 0),
    absent: a.absent + Number(student.absentPeriods || 0),
    atRisk: a.atRisk + Number(['danger', 'watch'].includes(student.alert)),
  }), {total:0,present:0,absent:0,atRisk:0});
  const summaryRows = students.map(student =>
    '<tr><td>' + esc(student.studentCode || '—') + '</td>' +
    '<td>' + esc(student.name) + '</td>' +
    '<td>' + esc(student.schoolClass || '—') + '</td>' +
    '<td>' + esc(student.totalPeriods) + '</td>' +
    '<td>' + esc(student.presentPeriods) + '</td>' +
    '<td>' + esc(student.absentPeriods) + '</td>' +
    '<td>' + esc(student.lateCount) + '</td>' +
    '<td>' + esc(rateText(student.rate)) + '</td>' +
    '<td>' + esc(levelName(student.alert)) + '</td></tr>'
  ).join('');
  return '<section class="report-sheet">' + reportSchoolHeading() +
    '<h1 class="report-title">' + esc(title) + '</h1>' +
    reportScope(filters, 'Tổng hợp ' + students.length + ' học sinh · ' + escNotNeededActivity(filters.activityType)) +
    '<div class="metrics">' + reportMetric('Học sinh', students.length) +
    reportMetric('Tổng lượt tiết', Math.round(totals.total * 100) / 100) +
    reportMetric('Tỷ lệ chuyên cần', rateText(totals.total ? totals.present / totals.total : null)) +
    reportMetric('Cần theo dõi', totals.atRisk) + '</div>' +
    reportSection('1. TỔNG HỢP THEO HỌC SINH',
      ['Mã HS', 'Họ và tên', 'Lớp', 'Tổng tiết', 'Có mặt', 'Vắng', 'Trễ', 'Chuyên cần', 'Đánh giá'],
      summaryRows, 'Không có học sinh phù hợp kỳ báo cáo.') +
    '<div class="student-note">Các trang tiếp theo trình bày chi tiết theo từng học sinh. ' +
    'Chỉ tổng hợp các buổi đã chốt, không coi buổi chưa chốt hoặc buổi hủy là học sinh vắng.</div>' +
    '</section>';
}

export async function printStudentAttendancePdf(students, filters = {}) {
  if (!Array.isArray(students) || !students.length) throw new Error('Không có học sinh để xuất báo cáo.');
  // Open synchronously from the click handler, before awaiting image readiness.
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* Browser may isolate the popup. */ }
  const isIndividual = students.length === 1;
  const exportedAt = reportExportTimestamp();
  const footerSignatureDataUri = attendanceFooterSignatureDataUri();
  const pages = (isIndividual ? '' : summaryReportPage(students, filters)) +
    students.map((student, index) => studentReportPage(student, filters, isIndividual || index === students.length - 1)).join('');
  const pageHtml = '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + ' ' + esc(prettyDate(filters.from)) + ' – ' + esc(prettyDate(filters.to)) + '</title>' +
    '<style>' + printStyles(isIndividual, exportedAt, footerSignatureDataUri) + '</style></head>' +
    '<body><main class="report-page">' + pages + reportFooterHtml(exportedAt) + '</main></body></html>';
  popup.document.open();
  popup.document.write(pageHtml);
  popup.document.close();
  await waitForPrintWindowLoad(popup);
  await waitForReportImages(popup);
  if (typeof popup.requestAnimationFrame === 'function') {
    await new Promise(resolve => popup.requestAnimationFrame(() => popup.requestAnimationFrame(resolve)));
  }
  popup.focus();
  popup.print();
}
