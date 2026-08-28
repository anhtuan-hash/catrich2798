import {
  calculateWeeklyConduct,
  conductPlanRowsForWorkspace,
  conductWeekEndForWorkspace,
  inferConductPeriodRanges,
  resolveConductWeekStart,
} from './utils/homeroomConduct.js';
import {
  classifyConductPoint,
  conductWeekPoint,
  downgradeConductOneLevel,
  FIXED_CONDUCT_POLICY,
  prohibitedRecordsForRange,
} from './utils/conductFixedPolicy.js';

const PANEL_ID = 'bes-conduct-mid-final-reports';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';
const PERIOD_LABELS = Object.freeze({ current: 'Đến tuần hiện tại', mid1: 'Giữa học kỳ I', semester1: 'Cuối học kỳ I', mid2: 'Giữa học kỳ II', semester2: 'Cuối học kỳ II' });
const DEFAULT_SCHOOL = 'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ';

const text = (value, fallback = '') => String(value ?? '').trim() || fallback;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const isoToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const fmt = (value) => {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? text(value, '—') : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

function parse(raw) {
  try { return JSON.parse(raw || 'null'); } catch { return null; }
}

function currentWorkspace(panel) {
  const candidates = [];
  const seen = new Set();
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CURRENT_PREFIX)) continue;
      const userKey = key.slice(CURRENT_PREFIX.length);
      const workspaceId = text(localStorage.getItem(key), 'default');
      const workspace = parse(localStorage.getItem(`${WORKSPACE_PREFIX}${userKey}:${workspaceId}`));
      if (!workspace) continue;
      const sig = `${userKey}:${text(workspace.id, workspaceId)}`;
      if (!seen.has(sig)) { seen.add(sig); candidates.push(workspace); }
    }
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
      const workspace = parse(localStorage.getItem(key));
      if (!workspace) continue;
      const sig = `${text(workspace.classProfile?.adviserEmail)}:${text(workspace.id)}`;
      if (!seen.has(sig)) { seen.add(sig); candidates.push(workspace); }
    }
  } catch { return null; }
  if (!candidates.length) return null;
  const className = text(document.querySelector('#hr-material-hero-title')?.textContent || document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent).toLowerCase();
  let pool = className ? candidates.filter((item) => text(item.classProfile?.className).toLowerCase() === className) : [];
  if (!pool.length) {
    const id = text(panel?.dataset?.workspaceId);
    pool = id ? candidates.filter((item) => text(item.id, 'default') === id) : [];
  }
  if (!pool.length) pool = candidates;
  return [...pool].sort((a, b) => (Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0) - (Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0))[0];
}

function activeStudents(workspace) {
  return (Array.isArray(workspace?.students) ? workspace.students : []).filter((item) => item?.active !== false).sort((a, b) => text(a.fullName).localeCompare(text(b.fullName), 'vi'));
}

function rangeFor(workspace, period) {
  const ranges = inferConductPeriodRanges(workspace);
  if (period !== 'current') {
    const key = PERIOD_LABELS[period] ? period : 'mid1';
    return { type: key, label: PERIOD_LABELS[key], ...(ranges[key] || {}) };
  }
  const currentDate = isoToday();
  const semester2 = ranges.semester2 || {};
  const isSemester2 = Boolean(semester2.start && currentDate >= semester2.start);
  const semester = isSemester2 ? semester2 : (ranges.semester1 || {});
  const weekStart = resolveConductWeekStart(workspace, currentDate, { nearest: true });
  const weekEnd = conductWeekEndForWorkspace(workspace, weekStart);
  return {
    type: 'current', label: `Đến tuần hiện tại (${isSemester2 ? 'HKII' : 'HKI'})`,
    start: semester.start || weekStart,
    end: semester.end && weekEnd > semester.end ? semester.end : weekEnd,
  };
}

function recordsForRange(workspace, range) {
  return (Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : []).filter((record) => {
    if (text(record.status, 'confirmed') === 'cancelled') return false;
    if (text(record.entryType, 'violation') === 'reward') return false;
    const date = text(record.date || record.weekStart).slice(0, 10);
    return date && (!range.start || date >= range.start) && (!range.end || date <= range.end);
  });
}

function liveRows(workspace, range) {
  // For semester reports, only rows explicitly marked includeInAverage count.
  // Grade-12 summer-prep/orientation rows remain visible in the app but never dilute the HK average.
  const weeks = conductPlanRowsForWorkspace(workspace, { includeOrientation: false, includeInAverageOnly: true })
    .filter((row) => (!range.start || row.endDate >= range.start) && (!range.end || row.startDate <= range.end))
    .map((row) => row.startDate);
  const byWeek = weeks.map((week) => calculateWeeklyConduct(workspace, week, { live: true }));
  return activeStudents(workspace).map((student) => {
    const weekly = byWeek.map((rows) => rows.find((row) => row.student.id === student.id)).filter(Boolean);
    const points = weekly.map((row) => conductWeekPoint(row.score));
    const average = points.length ? Math.round((points.reduce((sum, point) => sum + point, 0) / points.length) * 100) / 100 : FIXED_CONDUCT_POLICY.maximum;
    const baseClassification = classifyConductPoint(average);
    const prohibited = prohibitedRecordsForRange(workspace, range.start, range.end, student.id);
    const classification = prohibited.length ? downgradeConductOneLevel(baseClassification) : baseClassification;
    return { student, weekly, weekCount: weekly.length, average, baseClassification, classification, prohibited, totalDeduction: weekly.reduce((sum, row) => sum + Number(row.totalDeduction || 0), 0) };
  });
}

function printReport(workspace, range) {
  const rows = liveRows(workspace, range);
  const violations = recordsForRange(workspace, range);
  const confirmed = violations.filter((item) => text(item.status, 'confirmed') === 'confirmed');
  const pending = violations.filter((item) => text(item.status, 'confirmed') === 'pending');
  const studentMap = new Map(activeStudents(workspace).map((student) => [student.id, student]));
  const prohibitedIds = new Set(rows.flatMap((row) => row.prohibited.map((record) => record.id)));
  const classAverage = rows.length ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length : 4;
  const counts = rows.reduce((out, row) => { const id = row.classification?.id || 'fail'; out[id] = (out[id] || 0) + 1; return out; }, { good: 0, fair: 0, pass: 0, fail: 0 });

  const bodyRows = rows.map((row, index) => {
    const studentViolations = violations.filter((item) => item.studentId === row.student.id);
    const studentConfirmed = studentViolations.filter((item) => text(item.status, 'confirmed') === 'confirmed');
    const studentPending = studentViolations.filter((item) => text(item.status, 'confirmed') === 'pending');
    const deduction = studentConfirmed.reduce((sum, item) => sum + Math.max(0, Number(item.deduction) || 0), 0);
    const violationText = studentConfirmed.length || studentPending.length ? `${studentConfirmed.length} xác nhận${studentPending.length ? ` · ${studentPending.length} chờ` : ''} · −${deduction}` : '0';
    const prohibitedText = row.prohibited.length ? `${row.prohibited.length} · Hạ 1 bậc` : '0';
    return `<tr><td>${index + 1}</td><td>${esc(row.student.code || '')}</td><td class="name">${esc(row.student.fullName)}</td><td>${row.weekCount}</td><td class="score">${row.average.toFixed(2)}</td><td>${esc(row.baseClassification?.label || '')}</td><td class="warn">${esc(violationText)}</td><td>${esc(prohibitedText)}</td><td class="${row.classification?.id || ''}"><b>${esc(row.classification?.label || '')}</b></td></tr>`;
  }).join('');

  const detailRows = violations.length ? violations.map((record, index) => {
    const student = studentMap.get(record.studentId);
    const prohibited = prohibitedIds.has(record.id);
    const pendingRow = text(record.status, 'confirmed') === 'pending';
    return `<tr class="${prohibited ? 'prohibited' : pendingRow ? 'pending' : ''}"><td>${index + 1}</td><td>${fmt(record.date || record.weekStart)}</td><td class="name">${esc(student?.fullName || 'Học sinh')}</td><td>${prohibited ? 'Điều cấm' : 'Vi phạm'}</td><td class="name">${esc(record.title || '')}</td><td>−${Number(record.deduction || 0)}</td><td>${pendingRow ? 'Chờ xác nhận' : 'Đã xác nhận'}</td></tr>`;
  }).join('') : '<tr><td colspan="7">Không có vi phạm trong khoảng xét.</td></tr>';

  const totalDeduction = confirmed.reduce((sum, item) => sum + Math.max(0, Number(item.deduction) || 0), 0);
  const title = `Hanh-kiem-lop-${workspace.classProfile?.className || 'lop'}-${range.label}`.replace(/[\\/:*?"<>|]/g, '-');
  const popup = window.open('', '_blank', 'width=1180,height=880,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,sans-serif}.actions{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff}.actions button{padding:10px 18px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;font-weight:700}.actions .primary{background:#0b57d0;color:#fff;border-color:#0b57d0}.page{width:297mm;min-height:210mm;margin:18px auto;padding:12mm;background:#fff}.head{display:flex;gap:14px;align-items:center;border-bottom:3px solid #0b57d0;padding-bottom:12px}.mark{width:56px;height:56px;display:grid;place-items:center;border-radius:15px;background:#0b57d0;color:#fff;font-weight:900}.head small{color:#0b57d0;font-weight:900}.head h1{margin:4px 0;font-size:19px}.meta{display:flex;gap:22px;flex-wrap:wrap;margin:10px 0;font-size:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.summary article{border:1px solid #d7e2ee;border-radius:10px;padding:9px;background:#f8fbff}.summary small{display:block;color:#5f6368;font-size:9px}.summary b{display:block;margin-top:3px;color:#17365d;font-size:15px}.formula{padding:9px 11px;border-left:5px solid #0b57d0;background:#edf4ff;border-radius:10px;font-size:10px}.formula strong{color:#174ea6}table{width:100%;border-collapse:collapse;font-size:8.5px}th,td{border:1px solid #aebbc7;padding:4px;text-align:center;vertical-align:top}th{background:#eaf2ff;color:#17365d}.name,.warn{text-align:left}.score{font-weight:900}.good{color:#137333}.fair{color:#174ea6}.pass{color:#b06000}.fail{color:#b3261e}.prohibited td{background:#fce8e6}.pending td{background:#fff8e1}h2{font-size:13px;margin:15px 0 6px}.sign{display:grid;grid-template-columns:1fr 1fr;text-align:center;margin-top:28px;font-weight:800}@media print{body{background:#fff}.actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0}tr{break-inside:avoid}}</style></head><body><div class="actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page"><header class="head"><div class="mark">PK</div><div><small>${esc(text(workspace.classProfile?.schoolName, DEFAULT_SCHOOL).toUpperCase())}</small><h1>BÁO CÁO HẠNH KIỂM ${esc(range.label.toUpperCase())}</h1><div>${fmt(range.start)} – ${fmt(range.end)}</div></div></header><div class="meta"><span><b>Lớp:</b> ${esc(workspace.classProfile?.className || '—')}</span><span><b>Năm học:</b> ${esc(workspace.classProfile?.schoolYear || '—')}</span><span><b>GVCN:</b> ${esc(workspace.classProfile?.adviserName || '—')}</span><span><b>Ngày xuất:</b> ${fmt(isoToday())}</span></div><div class="formula"><strong>Dữ liệu sống:</strong> chỉ các tuần được đánh dấu “tính vào trung bình” mới được tính; mọi vi phạm đã xác nhận trong khoảng xét đều trừ điểm và hiển thị. Tuần hè/định hướng không làm loãng trung bình học kỳ.</div><section class="summary"><article><small>Điểm TB thang 4 của lớp</small><b>${classAverage.toFixed(2)}</b></article><article><small>Tốt / Khá · Đạt / Chưa đạt</small><b>${counts.good} / ${counts.fair} · ${counts.pass} / ${counts.fail}</b></article><article><small>Vi phạm ghi nhận</small><b>${confirmed.length} xác nhận · ${pending.length} chờ</b></article><article><small>Tổng điểm trừ đã áp dụng</small><b>−${totalDeduction}</b></article></section><table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Số tuần</th><th>TB /4</th><th>HK theo điểm</th><th>Vi phạm / điểm trừ</th><th>Điều cấm</th><th>HK cuối</th></tr></thead><tbody>${bodyRows}</tbody></table><h2>Chi tiết vi phạm trong khoảng xét</h2><table><thead><tr><th>STT</th><th>Ngày</th><th>Học sinh</th><th>Loại</th><th>Nội dung</th><th>Điểm trừ</th><th>Trạng thái</th></tr></thead><tbody>${detailRows}</tbody></table><div class="sign"><div>GIÁO VIÊN CHỦ NHIỆM<br><small>(Ký và ghi rõ họ tên)</small></div><div>XÁC NHẬN CỦA NHÀ TRƯỜNG<br><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div></div></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),320),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function install() {
  if (window.__besConductMidFinalV4Installed) return;
  window.__besConductMidFinalV4Installed = true;
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.(`#${PANEL_ID} [data-mf-export]`);
    if (!button) return;
    const panel = button.closest(`#${PANEL_ID}`);
    if (!panel || panel.querySelector('[data-mf-scope]')?.value === 'personal') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const errorBox = panel.querySelector('[data-mf-error]');
    if (errorBox) { errorBox.textContent = ''; errorBox.classList.remove('show'); }
    try {
      const workspace = currentWorkspace(panel);
      if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
      const range = rangeFor(workspace, panel.querySelector('[data-mf-period]')?.value || 'current');
      if (!range.start || !range.end) throw new Error('Mốc thời gian xét hạnh kiểm chưa hợp lệ.');
      printReport(workspace, range);
    } catch (error) {
      if (errorBox) { errorBox.textContent = error?.message || 'Không thể xuất báo cáo.'; errorBox.classList.add('show'); }
    }
  }, true);
}

install();
if (typeof window !== 'undefined') window.__besConductExportVersion = 'v4-live-class-report';