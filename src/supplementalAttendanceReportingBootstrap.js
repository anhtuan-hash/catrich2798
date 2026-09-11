import './styles/SupplementalLearning.css';
import { ensureRuntimeReady, getRuntimeClient, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';
import { loadAttendanceActivities, loadSupplementalHistory, loadSupplementalStudentReport } from './attendance/supplementalLearningApi.js';

const INSTALL_KEY = '__besSupplementalReportingInstalled';
const FILTER_ID = 'bes-supplemental-activity-filter';
const PANEL_ID = 'bes-supplemental-reporting-panel';
const TAB_SELECTOR = '.attendance-tabs button';

let client = null;
let runtime = null;
let observer = null;
let observerActiveTab = '';
let activeTab = '';
let filter = 'all';
let query = '';
let dateFrom = '';
let dateTo = '';
let token = 0;

function canManage() {
  return canManageSupplementalLearning(runtime || {});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function dayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function tabKind(button) {
  const text = normalize(button?.textContent);
  if (/lich su|history/.test(text)) return 'history';
  if (/bao cao|report/.test(text)) return 'report';
  return '';
}

function activeButton() {
  return [...document.querySelectorAll(TAB_SELECTOR)].find((button) =>
    button.getAttribute('aria-selected') === 'true' || button.classList.contains('active') || button.dataset.active === 'true');
}

function detectActiveTab() {
  const detected = tabKind(activeButton());
  if (detected) activeTab = detected;
  return activeTab;
}

function shell() {
  return document.querySelector('.attendance-shell') || document.querySelector('[data-route="attendance"]') || document.querySelector('#bes-main-content');
}

function filterOptions() {
  return [['all', 'Tất cả'], ['remedial', 'Phụ đạo'], ['enrichment', 'Bồi dưỡng'], ['supplemental', 'Học bổ sung']];
}

function activityLabel(type) {
  return ({ all: 'Tất cả', remedial: 'Phụ đạo', enrichment: 'Bồi dưỡng', supplemental: 'Học bổ sung' })[type] || type || '';
}

function statusLabel(value) {
  return ({ confirmed: 'Đã chốt', completed: 'Đã chốt', cancelled: 'Đã hủy', scheduled: 'Chưa điểm danh', in_progress: 'Đang điểm danh', present: 'Có mặt', absent: 'Vắng', tardy: 'Đi trễ', late: 'Đi trễ' })[value] || value || '';
}

function clearSupplementalReportingUi() {
  document.getElementById(FILTER_ID)?.remove();
  closePanel();
  filter = 'all';
  query = '';
  token += 1;
}

function legacyHistoryTypeSelect() {
  return [...document.querySelectorAll('.ahv3__filters select, [data-attendance-history-v3] select')].find((select) => {
    const values = [...select.options].map((option) => option.value);
    return values.includes('remedial') && values.includes('gifted');
  }) || null;
}

function syncLegacyHistoryFilter(activityType) {
  const mapped = activityType === 'enrichment' ? 'gifted' : activityType === 'remedial' ? 'remedial' : activityType === 'supplemental' ? 'supplemental' : 'all';
  const select = legacyHistoryTypeSelect();
  if (!select || select.value === mapped) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement?.prototype || {}, 'value')?.set;
  if (setter) setter.call(select, mapped);
  else select.value = mapped;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function ensureFilter() {
  if (!canManage()) {
    clearSupplementalReportingUi();
    return;
  }

  const host = shell();
  if (!host || !detectActiveTab()) {
    document.getElementById(FILTER_ID)?.remove();
    closePanel();
    return;
  }

  let bar = document.getElementById(FILTER_ID);
  if (!bar) {
    bar = document.createElement('section');
    bar.id = FILTER_ID;
    bar.className = 'bes-supplemental-report-filter';
    const tabs = document.querySelector('.attendance-tabs');
    if (tabs?.parentElement) tabs.insertAdjacentElement('afterend', bar);
    else host.prepend(bar);
  }

  bar.innerHTML = `<div><span>Loại hoạt động</span>${filterOptions().map(([value, label]) =>
    `<button type="button" data-activity-filter="${value}" class="${filter === value ? 'is-active' : ''}">${label}</button>`).join('')}</div>
    <small>${activeTab === 'report'
      ? 'Tất cả giữ nguyên báo cáo hiện tại; chọn Phụ đạo, Bồi dưỡng hoặc Học bổ sung để xem riêng.'
      : 'Tất cả giữ nguyên lịch sử hiện tại; chọn Phụ đạo, Bồi dưỡng hoặc Học bổ sung để xem riêng.'}</small>`;

  bar.querySelectorAll('[data-activity-filter]').forEach((button) => button.addEventListener('click', () => {
    if (!canManage()) return;
    filter = button.dataset.activityFilter || 'all';
    if (activeTab === 'history') syncLegacyHistoryFilter(filter);
    window.dispatchEvent(new CustomEvent('bes-attendance-activity-filter-change', { detail: { activityType: filter, tab: activeTab } }));
    ensureFilter();
  }));

  void refreshPanel();
}

function rangeControls() {
  if (!dateFrom) dateFrom = dayOffset(activeTab === 'report' ? -365 : -31);
  if (!dateTo) dateTo = dayOffset(0);
  const printable = activeTab === 'report' && filter !== 'all';
  return `<div class="bes-supplemental-report-tools">
    <label>Từ ngày<input type="date" data-report-from value="${esc(dateFrom)}"></label>
    <label>Đến ngày<input type="date" data-report-to value="${esc(dateTo)}"></label>
    ${activeTab === 'history' ? `<label>Tìm kiếm<input type="search" data-report-query value="${esc(query)}" placeholder="Học sinh, môn, lớp, giáo viên"></label>` : ''}
    <button type="button" data-report-refresh>Cập nhật</button>
    ${printable ? '<button type="button" class="is-primary" data-report-print>In / Lưu PDF</button>' : ''}
  </div>`;
}

function historyHtml(rows) {
  if (!rows.length) return '<p class="bes-supplemental-empty">Không có dữ liệu Học bổ sung phù hợp trong khoảng ngày này.</p>';
  return `<div class="bes-supplemental-history-list">${rows.map((row) => {
    const participants = row.participants || [];
    const sourceLabel = row.kind === 'adhoc' ? 'HỌC BỔ SUNG · DỮ LIỆU CŨ' : 'LỚP HỌC BỔ SUNG';
    return `<article class="bes-supplemental-history-card">
      <header><div><span class="bes-supplemental-source-badge">${sourceLabel}</span><h3>${esc(row.title || row.subject)}</h3><p>${esc(row.date)} · ${esc(row.subject)} · ${esc(row.teacherName || 'Chưa giáo viên')} · ${esc(row.room || 'Chưa phòng')} · ${esc(row.timeRange || '')}</p></div><strong>${statusLabel(row.status)}</strong></header>
      ${row.status === 'confirmed' ? `<div class="bes-supplemental-history-stats"><span>Tổng <b>${Number(row.totalStudents || 0)}</b></span><span>Có mặt <b>${Number(row.presentCount || 0)}</b></span><span>Đi trễ <b>${Number(row.tardyCount || 0)}</b></span><span>Vắng <b>${Number(row.absentCount || 0)}</b></span></div>` : ''}
      ${row.cancellationReason ? `<p class="bes-supplemental-cancel-reason">Lý do hủy: ${esc(row.cancellationReason)}</p>` : ''}
      ${participants.length ? `<details><summary>Danh sách học sinh (${participants.length})</summary><div class="bes-supplemental-history-participants">${participants.map((participant) => `<div><span><b>${esc(participant.fullName)}</b><small>${esc(participant.studentCode || 'Không mã')} · ${esc(participant.schoolClassName || 'Chưa lớp')}</small></span><em data-status="${esc(participant.status)}">${statusLabel(participant.status)}</em>${participant.status === 'absent' && (participant.absenceReasonCode || participant.absenceNote) ? `<small>${esc(participant.absenceReasonCode || '')} ${esc(participant.absenceNote || '')}</small>` : ''}</div>`).join('')}</div></details>` : ''}
      ${row.sessionNote ? `<p><b>Ghi chú:</b> ${esc(row.sessionNote)}</p>` : ''}
    </article>`;
  }).join('')}</div>`;
}

function unifiedHistoryHtml(rows) {
  if (!rows.length) return '<p class="bes-supplemental-empty">Không có hoạt động trong khoảng ngày này.</p>';
  return `<div class="bes-supplemental-unified-list">${rows.map((row) => `<article>
    <span data-type="${esc(row.activityType)}">${activityLabel(row.activityType)}</span>
    <div><b>${esc(row.title || row.subject)}</b><small>${esc(row.date)} · ${esc(row.subject)} · ${esc(row.teacherName || '')} · ${esc(row.timeRange || '')} · ${esc(row.room || '')}</small></div>
    <strong>${statusLabel(row.status)}</strong>
  </article>`).join('')}</div>`;
}

function reportHtml(rows) {
  const totals = rows.reduce((acc, row) => {
    acc.sessions += Number(row.eligibleSessionCount || 0);
    acc.present += Number(row.presentCount || 0);
    acc.absent += Number(row.absentCount || 0);
    acc.tardy += Number(row.tardyCount || 0);
    return acc;
  }, { sessions: 0, present: 0, absent: 0, tardy: 0 });

  return `<section class="bes-supplemental-pdf-report">
    <header><span>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</span><strong>TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ</strong><h1>BÁO CÁO HỌC BỔ SUNG KIẾN THỨC</h1><p>Từ ${esc(dateFrom)} đến ${esc(dateTo)} · Chỉ tính các buổi đã chốt điểm danh; buổi hủy không vào mẫu số.</p></header>
    <div class="bes-supplemental-report-summary"><span>Học sinh <b>${rows.length}</b></span><span>Lượt buổi đủ điều kiện <b>${totals.sessions}</b></span><span>Có mặt <b>${totals.present}</b></span><span>Đi trễ <b>${totals.tardy}</b></span><span>Vắng <b>${totals.absent}</b></span></div>
    ${rows.length ? `<div class="bes-supplemental-report-table-wrap"><table><thead><tr><th>Học sinh</th><th>Lớp</th><th>Môn</th><th>Buổi</th><th>Có mặt</th><th>Trễ</th><th>Vắng</th><th>Tỉ lệ</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${esc(row.fullName)}</b><small>${esc(row.studentCode || '')}</small></td><td>${esc(row.schoolClassName || '')}</td><td>${esc((row.subjects || []).join(', '))}</td><td>${Number(row.eligibleSessionCount || 0)}</td><td>${Number(row.presentCount || 0)}</td><td>${Number(row.tardyCount || 0)}</td><td>${Number(row.absentCount || 0)}</td><td>${Number(row.attendanceRate || 0)}%</td></tr>`).join('')}</tbody></table></div>` : '<p class="bes-supplemental-empty">Chưa có buổi Học bổ sung đã chốt trong khoảng ngày.</p>'}
  </section>`;
}

function renderLegacyActivityReport(rows, activityType) {
  const eligible = rows.filter((row) => !['cancelled', 'scheduled', 'in_progress'].includes(String(row.status || '').toLowerCase()));
  const totals = eligible.reduce((acc, row) => {
    acc.sessions += 1;
    acc.students += Number(row.totalStudents ?? row.participantCount ?? row.participant_count ?? 0);
    acc.present += Number(row.presentCount ?? row.present_count ?? 0);
    acc.absent += Number(row.absentCount ?? row.absent_count ?? 0);
    acc.tardy += Number(row.tardyCount ?? row.tardy_count ?? 0);
    return acc;
  }, { sessions: 0, students: 0, present: 0, absent: 0, tardy: 0 });
  const title = activityType === 'enrichment' ? 'BÁO CÁO BỒI DƯỠNG HỌC SINH GIỎI' : 'BÁO CÁO PHỤ ĐẠO';

  return `<section class="bes-supplemental-pdf-report">
    <header><span>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</span><strong>TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ</strong><h1>${title}</h1><p>Từ ${esc(dateFrom)} đến ${esc(dateTo)} · Buổi hủy/chưa chốt không được cộng vào tổng điểm danh.</p></header>
    <div class="bes-supplemental-report-summary"><span>Buổi đã chốt <b>${totals.sessions}</b></span><span>Lượt học sinh <b>${totals.students}</b></span><span>Có mặt <b>${totals.present}</b></span><span>Đi trễ <b>${totals.tardy}</b></span><span>Vắng <b>${totals.absent}</b></span></div>
    ${rows.length ? `<div class="bes-supplemental-report-table-wrap"><table><thead><tr><th>Ngày</th><th>Lớp / hoạt động</th><th>Môn</th><th>Giáo viên</th><th>Phòng · Giờ</th><th>Trạng thái</th><th>Tổng</th><th>Có mặt</th><th>Trễ</th><th>Vắng</th></tr></thead><tbody>${rows.map((row) => {
      const cancelled = String(row.status || '').toLowerCase() === 'cancelled';
      return `<tr><td>${esc(row.date || '')}</td><td><b>${esc(row.title || row.subject || '')}</b></td><td>${esc(row.subject || '')}</td><td>${esc(row.teacherName || '')}</td><td>${esc(row.room || '')}<small>${esc(row.timeRange || '')}</small></td><td>${statusLabel(row.status)}</td><td>${cancelled ? '—' : Number(row.totalStudents ?? row.participantCount ?? row.participant_count ?? 0)}</td><td>${cancelled ? '—' : Number(row.presentCount ?? row.present_count ?? 0)}</td><td>${cancelled ? '—' : Number(row.tardyCount ?? row.tardy_count ?? 0)}</td><td>${cancelled ? '—' : Number(row.absentCount ?? row.absent_count ?? 0)}</td></tr>`;
    }).join('')}</tbody></table></div>` : `<p class="bes-supplemental-empty">Không có dữ liệu ${esc(activityLabel(activityType))} trong khoảng ngày này.</p>`}
  </section>`;
}

function renderPanel(body, title) {
  if (!canManage()) {
    clearSupplementalReportingUi();
    return;
  }
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'bes-supplemental-reporting-panel';
    shell()?.append(panel);
  }

  const exclusive = filter !== 'all';
  panel.innerHTML = `<header class="bes-supplemental-reporting-head"><div><span class="bes-supplemental-kicker">${activeTab === 'report' ? 'BÁO CÁO' : 'LỊCH SỬ'} · ${activityLabel(filter)}</span><h2>${esc(title)}</h2></div>${exclusive ? '<button type="button" data-report-close aria-label="Quay về Tất cả">×</button>' : ''}</header>${rangeControls()}<main>${body}</main>`;
  panel.classList.toggle('is-exclusive', exclusive);
  document.body.classList.toggle('bes-supplemental-report-exclusive', exclusive);

  panel.querySelector('[data-report-close]')?.addEventListener('click', () => {
    filter = 'all';
    if (activeTab === 'history') syncLegacyHistoryFilter('all');
    window.dispatchEvent(new CustomEvent('bes-attendance-activity-filter-change', { detail: { activityType: 'all', tab: activeTab } }));
    ensureFilter();
  });
  panel.querySelector('[data-report-refresh]')?.addEventListener('click', () => {
    dateFrom = panel.querySelector('[data-report-from]')?.value || dateFrom;
    dateTo = panel.querySelector('[data-report-to]')?.value || dateTo;
    query = panel.querySelector('[data-report-query]')?.value || query;
    void refreshPanel(true);
  });
  panel.querySelector('[data-report-query]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      panel.querySelector('[data-report-refresh]')?.click();
    }
  });
  panel.querySelector('[data-report-print]')?.addEventListener('click', () => window.print());
}

function closePanel() {
  document.getElementById(PANEL_ID)?.remove();
  document.body.classList.remove('bes-supplemental-report-exclusive');
}

async function refreshPanel(force = false) {
  if (!client || !activeTab || !canManage()) {
    clearSupplementalReportingUi();
    return;
  }
  if (!dateFrom) dateFrom = dayOffset(activeTab === 'report' ? -365 : -31);
  if (!dateTo) dateTo = dayOffset(0);
  if (!['all', 'remedial', 'enrichment', 'supplemental'].includes(filter)) filter = 'all';

  if (filter === 'all') {
    if (activeTab === 'history') syncLegacyHistoryFilter('all');
    closePanel();
    return;
  }

  const current = ++token;
  try {
    if (activeTab === 'history') {
      syncLegacyHistoryFilter(filter);
      closePanel();
      return;
    } else if (activeTab === 'report') {
      closePanel();
      return;
    }
  } catch (error) {
    if (current !== token || !canManage()) return;
    renderPanel(`<p class="bes-supplemental-empty">${esc(error?.message || 'Không thể tải dữ liệu báo cáo.')}</p>`, 'Không thể tải dữ liệu');
  } finally {
    void force;
  }
}

function bindTabs() {
  if (!canManage()) {
    clearSupplementalReportingUi();
    return;
  }
  document.querySelectorAll(TAB_SELECTOR).forEach((button) => {
    if (button.dataset.besSupplementalReportingBound) return;
    button.dataset.besSupplementalReportingBound = 'true';
    button.addEventListener('click', () => {
      if (!canManage()) {
        clearSupplementalReportingUi();
        return;
      }
      const next = tabKind(button);
      activeTab = next;
      observerActiveTab = next;
      if (!next) {
        document.getElementById(FILTER_ID)?.remove();
        closePanel();
        return;
      }
      dateFrom = '';
      dateTo = '';
      query = '';
      filter = 'all';
      if (next === 'history') setTimeout(() => syncLegacyHistoryFilter('all'), 0);
      setTimeout(() => ensureFilter(), 0);
    });
  });

  const detected = tabKind(activeButton());
  if (detected && detected !== observerActiveTab) {
    activeTab = detected;
    observerActiveTab = detected;
    ensureFilter();
  } else if (!detected) {
    observerActiveTab = '';
  }
}

function start() {
  if (observer) return;
  observer = new MutationObserver(bindTabs);
  observer.observe(document.body, { childList: true, subtree: true });
  bindTabs();
}

async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState();
  client = getRuntimeClient();
  start();
  subscribeRuntime((next) => {
    runtime = next || getRuntimeState();
    client = getRuntimeClient();
    if (!canManage()) {
      clearSupplementalReportingUi();
      return;
    }
    bindTabs();
    if (activeTab) void refreshPanel(true);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') void install();
