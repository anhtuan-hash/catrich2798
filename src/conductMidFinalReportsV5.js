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
      const signature = `${userKey}:${text(workspace.id, workspaceId)}`;
      if (!seen.has(signature)) { seen.add(signature); candidates.push(workspace); }
    }
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
      const workspace = parse(localStorage.getItem(key));
      if (!workspace) continue;
      const signature = `${text(workspace.classProfile?.adviserEmail)}:${text(workspace.id)}`;
      if (!seen.has(signature)) { seen.add(signature); candidates.push(workspace); }
    }
  } catch { return null; }
  if (!candidates.length) return null;

  const className = text(
    document.querySelector('#hr-material-hero-title')?.textContent
      || document.querySelector('.hr-class-switcher strong, .hr-workspace-current strong')?.textContent,
  ).toLowerCase();
  let pool = className ? candidates.filter((item) => text(item.classProfile?.className).toLowerCase() === className) : [];
  if (!pool.length) {
    const workspaceId = text(panel?.dataset?.workspaceId);
    pool = workspaceId ? candidates.filter((item) => text(item.id, 'default') === workspaceId) : [];
  }
  if (!pool.length) pool = candidates;
  return [...pool].sort((a, b) => (Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0) - (Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0))[0];
}

function activeStudents(workspace) {
  return (Array.isArray(workspace?.students) ? workspace.students : []).filter((item) => item?.active !== false);
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
    type: 'current',
    label: `Đến tuần hiện tại (${isSemester2 ? 'HKII' : 'HKI'})`,
    start: semester.start || weekStart,
    end: semester.end && weekEnd > semester.end ? semester.end : weekEnd,
  };
}

function recordsForStudent(workspace, range, studentId) {
  return (Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : [])
    .filter((record) => {
      if (record.studentId !== studentId) return false;
      if (text(record.status, 'confirmed') === 'cancelled') return false;
      const date = text(record.date || record.weekStart).slice(0, 10);
      return date && (!range.start || date >= range.start) && (!range.end || date <= range.end);
    })
    .sort((a, b) => `${text(a.date)}:${text(a.createdAt)}`.localeCompare(`${text(b.date)}:${text(b.createdAt)}`));
}

function liveStudentRow(workspace, range, student) {
  const weeks = conductPlanRowsForWorkspace(workspace, { includeOrientation: false, includeInAverageOnly: true })
    .filter((row) => (!range.start || row.endDate >= range.start) && (!range.end || row.startDate <= range.end))
    .map((row) => row.startDate);
  const weekly = weeks
    .map((weekStart) => calculateWeeklyConduct(workspace, weekStart, { live: true }).find((row) => row.student.id === student.id))
    .filter(Boolean);
  const points = weekly.map((row) => conductWeekPoint(row.score));
  const average = points.length
    ? Math.round((points.reduce((sum, point) => sum + point, 0) / points.length) * 100) / 100
    : FIXED_CONDUCT_POLICY.maximum;
  const baseClassification = classifyConductPoint(average);
  const prohibited = prohibitedRecordsForRange(workspace, range.start, range.end, student.id);
  const classification = prohibited.length ? downgradeConductOneLevel(baseClassification) : baseClassification;
  return { weekly, weekCount: weekly.length, average, baseClassification, classification, prohibited };
}

function printPersonalReport(workspace, range, student) {
  const row = liveStudentRow(workspace, range, student);
  const records = recordsForStudent(workspace, range, student.id);
  const violations = records.filter((record) => text(record.entryType, 'violation') !== 'reward');
  const confirmedViolations = violations.filter((record) => text(record.status, 'confirmed') === 'confirmed');
  const pendingViolations = violations.filter((record) => text(record.status, 'confirmed') === 'pending');
  const rewards = records.filter((record) => text(record.entryType, 'violation') === 'reward');
  const prohibitedIds = new Set(row.prohibited.map((record) => record.id));
  const totalDeduction = confirmedViolations.reduce((sum, record) => sum + Math.max(0, Number(record.deduction) || 0), 0);
  const totalBonus = rewards.filter((record) => text(record.status, 'confirmed') === 'confirmed').reduce((sum, record) => sum + Math.max(0, Number(record.bonus) || 0), 0);

  const weeklyRows = row.weekly.map((week, index) => `<tr><td>${index + 1}</td><td>${fmt(week.weekStart)} – ${fmt(week.weekEnd)}</td><td class="score">${Number(week.score || 0).toFixed(1)}</td><td class="score">${conductWeekPoint(week.score).toFixed(2)}</td><td>−${Number(week.totalDeduction || 0)}</td><td>+${Number(week.totalBonus || 0)}</td></tr>`).join('');
  const detailRows = records.length ? records.map((record, index) => {
    const reward = text(record.entryType, 'violation') === 'reward';
    const pending = text(record.status, 'confirmed') === 'pending';
    const prohibited = prohibitedIds.has(record.id);
    const type = reward ? 'Khen thưởng' : prohibited ? 'VI PHẠM ĐIỀU CẤM' : 'Vi phạm';
    const points = reward ? `+${Number(record.bonus || 0)}` : `−${Number(record.deduction || 0)}`;
    return `<tr class="${prohibited ? 'prohibited' : pending ? 'pending' : ''}"><td>${index + 1}</td><td>${fmt(record.date || record.weekStart)}</td><td>${type}</td><td class="name">${esc(record.title || '')}</td><td>${points}</td><td>${pending ? 'Chờ xác nhận' : 'Đã xác nhận'}</td><td class="name">${esc([record.note, record.evidence].filter(Boolean).join(' · '))}</td></tr>`;
  }).join('') : '<tr><td colspan="7">Không có ghi nhận trong khoảng xét.</td></tr>';

  const resultNote = row.prohibited.length
    ? `Có ${row.prohibited.length} vi phạm điều cấm đã xác nhận; kết quả được hạ đúng 1 bậc từ ${row.baseClassification.label} xuống ${row.classification.label}.`
    : 'Không có vi phạm điều cấm đã xác nhận trong khoảng xét.';
  const title = `Hanh-kiem-${student.fullName}-${range.label}`.replace(/[\\/:*?"<>|]/g, '-');
  const popup = window.open('', '_blank', 'width=1160,height=860,scrollbars=yes');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#172b24;font-family:Arial,sans-serif;line-height:1.36}.actions{position:sticky;top:0;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:12px;background:#fff}.actions button{padding:10px 18px;border:1px solid #b7c1ca;border-radius:999px;background:#fff;font-weight:700}.actions .primary{background:#0b57d0;color:#fff;border-color:#0b57d0}.page{width:210mm;min-height:297mm;margin:18px auto;padding:12mm;background:#fff}.head{display:flex;gap:14px;align-items:center;border-bottom:3px solid #0b57d0;padding-bottom:12px}.mark{width:56px;height:56px;display:grid;place-items:center;border-radius:15px;background:#0b57d0;color:#fff;font-weight:900}.head small{color:#0b57d0;font-weight:900}.head h1{margin:4px 0;font-size:18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;margin:10px 0;font-size:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.summary article{border:1px solid #d7e2ee;border-radius:10px;padding:8px;background:#f8fbff}.summary small{display:block;color:#5f6368;font-size:8.5px}.summary b{display:block;margin-top:3px;color:#17365d;font-size:14px}.formula{padding:9px 11px;border-left:5px solid #0b57d0;background:#edf4ff;border-radius:10px;font-size:9.5px}.result{margin:10px 0;padding:10px 12px;border-left:5px solid #188038;background:#e6f4ea;border-radius:10px}.result.downgraded{border-left-color:#d93025;background:#fce8e6}.result b{display:block;font-size:17px}.result small{font-size:9px}table{width:100%;border-collapse:collapse;font-size:8.7px}th,td{border:1px solid #aebbc7;padding:4px;text-align:center;vertical-align:top}th{background:#eaf2ff;color:#17365d}.name{text-align:left}.score{font-weight:900}.prohibited td{background:#fce8e6}.pending td{background:#fff8e1}h2{font-size:13px;margin:15px 0 6px}.sign{display:grid;grid-template-columns:1fr 1fr;text-align:center;margin-top:28px;font-weight:800}.teacher{margin-top:42px;font-weight:800}@media print{body{background:#fff}.actions{display:none}.page{width:auto;min-height:0;margin:0;padding:0}tr{break-inside:avoid}}</style></head><body><div class="actions"><button onclick="window.close()">Đóng</button><button class="primary" onclick="window.print()">In / lưu PDF</button></div><main class="page"><header class="head"><div class="mark">PK</div><div><small>${esc(text(workspace.classProfile?.schoolName, DEFAULT_SCHOOL).toUpperCase())}</small><h1>PHIẾU HẠNH KIỂM ${esc(range.label.toUpperCase())}</h1><div>${fmt(range.start)} – ${fmt(range.end)}</div></div></header><div class="meta"><span><b>Lớp:</b> ${esc(workspace.classProfile?.className || '—')}</span><span><b>Năm học:</b> ${esc(workspace.classProfile?.schoolYear || '—')}</span><span><b>Học sinh:</b> ${esc(student.fullName)}</span><span><b>GVCN:</b> ${esc(workspace.classProfile?.adviserName || '—')}</span></div><div class="formula"><b>Dữ liệu sống:</b> phiếu này đọc trực tiếp toàn bộ ghi nhận hiện có trong khoảng xét, không phụ thuộc snapshot của tuần đã khóa. Chỉ tuần được đánh dấu “tính vào trung bình” mới tham gia điểm TB.</div><section class="summary"><article><small>Số tuần tính điểm</small><b>${row.weekCount}</b></article><article><small>Điểm TB thang 4</small><b>${row.average.toFixed(2)}</b></article><article><small>Vi phạm ghi nhận</small><b>${confirmedViolations.length} xác nhận · ${pendingViolations.length} chờ</b></article><article><small>Điểm trừ / cộng</small><b>−${totalDeduction} / +${totalBonus}</b></article></section><section class="result ${row.prohibited.length ? 'downgraded' : ''}"><b>${esc(row.classification.label)}</b><small>${esc(resultNote)}</small></section><h2>Quy đổi điểm theo tuần</h2><table><thead><tr><th>STT</th><th>Tuần</th><th>Điểm /100</th><th>Điểm /4</th><th>Điểm trừ</th><th>Điểm cộng</th></tr></thead><tbody>${weeklyRows}</tbody></table><h2>Chi tiết toàn bộ ghi nhận</h2><table><thead><tr><th>STT</th><th>Ngày</th><th>Loại</th><th>Nội dung</th><th>Điểm</th><th>Trạng thái</th><th>Ghi chú / minh chứng</th></tr></thead><tbody>${detailRows}</tbody></table><div class="sign"><div>GIÁO VIÊN CHỦ NHIỆM<br><small>(Ký và ghi rõ họ tên)</small><div class="teacher">${esc(workspace.classProfile?.adviserName || '')}</div></div><div>XÁC NHẬN CỦA NHÀ TRƯỜNG<br><small>(Ký, ghi rõ họ tên và đóng dấu)</small></div></div></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),320),{once:true});<\/script></body></html>`);
  popup.document.close();
}

function install() {
  if (window.__besConductMidFinalV5Installed) return;
  window.__besConductMidFinalV5Installed = true;
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.(`#${PANEL_ID} [data-mf-export]`);
    if (!button) return;
    const panel = button.closest(`#${PANEL_ID}`);
    if (!panel || panel.querySelector('[data-mf-scope]')?.value !== 'personal') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const errorBox = panel.querySelector('[data-mf-error]');
    if (errorBox) { errorBox.textContent = ''; errorBox.classList.remove('show'); }
    try {
      const workspace = currentWorkspace(panel);
      if (!workspace) throw new Error('Chưa tìm thấy dữ liệu lớp đang mở trên thiết bị.');
      const studentId = panel.querySelector('[data-mf-student]')?.value || '';
      const student = activeStudents(workspace).find((item) => item.id === studentId);
      if (!student) throw new Error('Vui lòng chọn học sinh cần xuất báo cáo.');
      const range = rangeFor(workspace, panel.querySelector('[data-mf-period]')?.value || 'current');
      if (!range.start || !range.end) throw new Error('Mốc thời gian xét hạnh kiểm chưa hợp lệ.');
      printPersonalReport(workspace, range, student);
    } catch (error) {
      if (errorBox) { errorBox.textContent = error?.message || 'Không thể xuất báo cáo cá nhân.'; errorBox.classList.add('show'); }
    }
  }, true);
}

install();
if (typeof window !== 'undefined') window.__besConductPersonalExportVersion = 'v5-live-personal-report';
