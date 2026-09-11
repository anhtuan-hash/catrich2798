import './styles/SupplementalLearning.css';
import { ensureRuntimeReady, getRuntimeClient, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';
import { attachSupplementalProof, beginSupplementalAttendance, confirmSupplementalAttendance } from './attendance/supplementalLearningApi.js';

const INSTALL_KEY = '__besSupplementalAttendanceQuickInstalled';
const ROLLCALL_ID = 'bes-supplemental-rollcall';
const OPEN_EVENT = 'bes-open-supplemental-attendance';
const CLASS_OPEN_EVENT = 'bes-supplemental-open-rollcall';
const CHANGED_EVENT = 'bes-supplemental-attendance-changed';

let client = null;
let runtime = null;
let activeSession = null;
let participantState = [];
let busy = false;

function canManage() {
  return canManageSupplementalLearning(runtime || {});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function accessError(error) {
  const code = String(error?.message || error || '');
  if (code.includes('42501') || code.includes('không có quyền') || code.includes('permission')) return 'Tài khoản không có quyền điểm danh Học bổ sung.';
  if (code.includes('cancelled') || code.includes('đã bị hủy')) return 'Buổi Học bổ sung đã bị hủy.';
  return code || 'Không thể mở điểm danh Học bổ sung.';
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
  host.innerHTML = `<div class="bes-supplemental-backdrop" data-rollcall-close></div><section class="bes-supplemental-rollcall" role="dialog" aria-modal="true">
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

async function ensureClient() {
  if (client) return client;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState();
  client = getRuntimeClient();
  return client;
}

async function openRollcall(rawSessionId, knownStatus = '') {
  if (busy || !canManage()) return;
  const sessionId = String(rawSessionId || '').trim();
  if (!sessionId) return;
  const status = String(knownStatus || '').toLowerCase();
  if (status === 'confirmed') {
    window.alert('Buổi Học bổ sung này đã chốt điểm danh. Xem tại Lịch sử.');
    return;
  }
  if (status === 'cancelled') {
    window.alert('Buổi Học bổ sung đã bị hủy.');
    return;
  }
  await ensureClient();
  if (!client) {
    window.alert('Chưa thể kết nối dữ liệu điểm danh. Vui lòng thử lại.');
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
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { sessionId } }));
    if (proofWarning) window.alert(proofWarning);
  } catch (error) {
    renderRollcall(error?.message || 'Không thể chốt điểm danh.');
  } finally {
    busy = false;
  }
}

async function handleOpen(event) {
  if (!canManage()) return;
  await openRollcall(event?.detail?.sessionId, event?.detail?.status || '');
}

async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  window.addEventListener(OPEN_EVENT, handleOpen);
  window.addEventListener(CLASS_OPEN_EVENT, handleOpen);
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState();
  client = getRuntimeClient();
  subscribeRuntime((next) => {
    runtime = next || getRuntimeState();
    client = getRuntimeClient();
    if (!canManage()) closeRollcall();
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') void install();
