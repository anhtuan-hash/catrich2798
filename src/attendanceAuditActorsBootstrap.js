import { getRuntimeClient } from './services/runtime/core.js';
import { describeAttendanceAuditItem, groupAttendanceChangesBySession } from './utils/attendanceAuditActors.js';
import './components/attendance/AttendanceAuditActors.css';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CHANGE_COLUMNS = 'id,session_id,record_id,class_id,member_key,student_full_name,change_kind,changed_by,changed_by_name,changed_at,old_status,new_status,old_absence_reason_code,new_absence_reason_code,old_absence_note,new_absence_note,session_note_before,session_note_after';
let scheduled = false;
let activeKey = '';
let requestId = 0;
const cache = new Map();

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function dateIsoFromCard(button) {
  const text = button?.querySelector('time')?.textContent || '';
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function selectedHistoryIdentity() {
  const button = document.querySelector('.attendance-history-items > button.is-selected');
  const detail = document.querySelector('.attendance-history-detail');
  if (!button || !detail) return null;
  const className = button.querySelector('.attendance-history-card-title b')?.textContent?.trim() || '';
  const subjectLine = button.querySelector('.attendance-history-card-copy > small')?.textContent || '';
  const subject = subjectLine.split('·')[0]?.trim() || '';
  const attendanceDate = dateIsoFromCard(button);
  if (!className || !attendanceDate) return null;
  return { button, detail, className, subject, attendanceDate, key: `${className}|${subject}|${attendanceDate}` };
}

function renderLoading(detail) {
  const old = detail.querySelector('.attendance-audit-actor-panel');
  if (old) return;
  const panel = document.createElement('section');
  panel.className = 'attendance-audit-actor-panel is-loading';
  panel.innerHTML = '<strong>Nhật ký người thao tác</strong><span>Đang tải thông tin người điểm danh và điều chỉnh…</span>';
  const anchor = detail.querySelector('.attendance-history-info-grid');
  anchor?.insertAdjacentElement('afterend', panel);
}

function renderAudit(detail, session, changes) {
  detail.querySelector('.attendance-audit-actor-panel')?.remove();
  const grouped = groupAttendanceChangesBySession(changes).get(String(session.id)) || {
    events: [], change_count: 0, latest_changed_by_name: '', latest_changed_at: '',
  };
  const panel = document.createElement('section');
  panel.className = 'attendance-audit-actor-panel';
  panel.dataset.sessionId = String(session.id);

  const latestText = grouped.latest_changed_by_name
    ? `${grouped.latest_changed_by_name} · ${formatDateTime(grouped.latest_changed_at)}`
    : 'Chưa có điều chỉnh';
  const checkActor = String(session.checked_by_name || '').trim() || 'Chưa xác định';
  const teacher = session.session_status === 'cancelled' ? '—' : (session.teacher_name || 'Chưa ghi giáo viên');
  const eventHtml = grouped.events.map((event, index) => `
    <article class="attendance-audit-event">
      <header><b>Lần ${index + 1} · ${escapeHtml(event.changed_by_name)}</b><time>${escapeHtml(formatDateTime(event.changed_at))}</time></header>
      <ul>${event.items.map((item) => `<li>${escapeHtml(describeAttendanceAuditItem(item))}</li>`).join('')}</ul>
    </article>
  `).join('');

  panel.innerHTML = `
    <header class="attendance-audit-actor-panel__head"><div><strong>Nhật ký người thao tác</strong><span>Tách riêng giáo viên dạy, người điểm danh và người điều chỉnh.</span></div></header>
    <div class="attendance-audit-actor-grid">
      <article><span>Giáo viên dạy</span><b>${escapeHtml(teacher)}</b></article>
      <article><span>Người thực hiện điểm danh</span><b>${escapeHtml(checkActor)}</b><small>${escapeHtml(formatDateTime(session.checked_at))}</small></article>
      <article><span>Điều chỉnh gần nhất</span><b>${escapeHtml(latestText)}</b></article>
      <article><span>Đã điều chỉnh</span><b>${grouped.change_count} lần</b></article>
    </div>
    ${grouped.events.length ? `<details class="attendance-audit-history"><summary>Xem lịch sử điều chỉnh</summary><div>${eventHtml}</div></details>` : '<div class="attendance-audit-empty">Buổi này chưa từng điều chỉnh sau khi chốt.</div>'}
  `;
  const anchor = detail.querySelector('.attendance-history-info-grid');
  anchor?.insertAdjacentElement('afterend', panel);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadAudit(identity) {
  const client = getRuntimeClient();
  if (!client) return null;
  let query = client.from('bes_extra_attendance_sessions')
    .select('id,class_name,subject,teacher_name,attendance_date,checked_at,checked_by,checked_by_name,session_status')
    .eq('class_name', identity.className)
    .eq('attendance_date', identity.attendanceDate);
  if (identity.subject) query = query.eq('subject', identity.subject);
  const sessionResult = await query.order('checked_at', { ascending: false }).limit(2);
  if (sessionResult.error) throw sessionResult.error;
  const session = sessionResult.data?.[0];
  if (!session) return null;
  const changeResult = await client.from('bes_extra_attendance_record_changes')
    .select(CHANGE_COLUMNS)
    .eq('session_id', session.id)
    .order('changed_at', { ascending: true });
  if (changeResult.error) throw changeResult.error;
  return { session, changes: changeResult.data || [] };
}

async function refresh() {
  scheduled = false;
  const identity = selectedHistoryIdentity();
  if (!identity) {
    activeKey = '';
    return;
  }
  const existing = identity.detail.querySelector('.attendance-audit-actor-panel');
  if (activeKey === identity.key && existing && !existing.classList.contains('is-loading')) return;
  activeKey = identity.key;
  const currentRequest = ++requestId;
  renderLoading(identity.detail);
  try {
    let data = cache.get(identity.key);
    if (!data) {
      data = await loadAudit(identity);
      if (data) cache.set(identity.key, data);
    }
    if (currentRequest !== requestId) return;
    const latestIdentity = selectedHistoryIdentity();
    if (!latestIdentity || latestIdentity.key !== identity.key) return;
    if (data) renderAudit(latestIdentity.detail, data.session, data.changes);
  } catch (error) {
    if (currentRequest !== requestId) return;
    const panel = identity.detail.querySelector('.attendance-audit-actor-panel');
    if (panel) panel.innerHTML = `<strong>Nhật ký người thao tác</strong><span>Không thể tải lúc này: ${escapeHtml(error?.message || 'Lỗi không xác định')}</span>`;
  }
}

function scheduleRefresh() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(refresh);
}

if (typeof document !== 'undefined') {
  const start = () => {
    new MutationObserver(scheduleRefresh).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.attendance-history-items > button')) {
        activeKey = '';
        scheduleRefresh();
      }
    }, true);
    window.addEventListener('bes-attendance-audit-refresh', () => {
      cache.clear();
      activeKey = '';
      scheduleRefresh();
    });
    scheduleRefresh();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
