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
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const PERIOD_LABELS = Object.freeze({
  current: 'Đến tuần hiện tại',
  mid1: 'Giữa học kỳ I',
  semester1: 'Cuối học kỳ I',
  mid2: 'Giữa học kỳ II',
  semester2: 'Cuối học kỳ II',
});
const DEFAULT_SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';

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
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
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
  const seen = new Set();
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CURRENT_PREFIX)) continue;
      const userKey = key.slice(CURRENT_PREFIX.length);
      const workspaceId = safeText(localStorage.getItem(key), 'default');
      const workspace = parseWorkspace(localStorage.getItem(`${WORKSPACE_PREFIX}${userKey}:${workspaceId}`));
      if (!workspace) continue;
      const signature = `${userKey}:${safeText(workspace.id, workspaceId)}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        candidates.push(workspace);
      }
    }
    if (!candidates.length) {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
        const workspace = parseWorkspace(localStorage.getItem(key));
        if (!workspace) continue;
        const signature = `${safeText(workspace.classProfile?.adviserEmail)}:${safeText(workspace.id)}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          candidates.push(workspace);
        }
      }
    }
  } catch {
    return [];
  }
  return candidates;
}

function visibleClassName() {
  return safeText(
    document.querySelector('#hr-material-hero-title')?.textContent
      || document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent,
  ).toLowerCase();
}

function getCurrentWorkspace(panel = null) {
  const candidates = currentWorkspaceCandidates();
  if (!candidates.length) return null;
  const className = visibleClassName();
  if (className) {
    const matching = candidates.filter((item) => safeText(item.classProfile?.className).toLowerCase() === className);
    if (matching.length === 1) return matching[0];
    if (matching.length > 1) {
      return [...matching].sort((a, b) => (Date.parse(b.updatedAt || 0) || 0) - (Date.parse(a.updatedAt || 0) || 0))[0];
    }
  }
  const workspaceId = safeText(panel?.dataset?.workspaceId);
  if (workspaceId) {
    const exact = candidates.filter((item) => safeText(item.id, 'default') === workspaceId);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) {
      return [...exact].sort((a, b) => (Date.parse(b.updatedAt || 0) || 0) - (Date.parse(a.updatedAt || 0) || 0))[0];
    }
  }
  return [...candidates].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0;
    return bTime - aTime;
  })[0];
}

function activeStudents(workspace) {
  return (Array.isArray(workspace?.students) ? workspace.students : [])
    .filter((student) => student?.active !== false)
    .sort((a, b) => safeText(a.fullName).localeCompare(safeText(b.fullName), 'vi'));
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
  return {
    type: 'current',
    label: `Đến tuần hiện tại (${semesterLabel})`,
    start: semester.start || weekStart,
    end,
  };
}

function recordsForRange(workspace, range, studentId = '', includeRewards = true) {
  return (Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : [])
    .filter((record) => {
      const status = safeText(record.status, 'confirmed');
      if (status === 'cancelled') return false;
      if (!includeRewards && safeText(record.entryType, 'violation') === 'reward') return false;
      if (studentId && record.studentId !== studentId) return false;
      const date = safeText(record.date || record.weekStart).slice(0, 10);
      if (!date) return false;
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;
      return true;
    })
    .sort((a, b) => `${safeText(a.date)}:${safeText(a.createdAt)}`.localeCompare(`${safeText(b.date)}:${safeText(b.createdAt)}`));
}

function confirmedViolations(records = []) {
  return records.filter((record) => safeText(record.entryType, 'violation') !== 'reward' && safeText(record.status, 'confirmed') === 'confirmed');
}

function pendingViolations(records = []) {
  return records.filter((record) => safeText(record.entryType, 'violation') !== 'reward' && safeText(record.status, 'confirmed') === 'pending');
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
  return `<section class="formula-box"><b>Quy tắc tính</b><span>Điểm tuần: <strong>thang 100</strong>. Quy đổi từng tuần: <strong>điểm tuần ÷ 25</strong> → thang 4.</span><span>Tốt ≥ 3,60 · Khá ≥ 3,00 · Đạt ≥ 2,40 · Chưa đạt &lt; 2,40.</span><span><strong>Mọi vi phạm trong khoảng xét đều được liệt kê. Chỉ vi phạm đã xác nhận mới trừ điểm; vi phạm điều cấm đã xác nhận hạ đúng 1 bậc.</strong></span></section>`;
}

function signatureBlock(workspace) {
  return `<section class="signatures"><div><b>GIÁO VIÊN CHỦ NHIỆM</b><small>(Ký và ghi rõ họ tên)</small><strong>${escapeHtml(workspace.classProfile?.adviserName || '')}</strong></div><div><b>XÁC NHẬN CỦA NHÀ TRƯỜNG</b><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div></section>`;
}

function statusLabel(record) {
  const status = safeText(record.status, 'confirmed');
  if (status === 'pending') return 'Chờ xác nhận';
  return 'Đã xác nhận';
}

function classReport(workspace, range) {
  const rows = calculateFixedConductPeriod(workspace, range.start, range.end);
  const counts = classificationCounts(rows);
  const classAverage = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.average || 0), 0) / rows.length
    : FIXED_CONDUCT_POLICY.maximum;
  const allViolations = recordsForRange(workspace, range, '', false);
  const confirmed = confirmedViolations(allViolations);
  const pending = pendingViolations(allViolations);
  const totalDeduction = confirmed.reduce((sum, record) => sum + Math.max(0, Number(record.deduction) || 0), 0);
  const prohibitedTotal = rows.reduce((sum, row) => sum + Number(row.prohibitedViolationCount || 0), 0);
  const prohibitedIds = new Set(rows.flatMap((row) => (row.prohibitedRecords || []).map((record) => record.id)));
  const studentsById = new Map(activeStudents(workspace).map((student) => [student.id, student]));

  const bodyRows = rows.map((row, index) => {
    const studentRecords = allViolations.filter((record) => record.studentId === row.student.id);
    const studentConfirmed = confirmedViolations(studentRecords);
    const studentPending = pendingViolations(studentRecords);
    const deduction = studentConfirmed.reduce((sum, record) => sum + Math.max(0, Number(record.deduction) || 0), 0);
    const violationText = studentConfirmed.length || studentPending.length
      ? `${studentConfirmed.length} xác nhận${studentPending.length ? ` · ${studentPending.length} chờ` : ''} · −${deduction}`
      : '0';
    return `<tr><td>${index + 1}</td><td>${escapeHtml(row.student.code || '')}</td><td class="name">${escapeHtml(row.student.fullName)}</td><td>${row.weekCount}</td><td class="score">${Number(row.average || 0).toFixed(2)}</td><td>${escapeHtml(row.baseClassification?.label || '')}</td><td class="warning">${escapeHtml(violationText)}</td><td class="warning">${escapeHtml(prohibitedSummary(row))}</td><td class="result ${row.classification?.id || 'fail'}">${escapeHtml(row.classification?.label || '')}</td></tr>`;
  }).join('');

  const detailRows = allViolations.length
    ? allViolations.map((record, index) => {
      const student = studentsById.get(record.studentId);
      const prohibited = prohibitedIds.has(record.id);
      return `<tr class="${prohibited ? 'prohibited' : safeText(record.status, 'confirmed') === 'pending' ? 'pending' : ''}"><td>${index + 1}</td><td>${formatDate(record.date || record.weekStart)}</td><td class="name">${escapeHtml(student?.fullName || 'Học sinh')}</td><td>${prohibited ? 'Điều cấm' : 'Vi phạm'}</td><td class="name">${escapeHtml(record.title || '')}</td><td>−${Number(record.deduction || 0)}</td><td>${escapeHtml(statusLabel(record))}</td><td class="name">${escapeHtml([record.note, record.evidence].filter(Boolean).join(' · '))}</td></tr>`;
    }).join('')
    : '<tr><td colspan="8">Không có vi phạm nào được ghi nhận trong khoảng xét.</td></tr>';

  return `${reportHeader(workspace, `BÁO CÁO HẠNH KIỂM ${range.label.toUpperCase()}`, `${formatDate(range.start)} – ${formatDate(range.end)}`)}${formulaBlock()}<section class="summary-grid"><article><small>Điểm TB thang 4 của lớp</small><b>${classAverage.toFixed(2)}</b></article><article><small>Tốt / Khá · Đạt / Chưa đạt</small><b>${counts.good} / ${counts.fair} · ${counts.pass} / ${counts.fail}</b></article><article><small>Vi phạm đã ghi nhận</small><b>${confirmed.length} xác nhận · ${pending.length} chờ</b><em>−${totalDeduction} điểm đã áp dụng</em></article><article><small>Vi phạm điều cấm</small><b>${prohibitedTotal} lượt</b></article></section><table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Số tuần</th><th>TB /4</th><th>HK theo điểm</th><th>Vi phạm / điểm trừ</th><th>Điều cấm / xử lý</th><th>HK cuối</th></tr></thead><tbody>${bodyRows}</tbody></table><h2>Chi tiết vi phạm trong khoảng xét</h2><p class="detail-note">Các dòng “Chờ xác nhận” chỉ để đối chiếu dữ liệu, chưa được dùng để trừ điểm hoặc hạ bậc.</p><table><thead><tr><th>STT</th><th>Ngày</th><th>Học sinh</th><th>Loại</th><th>Nội dung</th><th>Điểm trừ</th><th>Trạng thái</th><th>Ghi chú / minh chứng</th></tr></thead><tbody>${detailRows}</tbody></table>${signatureBlock(workspace)}`;
}

function personalReport(workspace, range, student) {
  const row = calculateFixedConductPeriod(workspace, range.start, range.end).find((item) => item.student.id === student.id);
  if (!row) throw new Error('Không tìm thấy dữ liệu rèn luyện của học sinh trong giai đoạn đã chọn.');
  const records = recordsForRange(workspace, range, student.id, true);
  const violations = records.filter((record) => safeText(record.entryType, 'violation') !== 'reward');
  const confirmed = confirmedViolations(violations);
  const pending = pendingViolations(violations);
  const prohibitedIds = new Set((row.prohibitedRecords || []).map((record) => record.id));
  const weeklyRows = (row.weekly || []).map((week, index) => `<tr><td>${index + 1}</td><td>${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)}</td><td class="score">${Number(week.score || 0).toFixed(1)}</td><td class="score">${conductWeekPoint(week.score).toFixed(2)}</td><td>−${Number(week.totalDeduction || 0)}</td><td>+${Number(week.totalBonus || 0)}</td></tr>`).join('');
  const detailRows = records.length
    ? records.map((record) => {
      const reward = safeText(record.entryType, 'violation') === 'reward';
      const prohibited = prohibitedIds.has(record.id);
      const pendingRow = safeText(record.status, 'confirmed') === 'pending';
      return `<tr class="${prohibited ? 'prohibited' : pendingRow ? 'pending' : ''}"><td>${formatDate(record.date || record.weekStart)}</td><td>${reward ? 'Khen thưởng' : prohibited ? 'VI PHẠM ĐIỀU CẤM' : 'Vi phạm'}</td><td class="name">${escapeHtml(record.title || '')}</td><td>${reward ? `+${Number(record.bonus || 0)}` : `−${Number(record.deduction || 0)}`}</td><td>${escapeHtml(statusLabel(record))}</td><td class="name">${escapeHtml([record.note, record.evidence].filter(Boolean).join(' · '))}</td></tr>`;
    }).join('')
    : '<tr><td colspan="6">Không có ghi nhận trong giai đoạn.</td></tr>';
  const prohibitedCount = Number(row.prohibitedViolationCount || 0);
  const resultNote = prohibitedCount
    ? (row.prohibitedDowngraded
      ? `Có ${prohibitedCount} vi phạm điều cấm đã xác nhận. Hạ đúng 1 bậc từ ${row.baseClassification?.label || '—'} xuống ${row.classification?.label || '—'}.`
      : `Có ${prohibitedCount} vi phạm điều cấm đã xác nhận; kết quả theo điểm đã là Chưa đạt.`)
    : 'Không có vi phạm điều cấm đã xác nhận trong khoảng xét.';
  return `${reportHeader(workspace, `PHIẾU HẠNH KIỂM ${range.label.toUpperCase()}`, `${formatDate(range.start)} – ${formatDate(range.end)}`, student.fullName)}${formulaBlock()}<section class="summary-grid"><article><small>Số tuần tính điểm</small><b>${row.weekCount}</b></article><article><small>Điểm TB thang 4</small><b>${Number(row.average || 0).toFixed(2)}</b></article><article><small>Vi phạm ghi nhận</small><b>${confirmed.length} xác nhận · ${pending.length} chờ</b></article><article><small>Hạnh kiểm cuối</small><b>${escapeHtml(row.classification?.label || '')}</b></article></section><section class="result-banner ${prohibitedCount ? 'downgraded' : ''}"><span>Kết quả</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${escapeHtml(resultNote)}</small></section><h2>Quy đổi điểm theo tuần</h2><table><thead><tr><th>STT</th><th>Tuần</th><th>Điểm tuần /100</th><th>Điểm quy đổi /4</th><th>Điểm trừ</th><th>Điểm cộng</th></tr></thead><tbody>${weeklyRows}</tbody></table><h2>Chi tiết ghi nhận</h2><p class="detail-note">Ghi nhận “Chờ xác nhận” được hiển thị để đối chiếu nhưng chưa tác động đến điểm.</p><table><thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th>Điểm</th><th>Trạng thái</th><th>Ghi chú / minh chứng</th></tr></thead><tbody>${detailRows}</tbody></table>${signatureBlock(workspace)}`;
}

function printDocument(title, body, landscape = false) {
  const popup = window.open('', '_blank', 'width=1180,height=880,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,sans-serif;line-height:1.38}.print-actions{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff;border-bottom:1px solid #d8e0e7}.print-actions button{min-height:38px;padding:0 16px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;color:#174ea6;font-weight:700}.print-actions .primary{border-color:#0b57d0;background:#0b57d0;color:#fff}.page{width:${landscape ? '297mm' : '210mm'};min-height:${landscape ? '210mm' : '297mm'};margin:18px auto;padding:12mm;background:#fff}.report-header{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;padding-bottom:12px;border-bottom:3px solid #0b57d0}.school-mark{width:58px;height:58px;display:grid;place-items:center;border-radius:16px;background:#0b57d0;color:#fff;font-size:21px;font-weight:900}.report-header small{color:#0b57d0;font-size:10px;font-weight:900}.report-header h1{margin:4px 0 3px;font-size:19px}.report-header p{margin:0;color:#5f6368;font-size:11px}.report-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 16px;margin:12px 0;padding:9px 11px;border:1px solid #d9e3ef;border-radius:10px;background:#f7faff;font-size:10.5px}.formula-box{display:grid;gap:3px;margin:10px 0;padding:10px 12px;border-left:5px solid #0b57d0;border-radius:10px;background:#edf4ff;font-size:10.5px}.formula-box b{color:#174ea6}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0}.summary-grid article{padding:9px;border:1px solid #d7e2ee;border-radius:10px;background:#f8fbff}.summary-grid small{display:block;color:#5f6368;font-size:9.5px}.summary-grid b{display:block;margin-top:4px;color:#17365d;font-size:15px}.summary-grid em{display:block;margin-top:2px;color:#5f6368;font-size:8.5px;font-style:normal}.result-banner{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;align-items:center;margin:12px 0;padding:11px 13px;border-left:5px solid #188038;border-radius:10px;background:#e6f4ea}.result-banner.downgraded{border-left-color:#d93025;background:#fce8e6}.result-banner span{grid-row:1/3;font-size:9.5px;font-weight:900}.result-banner b{font-size:18px}.result-banner small{font-size:10px}h2{margin:16px 0 7px;font-size:13px}.detail-note{margin:-2px 0 7px;color:#5f6368;font-size:9px}table{width:100%;border-collapse:collapse;font-size:${landscape ? '8.4px' : '9.2px'}}th,td{padding:4.5px 3.5px;border:1px solid #aebbc7;text-align:center;vertical-align:top}th{background:#eaf2ff;color:#17365d}td.name{text-align:left;font-weight:650}td.score{font-weight:900}td.warning{text-align:left}.result.good{color:#137333;font-weight:900}.result.fair{color:#174ea6;font-weight:900}.result.pass{color:#b06000;font-weight:900}.result.fail{color:#b3261e;font-weight:900}tr.prohibited td{background:#fce8e6;color:#8c1d18;font-weight:700}tr.pending td{background:#fff8e1;color:#6f4e00}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:30px;text-align:center}.signatures b,.signatures small,.signatures strong{display:block}.signatures strong{margin-top:48px}@media print{body{background:#fff}.print-actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0}.formula-box,.summary-grid article,.result-banner,tr.prohibited td,tr.pending td{print-color-adjust:exact;-webkit-print-color-adjust:exact}tr{break-inside:avoid}}</style></head><body><div class="print-actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page">${body}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),320),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function showError(panel, message) {
  const errorBox = panel?.querySelector('[data-mf-error]');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.add('show');
}

function clearError(panel) {
  const errorBox = panel?.querySelector('[data-mf-error]');
  if (!errorBox) return;
  errorBox.textContent = '';
  errorBox.classList.remove('show');
}

function exportReport(panel) {
  const workspace = getCurrentWorkspace(panel);
  if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
  const scope = panel.querySelector('[data-mf-scope]')?.value || 'class';
  const period = panel.querySelector('[data-mf-period]')?.value || 'current';
  const range = resolveRange(workspace, period);
  if (!range.start || !range.end) throw new Error('Mốc thời gian xét hạnh kiểm chưa hợp lệ.');
  let body;
  let title;
  if (scope === 'personal') {
    const studentId = panel.querySelector('[data-mf-student]')?.value;
    const student = activeStudents(workspace).find((item) => item.id === studentId);
    if (!student) throw new Error('Vui lòng chọn học sinh cần xuất báo cáo.');
    body = personalReport(workspace, range, student);
    title = `Hanh-kiem-${student.fullName}-${range.label}`;
  } else {
    body = classReport(workspace, range);
    title = `Hanh-kiem-lop-${workspace.classProfile?.className || 'lop'}-${range.label}`;
  }
  printDocument(title.replace(/[\\/:*?"<>|]/g, '-'), body, scope === 'class');
}

function refreshPanelCopy() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const paragraph = panel.querySelector('.bes-mf-title p');
  if (paragraph) paragraph.textContent = 'Hiển thị đầy đủ mọi vi phạm trong khoảng xét; vi phạm chờ xác nhận được ghi rõ và chưa tác động điểm.';
  const workspace = getCurrentWorkspace(panel);
  if (workspace) panel.dataset.workspaceId = safeText(workspace.id, 'default');
}

function installCaptureExport() {
  if (window.__besConductMidFinalV3Installed) return;
  window.__besConductMidFinalV3Installed = true;
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.(`#${PANEL_ID} [data-mf-export]`);
    if (!button) return;
    const panel = button.closest(`#${PANEL_ID}`);
    if (!panel) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearError(panel);
    try {
      exportReport(panel);
    } catch (error) {
      showError(panel, error?.message || 'Không thể xuất báo cáo hạnh kiểm.');
    }
  }, true);

  const observer = new MutationObserver(refreshPanelCopy);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', refreshPanelCopy);
  window.addEventListener('bes-homeroom-store-updated', refreshPanelCopy);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshPanelCopy, { once: true });
  else refreshPanelCopy();
}

installCaptureExport();

if (typeof window !== 'undefined') window.__besConductExportVersion = 'v3-all-violations';
