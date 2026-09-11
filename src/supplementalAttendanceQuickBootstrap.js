import './styles/SupplementalLearning.css';
import { ensureRuntimeReady, getRuntimeClient, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';
import {
  attachSupplementalProof,
  beginSupplementalAttendance,
  confirmSupplementalAttendance,
  loadSupplementalAttendanceActivities,
} from './attendance/supplementalLearningApi.js';

const INSTALL_KEY = '__besSupplementalAttendanceQuickInstalled';
const DAILY_ROOT = '[data-bes-supplemental-daily-scroll-root]';
const SECTION_CLASS = 'bes-supplemental-daily-section';
const ROLLCALL_ID = 'bes-supplemental-rollcall';

let client = null;
let runtime = null;
let observer = null;
let queued = false;
let requestKey = '';
let activities = [];
let activeSession = null;
let participantState = [];
let busy = false;

function canManage() {
  return canManageSupplementalLearning(runtime || {});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function dateForRoot(root) {
  return String(
    root?.querySelector('input[type="date"]')?.value
      || document.querySelector('.attendance-daily-compact-toolbar input[type="date"]')?.value
      || new Date().toISOString().slice(0, 10),
  ).slice(0, 10);
}

function statusLabel(status) {
  return ({ scheduled: 'Chưa điểm danh', in_progress: 'Đang điểm danh', confirmed: 'Đã chốt', cancelled: 'Đã hủy' })[status] || status;
}

function accessError(error) {
  const code = String(error?.message || error || '');
  if (code.includes('supplemental_not_allowed') || code.includes('không có quyền')) return 'Tài khoản không có quyền điểm danh Học bổ sung.';
  if (code.includes('cancelled') || code.includes('đã bị hủy')) return 'Buổi Học bổ sung đã bị hủy.';
  return code || 'Không thể mở điểm danh Học bổ sung.';
}

function removeSection() {
  document.querySelectorAll(`.${SECTION_CLASS}`).forEach((node) => node.remove());
}

function renderSection(root) {
  if (!canManage()) {
    removeSection();
    return;
  }
  let section = root.querySelector(`.${SECTION_CLASS}`);
  if (!section) {
    section = document.createElement('section');
    section.className = SECTION_CLASS;
    section.dataset.besSupplementalDaily = 'true';
    root.append(section);
  }
  section.innerHTML = `<header><div><span>HỌC BỔ SUNG</span><strong>${activities.length} lớp</strong></div><small>Các lớp học bổ sung trong ngày</small></header>
    <div class="bes-supplemental-daily-grid">${activities.length ? activities.map((activity) => `
      <button type="button" class="bes-supplemental-daily-card" data-bes-attendance-source="supplemental" data-bes-supplemental-session-id="${esc(activity.id)}" ${activity.status === 'cancelled' ? 'disabled' : ''}>
        <span class="bes-supplemental-source-badge">LỚP HỌC BỔ SUNG</span>
        <strong>${esc(activity.title || activity.subject)}</strong>
        <small>${esc(activity.subject)} · ${esc(activity.timeRange || '')} · ${esc(activity.room || 'Chưa phòng')}</small>
        <small>${esc(activity.teacherName || 'Chưa giáo viên')} · ${Number(activity.participantCount || 0)} học sinh</small>
        <span class="bes-supplemental-kind">${statusLabel(activity.status)}</span>
      </button>`).join('') : '<p>Không có lớp Học bổ sung trong ngày này.</p>'}</div>`;
  section.querySelectorAll('[data-bes-supplemental-session-id]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void openRollcall(button.dataset.besSupplementalSessionId);
  }));
}

async function refresh(root = document.querySelector(DAILY_ROOT), force = false) {
  if (!root || !client || !canManage()) {
    removeSection();
    return;
  }
  const date = dateForRoot(root);
  const key = `${runtime?.user?.id || runtime?.profile?.id || 'user'}:${date}`;
  if (!force && requestKey === key) {
    if (!root.querySelector(`.${SECTION_CLASS}`)) renderSection(root);
    return;
  }
  requestKey = key;
  try {
    const rows = await loadSupplementalAttendanceActivities(client, { from: date, to: date });
    // Legacy one-off sessions remain available in history only. The new daily flow is class-based.
    activities = rows.filter((activity) => activity.supplementalKind !== 'adhoc');
    renderSection(root);
  } catch (error) {
    activities = [];
    renderSection(root);
    const section = root.querySelector(`.${SECTION_CLASS}`);
    if (section) section.dataset.loadError = error?.message || 'error';
  }
}

function queueRefresh(force = false) {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const root = document.querySelector(DAILY_ROOT);
    if (root) void refresh(root, force);
  });
}

function safeFileName(name = 'proof.jpg') {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'proof.jpg';
}

function closeRollcall() {
  document.getElementById(ROLLCALL_ID)?.remove();
  activeSession = null;
  participantState = [];
}

function participantHtml(participant, index) {
  const absent = participant.status === 'absent';
  return `<article class="bes-supplemental-participant" data-index="${index}">
    <div><strong>${esc(participant.fullName)}</strong><small>${esc(participant.studentCode || 'Không mã')} · ${esc(participant.schoolClassName || 'Chưa lớp')}</small></div>
    <div class="bes-supplemental-status-buttons">${['present', 'tardy', 'absent'].map((status) => `<button type="button" data-status="${status}" class="${participant.status === status ? 'is-active' : ''}">${status === 'present' ? 'Có mặt' : status === 'tardy' ? 'Đi trễ' : 'Vắng'}</button>`).join('')}</div>
    <div class="bes-supplemental-absence ${absent ? '' : 'is-hidden'}">
      <select data-field="absenceReasonCode"><option value="">Lý do vắng</option><option value="permission" ${participant.absenceReasonCode === 'permission' ? 'selected' : ''}>Có phép</option><option value="sick" ${participant.absenceReasonCode === 'sick' ? 'selected' : ''}>Ốm</option><option value="unknown" ${participant.absenceReasonCode === 'unknown' ? 'selected' : ''}>Không rõ lý do</option><option value="other" ${participant.absenceReasonCode === 'other' ? 'selected' : ''}>Khác</option></select>
      <input data-field="absenceNote" value="${esc(participant.absenceNote || '')}" placeholder="Ghi chú vắng">
    </div>
  </article>`;
}

function renderRollcall(message = '') {
  if (!canManage()) {
    closeRollcall();
    return;
  }
  let host = document.getElementById(ROLLCALL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = ROLLCALL_ID;
    document.body.append(host);
  }
  const session = activeSession?.session || {};
  host.innerHTML = `<section class="bes-supplemental-rollcall bes-supplemental-rollcall-workspace">
    <header><div><span class="bes-supplemental-source-badge">LỚP HỌC BỔ SUNG</span><h2>${esc(session.title || session.subject || 'Học bổ sung')}</h2><p>${esc(session.attendance_date || '')} · ${esc(session.subject || '')} · ${esc(session.teacher_name || 'Chưa giáo viên')} · ${esc(session.room || 'Chưa phòng')}</p></div><button type="button" data-rollcall-close aria-label="Đóng">×</button></header>
    ${message ? `<div class="bes-supplemental-rollcall-message">${esc(message)}</div>` : ''}
    <main>${participantState.map(participantHtml).join('') || '<p class="bes-supplemental-empty">Buổi học chưa có học sinh đang học.</p>'}</main>
    <footer><label>Ghi chú buổi học<textarea data-session-note rows="2">${esc(session.session_note || '')}</textarea></label><label>Minh chứng hình ảnh<input type="file" data-proof accept="image/*"></label><div><button type="button" data-rollcall-close>Thoát</button><button type="button" class="is-primary" data-confirm ${busy ? 'disabled' : ''}>Chốt điểm danh</button></div></footer>
  </section>`;
  bindRollcall(host);
}

function bindRollcall(host) {
  host.querySelectorAll('[data-rollcall-close]').forEach((node) => node.addEventListener('click', closeRollcall));
  host.querySelectorAll('.bes-supplemental-participant').forEach((row) => {
    const index = Number(row.dataset.index);
    row.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
      participantState[index].status = button.dataset.status;
      if (button.dataset.status !== 'absent') {
        participantState[index].absenceReasonCode = '';
        participantState[index].absenceNote = '';
      }
      renderRollcall();
    }));
    row.querySelector('[data-field="absenceReasonCode"]')?.addEventListener('change', (event) => { participantState[index].absenceReasonCode = event.target.value; });
    row.querySelector('[data-field="absenceNote"]')?.addEventListener('input', (event) => { participantState[index].absenceNote = event.target.value; });
  });
  host.querySelector('[data-confirm]')?.addEventListener('click', () => void confirmCurrent(host));
}

async function openRollcall(sessionId) {
  if (busy || !client || !canManage() || !sessionId) return;
  const current = activities.find((activity) => activity.id === sessionId);
  if (current?.status === 'confirmed') {
    window.alert('Buổi Học bổ sung này đã chốt điểm danh. Xem tại Lịch sử.');
    return;
  }
  busy = true;
  try {
    activeSession = await beginSupplementalAttendance(client, sessionId);
    participantState = (activeSession?.participants || []).map((participant) => ({
      participantId: participant.id,
      status: participant.status || 'present',
      fullName: participant.fullName || participant.full_name || '',
      studentCode: participant.studentCode || participant.student_code || '',
      schoolClassName: participant.schoolClassName || participant.school_class_name || '',
      absenceReasonCode: participant.absenceReasonCode || participant.absence_reason_code || '',
      absenceNote: participant.absenceNote || participant.absence_note || '',
    }));
    renderRollcall();
  } catch (error) {
    window.alert(accessError(error));
  } finally {
    busy = false;
  }
}

async function confirmCurrent(host) {
  if (!activeSession || busy || !canManage()) return;
  const missing = participantState.find((participant) => !['present', 'absent', 'tardy'].includes(participant.status));
  if (missing) {
    renderRollcall('Hãy chọn trạng thái cho toàn bộ học sinh.');
    return;
  }
  const absentWithoutReason = participantState.find((participant) => participant.status === 'absent' && !participant.absenceReasonCode);
  if (absentWithoutReason) {
    renderRollcall(`Hãy chọn lý do vắng cho ${absentWithoutReason.fullName}.`);
    return;
  }

  busy = true;
  const note = host.querySelector('[data-session-note]')?.value || '';
  const file = host.querySelector('[data-proof]')?.files?.[0] || null;
  const sessionId = activeSession.session.id;
  const proofPath = file ? `${sessionId}/${Date.now()}-${safeFileName(file.name)}` : '';
  renderRollcall('Đang chốt điểm danh trên máy chủ…');
  try {
    await confirmSupplementalAttendance(client, { sessionId, participants: participantState, sessionNote: note, proofPath: '' });
    let proofWarning = '';
    if (file) {
      const { error } = await client.storage.from('attendance-session-proofs').upload(proofPath, file, { upsert: false, contentType: file.type || 'image/jpeg' });
      if (error) proofWarning = 'Điểm danh đã chốt nhưng ảnh minh chứng chưa tải lên được.';
      else {
        try { await attachSupplementalProof(client, sessionId, proofPath); }
        catch { proofWarning = 'Điểm danh và ảnh đã lưu, nhưng chưa gắn được ảnh vào lịch sử buổi học.'; }
      }
    }
    closeRollcall();
    requestKey = '';
    await refresh(document.querySelector(DAILY_ROOT), true);
    if (proofWarning) window.alert(proofWarning);
  } catch (error) {
    renderRollcall(error?.message || 'Không thể chốt điểm danh.');
  } finally {
    busy = false;
  }
}

function start() {
  if (observer) return;
  document.addEventListener('change', (event) => {
    if (event.target?.matches?.(`${DAILY_ROOT} input[type="date"], .attendance-daily-compact-toolbar input[type="date"]`)) {
      requestKey = '';
      queueRefresh(true);
    }
  }, true);
  window.addEventListener('bes-supplemental-open-rollcall', (event) => {
    if (canManage()) void openRollcall(event?.detail?.sessionId || '');
  });
  observer = new MutationObserver(() => queueRefresh(false));
  observer.observe(document.body, { childList: true, subtree: true });
  queueRefresh(true);
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
    requestKey = '';
    if (!canManage()) {
      closeRollcall();
      removeSection();
      activities = [];
      return;
    }
    queueRefresh(true);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
