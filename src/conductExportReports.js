import {
  calculateConductPeriod,
  calculateWeeklyConduct,
  conductWeekEndForWorkspace,
  conductWeeksForWorkspace,
  findConductPlanRow,
  inferConductPeriodRanges,
  isConductWeekLocked,
} from './utils/homeroomConduct.js';

const PANEL_ID = 'bes-conduct-export-reports';
const STYLE_ID = 'bes-conduct-export-reports-style';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const PREFS_KEY = 'bes-conduct-export-reports-prefs-v1';
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function formatMonth(value) {
  const match = safeText(value).match(/^(\d{4})-(\d{2})$/);
  return match ? `Tháng ${Number(match[2])}/${match[1]}` : 'Tháng chưa xác định';
}

function monthRange(value) {
  const match = safeText(value).match(/^(\d{4})-(\d{2})$/);
  if (!match) return { start: today(), end: today() };
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: toLocalIsoDate(new Date(year, month, 0)),
  };
}

function readPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePrefs(panel) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      scope: panel.querySelector('[data-export-scope]')?.value || 'class',
      period: panel.querySelector('[data-export-period]')?.value || 'week',
      week: panel.querySelector('[data-export-week]')?.value || '',
      month: panel.querySelector('[data-export-month]')?.value || today().slice(0, 7),
      studentId: panel.querySelector('[data-export-student]')?.value || '',
    }));
  } catch {
    // Preferences are optional.
  }
}

function parseWorkspace(raw) {
  try {
    const workspace = JSON.parse(raw || 'null');
    return workspace && typeof workspace === 'object' ? workspace : null;
  } catch {
    return null;
  }
}

function currentWorkspaceCandidates() {
  const candidates = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CURRENT_PREFIX)) continue;
      const userKey = key.slice(CURRENT_PREFIX.length);
      const workspaceId = safeText(localStorage.getItem(key), 'default');
      const raw = localStorage.getItem(`${WORKSPACE_PREFIX}${userKey}:${workspaceId}`);
      const workspace = parseWorkspace(raw);
      if (workspace) candidates.push(workspace);
    }

    if (!candidates.length) {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
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
  const visibleClassName = safeText(document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent).toLowerCase();
  const matching = visibleClassName
    ? candidates.filter((item) => safeText(item.classProfile?.className).toLowerCase() === visibleClassName)
    : [];
  return [...(matching.length ? matching : candidates)].sort((a, b) => {
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

function selectedWeekFromPage() {
  return safeText(
    document.querySelector('.hr-conduct-week-picker select')?.value
      || document.querySelector('.hr-conduct-week-nav select')?.value,
  );
}

function selectedMonthFromPage() {
  return safeText(document.querySelector('.hr-conduct-period input[type="month"]')?.value, today().slice(0, 7));
}

function weekLabel(workspace, weekStart) {
  const planRow = findConductPlanRow(workspace, weekStart);
  const range = `${formatDate(weekStart)} – ${formatDate(conductWeekEndForWorkspace(workspace, weekStart))}`;
  return planRow?.schoolPlanLabel ? `${planRow.schoolPlanLabel} · ${range}` : `Tuần ${range}`;
}

function getAvailableWeeks(workspace) {
  const ranges = inferConductPeriodRanges(workspace);
  const year = ranges.year || {};
  return conductWeeksForWorkspace(workspace, year.start, year.end, {
    includeOrientation: true,
    includeInAverageOnly: false,
  });
}

function resolveRange(workspace, panel) {
  const period = panel.querySelector('[data-export-period]')?.value || 'week';
  if (period === 'week') {
    const start = safeText(panel.querySelector('[data-export-week]')?.value, selectedWeekFromPage() || today());
    return {
      type: 'week',
      label: weekLabel(workspace, start),
      start,
      end: conductWeekEndForWorkspace(workspace, start),
    };
  }
  if (period === 'month') {
    const value = safeText(panel.querySelector('[data-export-month]')?.value, selectedMonthFromPage());
    const range = monthRange(value);
    return { type: 'month', label: formatMonth(value), ...range };
  }
  const ranges = inferConductPeriodRanges(workspace);
  const key = period === 'semester2' ? 'semester2' : 'semester1';
  const range = ranges[key] || {};
  return {
    type: key,
    label: key === 'semester2' ? 'Học kỳ II' : 'Học kỳ I',
    start: range.start,
    end: range.end,
  };
}

function classificationCounts(rows) {
  return rows.reduce((counts, row) => {
    const key = row.classification?.id || 'fail';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { good: 0, fair: 0, pass: 0, fail: 0 });
}

function reportHeader(workspace, title, subtitle, subjectName = '') {
  const profile = workspace.classProfile || {};
  const school = safeText(profile.schoolName, DEFAULT_SCHOOL).toUpperCase();
  const className = safeText(profile.className, '—');
  const schoolYear = safeText(profile.schoolYear, '—');
  const adviser = safeText(profile.adviserName, '—');
  return `
    <header class="report-header">
      <div class="school-mark">PK</div>
      <div class="school-heading">
        <small>${escapeHtml(school)}</small>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
    </header>
    <section class="report-meta">
      <span><b>Lớp:</b> ${escapeHtml(className)}</span>
      <span><b>Năm học:</b> ${escapeHtml(schoolYear)}</span>
      <span><b>Giáo viên chủ nhiệm:</b> ${escapeHtml(adviser)}</span>
      ${subjectName ? `<span><b>Học sinh:</b> ${escapeHtml(subjectName)}</span>` : ''}
      <span><b>Ngày xuất:</b> ${formatDate(today())}</span>
    </section>`;
}

function signatureBlock(workspace) {
  const adviser = safeText(workspace.classProfile?.adviserName);
  return `
    <section class="signatures">
      <div><b>GIÁO VIÊN CHỦ NHIỆM</b><small>(Ký và ghi rõ họ tên)</small><strong>${escapeHtml(adviser)}</strong></div>
      <div><b>XÁC NHẬN CỦA NHÀ TRƯỜNG</b><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div>
    </section>`;
}

function statusText(locked) {
  return locked ? 'Đã khóa' : 'Đang mở';
}

function classWeeklyReport(workspace, range) {
  const rows = calculateWeeklyConduct(workspace, range.start);
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length : 100;
  const counts = classificationCounts(rows);
  const totalDeduction = rows.reduce((sum, row) => sum + Number(row.totalDeduction || 0), 0);
  const totalBonus = rows.reduce((sum, row) => sum + Number(row.totalBonus || 0), 0);
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.student.code || '')}</td>
      <td class="name">${escapeHtml(row.student.fullName)}</td>
      <td>${row.baseScore}</td>
      <td>−${row.totalDeduction}</td>
      <td>+${row.totalBonus || 0}</td>
      <td class="score">${Number(row.score || 0).toFixed(1)}</td>
      <td>${escapeHtml(row.classification?.label || '')}</td>
      <td>${row.critical ? 'Cần xem xét' : ''}</td>
    </tr>`).join('');
  return `
    ${reportHeader(workspace, 'BẢNG TỔNG HỢP RÈN LUYỆN LỚP', range.label)}
    <section class="summary-grid">
      <article><small>Điểm trung bình</small><b>${average.toFixed(2)}</b></article>
      <article><small>Tốt / Khá</small><b>${counts.good} / ${counts.fair}</b></article>
      <article><small>Đạt / Chưa đạt</small><b>${counts.pass} / ${counts.fail}</b></article>
      <article><small>Điểm trừ / cộng</small><b>−${totalDeduction} / +${totalBonus}</b></article>
    </section>
    <div class="status-line">Trạng thái tuần: <b>${statusText(isConductWeekLocked(workspace, range.start))}</b></div>
    <table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Điểm đầu</th><th>Trừ</th><th>Cộng</th><th>Điểm cuối</th><th>Xếp loại</th><th>Ghi chú</th></tr></thead><tbody>${bodyRows}</tbody></table>
    ${signatureBlock(workspace)}`;
}

function classPeriodReport(workspace, range) {
  const rows = calculateConductPeriod(workspace, range.start, range.end);
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.average || 0), 0) / rows.length : 100;
  const counts = classificationCounts(rows);
  const totalDeduction = rows.reduce((sum, row) => sum + Number(row.totalDeduction || 0), 0);
  const totalBonus = rows.reduce((sum, row) => sum + Number(row.totalBonus || 0), 0);
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.student.code || '')}</td>
      <td class="name">${escapeHtml(row.student.fullName)}</td>
      <td>${row.weekCount}</td>
      <td>${row.lockedWeeks || 0}</td>
      <td>−${row.totalDeduction}</td>
      <td>+${row.totalBonus || 0}</td>
      <td class="score">${Number(row.average || 0).toFixed(2)}</td>
      <td>${escapeHtml(row.classification?.label || '')}</td>
      <td>${row.criticalWeeks ? `${row.criticalWeeks} tuần` : ''}</td>
    </tr>`).join('');
  return `
    ${reportHeader(workspace, 'BẢNG TỔNG HỢP RÈN LUYỆN LỚP', `${range.label} · ${formatDate(range.start)} – ${formatDate(range.end)}`)}
    <section class="summary-grid">
      <article><small>Điểm trung bình lớp</small><b>${average.toFixed(2)}</b></article>
      <article><small>Tốt / Khá</small><b>${counts.good} / ${counts.fair}</b></article>
      <article><small>Đạt / Chưa đạt</small><b>${counts.pass} / ${counts.fail}</b></article>
      <article><small>Điểm trừ / cộng</small><b>−${totalDeduction} / +${totalBonus}</b></article>
    </section>
    <table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Số tuần</th><th>Đã khóa</th><th>Trừ</th><th>Cộng</th><th>Điểm TB</th><th>Xếp loại</th><th>Cảnh báo</th></tr></thead><tbody>${bodyRows}</tbody></table>
    ${signatureBlock(workspace)}`;
}

function detailRecords(records = []) {
  if (!records.length) return '<p class="empty-note">Không có ghi nhận trừ điểm hoặc cộng điểm trong giai đoạn này.</p>';
  return `
    <table class="detail-table"><thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th>Điểm</th><th>Ghi chú / minh chứng</th></tr></thead><tbody>
      ${records.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map((record) => `
        <tr>
          <td>${formatDate(record.date)}</td>
          <td>${record.entryType === 'reward' ? 'Khen thưởng' : 'Vi phạm'}</td>
          <td class="name">${escapeHtml(record.title)}</td>
          <td>${record.entryType === 'reward' ? `+${record.bonus || 0}` : `−${record.deduction || 0}`}</td>
          <td>${escapeHtml([record.note, record.evidence].filter(Boolean).join(' · '))}</td>
        </tr>`).join('')}
    </tbody></table>`;
}

function personalWeeklyReport(workspace, range, student) {
  const row = calculateWeeklyConduct(workspace, range.start).find((item) => item.student.id === student.id);
  if (!row) throw new Error('Không tìm thấy dữ liệu rèn luyện của học sinh trong tuần đã chọn.');
  return `
    ${reportHeader(workspace, 'PHIẾU RÈN LUYỆN CÁ NHÂN', range.label, student.fullName)}
    <section class="summary-grid personal">
      <article><small>Điểm đầu tuần</small><b>${row.baseScore}</b></article>
      <article><small>Tổng điểm trừ</small><b>−${row.totalDeduction}</b></article>
      <article><small>Tổng điểm cộng</small><b>+${row.totalBonus || 0}</b></article>
      <article><small>Điểm cuối tuần</small><b>${Number(row.score || 0).toFixed(1)}</b></article>
    </section>
    <section class="result-banner"><span>Kết quả</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.critical ? 'Có ghi nhận cần giáo viên chủ nhiệm xem xét.' : 'Không có cảnh báo nghiêm trọng.'}</small></section>
    <h2 class="section-title">Chi tiết ghi nhận</h2>
    ${detailRecords(row.records)}
    ${signatureBlock(workspace)}`;
}

function personalPeriodReport(workspace, range, student) {
  const row = calculateConductPeriod(workspace, range.start, range.end).find((item) => item.student.id === student.id);
  if (!row) throw new Error('Không tìm thấy dữ liệu rèn luyện của học sinh trong giai đoạn đã chọn.');
  const weeklyRows = row.weekly.map((week, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)}</td>
      <td>−${week.totalDeduction}</td>
      <td>+${week.totalBonus || 0}</td>
      <td class="score">${Number(week.score || 0).toFixed(1)}</td>
      <td>${escapeHtml(week.classification?.label || '')}</td>
      <td>${statusText(Boolean(week.locked))}</td>
    </tr>`).join('');
  const records = row.weekly.flatMap((week) => week.records || []);
  return `
    ${reportHeader(workspace, 'PHIẾU RÈN LUYỆN CÁ NHÂN', `${range.label} · ${formatDate(range.start)} – ${formatDate(range.end)}`, student.fullName)}
    <section class="summary-grid personal">
      <article><small>Số tuần tính điểm</small><b>${row.weekCount}</b></article>
      <article><small>Tổng điểm trừ</small><b>−${row.totalDeduction}</b></article>
      <article><small>Tổng điểm cộng</small><b>+${row.totalBonus || 0}</b></article>
      <article><small>Điểm trung bình</small><b>${Number(row.average || 0).toFixed(2)}</b></article>
    </section>
    <section class="result-banner"><span>Xếp loại giai đoạn</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.criticalWeeks ? `${row.criticalWeeks} tuần có cảnh báo cần xem xét.` : 'Không có tuần cảnh báo nghiêm trọng.'}</small></section>
    <h2 class="section-title">Diễn biến theo tuần</h2>
    <table><thead><tr><th>STT</th><th>Tuần</th><th>Trừ</th><th>Cộng</th><th>Điểm</th><th>Xếp loại</th><th>Trạng thái</th></tr></thead><tbody>${weeklyRows}</tbody></table>
    <h2 class="section-title">Chi tiết ghi nhận</h2>
    ${detailRecords(records)}
    ${signatureBlock(workspace)}`;
}

function printDocument(title, body) {
  const popup = window.open('', '_blank', 'width=1120,height=840,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* browser controlled */ }
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 portrait;margin:12mm}
    *{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,'Helvetica Neue',sans-serif;line-height:1.42}.print-actions{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff;border-bottom:1px solid #d8e0e7}.print-actions button{min-height:38px;padding:0 16px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;color:#174ea6;font-weight:700;cursor:pointer}.print-actions button.primary{border-color:#0b57d0;background:#0b57d0;color:#fff}.page{width:210mm;min-height:297mm;margin:18px auto;padding:16mm 14mm;background:#fff;box-shadow:0 18px 48px rgba(32,33,36,.16)}.report-header{display:grid;grid-template-columns:62px 1fr;align-items:center;gap:16px;padding-bottom:15px;border-bottom:3px solid #0b57d0}.school-mark{width:62px;height:62px;display:grid;place-items:center;border-radius:18px;background:#0b57d0;color:#fff;font-size:22px;font-weight:900;letter-spacing:.04em}.school-heading small{display:block;color:#0b57d0;font-size:11px;font-weight:900;letter-spacing:.055em}.school-heading h1{margin:4px 0 3px;font-size:21px;line-height:1.15}.school-heading p{margin:0;color:#5f6368;font-size:12px}.report-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px;margin:14px 0 16px;padding:11px 13px;border:1px solid #d9e3ef;border-radius:12px;background:#f7faff;font-size:11.5px}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.summary-grid article{min-height:66px;padding:10px;border:1px solid #d7e2ee;border-radius:12px;background:#f8fbff}.summary-grid article:nth-child(2){background:#f1f8f3}.summary-grid article:nth-child(3){background:#fff8e8}.summary-grid article:nth-child(4){background:#fceef0}.summary-grid small{display:block;color:#5f6368;font-size:10px}.summary-grid b{display:block;margin-top:5px;color:#17365d;font-size:18px}.status-line{margin:10px 0;font-size:11.5px}.result-banner{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:3px 14px;margin:14px 0;padding:13px 15px;border-left:5px solid #0b57d0;border-radius:10px;background:#eaf2ff}.result-banner span{grid-row:1/3;color:#174ea6;font-size:10px;font-weight:900;text-transform:uppercase}.result-banner b{font-size:19px}.result-banner small{color:#5f6368;font-size:11px}.section-title{margin:20px 0 8px;color:#183153;font-size:14px}table{width:100%;border-collapse:collapse;font-size:10.3px}thead{display:table-header-group}th,td{padding:6px 5px;border:1px solid #aebbc7;text-align:center;vertical-align:middle}th{background:#eaf2ff;color:#17365d;font-weight:800}td.name{text-align:left;font-weight:650}td.score{font-size:12px;font-weight:900}.detail-table{margin-top:6px}.empty-note{padding:14px;border:1px dashed #b9c5d0;border-radius:10px;color:#5f6368;text-align:center;font-size:11px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:38px;text-align:center;break-inside:avoid}.signatures div{min-height:100px}.signatures b,.signatures small,.signatures strong{display:block}.signatures b{font-size:11px}.signatures small{margin-top:3px;color:#6a7279;font-size:10px;font-style:italic}.signatures strong{margin-top:54px;font-size:12px}@media(max-width:900px){.page{width:100%;min-height:0;margin:0;padding:22px}.summary-grid{grid-template-columns:repeat(2,1fr)}}@media print{body{background:#fff}.print-actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.report-meta,.summary-grid article,.result-banner{print-color-adjust:exact;-webkit-print-color-adjust:exact}.section-title{break-after:avoid}tr{break-inside:avoid}}
  </style></head><body><div class="print-actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page">${body}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),380),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function exportReport(panel) {
  const workspace = getCurrentWorkspace();
  if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
  const scope = panel.querySelector('[data-export-scope]')?.value || 'class';
  const range = resolveRange(workspace, panel);
  if (!range.start || !range.end) throw new Error('Khoảng thời gian xuất chưa hợp lệ.');
  const profile = workspace.classProfile || {};
  const className = safeText(profile.className, 'Lop');
  let body = '';
  let title = '';

  if (scope === 'class') {
    body = range.type === 'week' ? classWeeklyReport(workspace, range) : classPeriodReport(workspace, range);
    title = `Ren-luyen-lop-${className}-${range.label}`;
  } else {
    const studentId = panel.querySelector('[data-export-student]')?.value;
    const student = activeStudents(workspace).find((item) => item.id === studentId);
    if (!student) throw new Error('Vui lòng chọn học sinh cần xuất phiếu rèn luyện.');
    body = range.type === 'week'
      ? personalWeeklyReport(workspace, range, student)
      : personalPeriodReport(workspace, range, student);
    title = `Ren-luyen-${student.fullName}-${range.label}`;
  }

  savePrefs(panel);
  printDocument(title.replace(/[\\/:*?"<>|]/g, '-'), body);
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .bes-conduct-export-panel{margin:0 0 20px;padding:18px;border:1px solid #c9daf5;border-radius:24px;background:linear-gradient(135deg,#edf4ff 0%,#fff 58%,#eef8f1 100%);box-shadow:0 8px 22px rgba(60,64,67,.08);font-family:inherit}.bes-conduct-export-panel *{box-sizing:border-box}.bes-conduct-export-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}.bes-conduct-export-title{display:grid;grid-template-columns:44px 1fr;gap:12px}.bes-conduct-export-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:#0b57d0;color:#fff;font-weight:900;box-shadow:0 8px 18px rgba(11,87,208,.24)}.bes-conduct-export-title small{display:block;color:#0b57d0;font-size:.66rem;font-weight:900;letter-spacing:.08em}.bes-conduct-export-title h3{margin:3px 0 4px;color:#202124;font-size:1.16rem}.bes-conduct-export-title p{margin:0;color:#5f6368;font-size:.82rem;line-height:1.45}.bes-conduct-export-chip{padding:6px 10px;border-radius:999px;background:#e6f4ea;color:#137333;font-size:.68rem;font-weight:850;white-space:nowrap}.bes-conduct-export-controls{display:grid;grid-template-columns:1fr 1fr 1.25fr 1.25fr auto;align-items:end;gap:10px}.bes-conduct-export-controls label{display:grid;gap:6px;min-width:0;color:#3c4043;font-size:.73rem;font-weight:750}.bes-conduct-export-controls select,.bes-conduct-export-controls input{width:100%;height:44px;padding:0 12px;border:1px solid #b8c2cc;border-radius:13px;background:#fff;color:#202124;font:inherit;font-size:.82rem;outline:none}.bes-conduct-export-controls select:focus,.bes-conduct-export-controls input:focus{border-color:#0b57d0;box-shadow:0 0 0 3px rgba(11,87,208,.15)}.bes-conduct-export-controls button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#0b57d0;color:#fff;font:inherit;font-size:.82rem;font-weight:850;cursor:pointer;box-shadow:0 5px 13px rgba(11,87,208,.23)}.bes-conduct-export-controls button:hover{background:#0842a0}.bes-conduct-export-controls button:disabled{opacity:.6;cursor:wait}.bes-conduct-export-range{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(11,87,208,.14);color:#5f6368;font-size:.76rem}.bes-conduct-export-range b{color:#174ea6}.bes-conduct-export-error{display:none;margin-top:10px;padding:10px 12px;border-radius:12px;background:#fce8e6;color:#b3261e;font-size:.78rem;font-weight:700}.bes-conduct-export-error.show{display:block}@media(max-width:1120px){.bes-conduct-export-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.bes-conduct-export-controls button{grid-column:1/-1}}@media(max-width:620px){.bes-conduct-export-panel{padding:15px;border-radius:20px}.bes-conduct-export-head{display:grid}.bes-conduct-export-chip{justify-self:start}.bes-conduct-export-controls{grid-template-columns:1fr}.bes-conduct-export-controls button{grid-column:auto}.bes-conduct-export-title{grid-template-columns:38px 1fr}.bes-conduct-export-icon{width:38px;height:38px;border-radius:12px}}
  `;
  document.head.appendChild(style);
}

function updatePanelVisibility(panel, workspace) {
  const scope = panel.querySelector('[data-export-scope]')?.value || 'class';
  const period = panel.querySelector('[data-export-period]')?.value || 'week';
  const studentField = panel.querySelector('[data-export-student-field]');
  const weekField = panel.querySelector('[data-export-week-field]');
  const monthField = panel.querySelector('[data-export-month-field]');
  if (studentField) studentField.hidden = scope !== 'personal';
  if (weekField) weekField.hidden = period !== 'week';
  if (monthField) monthField.hidden = period !== 'month';
  const range = resolveRange(workspace, panel);
  const preview = panel.querySelector('[data-export-range-preview]');
  if (preview) preview.innerHTML = `<span>Khoảng xuất:</span><b>${escapeHtml(range.label)}</b><span>${formatDate(range.start)} → ${formatDate(range.end)}</span>`;
  const button = panel.querySelector('[data-export-button]');
  if (button) button.textContent = scope === 'class' ? 'Xuất rèn luyện lớp' : 'Xuất phiếu cá nhân';
  savePrefs(panel);
}

function buildPanel(workspace) {
  const prefs = readPrefs();
  const students = activeStudents(workspace);
  const weeks = getAvailableWeeks(workspace);
  const pageWeek = selectedWeekFromPage();
  const selectedWeek = weeks.includes(prefs.week) ? prefs.week : weeks.includes(pageWeek) ? pageWeek : weeks.at(-1) || today();
  const selectedStudent = students.some((item) => item.id === prefs.studentId) ? prefs.studentId : students[0]?.id || '';
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'bes-conduct-export-panel';
  panel.dataset.workspaceId = safeText(workspace.id, 'default');
  panel.innerHTML = `
    <div class="bes-conduct-export-head">
      <div class="bes-conduct-export-title"><span class="bes-conduct-export-icon">PDF</span><div><small>XUẤT BÁO CÁO RÈN LUYỆN</small><h3>Lớp và cá nhân theo tuần, tháng, học kỳ</h3><p>Tạo bản A4 có thông tin lớp, bảng điểm, chi tiết ghi nhận và khu vực ký xác nhận.</p></div></div>
      <span class="bes-conduct-export-chip">Sẵn sàng xuất PDF</span>
    </div>
    <div class="bes-conduct-export-controls">
      <label><span>Đối tượng</span><select data-export-scope><option value="class"${prefs.scope === 'personal' ? '' : ' selected'}>Cả lớp</option><option value="personal"${prefs.scope === 'personal' ? ' selected' : ''}>Cá nhân</option></select></label>
      <label data-export-student-field><span>Học sinh</span><select data-export-student>${students.map((student) => `<option value="${escapeHtml(student.id)}"${student.id === selectedStudent ? ' selected' : ''}>${escapeHtml(student.code ? `${student.code} · ${student.fullName}` : student.fullName)}</option>`).join('')}</select></label>
      <label><span>Giai đoạn</span><select data-export-period><option value="week"${prefs.period === 'week' || !prefs.period ? ' selected' : ''}>Theo tuần</option><option value="month"${prefs.period === 'month' ? ' selected' : ''}>Theo tháng</option><option value="semester1"${prefs.period === 'semester1' ? ' selected' : ''}>Học kỳ I</option><option value="semester2"${prefs.period === 'semester2' ? ' selected' : ''}>Học kỳ II</option></select></label>
      <label data-export-week-field><span>Tuần</span><select data-export-week>${weeks.map((week) => `<option value="${week}"${week === selectedWeek ? ' selected' : ''}>${escapeHtml(weekLabel(workspace, week))}</option>`).join('')}</select></label>
      <label data-export-month-field><span>Tháng</span><input data-export-month type="month" value="${escapeHtml(prefs.month || selectedMonthFromPage())}"></label>
      <button type="button" data-export-button>Xuất rèn luyện lớp</button>
    </div>
    <div class="bes-conduct-export-range" data-export-range-preview></div>
    <div class="bes-conduct-export-error" data-export-error></div>`;

  panel.querySelectorAll('select,input').forEach((control) => control.addEventListener('change', () => updatePanelVisibility(panel, getCurrentWorkspace() || workspace)));
  panel.querySelector('[data-export-button]')?.addEventListener('click', () => {
    const button = panel.querySelector('[data-export-button]');
    const errorBox = panel.querySelector('[data-export-error]');
    if (errorBox) { errorBox.classList.remove('show'); errorBox.textContent = ''; }
    if (button) button.disabled = true;
    try {
      exportReport(panel);
    } catch (error) {
      if (errorBox) { errorBox.textContent = error?.message || 'Không thể xuất báo cáo.'; errorBox.classList.add('show'); }
    } finally {
      if (button) button.disabled = false;
    }
  });
  updatePanelVisibility(panel, workspace);
  return panel;
}

function ensurePanel() {
  const periodSection = document.querySelector('.hr-conduct-period');
  if (!periodSection) return;
  const workspace = getCurrentWorkspace();
  if (!workspace) return;
  const existing = document.getElementById(PANEL_ID);
  if (existing?.dataset.workspaceId === safeText(workspace.id, 'default')) return;
  existing?.remove();
  injectStyle();
  periodSection.parentElement?.insertBefore(buildPanel(workspace), periodSection);
}

let ensureScheduled = false;
function scheduleEnsure() {
  if (ensureScheduled) return;
  ensureScheduled = true;
  window.requestAnimationFrame(() => {
    ensureScheduled = false;
    ensurePanel();
  });
}

const observer = new MutationObserver(scheduleEnsure);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', scheduleEnsure);
window.addEventListener('bes-homeroom-store-updated', () => {
  document.getElementById(PANEL_ID)?.remove();
  scheduleEnsure();
});
document.addEventListener('change', (event) => {
  if (!event.target?.closest?.('.hr-conduct-week-picker,.hr-conduct-week-nav')) return;
  const panel = document.getElementById(PANEL_ID);
  const weekSelect = panel?.querySelector('[data-export-week]');
  if (weekSelect && [...weekSelect.options].some((option) => option.value === event.target.value)) {
    weekSelect.value = event.target.value;
    const workspace = getCurrentWorkspace();
    if (workspace) updatePanelVisibility(panel, workspace);
  }
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnsure, { once: true });
else scheduleEnsure();
