import {
  conductWeekEndForWorkspace,
  inferConductPeriodRanges,
  resolveConductWeekStart,
} from './utils/homeroomConduct.js';
import {
  calculateFixedConductPeriod,
  conductWeekPoint,
  FIXED_CONDUCT_POLICY,
} from './utils/conductFixedPolicy.js';

const PANEL_ID = 'bes-conduct-mid-final-reports';
const STYLE_ID = 'bes-conduct-mid-final-reports-v2-style';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const PREFS_KEY = 'bes-conduct-mid-final-reports-prefs-v3';
const DEFAULT_SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';

const PERIOD_LABELS = Object.freeze({
  current: 'Đến tuần hiện tại',
  mid1: 'Giữa học kỳ I',
  semester1: 'Cuối học kỳ I',
  mid2: 'Giữa học kỳ II',
  semester2: 'Cuối học kỳ II',
});

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function toLocalIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function today() {
  return toLocalIsoDate(new Date());
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return safeText(value, '—');
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function parseWorkspace(raw) {
  try {
    const value = JSON.parse(raw || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function currentWorkspaceCandidates() {
  const candidates = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CURRENT_PREFIX)) continue;
      const userKey = key.slice(CURRENT_PREFIX.length);
      const workspaceId = safeText(localStorage.getItem(key), 'default');
      const workspace = parseWorkspace(localStorage.getItem(`${WORKSPACE_PREFIX}${userKey}:${workspaceId}`));
      if (workspace) candidates.push(workspace);
    }
    if (!candidates.length) {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
        const workspace = parseWorkspace(localStorage.getItem(key));
        if (workspace) candidates.push(workspace);
      }
    }
  } catch {
    return [];
  }
  return candidates;
}

function getCurrentWorkspace() {
  const candidates = currentWorkspaceCandidates();
  if (!candidates.length) return null;
  const visibleClass = safeText(document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent).toLowerCase();
  const matching = visibleClass
    ? candidates.filter((item) => safeText(item.classProfile?.className).toLowerCase() === visibleClass)
    : [];
  return [...(matching.length ? matching : candidates)].sort((a, b) => {
    const at = Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0;
    const bt = Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0;
    return bt - at;
  })[0];
}

function activeStudents(workspace) {
  return (Array.isArray(workspace?.students) ? workspace.students : [])
    .filter((student) => student?.active !== false)
    .sort((a, b) => safeText(a.fullName).localeCompare(safeText(b.fullName), 'vi'));
}

function readPrefs() {
  try {
    const value = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function savePrefs(panel) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      scope: panel.querySelector('[data-mf-scope]')?.value || 'class',
      period: panel.querySelector('[data-mf-period]')?.value || 'current',
      studentId: panel.querySelector('[data-mf-student]')?.value || '',
    }));
  } catch {
    // optional
  }
}

function resolveRange(workspace, period) {
  const ranges = inferConductPeriodRanges(workspace);
  if (period !== 'current') {
    const key = PERIOD_LABELS[period] ? period : 'mid1';
    const range = ranges[key] || {};
    return { type: key, label: PERIOD_LABELS[key], start: range.start, end: range.end };
  }

  const currentDate = today();
  const semester2 = ranges.semester2 || {};
  const isSemester2 = Boolean(semester2.start && currentDate >= semester2.start);
  const semester = isSemester2 ? semester2 : (ranges.semester1 || {});
  const semesterLabel = isSemester2 ? 'HKII' : 'HKI';
  const weekStart = resolveConductWeekStart(workspace, currentDate, { nearest: true });
  const weekEnd = conductWeekEndForWorkspace(workspace, weekStart);
  const end = semester.end && weekEnd > semester.end ? semester.end : weekEnd;
  return { type: 'current', label: `Đến tuần hiện tại (${semesterLabel})`, start: semester.start, end };
}

function calculateRows(workspace, range) {
  return calculateFixedConductPeriod(workspace, range.start, range.end);
}

function classificationCounts(rows) {
  return rows.reduce((counts, row) => {
    const id = row.classification?.id || 'fail';
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, { good: 0, fair: 0, pass: 0, fail: 0 });
}

function prohibitedSummary(row) {
  const count = Number(row.prohibitedViolationCount || 0);
  if (!count) return '0';
  if (!row.prohibitedDowngraded) return `${count} · Chưa đạt, không thể hạ thêm`;
  return `${count} · Hạ 1 bậc ${row.baseClassification?.label || '—'} → ${row.classification?.label || '—'}`;
}

function reportHeader(workspace, title, subtitle, studentName = '') {
  const profile = workspace.classProfile || {};
  return `<header class="report-header"><div class="school-mark">PK</div><div><small>${escapeHtml(safeText(profile.schoolName, DEFAULT_SCHOOL).toUpperCase())}</small><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></header>
  <section class="report-meta"><span><b>Lớp:</b> ${escapeHtml(profile.className || '—')}</span><span><b>Năm học:</b> ${escapeHtml(profile.schoolYear || '—')}</span><span><b>Giáo viên chủ nhiệm:</b> ${escapeHtml(profile.adviserName || '—')}</span>${studentName ? `<span><b>Học sinh:</b> ${escapeHtml(studentName)}</span>` : ''}<span><b>Ngày xuất:</b> ${formatDate(today())}</span></section>`;
}

function formulaBlock() {
  return `<section class="formula-box"><b>Quy tắc cố định</b><span>Điểm tuần: <strong>thang 100</strong>. Quy đổi từng tuần: <strong>điểm tuần ÷ 25</strong> → thang 4.</span><span>Giữa kỳ: trung bình điểm thang 4 từ đầu học kỳ đến mốc giữa kỳ. Cuối kỳ: trung bình điểm thang 4 của toàn học kỳ.</span><span>Tốt ≥ 3,60 · Khá ≥ 3,00 · Đạt ≥ 2,40 · Chưa đạt &lt; 2,40.</span><span><strong>Có ít nhất 1 vi phạm điều cấm đã xác nhận trong chính khoảng xét: hạ đúng 1 bậc; nhiều vi phạm không hạ thêm bậc.</strong></span></section>`;
}

function signatureBlock(workspace) {
  return `<section class="signatures"><div><b>GIÁO VIÊN CHỦ NHIỆM</b><small>(Ký và ghi rõ họ tên)</small><strong>${escapeHtml(workspace.classProfile?.adviserName || '')}</strong></div><div><b>XÁC NHẬN CỦA NHÀ TRƯỜNG</b><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div></section>`;
}

function classReport(workspace, range) {
  const rows = calculateRows(workspace, range);
  const counts = classificationCounts(rows);
  const classAverage = rows.length ? rows.reduce((sum, row) => sum + Number(row.average || 0), 0) / rows.length : FIXED_CONDUCT_POLICY.maximum;
  const prohibitedTotal = rows.reduce((sum, row) => sum + Number(row.prohibitedViolationCount || 0), 0);
  const prohibitedStudents = rows.filter((row) => Number(row.prohibitedViolationCount || 0) > 0).length;
  const bodyRows = rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.student.code || '')}</td><td class="name">${escapeHtml(row.student.fullName)}</td><td>${row.weekCount}</td><td class="score">${Number(row.average || 0).toFixed(2)}</td><td>${escapeHtml(row.baseClassification?.label || '')}</td><td class="warning">${escapeHtml(prohibitedSummary(row))}</td><td class="result ${row.classification?.id || 'fail'}">${escapeHtml(row.classification?.label || '')}</td></tr>`).join('');
  return `${reportHeader(workspace, `BÁO CÁO HẠNH KIỂM ${range.label.toUpperCase()}`, `${formatDate(range.start)} – ${formatDate(range.end)}`)}${formulaBlock()}<section class="summary-grid"><article><small>Điểm TB thang 4 của lớp</small><b>${classAverage.toFixed(2)}</b></article><article><small>Tốt / Khá</small><b>${counts.good} / ${counts.fair}</b></article><article><small>Đạt / Chưa đạt</small><b>${counts.pass} / ${counts.fail}</b></article><article><small>Vi phạm điều cấm</small><b>${prohibitedTotal} lượt · ${prohibitedStudents} HS</b></article></section><table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Số tuần</th><th>TB thang 4</th><th>Hạnh kiểm theo điểm</th><th>Số vi phạm điều cấm / xử lý</th><th>Hạnh kiểm cuối</th></tr></thead><tbody>${bodyRows}</tbody></table>${signatureBlock(workspace)}`;
}

function personalReport(workspace, range, student) {
  const row = calculateRows(workspace, range).find((item) => item.student.id === student.id);
  if (!row) throw new Error('Không tìm thấy dữ liệu rèn luyện của học sinh trong giai đoạn đã chọn.');
  const prohibitedIds = new Set((row.prohibitedRecords || []).map((record) => record.id));
  const weeklyRows = row.weekly.map((week, index) => `<tr><td>${index + 1}</td><td>${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)}</td><td class="score">${Number(week.score || 0).toFixed(1)}</td><td class="score">${conductWeekPoint(week.score).toFixed(2)}</td><td>−${Number(week.totalDeduction || 0)}</td><td>+${Number(week.totalBonus || 0)}</td></tr>`).join('');
  const records = row.weekly.flatMap((week) => week.records || []).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const detailRows = records.length ? records.map((record) => `<tr class="${prohibitedIds.has(record.id) ? 'prohibited' : ''}"><td>${formatDate(record.date)}</td><td>${record.entryType === 'reward' ? 'Khen thưởng' : prohibitedIds.has(record.id) ? 'VI PHẠM ĐIỀU CẤM' : 'Vi phạm'}</td><td class="name">${escapeHtml(record.title || '')}</td><td>${record.entryType === 'reward' ? `+${record.bonus || 0}` : `−${record.deduction || 0}`}</td><td>${escapeHtml([record.note, record.evidence].filter(Boolean).join(' · '))}</td></tr>`).join('') : '<tr><td colspan="5">Không có ghi nhận trong giai đoạn.</td></tr>';
  const count = Number(row.prohibitedViolationCount || 0);
  const note = count ? (row.prohibitedDowngraded ? `Có ${count} vi phạm điều cấm đã xác nhận. Hạ đúng 1 bậc từ ${row.baseClassification?.label || '—'} xuống ${row.classification?.label || '—'}.` : `Có ${count} vi phạm điều cấm đã xác nhận; kết quả theo điểm đã là Chưa đạt.`) : 'Không có vi phạm điều cấm đã xác nhận trong khoảng xét.';
  return `${reportHeader(workspace, `PHIẾU HẠNH KIỂM ${range.label.toUpperCase()}`, `${formatDate(range.start)} – ${formatDate(range.end)}`, student.fullName)}${formulaBlock()}<section class="summary-grid"><article><small>Số tuần tính điểm</small><b>${row.weekCount}</b></article><article><small>Điểm TB thang 4</small><b>${Number(row.average || 0).toFixed(2)}</b></article><article><small>Vi phạm điều cấm</small><b>${count}</b></article><article><small>Hạnh kiểm cuối</small><b>${escapeHtml(row.classification?.label || '')}</b></article></section><section class="result-banner ${count ? 'downgraded' : ''}"><span>Kết quả</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${escapeHtml(note)}</small></section><h2>Quy đổi điểm theo tuần</h2><table><thead><tr><th>STT</th><th>Tuần</th><th>Điểm tuần /100</th><th>Điểm quy đổi /4</th><th>Điểm trừ</th><th>Điểm cộng</th></tr></thead><tbody>${weeklyRows}</tbody></table><h2>Chi tiết ghi nhận</h2><table><thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th>Điểm</th><th>Ghi chú / minh chứng</th></tr></thead><tbody>${detailRows}</tbody></table>${signatureBlock(workspace)}`;
}

function printDocument(title, body, landscape = false) {
  const popup = window.open('', '_blank', 'width=1160,height=860,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:11mm}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,sans-serif;line-height:1.38}.print-actions{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff;border-bottom:1px solid #d8e0e7}.print-actions button{min-height:38px;padding:0 16px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;color:#174ea6;font-weight:700}.print-actions .primary{border-color:#0b57d0;background:#0b57d0;color:#fff}.page{width:${landscape ? '297mm' : '210mm'};min-height:${landscape ? '210mm' : '297mm'};margin:18px auto;padding:13mm;background:#fff}.report-header{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;padding-bottom:12px;border-bottom:3px solid #0b57d0}.school-mark{width:58px;height:58px;display:grid;place-items:center;border-radius:16px;background:#0b57d0;color:#fff;font-size:21px;font-weight:900}.report-header small{color:#0b57d0;font-size:10px;font-weight:900}.report-header h1{margin:4px 0 3px;font-size:20px}.report-header p{margin:0;color:#5f6368;font-size:11px}.report-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 16px;margin:12px 0;padding:9px 11px;border:1px solid #d9e3ef;border-radius:10px;background:#f7faff;font-size:10.5px}.formula-box{display:grid;gap:3px;margin:10px 0;padding:10px 12px;border-left:5px solid #0b57d0;border-radius:10px;background:#edf4ff;font-size:10.5px}.formula-box b{color:#174ea6}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0}.summary-grid article{padding:9px;border:1px solid #d7e2ee;border-radius:10px;background:#f8fbff}.summary-grid small{display:block;color:#5f6368;font-size:9.5px}.summary-grid b{display:block;margin-top:4px;color:#17365d;font-size:17px}.result-banner{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;align-items:center;margin:12px 0;padding:11px 13px;border-left:5px solid #188038;border-radius:10px;background:#e6f4ea}.result-banner.downgraded{border-left-color:#d93025;background:#fce8e6}.result-banner span{grid-row:1/3;font-size:9.5px;font-weight:900}.result-banner b{font-size:18px}.result-banner small{font-size:10px}h2{margin:16px 0 7px;font-size:13px}table{width:100%;border-collapse:collapse;font-size:${landscape ? '9px' : '9.5px'}}th,td{padding:5px 4px;border:1px solid #aebbc7;text-align:center}th{background:#eaf2ff;color:#17365d}td.name{text-align:left;font-weight:650}td.score{font-weight:900}td.warning{text-align:left}.result.good{color:#137333;font-weight:900}.result.fair{color:#174ea6;font-weight:900}.result.pass{color:#b06000;font-weight:900}.result.fail{color:#b3261e;font-weight:900}tr.prohibited td{background:#fce8e6;color:#8c1d18;font-weight:700}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:30px;text-align:center}.signatures b,.signatures small,.signatures strong{display:block}.signatures strong{margin-top:48px}@media print{body{background:#fff}.print-actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0}.formula-box,.summary-grid article,.result-banner,tr.prohibited td{print-color-adjust:exact;-webkit-print-color-adjust:exact}tr{break-inside:avoid}}</style></head><body><div class="print-actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page">${body}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),320),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function exportReport(panel) {
  const workspace = getCurrentWorkspace();
  if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
  const scope = panel.querySelector('[data-mf-scope]')?.value || 'class';
  const period = panel.querySelector('[data-mf-period]')?.value || 'current';
  const range = resolveRange(workspace, period);
  if (!range.start || !range.end) throw new Error('Mốc thời gian xét hạnh kiểm chưa hợp lệ.');
  let body;
  let title;
  if (scope === 'personal') {
    const student = activeStudents(workspace).find((item) => item.id === panel.querySelector('[data-mf-student]')?.value);
    if (!student) throw new Error('Vui lòng chọn học sinh cần xuất báo cáo.');
    body = personalReport(workspace, range, student);
    title = `Hanh-kiem-${student.fullName}-${range.label}`;
  } else {
    body = classReport(workspace, range);
    title = `Hanh-kiem-lop-${workspace.classProfile?.className || 'lop'}-${range.label}`;
  }
  savePrefs(panel);
  printDocument(title.replace(/[\\/:*?"<>|]/g, '-'), body, scope === 'class');
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `.bes-mf-panel{margin:0 0 20px;padding:18px;border:1px solid #c9daf5;border-radius:24px;background:linear-gradient(135deg,#edf4ff 0%,#fff 58%,#eef8f1 100%);box-shadow:0 8px 22px rgba(60,64,67,.08)}.bes-mf-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:14px}.bes-mf-title{display:grid;grid-template-columns:44px 1fr;gap:12px}.bes-mf-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:#0b57d0;color:#fff;font-weight:900}.bes-mf-title small{color:#0b57d0;font-size:.66rem;font-weight:900}.bes-mf-title h3{margin:3px 0 4px;font-size:1.16rem}.bes-mf-title p{margin:0;color:#5f6368;font-size:.82rem}.bes-mf-chip{padding:6px 10px;border-radius:999px;background:#e6f4ea;color:#137333;font-size:.68rem;font-weight:850;white-space:nowrap}.bes-mf-formula{display:flex;flex-wrap:wrap;gap:6px 12px;margin:0 0 14px;padding:10px 12px;border-radius:14px;background:#f7faff;font-size:.73rem}.bes-mf-formula b{color:#174ea6}.bes-mf-controls{display:grid;grid-template-columns:1fr 1.3fr 1.4fr auto;align-items:end;gap:10px}.bes-mf-controls label{display:grid;gap:6px;font-size:.73rem;font-weight:750}.bes-mf-controls select{height:44px;padding:0 12px;border:1px solid #b8c2cc;border-radius:13px;background:#fff}.bes-mf-controls button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#0b57d0;color:#fff;font-weight:850}.bes-mf-range{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(11,87,208,.14);font-size:.76rem}.bes-mf-range b{color:#174ea6}.bes-mf-error{display:none;margin-top:10px;padding:10px 12px;border-radius:12px;background:#fce8e6;color:#b3261e}.bes-mf-error.show{display:block}@media(max-width:1050px){.bes-mf-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.bes-mf-controls button{grid-column:1/-1}}`;
  document.head.appendChild(style);
}

function updatePanel(panel, workspace) {
  const scope = panel.querySelector('[data-mf-scope]')?.value || 'class';
  const period = panel.querySelector('[data-mf-period]')?.value || 'current';
  const studentField = panel.querySelector('[data-mf-student-field]');
  if (studentField) studentField.hidden = scope !== 'personal';
  const range = resolveRange(workspace, period);
  panel.querySelector('[data-mf-range]').innerHTML = `<span>Khoảng xét:</span><b>${escapeHtml(range.label)}</b><span>${formatDate(range.start)} → ${formatDate(range.end)}</span>`;
  panel.querySelector('[data-mf-export]').textContent = scope === 'personal' ? `Xuất ${range.label.toLowerCase()} cá nhân` : `Xuất ${range.label.toLowerCase()} lớp`;
  savePrefs(panel);
}

function buildPanel(workspace) {
  const prefs = readPrefs();
  const students = activeStudents(workspace);
  const selectedStudent = students.some((student) => student.id === prefs.studentId) ? prefs.studentId : students[0]?.id || '';
  const selectedPeriod = PERIOD_LABELS[prefs.period] ? prefs.period : 'current';
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'bes-mf-panel';
  panel.dataset.workspaceId = safeText(workspace.id, 'default');
  panel.innerHTML = `<div class="bes-mf-head"><div class="bes-mf-title"><span class="bes-mf-icon">PDF</span><div><small>XUẤT BÁO CÁO HẠNH KIỂM</small><h3>Giữa kỳ · Cuối kỳ · Đến tuần hiện tại</h3><p>Báo cáo dùng duy nhất thang điểm 4 đã quy đổi và hiển thị rõ số vi phạm điều cấm.</p></div></div><span class="bes-mf-chip">Sẵn sàng xuất PDF</span></div><div class="bes-mf-formula"><b>Quy đổi:</b><span>Điểm tuần ÷ 25 → thang 4</span><span>·</span><span>Tốt ≥ 3,60 · Khá ≥ 3,00 · Đạt ≥ 2,40</span><span>·</span><strong>Điều cấm: hạ đúng 1 bậc</strong></div><div class="bes-mf-controls"><label><span>Đối tượng</span><select data-mf-scope><option value="class"${prefs.scope === 'personal' ? '' : ' selected'}>Cả lớp</option><option value="personal"${prefs.scope === 'personal' ? ' selected' : ''}>Cá nhân</option></select></label><label data-mf-student-field><span>Học sinh</span><select data-mf-student>${students.map((student) => `<option value="${escapeHtml(student.id)}"${student.id === selectedStudent ? ' selected' : ''}>${escapeHtml(student.code ? `${student.code} · ${student.fullName}` : student.fullName)}</option>`).join('')}</select></label><label><span>Giai đoạn</span><select data-mf-period><option value="current"${selectedPeriod === 'current' ? ' selected' : ''}>Đến tuần hiện tại</option><option value="mid1"${selectedPeriod === 'mid1' ? ' selected' : ''}>Giữa học kỳ I</option><option value="semester1"${selectedPeriod === 'semester1' ? ' selected' : ''}>Cuối học kỳ I</option><option value="mid2"${selectedPeriod === 'mid2' ? ' selected' : ''}>Giữa học kỳ II</option><option value="semester2"${selectedPeriod === 'semester2' ? ' selected' : ''}>Cuối học kỳ II</option></select></label><button type="button" data-mf-export>Xuất báo cáo</button></div><div class="bes-mf-range" data-mf-range></div><div class="bes-mf-error" data-mf-error></div>`;
  panel.querySelectorAll('select').forEach((control) => control.addEventListener('change', () => updatePanel(panel, getCurrentWorkspace() || workspace)));
  panel.querySelector('[data-mf-export]').addEventListener('click', () => {
    const errorBox = panel.querySelector('[data-mf-error]');
    errorBox.classList.remove('show');
    errorBox.textContent = '';
    try { exportReport(panel); } catch (error) { errorBox.textContent = error?.message || 'Không thể xuất báo cáo.'; errorBox.classList.add('show'); }
  });
  updatePanel(panel, workspace);
  return panel;
}

function ensurePanel() {
  const anchor = document.querySelector('.hr-conduct-settings');
  if (!anchor) return;
  const workspace = getCurrentWorkspace();
  if (!workspace) return;
  const existing = document.getElementById(PANEL_ID);
  if (existing?.dataset.workspaceId === safeText(workspace.id, 'default')) return;
  existing?.remove();
  injectStyle();
  anchor.parentElement?.insertBefore(buildPanel(workspace), anchor);
}

let scheduled = false;
function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; ensurePanel(); });
}

const observer = new MutationObserver(scheduleEnsure);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', scheduleEnsure);
window.addEventListener('bes-homeroom-store-updated', () => { document.getElementById(PANEL_ID)?.remove(); scheduleEnsure(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnsure, { once: true });
else scheduleEnsure();
