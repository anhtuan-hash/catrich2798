import { useEffect } from 'react';
import { getRuntimeClient } from '../../services/runtime/core.js';
import { useRuntimeCore } from '../../services/runtime/useRuntimeCore.js';
import { getSupplementalAttendanceEditSnapshot } from '../../attendance/supplementalLearningApi.js';
import { formatPostConfirmRemaining } from '../../utils/attendancePostConfirmEdit.js';
import './AttendanceHistoryPostConfirmAction.css';

const ACTION_ID = 'bes-attendance-history-adjust-action';
const ACTION_CLASS = 'ahv3__adjust-button';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function text(value) {
  return String(value ?? '').trim();
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function dateFromHistoryLabel(value) {
  const match = text(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function selectedHistoryIdentity() {
  const selected = document.querySelector('.ahv3__items > button.is-selected');
  if (!selected) return null;
  const className = text(selected.querySelector('.ahv3__card-title b')?.textContent);
  const attendanceDate = dateFromHistoryLabel(selected.querySelector('time')?.textContent);
  if (!className || !attendanceDate) return null;
  return {
    key: `${className}|${attendanceDate}|${text(selected.querySelector('.ahv3__type')?.textContent)}`,
    className,
    attendanceDate,
    supplemental: /học bổ sung/i.test(text(selected.querySelector('.ahv3__type')?.textContent)),
  };
}

function normalizeServerAccess(value = {}) {
  const access = value && typeof value === 'object' ? value : {};
  return {
    allowed: Boolean(access.allowed),
    bypass: Boolean(access.bypass),
    reason: text(access.reason),
    expiresAt: text(access.expires_at || access.expiresAt),
    serverNow: text(access.server_now || access.serverNow),
    remainingSeconds: Math.max(0, Number(access.remaining_seconds ?? access.remainingSeconds ?? 0) || 0),
  };
}

function serverClockOffset(access) {
  const parsed = new Date(access?.serverNow || '');
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() - Date.now() : 0;
}

function remainingMs(access, offsetMs = 0, loadedAt = Date.now()) {
  const expiresAt = new Date(access?.expiresAt || '');
  if (Number.isFinite(expiresAt.getTime())) {
    return Math.max(0, expiresAt.getTime() - (Date.now() + offsetMs));
  }
  const elapsed = Math.max(0, Date.now() - loadedAt);
  return Math.max(0, Number(access?.remainingSeconds || 0) * 1000 - elapsed);
}

function actionLabel(access, offsetMs, loadedAt) {
  const remaining = remainingMs(access, offsetMs, loadedAt);
  if (remaining > 0) return `Điều chỉnh điểm danh · Còn ${formatPostConfirmRemaining(remaining)}`;
  return access?.bypass ? 'Điều chỉnh điểm danh' : '';
}

function setNativeInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitFor(getValue, { timeout = 7000, interval = 60 } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const value = getValue();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        reject(new Error('Không thể mở trình điều chỉnh điểm danh lúc này.'));
        return;
      }
      window.setTimeout(tick, interval);
    };
    tick();
  });
}

function findQuickTab() {
  return Array.from(document.querySelectorAll('.attendance-tabs button'))
    .find((button) => /điểm danh nhanh/i.test(text(button.textContent))) || null;
}

function findClassButton(className) {
  return Array.from(document.querySelectorAll('.attendance-class-list button'))
    .find((button) => fold(button.querySelector('.attendance-class-name-row b')?.textContent) === fold(className)) || null;
}

async function openExistingPostConfirmEditor(session) {
  if (!session) return;

  if (session.source === 'supplemental') {
    window.dispatchEvent(new CustomEvent('bes-supplemental-open-rollcall', {
      detail: { sessionId: session.sessionId, classId: session.classId || '' },
    }));
  } else {
    findQuickTab()?.click();
    await waitFor(() => document.querySelector('.attendance-quick-layout'));

    const search = document.querySelector('.att-m3-class-search input');
    if (search && text(search.value)) setNativeInputValue(search, '');
    document.querySelector('.att-m3-subject-hub button:first-child')?.click();

    const classButton = await waitFor(() => findClassButton(session.className));
    classButton.click();

    const dateInput = await waitFor(() => document.querySelector('.attendance-session-controls input[type="date"]'));
    if (dateInput.value !== session.attendanceDate) setNativeInputValue(dateInput, session.attendanceDate);
  }

  await waitFor(() => {
    const rollcall = document.querySelector('.attendance-rollcall');
    if (!rollcall) return null;
    const source = text(rollcall.dataset.besAttendanceSource || rollcall.getAttribute('data-bes-attendance-source'));
    const sessionId = text(rollcall.dataset.besAttendanceSessionId || rollcall.getAttribute('data-bes-attendance-session-id'));
    if (session.source === 'supplemental') return source === 'supplemental' && sessionId === session.sessionId ? rollcall : null;
    return sessionId === session.sessionId ? rollcall : null;
  });

  const openButton = await waitFor(() => document.querySelector('.bes-post-confirm-edit-card button[data-action="open"]'));
  openButton.click();
}

async function resolveExtraSession(client, identity) {
  const { data, error } = await client
    .from('bes_extra_attendance_sessions')
    .select('id,class_id,class_name,attendance_date,checked_at,session_status')
    .eq('attendance_date', identity.attendanceDate)
    .eq('class_name', identity.className)
    .eq('session_status', 'completed')
    .order('checked_at', { ascending: false })
    .limit(4);
  if (error) throw error;
  const row = (data || []).find((item) => fold(item.class_name) === fold(identity.className)) || data?.[0];
  if (!row?.id) return null;
  return {
    source: 'extra',
    sessionId: text(row.id),
    classId: text(row.class_id),
    className: text(row.class_name),
    attendanceDate: text(row.attendance_date).slice(0, 10),
  };
}

async function resolveSupplementalSession(client, identity) {
  const { data, error } = await client.rpc('bes_list_supplemental_history', {
    p_from: identity.attendanceDate,
    p_to: identity.attendanceDate,
    p_query: '',
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((item) => {
    const name = item?.groupName || item?.group_name || item?.title || 'Học bổ sung';
    const date = text(item?.date || item?.attendanceDate || item?.attendance_date).slice(0, 10);
    return fold(name) === fold(identity.className) && date === identity.attendanceDate;
  });
  if (!row?.id) return null;
  return {
    source: 'supplemental',
    sessionId: text(row.id),
    classId: text(row.groupId || row.group_id),
    className: identity.className,
    attendanceDate: identity.attendanceDate,
  };
}

async function resolveHistorySession(client, identity) {
  return identity.supplemental
    ? resolveSupplementalSession(client, identity)
    : resolveExtraSession(client, identity);
}

async function loadEditAccess(client, session) {
  if (session.source === 'supplemental') {
    const snapshot = await getSupplementalAttendanceEditSnapshot(client, session.sessionId);
    return normalizeServerAccess(snapshot?.access);
  }
  const { data, error } = await client.rpc('bes_get_extra_attendance_edit_access', {
    p_session_id: session.sessionId,
  });
  if (error) throw error;
  return normalizeServerAccess(data);
}

export default function AttendanceHistoryPostConfirmAction({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();

  useEffect(() => {
    if (typeof document === 'undefined' || !client || !runtime.ready || !currentUser?.id) return undefined;

    let stopped = false;
    let observer = null;
    let timer = 0;
    let requestToken = 0;
    let identityKey = '';
    let activeSession = null;
    let activeAccess = null;
    let accessLoadedAt = 0;
    let clockOffsetMs = 0;

    const removeAction = () => document.getElementById(ACTION_ID)?.remove();

    const render = () => {
      if (stopped) return;
      const actions = document.querySelector('.ahv3__detail .ahv3__actions');
      if (!actions || !activeSession || !activeAccess?.allowed) {
        removeAction();
        return;
      }
      const label = actionLabel(activeAccess, clockOffsetMs, accessLoadedAt);
      if (!label) {
        removeAction();
        return;
      }

      let button = document.getElementById(ACTION_ID);
      if (!button) {
        button = document.createElement('button');
        button.id = ACTION_ID;
        button.type = 'button';
        button.className = ACTION_CLASS;
        button.addEventListener('click', async () => {
          if (button.disabled || !activeSession) return;
          button.disabled = true;
          button.dataset.busy = 'true';
          button.textContent = 'Đang mở trình điều chỉnh…';
          try {
            const freshAccess = await loadEditAccess(client, activeSession);
            activeAccess = freshAccess;
            accessLoadedAt = Date.now();
            clockOffsetMs = serverClockOffset(freshAccess);
            if (!freshAccess.allowed || (!freshAccess.bypass && remainingMs(freshAccess, clockOffsetMs, accessLoadedAt) <= 0)) {
              removeAction();
              return;
            }
            await openExistingPostConfirmEditor(activeSession);
          } catch (error) {
            console.warn('[AttendanceHistoryPostConfirmAction] Không thể mở trình điều chỉnh.', error);
            button.title = error?.message || 'Không thể mở trình điều chỉnh lúc này.';
            button.textContent = 'Không thể mở · Thử lại';
            window.setTimeout(() => {
              if (!stopped && document.body.contains(button)) {
                button.disabled = false;
                button.dataset.busy = 'false';
                render();
              }
            }, 1600);
            return;
          }
          button.disabled = false;
          button.dataset.busy = 'false';
        });
        actions.prepend(button);
      } else if (button.parentElement !== actions) {
        actions.prepend(button);
      }
      if (button.dataset.busy !== 'true') button.textContent = label;
      button.title = activeAccess.bypass
        ? 'Mở trình điều chỉnh điểm danh hiện có. Quyền chỉnh sửa vẫn được kiểm tra lại trên máy chủ.'
        : 'Mở trình điều chỉnh điểm danh hiện có trong thời hạn 30 phút sau khi chốt.';
    };

    const sync = async () => {
      const identity = selectedHistoryIdentity();
      if (!identity) {
        identityKey = '';
        activeSession = null;
        activeAccess = null;
        removeAction();
        return;
      }
      if (identity.key === identityKey && activeSession && activeAccess) {
        render();
        return;
      }

      identityKey = identity.key;
      activeSession = null;
      activeAccess = null;
      removeAction();
      const token = ++requestToken;
      try {
        const session = await resolveHistorySession(client, identity);
        if (stopped || token !== requestToken || !session) return;
        const access = await loadEditAccess(client, session);
        if (stopped || token !== requestToken) return;
        activeSession = session;
        activeAccess = access;
        accessLoadedAt = Date.now();
        clockOffsetMs = serverClockOffset(access);
        render();
      } catch (error) {
        if (!stopped && token === requestToken) {
          console.warn('[AttendanceHistoryPostConfirmAction] Không thể kiểm tra quyền điều chỉnh.', error);
          removeAction();
        }
      }
    };

    let syncQueued = false;
    const queueSync = () => {
      if (syncQueued || stopped) return;
      syncQueued = true;
      window.requestAnimationFrame(() => {
        syncQueued = false;
        sync();
      });
    };

    observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target?.closest?.(`#${ACTION_ID}`))) return;
      queueSync();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    timer = window.setInterval(render, 1000);
    queueSync();

    return () => {
      stopped = true;
      requestToken += 1;
      observer?.disconnect();
      window.clearInterval(timer);
      removeAction();
    };
  }, [client, runtime.ready, runtime.session?.user?.id, currentUser?.id]);

  return null;
}
