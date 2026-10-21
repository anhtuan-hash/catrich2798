import { createXlsxBlob } from './simpleXlsx.js';

const SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';
const title = 'BÁO CÁO TÌNH HÌNH THAM GIA HỌC TẬP THEO HỌC SINH';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const prettyDate = (value) => String(value || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
const statusName = (status) => status === 'late' ? 'Đi trễ' : status === 'present' ? 'Có mặt' : 'Vắng';
const levelName = (status) => ({ danger: 'Cần quan tâm', watch: 'Cần theo dõi', good: 'Tốt', unknown: 'Chưa đánh giá' }[status] || status);
const typeName = (type) => ({ gifted: 'Bồi dưỡng', remedial: 'Phụ đạo', supplemental: 'Học bổ sung' }[type] || type);
const rateText = (value) => value === null ? 'Chưa có dữ liệu' : (value * 100).toFixed(1).replace('.', ',') + '%';
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
    ...allDetails.map(({student:s,detail:d})=>[prettyDate(d.date),s.studentCode,s.name,s.schoolClass,d.className,typeName(d.activityType),d.subject,d.teacher,d.room,d.timeRange,d.periods,statusName(d.status),d.absenceReason,d.absenceNote]),
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

export function printStudentAttendancePdf(students, filters = {}) {
  if (!students.length) throw new Error('Không có học sinh để xuất báo cáo.');
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup để lưu PDF.');
  const isIndividual = students.length === 1;
  const totals = students.reduce((n,s) => ({students:n.students+1,total:n.total+s.totalPeriods,present:n.present+s.presentPeriods,absent:n.absent+s.absentPeriods}), {students:0,total:0,present:0,absent:0});
  const summaryPage = isIndividual ? '' : '<section class="page"><div class="school">'+esc(SCHOOL)+'</div><h1>'+esc(title)+'</h1><div class="period">Từ '+esc(prettyDate(filters.from))+' đến '+esc(prettyDate(filters.to))+'</div>'+
    '<h3>Tổng hợp tình hình tham gia của '+totals.students+' học sinh</h3>'+
    '<p>Tổng lượt tiết: '+Math.round(totals.total*100)/100+' · Có mặt: '+Math.round(totals.present*100)/100+' · Vắng: '+Math.round(totals.absent*100)/100+' · Chuyên cần: '+esc(rateText(totals.total?totals.present/totals.total:null))+'</p>'+
    '<table><thead><tr><th>Mã HS</th><th>Họ và tên</th><th>Lớp</th><th>Tổng tiết</th><th>Có mặt</th><th>Vắng</th><th>Đi trễ</th><th>Chuyên cần</th><th>Đánh giá</th></tr></thead><tbody>'+
    students.map(s=>'<tr><td>'+esc(s.studentCode)+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.schoolClass)+'</td><td>'+s.totalPeriods+'</td><td>'+s.presentPeriods+'</td><td>'+s.absentPeriods+'</td><td>'+s.lateCount+'</td><td>'+esc(rateText(s.rate))+'</td><td>'+esc(levelName(s.alert))+'</td></tr>').join('')+
    '</tbody></table><p>Phần sau là báo cáo chi tiết từng học sinh.</p></section>';
  const pages = summaryPage + students.map((s) => {
    const subRows = s.subjectRows.map(r=>'<tr><td>'+esc(r.subject)+'</td><td>'+r.total+'</td><td>'+r.present+'</td><td>'+r.absent+'</td></tr>').join('');
    const details = s.details.map(d=>'<tr><td>'+esc(prettyDate(d.date))+'</td><td>'+esc(d.className)+'</td><td>'+esc(d.subject)+'</td><td>'+esc(d.teacher)+'</td><td>'+d.periods+'</td><td>'+statusName(d.status)+'</td><td>'+esc(d.absenceReason||'—')+'</td></tr>').join('');
    return '<section class="page"><div class="school">'+esc(SCHOOL)+'</div><h1>'+esc(title)+'</h1><div class="period">Từ '+esc(prettyDate(filters.from))+' đến '+esc(prettyDate(filters.to))+'</div>'+
      '<h2>'+esc(s.name)+'</h2><p>Mã HS: '+esc(s.studentCode||'Chưa có')+' · Lớp hành chính: '+esc(s.schoolClass||'Chưa ghi')+'</p>'+
      '<div class="metrics"><div><b>'+s.totalPeriods+'</b><span>Tổng tiết</span></div><div><b>'+s.presentPeriods+'</b><span>Có mặt</span></div><div><b>'+s.absentPeriods+'</b><span>Vắng</span></div><div><b>'+esc(rateText(s.rate))+'</b><span>Chuyên cần</span></div></div>'+
      '<p><b>Đánh giá chuyên cần: '+esc(levelName(s.alert))+'</b> · Đi trễ: '+s.lateCount+' · Vắng có phép: '+s.excusedCount+' · Không phép: '+s.unexcusedCount+'</p>'+
      '<h3>Theo môn học</h3><table><thead><tr><th>Môn</th><th>Tổng tiết</th><th>Có mặt</th><th>Vắng</th></tr></thead><tbody>'+subRows+'</tbody></table>'+
      '<h3>Chi tiết lịch sử tham gia</h3><table><thead><tr><th>Ngày</th><th>Lớp</th><th>Môn</th><th>Giáo viên</th><th>Tiết</th><th>Trạng thái</th><th>Lý do</th></tr></thead><tbody>'+details+'</tbody></table>'+
      '<div class="signature"><div>NGƯỜI LẬP BÁO CÁO<br><small>(Ký, ghi rõ họ tên)</small></div><div>ĐẠI DIỆN NHÀ TRƯỜNG<br><small>(Ký, ghi rõ họ tên)</small></div></div></section>';
  }).join('');
  popup.document.open();
  popup.document.write('<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>'+esc(title)+'</title><style>'+
    '@page{size:'+ (isIndividual?'A4 portrait':'A4 landscape') +';margin:12mm}body{margin:0;color:#1b2c40;font:10pt Arial,sans-serif}h1{text-align:center;font-size:15pt;margin:7px 0;color:#156d49}.school,.period{text-align:center}.school{font-weight:bold}.period{margin:8px 0 18px}h2{font-size:14pt;margin:0}h3{background:#e7f3ee;padding:6px 9px;margin:15px 0 7px;font-size:11pt}.metrics{display:flex;gap:10px}.metrics div{flex:1;border:1px solid #c8d9d0;border-radius:7px;padding:10px;text-align:center}.metrics b{display:block;color:#156d49;font-size:17pt}.metrics span{font-size:9pt}table{width:100%;border-collapse:collapse;font-size:8pt}th,td{border:1px solid #cfddd6;padding:5px;text-align:left}th{background:#176f4b;color:#fff}tr{break-inside:avoid}.page{break-after:page}.page:last-child{break-after:auto}.signature{display:flex;justify-content:space-around;text-align:center;margin-top:22mm;font-weight:bold}.signature small{font-weight:normal}</style></head><body>'+pages+'</body></html>');
  popup.document.close();
  popup.focus();
  popup.print();
}
