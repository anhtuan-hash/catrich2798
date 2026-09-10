import './styles/AttendancePostConfirmEdit.css';
import {
  ensureRuntimeReady,
  getRuntimeClient,
  getRuntimeState,
  subscribeRuntime,
} from './services/runtime/core.js';
import { hasAttendanceTabAccess } from './utils/permissions.js';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';
import {
  evaluatePostConfirmEditAccess,
  formatPostConfirmRemaining,
  postConfirmAccessReasonVi,
} from './utils/attendancePostConfirmEdit.js';

const INSTALL_KEY = '__besAttendancePostConfirmEditInstalled';
const CARD_CLASS = 'bes-post-confirm-edit-card';
const SESSION_SELECT = 'id,class_id,class_name,subject,teacher_name,attendance_date,checked_at,checked_by,total_students,present_count,absent_count,note,session_status';
const RECORD_SELECT = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,absence_reason_code,absence_note';
const REASON_OPTIONS = [
  ['excused', 'Có phép'],
  ['unexcused', 'Không phép'],
  ['sick', 'Ốm / sức khỏe'],
  ['family', 'Việc gia đình'],
  ['other', 'Khác'],
  ['unspecified', 'Chưa xác định'],
];

let client = null;
let runtimeSnapshot = null;
let observer = null;
let timer = 0;
let renderQueued = false;
let loadQueued = false;
let activeKey = '';
let activeSession = null;
let serverAccess = null;
let serverClockOffsetMs = 0;
let records = [];
let latestChange = null;
let loading = false;
let saving = false;
let editing = false;
let draft = [];
let draftNote = '';
let notice = '';
let errorMessage = '';

function text(value) {
  return String(value ?? '');
}

function escapeHtml(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isAdmin() {
  return normalizeSystemRole(
    runtimeSnapshot?.role || runtimeSnapshot?.profile?.role,
    SYSTEM_ROLES.GUEST,
  ) === SYSTEM_ROLES.ADMIN;
}

function currentProfile() {
  return runtimeSnapshot?.profile || null;
}

function currentUserId() {
  return text(runtimeSnapshot?.user?.id || currentProfile()?.id).trim();
}

function hasQuickPermission() {
  return Boolean(isAdmin() || hasAttendanceTabAccess(currentProfile(), 'quick'));
}

function hasReportPermission() {
  return Boolean(isAdmin() || hasAttendanceTabAccess(currentProfile(), 'report'));
}

function nowFromServerClock() {
  return new Date(Date.now() + serverClockOffsetMs);
}

function formatVietnamTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function selectedContext() {
  const rollcall = document.querySelector('.attendance-rollcall');
  if (!rollcall) return null;
  const className = text(rollcall.querySelector('.attendance-rollcall-head h2')?.textContent).trim();
  const attendanceDate = text(rollcall.querySelector('.attendance-session-controls input[type="date"]')?.value).trim();
  const selectedButton = document.querySelector('.attendance-class-list button.is-selected');
  const classId = text(
    selectedButton?.dataset?.besAttendanceClassId
      || selectedButton?.getAttribute?.('data-bes-attendance-class-id'),
  ).trim();
  if (!className || !attendanceDate) return null;
  return { rollcall, className, attendanceDate, classId };
}

function clearState({ keepNotice = false } = {}) {
  activeKey = '';
  activeSession = null;
  serverAccess = null;
  records = [];
  latestChange = null;
  editing = false;
  draft = [];
  draftNote = '';
  if (!keepNotice) notice = '';
  errorMessage = '';
  document.querySelector(`.${CARD_CLASS}`)?.remove();
}

async function resolveClassId(context) {
  if (context.classId) return context.classId;
  const { data, error } = await client
    .from('bes_extra_classes')
    .select('id,class_name,active')
    .eq('class_name', context.className)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id || '';
}

function updateClockOffset(serverNow) {
  const parsed = new Date(serverNow);
  if (Number.isFinite(parsed.getTime())) serverClockOffsetMs = parsed.getTime() - Date.now();
}

async function fetchRecords(sessionId) {
  const { data, error } = await client
    .from('bes_extra_attendance_records')
    .select(RECORD_SELECT)
    .eq('session_id', sessionId)
    .order('student_full_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchLatestChange(sessionId) {
  try {
    const { data, error } = await client
      .from('bes_extra_attendance_record_changes')
      .select('changed_at,changed_by_name')
      .eq('session_id', sessionId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

async function loadSelectedSession({ force = false } = {}) {
  loadQueued = false;
  if (!client || loading) return;
  const context = selectedContext();
  if (!context) {
    clearState();
    return;
  }

  const provisionalKey = `${context.classId || context.className}|${context.attendanceDate}`;
  if (!force && provisionalKey === activeKey && activeSession) {
    queueRender();
    return;
  }

  loading = true;
  queueRender();
  try {
    const classId = await resolveClassId(context);
    if (!classId) {
      clearState();
      return;
    }
    const key = `${classId}|${context.attendanceDate}`;
    if (!force && key === activeKey && activeSession) return;

    const { data: session, error: sessionError } = await client
      .from('bes_extra_attendance_sessions')
      .select(SESSION_SELECT)
      .eq('class_id', classId)
      .eq('attendance_date', context.attendanceDate)
      .limit(1)
      .maybeSingle();
    if (sessionError) throw sessionError;

    activeKey = key;
    activeSession = session || null;
    serverAccess = null;
    records = [];
    latestChange = null;
    editing = false;
    draft = [];
    draftNote = text(session?.note);
    errorMessage = '';

    if (!session || session.session_status !== 'completed') return;

    const { data: access, error: accessError } = await client.rpc('bes_get_extra_attendance_edit_access', {
      p_session_id: session.id,
    });
    if (accessError) {
      serverAccess = { allowed: false, reason: 'server_access_unavailable' };
      errorMessage = 'Chưa thể kiểm tra quyền điều chỉnh sau khi chốt. Hãy tải lại trang sau khi hệ thống cập nhật.';
      return;
    }
    serverAccess = access || { allowed: false, reason: 'unknown' };
    updateClockOffset(serverAccess.server_now);

    latestChange = await fetchLatestChange(session.id);
    if (serverAccess.allowed) records = await fetchRecords(session.id);
  } catch (error) {
    errorMessage = error?.message || 'Không thể tải dữ liệu điều chỉnh điểm danh.';
  } finally {
    loading = false;
    queueRender();
  }
}

function localAccess() {
  if (!activeSession) return { allowed: false, reason: 'not_completed', remainingMs: 0, expiresAt: '' };
  const evaluated = evaluatePostConfirmEditAccess({
    session: activeSession,
    currentUserId: currentUserId(),
    isAdmin: isAdmin(),
    hasReportPermission: hasReportPermission(),
    hasQuickPermission: hasQuickPermission(),
    now: nowFromServerClock(),
  });

  if (!serverAccess) return evaluated;
  if (serverAccess.reason === 'server_access_unavailable') {
    return { allowed: false, reason: 'server_access_unavailable', bypass: false, remainingMs: 0, expiresAt: evaluated.expiresAt };
  }
  if (serverAccess.bypass && serverAccess.allowed) return { ...evaluated, allowed: true, bypass: true, reason: serverAccess.reason };
  if (!serverAccess.allowed && serverAccess.reason !== 'within_edit_window') {
    return {
      ...evaluated,
      allowed: false,
      bypass: false,
      reason: serverAccess.reason || evaluated.reason,
    };
  }
  return evaluated;
}

function reasonLabel(code) {
  return REASON_OPTIONS.find(([value]) => value === code)?.[1] || 'Chưa xác định';
}

function makeDraft() {
  draft = records.map((record) => ({
    ...record,
    status: ['present', 'late', 'absent'].includes(record.status) ? record.status : 'present',
    absence_reason_code: text(record.absence_reason_code),
    absence_note: text(record.absence_note),
  }));
  draftNote = text(activeSession?.note);
}

function statusSummary() {
  const source = editing ? draft : records;
  const total = source.length || Number(activeSession?.total_students || 0);
  const absent = source.filter((item) => item.status === 'absent').length;
  const late = source.filter((item) => item.status === 'late').length;
  return { total, absent, late, present: Math.max(0, total - absent) };
}

function renderEditorRows() {
  return draft.map((record, index) => {
    const absent = record.status === 'absent';
    const late = record.status === 'late';
    const reasons = REASON_OPTIONS.map(([value, label]) => `<option value="${value}" ${record.absence_reason_code === value ? 'selected' : ''}>${label}</option>`).join('');
    return `<article class="bes-post-confirm-student ${absent ? 'is-absent' : late ? 'is-late' : 'is-present'}" data-record-id="${escapeHtml(record.id)}">
      <span class="bes-post-confirm-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="bes-post-confirm-student-name"><b>${escapeHtml(record.student_full_name)}</b><small>${escapeHtml(record.student_code || 'Không có mã HS')} · ${escapeHtml(record.school_class_name || '—')}</small></div>
      <div class="bes-post-confirm-status-toggle" role="group" aria-label="Trạng thái ${escapeHtml(record.student_full_name)}">
        <button type="button" data-action="status" data-status="present" class="${record.status === 'present' ? 'is-active' : ''}">Có mặt</button>
        <button type="button" data-action="status" data-status="late" class="${late ? 'is-active is-late' : ''}">Đi trễ</button>
        <button type="button" data-action="status" data-status="absent" class="${absent ? 'is-active' : ''}">Vắng</button>
      </div>
      ${absent ? `<div class="bes-post-confirm-absence-fields">
        <label><span>Lý do vắng</span><select data-field="reason">${reasons}</select></label>
        <label><span>Ghi chú</span><input data-field="absence-note" value="${escapeHtml(record.absence_note)}" placeholder="Bắt buộc nếu chọn Khác" /></label>
      </div>` : '<small class="bes-post-confirm-present-note">Đi trễ được lưu thành trạng thái riêng và vẫn được tính là có mặt.</small>'}
    </article>`;
  }).join('');
}

function accessHeading(access) {
  if (access.reason === 'admin_bypass') return 'Admin · được phép điều chỉnh';
  if (access.reason === 'report_bypass') return 'Quyền Báo cáo · được phép điều chỉnh';
  if (access.allowed) return `Còn ${formatPostConfirmRemaining(access.remainingMs)} để điều chỉnh`;
  if (access.reason === 'edit_window_expired') return 'Đã khóa chỉnh sửa';
  if (access.reason === 'not_session_teacher') return 'Không phải người đã chốt buổi này';
  return 'Không thể điều chỉnh';
}

function ensureCard() {
  const context = selectedContext();
  if (!context?.rollcall || !activeSession || activeSession.session_status !== 'completed') {
    document.querySelector(`.${CARD_CLASS}`)?.remove();
    return null;
  }
  let card = context.rollcall.querySelector(`.${CARD_CLASS}`);
  if (!card) {
    card = document.createElement('section');
    card.className = CARD_CLASS;
    card.setAttribute('aria-label', 'Điều chỉnh điểm danh sau khi chốt');
    const controls = context.rollcall.querySelector('.attendance-session-controls');
    if (controls?.parentNode) controls.insertAdjacentElement('afterend', card);
    else context.rollcall.prepend(card);
    card.addEventListener('click', onCardClick);
    card.addEventListener('change', onCardChange);
    card.addEventListener('input', onCardInput);
  }
  return card;
}

function renderCard() {
  renderQueued = false;
  const card = ensureCard();
  if (!card) return;

  const access = localAccess();
  if (!access.allowed && editing) editing = false;
  const summary = statusSummary();
  const expiry = access.expiresAt || serverAccess?.expires_at || '';
  const auditText = latestChange?.changed_at
    ? `Điều chỉnh gần nhất: ${formatVietnamTime(latestChange.changed_at)}${latestChange.changed_by_name ? ` · ${latestChange.changed_by_name}` : ''}`
    : 'Chưa có điều chỉnh nào sau khi chốt.';
  const helper = access.allowed
    ? (access.bypass
      ? 'Tài khoản này có quyền điều chỉnh sau khi chốt. Mọi thay đổi đều được ghi nhật ký.'
      : `Giáo viên có 30 phút tính từ lúc chốt. Hạn điều chỉnh: ${formatVietnamTime(expiry)}.`)
    : (access.reason === 'server_access_unavailable' ? errorMessage : postConfirmAccessReasonVi(access));

  if (!editing) {
    card.className = `${CARD_CLASS} ${access.allowed ? 'is-open' : 'is-locked'}`;
    card.innerHTML = `<div class="bes-post-confirm-card-copy">
        <span class="bes-post-confirm-icon" aria-hidden="true">${access.allowed ? '✎' : '🔒'}</span>
        <div><strong>Điều chỉnh điểm danh sau khi chốt</strong><p>${escapeHtml(helper)}</p><small>${escapeHtml(auditText)}</small></div>
      </div>
      <div class="bes-post-confirm-card-summary"><b>${summary.present}/${summary.total}</b><span>có mặt</span><em>${summary.late} đi trễ · ${summary.absent} vắng</em></div>
      <div class="bes-post-confirm-card-action">
        <strong>${escapeHtml(accessHeading(access))}</strong>
        ${access.allowed ? `<button type="button" data-action="open" ${loading ? 'disabled' : ''}>Điều chỉnh điểm danh</button>` : ''}
      </div>
      ${notice ? `<div class="bes-post-confirm-notice is-success">${escapeHtml(notice)}</div>` : ''}
      ${errorMessage && access.reason !== 'server_access_unavailable' ? `<div class="bes-post-confirm-notice is-error">${escapeHtml(errorMessage)}</div>` : ''}`;
    return;
  }

  card.className = `${CARD_CLASS} is-editing`;
  card.innerHTML = `<header class="bes-post-confirm-editor-head">
      <div><span aria-hidden="true">✎</span><div><strong>Điều chỉnh điểm danh</strong><p>${escapeHtml(accessHeading(access))} · chốt lúc ${escapeHtml(formatVietnamTime(activeSession.checked_at))}</p></div></div>
      <div class="bes-post-confirm-live-summary"><b>${summary.present}/${summary.total}</b><span>có mặt</span><em>${summary.absent} vắng</em></div>
    </header>
    <div class="bes-post-confirm-editor-note">Chọn đúng trạng thái <b>Có mặt</b>, <b>Đi trễ</b> hoặc <b>Vắng</b>. Đi trễ vẫn tính là có mặt; hệ thống lưu người sửa, thời gian và trạng thái trước/sau.</div>
    <div class="bes-post-confirm-students">${renderEditorRows()}</div>
    <footer class="bes-post-confirm-editor-footer">
      <label><span>Ghi chú buổi học</span><input data-field="session-note" value="${escapeHtml(draftNote)}" placeholder="Không bắt buộc" /></label>
      <div><button type="button" class="is-secondary" data-action="cancel" ${saving ? 'disabled' : ''}>Hủy điều chỉnh</button><button type="button" class="is-primary" data-action="save" ${saving ? 'disabled' : ''}>${saving ? 'Đang lưu…' : 'Lưu điều chỉnh'}</button></div>
    </footer>
    ${errorMessage ? `<div class="bes-post-confirm-notice is-error">${escapeHtml(errorMessage)}</div>` : ''}`;
}

function queueRender() {
  if (renderQueued || typeof window === 'undefined') return;
  renderQueued = true;
  window.requestAnimationFrame(renderCard);
}

function queueLoad(force = false) {
  if (loadQueued && !force) return;
  loadQueued = true;
  window.queueMicrotask(() => loadSelectedSession({ force }).catch(() => {}));
}

function draftRecordFromTarget(target) {
  const row = target?.closest?.('[data-record-id]');
  if (!row) return null;
  return draft.find((item) => text(item.id) === text(row.dataset.recordId)) || null;
}

async function openEditor() {
  const access = localAccess();
  if (!access.allowed || !activeSession || saving) return;
  errorMessage = '';
  notice = '';
  try {
    if (!records.length) records = await fetchRecords(activeSession.id);
    makeDraft();
    editing = true;
    queueRender();
  } catch (error) {
    errorMessage = error?.message || 'Không thể tải danh sách học sinh để điều chỉnh.';
    queueRender();
  }
}

function validateDraft() {
  if (!draft.length) return 'Không có học sinh để điều chỉnh.';
  for (const record of draft) {
    if (record.status !== 'absent') continue;
    if (!record.absence_reason_code) return `Vui lòng chọn lý do vắng cho ${record.student_full_name}.`;
    if (record.absence_reason_code === 'other' && !text(record.absence_note).trim()) {
      return `Vui lòng ghi rõ lý do khác cho ${record.student_full_name}.`;
    }
  }
  return '';
}

async function saveAdjustment() {
  if (!client || !activeSession || saving) return;
  const access = localAccess();
  if (!access.allowed) {
    editing = false;
    errorMessage = 'Khoảng thời gian điều chỉnh đã kết thúc.';
    queueRender();
    return;
  }
  const validation = validateDraft();
  if (validation) {
    errorMessage = validation;
    queueRender();
    return;
  }

  saving = true;
  errorMessage = '';
  queueRender();
  const payload = draft.map((record) => ({
    record_id: record.id,
    status: record.status,
    reason_code: record.status === 'absent' ? record.absence_reason_code : '',
    note: record.status === 'absent' ? text(record.absence_note).trim() : '',
  }));

  const { error } = await client.rpc('bes_update_extra_attendance_session', {
    p_session_id: activeSession.id,
    p_records: payload,
    p_note: text(draftNote).trim(),
  });
  saving = false;

  if (error) {
    errorMessage = error.message || 'Không thể lưu điều chỉnh điểm danh.';
    if (/30 phút|không có quyền|đã hết/i.test(errorMessage)) editing = false;
    queueRender();
    return;
  }

  notice = 'Đã lưu điều chỉnh. Sĩ số, báo cáo và lịch sử đã được cập nhật.';
  editing = false;
  await loadSelectedSession({ force: true });
  document.querySelector('.attendance-top-actions button[title="Làm mới"]')?.click();
  window.setTimeout(() => queueLoad(true), 250);
}

function onCardClick(event) {
  const button = event.target?.closest?.('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'open') {
    openEditor();
    return;
  }
  if (action === 'cancel') {
    editing = false;
    errorMessage = '';
    makeDraft();
    queueRender();
    return;
  }
  if (action === 'save') {
    saveAdjustment();
    return;
  }
  if (action === 'status') {
    const record = draftRecordFromTarget(button);
    if (!record) return;
    const nextStatus = button.dataset.status;
    record.status = ['present', 'late', 'absent'].includes(nextStatus) ? nextStatus : 'present';
    if (record.status === 'absent' && !record.absence_reason_code) record.absence_reason_code = 'unspecified';
    if (record.status === 'present' || record.status === 'late') {
      record.absence_reason_code = '';
      record.absence_note = '';
    }
    errorMessage = '';
    queueRender();
  }
}

function onCardChange(event) {
  const target = event.target;
  const record = draftRecordFromTarget(target);
  if (!record) return;
  if (target.matches('select[data-field="reason"]')) {
    record.absence_reason_code = text(target.value);
    if (record.absence_reason_code !== 'other' && record.absence_note === undefined) record.absence_note = '';
  }
}

function onCardInput(event) {
  const target = event.target;
  if (target.matches('input[data-field="session-note"]')) {
    draftNote = text(target.value);
    return;
  }
  if (target.matches('input[data-field="absence-note"]')) {
    const record = draftRecordFromTarget(target);
    if (record) record.absence_note = text(target.value);
  }
}

function onDocumentChange(event) {
  if (event.target?.matches?.('.attendance-session-controls input[type="date"], .attendance-session-controls select')) {
    notice = '';
    errorMessage = '';
    queueLoad(true);
  }
}

function startObserver() {
  if (!document.body || observer) return;
  observer = new MutationObserver((mutations) => {
    if (mutations.every((mutation) => mutation.target?.closest?.(`.${CARD_CLASS}`))) return;
    queueLoad(false);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value'] });
  document.addEventListener('change', onDocumentChange, true);
  timer = window.setInterval(() => {
    if (activeSession?.session_status === 'completed') queueRender();
  }, 1000);
  queueLoad(true);
}

export function installAttendancePostConfirmEdit() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  const start = async () => {
    try {
      runtimeSnapshot = await ensureRuntimeReady();
      client = getRuntimeClient();
      subscribeRuntime((next) => {
        runtimeSnapshot = next || getRuntimeState();
        client = getRuntimeClient();
        queueLoad(true);
      });
    } catch (error) {
      console.warn('[AttendancePostConfirmEdit] Runtime unavailable', error);
    }
    startObserver();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendancePostConfirmEdit();
