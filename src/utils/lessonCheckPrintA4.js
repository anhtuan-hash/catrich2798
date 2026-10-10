// Print-only document builder for Fun for Assessment.
// No effect on the dashboard, scoring workflow, access controls, or stored results.
const asText = (value, fallback = '') => String(value ?? '').trim() || fallback;
const safe = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const fmtScore = (value) => Number.isFinite(value) ? Number(value).toFixed(2).replace('.', ',') : '—';
const labelFocus = (name) => ({
  vocabulary: 'Vocabulary', grammar: 'Grammar', reading: 'Reading',
  listening: 'Listening', speaking: 'Speaking', mixed: 'Mixed',
  unclassified: 'Chưa phân loại',
}[name] || name || 'Chưa phân loại');

const PRINT_CSS = [
  '@page{size:A4 portrait;margin:17mm 18mm;}',
  ':root{--ink:#1b354c;--teal:#0f8074;--muted:#63798b;--line:#d8e3e7;--soft:#f4f8f9;}',
  '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}',
  'html,body{margin:0;padding:0;background:#f1f4f6;color:var(--ink);font-family:Arial,Helvetica,sans-serif;}',
  'body{font-size:9.2pt;line-height:1.46;}',
  '.sheet{width:210mm;min-height:297mm;margin:14px auto;padding:17mm 18mm;background:#fff;box-shadow:0 7px 28px rgba(18,48,65,.10);}',
  '.masthead{display:flex;align-items:flex-start;justify-content:space-between;gap:10mm;padding-left:6mm;position:relative;min-height:19mm;}',
  '.masthead:before{content:"";position:absolute;left:0;top:0;width:1.6mm;height:19mm;background:var(--teal);border-radius:2mm;}',
  '.school-name{font-size:9.5pt;font-weight:800;letter-spacing:.015em;}',
  '.school-dept{color:var(--muted);font-size:8.2pt;margin-top:3px;}',
  '.app-name{font-size:8pt;color:var(--teal);font-weight:800;text-align:right;letter-spacing:.04em;}',
  'h1{font-size:17.2pt;line-height:1.25;margin:6mm 0 3.5mm;font-weight:800;letter-spacing:.005em;}',
  '.title-rule{height:1px;background:var(--teal);margin-bottom:4mm;}',
  '.metadata{padding:4mm 5mm;background:var(--soft);border-radius:3mm;display:grid;grid-template-columns:1fr 1fr;column-gap:6mm;row-gap:2.2mm;font-size:9pt;}',
  '.metadata b{font-weight:700;}',
  '.section{margin-top:5mm;}',
  '.section-title{display:flex;align-items:center;gap:3.2mm;margin:0 0 3mm;font-size:11pt;line-height:1.25;font-weight:800;break-after:avoid;}',
  '.number{display:inline-grid;place-items:center;min-width:9mm;height:8mm;border-radius:2.1mm;background:#e8f4f1;color:var(--teal);font-size:9pt;flex-shrink:0;}',
  '.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3mm;}',
  '.kpi{min-height:23mm;padding:3.6mm 4.2mm;border:1px solid var(--line);border-radius:3mm;background:var(--soft);break-inside:avoid;}',
  '.kpi.highlight{background:#eaf5f1;}',
  '.kpi-value{display:block;font-size:19pt;line-height:1.1;font-weight:800;}',
  '.kpi.highlight .kpi-value{color:var(--teal);}',
  '.kpi-caption{display:block;color:var(--muted);font-size:8pt;margin-top:2.4mm;}',
  '.focus-summary{margin:2.5mm 0 0;color:var(--muted);font-size:8.5pt;}',
  'table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.4pt;}',
  'thead{display:table-header-group;}',
  'th{padding:2.4mm 1.8mm;background:var(--soft);color:#597083;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-weight:700;text-align:left;}',
  'td{padding:2.3mm 1.8mm;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere;}',
  'tr{break-inside:avoid;page-break-inside:avoid;}',
  '.student-name{font-weight:700;}',
  '.center{text-align:center;}',
  '.score{font-weight:800;color:var(--teal);text-align:center;}',
  '.thin-info{margin:0 0 3mm;color:var(--ink);font-size:8.9pt;}',
  '.thin-info b{display:inline-block;min-width:39mm;}',
  '.recorded{margin:2mm 0 3mm;padding-left:4mm;}',
  '.recorded li{margin:1.5mm 0;break-inside:avoid;overflow-wrap:anywhere;}',
  '.field{margin-top:3.2mm;break-inside:avoid;}',
  '.field b{display:block;font-size:8.9pt;margin-bottom:1.5mm;}',
  '.writing-line{height:8.5mm;border-bottom:1px solid var(--line);}',
  '.writing-line.compact{height:6mm;}',
  '.value-note{padding:2mm 2.5mm 2.5mm;border-bottom:1px solid var(--line);white-space:pre-wrap;overflow-wrap:anywhere;min-height:8mm;}',
  '.signatures{display:grid;grid-template-columns:1fr 1fr;gap:9mm;margin-top:8mm;padding-top:4mm;border-top:1px solid var(--line);break-inside:avoid;}',
  '.signature{text-align:left;min-height:20mm;font-weight:700;font-size:8.6pt;}',
  '.signature-name{display:block;margin-top:13mm;font-weight:600;}',
  '.print-footer{margin-top:3mm;border-top:1px solid var(--line);padding-top:2mm;color:var(--muted);font-size:7.2pt;}',
  '@media print{html,body{background:#fff;} .sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none;} .section-title,.masthead,.metadata,.kpis{break-inside:avoid;} }',
].join('\n');

const sectionTitle = (number, title) => '<h2 class="section-title"><span class="number">' +
  number + '</span>' + safe(title) + '</h2>';

const blankField = (label, lines = 1) =>
  '<div class="field"><b>' + safe(label) + '</b>' +
  Array.from({ length: lines }, () => '<div class="writing-line"></div>').join('') +
  '</div>';

const recordedField = (label, content, lines = 1) =>
  content
    ? '<div class="field"><b>' + safe(label) + '</b><div class="value-note">' + safe(content) + '</div></div>'
    : blankField(label, lines);

export function buildLessonCheckA4Html({
  teacherName = '',
  reportClass = '',
  completedSessions = [],
  reportResults = [],
  studentReportRows = [],
  reportSummary = {},
  printedAt = new Date(),
} = {}) {
  const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(printedAt);
  const scope = asText(reportClass, 'Tất cả lớp');
  const teacher = asText(teacherName, 'Giáo viên phụ trách');

  const gradeResults = reportResults.filter((result) => Number.isFinite(result.grade10));
  const gradedStudents = new Set(gradeResults.map((result) => result.studentRef || result.studentName).filter(Boolean));
  const gradedSessionIds = new Set(gradeResults.map((result) => result.sessionId).filter(Boolean));
  const sessionsMissingGrade = completedSessions.filter((session) => !gradedSessionIds.has(session.id)).length;
  const average = Number.isFinite(reportSummary.average) ? reportSummary.average : null;

  const focusCounts = new Map();
  completedSessions.forEach((session) => {
    const focus = asText(session.focusArea, 'unclassified');
    focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
  });
  const focusText = [...focusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([focus, count]) => labelFocus(focus) + ' (' + count + ' phiên)')
    .join(' · ');

  const studentsHtml = studentReportRows.map((student, index) => {
    const last = reportResults
      .filter((result) => (result.studentRef || result.studentName) === student.studentRef)
      .sort((a, b) => Date.parse(b.completedAt || 0) - Date.parse(a.completedAt || 0))[0] || {};
    const className = asText(last.className, asText(reportClass, '—'));
    return '<tr><td class="center">' + (index + 1) + '</td>' +
      '<td class="student-name">' + safe(student.studentName) + '</td>' +
      '<td>' + safe(className) + '</td>' +
      '<td class="center">' + (Number(student.sessionCount) || 0) + '</td>' +
      '<td class="score">' + fmtScore(student.average) + '</td>' +
      '<td>' + safe(student.focusText || '—') + '</td></tr>';
  }).join('');

  // Only notes actually entered by teachers are treated as pedagogical observations.
  const sessionNotes = completedSessions.map((session) => asText(session.notes)).filter(Boolean);
  const learnerNotes = reportResults
    .map((result) => asText(result.note)
      ? asText(result.studentName, 'Học sinh') + ': ' + asText(result.note)
      : '')
    .filter(Boolean);
  const teacherNotes = [...new Set([...sessionNotes, ...learnerNotes])];
  const teacherAdjustments = [...new Set(
    completedSessions.map((session) => asText(session.teachingAdjustment)).filter(Boolean)
  )];
  const confirmedSupport = [...new Set(
    reportResults
      .filter((result) => asText(result.achievement).toLocaleLowerCase('vi') === 'cần hỗ trợ')
      .map((result) => asText(result.studentName))
      .filter(Boolean)
  )];

  const observationsHtml = teacherNotes.length
    ? '<ul class="recorded">' + teacherNotes.map((note) => '<li>' + safe(note) + '</li>').join('') + '</ul>'
    : '<div class="writing-line"></div><div class="writing-line compact"></div>';
  const adjustmentsHtml = teacherAdjustments.length
    ? '<ul class="recorded">' + teacherAdjustments.map((note) => '<li>' + safe(note) + '</li>').join('') + '</ul>'
    : '<div class="writing-line"></div>';
  const dataFinding = gradedStudents.size + ' học sinh có điểm /10' +
    (sessionsMissingGrade ? '; ' + sessionsMissingGrade + ' phiên đã hoàn thành chưa ghi nhận điểm /10.' : '.');

  return [
    '<!doctype html><html lang="vi"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Phiếu nhận xét kết quả đánh giá và điều chỉnh dạy học</title>',
    '<style>', PRINT_CSS, '</style></head><body><article class="sheet">',
    '<header class="masthead"><div><div class="school-name">PETRUS KY SCHOOL SYSTEM</div>',
    '<div class="school-dept">ENGLISH DEPARTMENT · BINH DUONG</div></div>',
    '<div class="app-name">FUN FOR ASSESSMENT</div></header>',
    '<h1>PHIẾU NHẬN XÉT KẾT QUẢ ĐÁNH GIÁ<br>VÀ ĐIỀU CHỈNH DẠY HỌC</h1>',
    '<div class="title-rule"></div>',
    '<div class="metadata"><div><b>Giáo viên:</b> ', safe(teacher), '</div>',
    '<div><b>Ngày lập:</b> ', safe(date), '</div>',
    '<div><b>Phạm vi:</b> ', safe(scope), '</div>',
    '<div><b>Môn:</b> Tiếng Anh</div></div>',

    '<section class="section">', sectionTitle('01', 'KẾT QUẢ TỔNG QUAN'),
    '<div class="kpis">',
    '<div class="kpi"><span class="kpi-value">', String(completedSessions.length).padStart(2, '0'),
    '</span><span class="kpi-caption">Phiên đánh giá</span></div>',
    '<div class="kpi"><span class="kpi-value">', String(gradedStudents.size).padStart(2, '0'),
    '</span><span class="kpi-caption">Học sinh có điểm</span></div>',
    '<div class="kpi highlight"><span class="kpi-value">', fmtScore(average),
    '</span><span class="kpi-caption">Điểm trung bình /10</span></div>',
    '</div><p class="focus-summary"><b>Chuyên đề đã thực hiện:</b> ',
    safe(focusText || 'Chưa có dữ liệu'), '</p></section>',

    '<section class="section">', sectionTitle('02', 'KẾT QUẢ THEO HỌC SINH'),
    '<table><colgroup><col style="width:7%"><col style="width:29%"><col style="width:12%">',
    '<col style="width:12%"><col style="width:12%"><col style="width:28%"></colgroup>',
    '<thead><tr><th>STT</th><th>Họ tên</th><th>Lớp</th>',
    '<th>Số lượt</th><th>TB /10</th><th>Nội dung đánh giá</th></tr></thead>',
    '<tbody>', studentsHtml || '<tr><td colspan="6">Chưa có kết quả học sinh trong phạm vi đã chọn.</td></tr>',
    '</tbody></table></section>',

    '<section class="section">', sectionTitle('03', 'NHẬN XÉT SƯ PHẠM'),
    '<p class="thin-info"><b>Ghi nhận từ dữ liệu:</b> ', safe(dataFinding), '</p>',
    '<div class="field"><b>Nhận xét chuyên môn của giáo viên:</b>',
    observationsHtml, '</div></section>',

    '<section class="section">', sectionTitle('04', 'ĐIỀU CHỈNH DẠY HỌC VÀ THEO DÕI'),
    blankField('Nội dung / kỹ năng cần củng cố:'),
    recordedField('Học sinh / nhóm học sinh cần hỗ trợ:',
      confirmedSupport.join(', ')),
    '<div class="field"><b>Biện pháp và thời điểm thực hiện:</b>',
    adjustmentsHtml, '</div>',
    blankField('Cách / thời điểm đánh giá lại:'),
    '</section>',
    '<section class="signatures"><div class="signature">GIÁO VIÊN THỰC HIỆN',
    '<span class="signature-name">', safe(teacher), '</span></div>',
    '<div class="signature">TỔ TRƯỞNG CHUYÊN MÔN (NẾU CẦN)</div></section>',
    '<footer class="print-footer">Fun for Assessment · Petrus Ky School System · English Department</footer>',
    '</article></body></html>',
  ].join('');
}
