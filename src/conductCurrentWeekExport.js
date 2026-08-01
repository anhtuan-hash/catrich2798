import {
  calculateConductPeriod,
  conductWeekEndForWorkspace,
  conductWeeksForWorkspace,
  inferConductPeriodRanges,
} from './utils/homeroomConduct.js';

const PANEL_ID = 'bes-conduct-export-reports';
const BUTTON_ID = 'bes-conduct-export-current-week';
const STYLE_ID = 'bes-conduct-export-current-week-style';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const DEFAULT_SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
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
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
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
      const workspace = parseWorkspace(localStorage.getItem(`${WORKSPACE_PREFIX}${userKey}:${workspaceId}`));
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
  const visibleClassName = safeText(
    document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent,
  ).toLowerCase();
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

function daysBetween(first, second) {
  const a = new Date(`${first}T12:00:00`);
  const b = new Date(`${second}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

function resolveCurrentConductWeek(workspace) {
  const ranges = inferConductPeriodRanges(workspace);
  const year = ranges.year || {};
  const weeks = conductWeeksForWorkspace(workspace, year.start, year.end, {
    includeOrientation: false,
    includeInAverageOnly: true,
  });
  const currentDate = today();
  if (!weeks.length) return currentDate;

  const containing = weeks.find((weekStart) => {
    const weekEnd = conductWeekEndForWorkspace(workspace, weekStart);
    return weekStart <= currentDate && currentDate <= weekEnd;
  });
  if (containing) return containing;

  const previous = [...weeks].reverse().find((weekStart) => weekStart <= currentDate);
  const next = weeks.find((weekStart) => weekStart > currentDate);
  if (!previous) return next || weeks[0];
  if (!next) return previous;

  const previousEnd = conductWeekEndForWorkspace(workspace, previous);
  return daysBetween(currentDate, next) <= daysBetween(currentDate, previousEnd) ? next : previous;
}

function resolveCurrentRange(workspace) {
  const ranges = inferConductPeriodRanges(workspace);
  const currentWeek = resolveCurrentConductWeek(workspace);
  const semester2 = ranges.semester2 || {};
  const semester1 = ranges.semester1 || {};
  const isSemester2 = Boolean(semester2.start && currentWeek >= semester2.start);
  const semester = isSemester2 ? semester2 : semester1;
  const semesterLabel = isSemester2 ? 'Học kỳ II' : 'Học kỳ I';
  const weekEnd = conductWeekEndForWorkspace(workspace, currentWeek);
  const end = semester.end && weekEnd > semester.end ? semester.end : weekEnd;
  return {
    type: 'current',
    start: semester.start || currentWeek,
    end,
    currentWeek,
    currentWeekEnd: weekEnd,
    semesterLabel,
    label: `Tính đến tuần ${formatDate(currentWeek)} – ${formatDate(weekEnd)}`,
  };
}

function weeklyPoint(score) {
  return Math.max(0, Math.min(4, (Number(score) || 0) / 25));
}

function classificationCounts(rows) {
  return rows.reduce((counts, row) => {
    const key = row.classification?.id || 'fail';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { good: 0, fair: 0, pass: 0, fail: 0 });
}

function reportHeader(workspace, title, range, studentName = '') {
  const profile = workspace.classProfile || {};
  return `
    <header class="report-header">
      <div class="school-mark">PK</div>
      <div>
        <small>${escapeHtml(safeText(profile.schoolName, DEFAULT_SCHOOL).toUpperCase())}</small>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(range.label)} · ${escapeHtml(range.semesterLabel)}</p>
      </div>
    </header>
    <section class="report-meta">
      <span><b>Lớp:</b> ${escapeHtml(safeText(profile.className, '—'))}</span>
      <span><b>Năm học:</b> ${escapeHtml(safeText(profile.schoolYear, '—'))}</span>
      <span><b>GVCN:</b> ${escapeHtml(safeText(profile.adviserName, '—'))}</span>
      ${studentName ? `<span><b>Học sinh:</b> ${escapeHtml(studentName)}</span>` : ''}
      <span><b>Giai đoạn:</b> ${formatDate(range.start)} – ${formatDate(range.end)}</span>
      <span><b>Ngày xuất:</b> ${formatDate(today())}</span>
    </section>
    <p class="provisional-note"><b>Kết quả tạm tính:</b> Điểm mỗi tuần được quy đổi bằng điểm tuần ÷ 25. Báo cáo gồm dữ liệu từ đầu ${escapeHtml(range.semesterLabel)} đến hết tuần hiện tại.</p>`;
}

function signatureBlock(workspace) {
  return `
    <section class="signatures">
      <div><b>GIÁO VIÊN CHỦ NHIỆM</b><small>(Ký và ghi rõ họ tên)</small><strong>${escapeHtml(safeText(workspace.classProfile?.adviserName))}</strong></div>
      <div><b>XÁC NHẬN CỦA NHÀ TRƯỜNG</b><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div>
    </section>`;
}

function classReport(workspace, range) {
  const rows = calculateConductPeriod(workspace, range.start, range.end);
  const counts = classificationCounts(rows);
  const classAverage = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.average || 0), 0) / rows.length
    : 4;
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.student?.code || '')}</td>
      <td class="name">${escapeHtml(row.student?.fullName || '')}</td>
      <td>${row.weekCount || 0}</td>
      <td>${Number(row.scoreAverage ?? 0).toFixed(2)}</td>
      <td class="score">${Number(row.average || 0).toFixed(2)}</td>
      <td>${escapeHtml(row.classification?.label || '')}</td>
      <td>−${Number(row.totalDeduction || 0)}</td>
      <td>+${Number(row.totalBonus || 0)}</td>
      <td>${row.criticalWeeks ? `${row.criticalWeeks} tuần cần xem xét` : ''}</td>
    </tr>`).join('');

  return `
    ${reportHeader(workspace, 'BẢNG RÈN LUYỆN TÍNH ĐẾN TUẦN HIỆN TẠI', range)}
    <section class="summary-grid">
      <article><small>Điểm TB quy đổi lớp</small><b>${classAverage.toFixed(2)}</b></article>
      <article><small>Tốt / Khá</small><b>${counts.good} / ${counts.fair}</b></article>
      <article><small>Đạt / Chưa đạt</small><b>${counts.pass} / ${counts.fail}</b></article>
      <article><small>Tuần hiện tại</small><b>${formatDate(range.currentWeek)}</b></article>
    </section>
    <table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Số tuần</th><th>TB thang 100</th><th>TB thang 4</th><th>Tạm xếp loại</th><th>Trừ</th><th>Cộng</th><th>Cảnh báo</th></tr></thead><tbody>${bodyRows}</tbody></table>
    ${signatureBlock(workspace)}`;
}

function personalReport(workspace, range, student) {
  const row = calculateConductPeriod(workspace, range.start, range.end)
    .find((item) => item.student?.id === student.id);
  if (!row) throw new Error('Không tìm thấy dữ liệu rèn luyện của học sinh.');

  const weeklyRows = (row.weekly || []).map((week, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)}</td>
      <td>${Number(week.score || 0).toFixed(1)}</td>
      <td class="score">${weeklyPoint(week.score).toFixed(2)}</td>
      <td>${escapeHtml(week.classification?.label || '')}</td>
      <td>−${Number(week.totalDeduction || 0)}</td>
      <td>+${Number(week.totalBonus || 0)}</td>
      <td>${week.locked ? 'Đã khóa' : 'Đang mở'}</td>
    </tr>`).join('');

  return `
    ${reportHeader(workspace, 'PHIẾU RÈN LUYỆN TÍNH ĐẾN TUẦN HIỆN TẠI', range, student.fullName)}
    <section class="summary-grid">
      <article><small>Số tuần được tính</small><b>${row.weekCount || 0}</b></article>
      <article><small>Điểm TB thang 100</small><b>${Number(row.scoreAverage ?? 0).toFixed(2)}</b></article>
      <article><small>Điểm TB thang 4</small><b>${Number(row.average || 0).toFixed(2)}</b></article>
      <article><small>Tạm xếp loại</small><b>${escapeHtml(row.classification?.label || '')}</b></article>
    </section>
    <section class="result-banner"><span>Kết quả tạm tính</span><b>${escapeHtml(row.classification?.label || '')}</b><small>Tổng điểm trừ: ${Number(row.totalDeduction || 0)} · Tổng điểm cộng: ${Number(row.totalBonus || 0)}${row.criticalWeeks ? ` · ${row.criticalWeeks} tuần cần giáo viên xem xét` : ''}.</small></section>
    <h2>Diễn biến theo tuần</h2>
    <table><thead><tr><th>STT</th><th>Tuần</th><th>Điểm 100</th><th>Quy đổi 4</th><th>Xếp loại tuần</th><th>Trừ</th><th>Cộng</th><th>Trạng thái</th></tr></thead><tbody>${weeklyRows}</tbody></table>
    ${signatureBlock(workspace)}`;
}

function printReport(title, body) {
  const popup = window.open('', '_blank', 'width=1120,height=840,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  try { popup.opener = null; } catch { /* Browser controlled. */ }
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,'Helvetica Neue',sans-serif;line-height:1.4}.actions{position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff;border-bottom:1px solid #d8e0e7}.actions button{min-height:38px;padding:0 16px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;color:#174ea6;font-weight:700;cursor:pointer}.actions .primary{border-color:#137333;background:#137333;color:#fff}.page{width:297mm;min-height:210mm;margin:16px auto;padding:12mm;background:#fff;box-shadow:0 18px 48px rgba(32,33,36,.16)}.report-header{display:grid;grid-template-columns:58px 1fr;align-items:center;gap:14px;padding-bottom:13px;border-bottom:3px solid #137333}.school-mark{width:58px;height:58px;display:grid;place-items:center;border-radius:17px;background:#137333;color:#fff;font-size:21px;font-weight:900}.report-header small{display:block;color:#137333;font-size:10.5px;font-weight:900;letter-spacing:.055em}.report-header h1{margin:3px 0;font-size:20px}.report-header p{margin:0;color:#5f6368;font-size:11px}.report-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 16px;margin:12px 0;padding:10px 12px;border:1px solid #d6e4da;border-radius:12px;background:#f3faf5;font-size:10.5px}.provisional-note{margin:10px 0;padding:9px 11px;border-left:4px solid #f9ab00;border-radius:8px;background:#fff8e1;color:#5f4b00;font-size:10.5px}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.summary-grid article{padding:9px;border:1px solid #d7e2ee;border-radius:11px;background:#f8fbff}.summary-grid small{display:block;color:#5f6368;font-size:9.5px}.summary-grid b{display:block;margin-top:4px;color:#17365d;font-size:17px}.result-banner{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;align-items:center;margin:13px 0;padding:12px 14px;border-left:5px solid #137333;border-radius:10px;background:#e6f4ea}.result-banner span{grid-row:1/3;color:#137333;font-size:9.5px;font-weight:900;text-transform:uppercase}.result-banner b{font-size:18px}.result-banner small{color:#5f6368;font-size:10.5px}h2{margin:18px 0 7px;font-size:13px}table{width:100%;border-collapse:collapse;font-size:9.3px}thead{display:table-header-group}th,td{padding:5px 4px;border:1px solid #aebbc7;text-align:center;vertical-align:middle}th{background:#e6f4ea;color:#174d2a;font-weight:800}td.name{text-align:left;font-weight:650}td.score{font-size:11px;font-weight:900}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:32px;text-align:center;break-inside:avoid}.signatures b,.signatures small,.signatures strong{display:block}.signatures b{font-size:10px}.signatures small{margin-top:3px;color:#6a7279;font-size:9px;font-style:italic}.signatures strong{margin-top:46px;font-size:11px}@media print{body{background:#fff}.actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.report-meta,.summary-grid article,.result-banner,.provisional-note{print-color-adjust:exact;-webkit-print-color-adjust:exact}tr{break-inside:avoid}}
  </style></head><body><div class="actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page">${body}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function exportCurrentWeek(panel) {
  const workspace = getCurrentWorkspace();
  if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
  const range = resolveCurrentRange(workspace);
  if (!range.start || !range.end) throw new Error('Không xác định được giai đoạn tính đến tuần hiện tại.');

  const scope = panel.querySelector('[data-export-scope]')?.value || 'class';
  const className = safeText(workspace.classProfile?.className, 'Lop');
  if (scope === 'personal') {
    const studentId = panel.querySelector('[data-export-student]')?.value;
    const student = activeStudents(workspace).find((item) => item.id === studentId);
    if (!student) throw new Error('Vui lòng chọn học sinh cần xuất phiếu rèn luyện.');
    printReport(
      `Ren-luyen-${student.fullName}-den-tuan-hien-tai`.replace(/[\\/:*?"<>|]/g, '-'),
      personalReport(workspace, range, student),
    );
    return;
  }

  printReport(
    `Ren-luyen-lop-${className}-den-tuan-hien-tai`.replace(/[\\/:*?"<>|]/g, '-'),
    classReport(workspace, range),
  );
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{background:#137333!important;box-shadow:0 5px 13px rgba(19,115,51,.24)!important}
    #${BUTTON_ID}:hover{background:#0d652d!important}
  `;
  document.head.appendChild(style);
}

function ensureButton() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel || document.getElementById(BUTTON_ID)) return;
  const controls = panel.querySelector('.bes-conduct-export-controls');
  if (!controls) return;

  injectStyle();
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Xuất đến tuần hiện tại';
  button.title = 'Xuất kết quả rèn luyện tạm tính từ đầu học kỳ đến hết tuần hiện tại';
  button.addEventListener('click', () => {
    const errorBox = panel.querySelector('[data-export-error]');
    if (errorBox) {
      errorBox.classList.remove('show');
      errorBox.textContent = '';
    }
    button.disabled = true;
    try {
      exportCurrentWeek(panel);
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error?.message || 'Không thể xuất báo cáo tính đến tuần hiện tại.';
        errorBox.classList.add('show');
      }
    } finally {
      button.disabled = false;
    }
  });
  controls.appendChild(button);
}

let scheduled = false;
function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    ensureButton();
  });
}

const observer = new MutationObserver(scheduleEnsure);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', scheduleEnsure);
window.addEventListener('bes-homeroom-store-updated', scheduleEnsure);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnsure, { once: true });
} else {
  scheduleEnsure();
}
