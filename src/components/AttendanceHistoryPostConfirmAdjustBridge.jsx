import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { hasAttendanceTabAccess } from '../utils/permissions.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  evaluatePostConfirmEditAccess,
  formatPostConfirmRemaining,
} from '../utils/attendancePostConfirmEdit.js';
import {
  getSupplementalAttendanceEditSnapshot,
  loadSupplementalHistory,
} from '../attendance/supplementalLearningApi.js';
import '../attendancePostConfirmEditBootstrap.js';
import './AttendanceHistoryPostConfirmAdjustBridge.css';

const EXTRA_SESSION_SELECT = 'id,class_id,class_type,class_name,subject,teacher_name,attendance_date,checked_at,session_status';
const DOM_SYNC_TIMEOUT_MS = 8000;

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

function viDateToIso(value) {
  const match = text(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function findInfoValue(detail, label) {
  const wanted = fold(label);
  const article = Array.from(detail?.querySelectorAll?.('.ahv3__info-grid article') || [])
    .find((node) => fold(node.querySelector('div > span')?.textContent) === wanted);
  return text(article?.querySelector('div > b')?.textContent);
}

function selectedHistoryDescriptor() {
  const shell = document.querySelector('.ahv3__shell[data-attendance-history-v3="true"]');
  const detail = shell?.querySelector('.ahv3__detail');
  const selectedCard = shell?.querySelector('.ahv3__items > button.is-selected');
  if (!shell || !detail || !selectedCard) return null;

  const className = text(detail.querySelector('.ahv3__hero h2')?.textContent);
  const chips = Array.from(detail.querySelectorAll('.ahv3__hero-chips > span'));
  const dateLabel = chips.map((node) => text(node.textContent)).find((value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value)) || '';
  const attendanceDate = viDateToIso(dateLabel);
  const typeLabel = text(detail.querySelector('.ahv3__hero .ahv3__type')?.textContent || selectedCard.querySelector('.ahv3__type')?.textContent);
  const statusLabel = text(detail.querySelector('.att-m3-status-chip')?.textContent);
  if (!className || !attendanceDate || fold(statusLabel).includes('da huy')) return null;

  const subject = findInfoValue(detail, 'Môn học');
  const teacherName = findInfoValue(detail, 'Giáo viên');
  const source = fold(typeLabel).includes('hoc bo sung') ? 'supplemental' : 'extra';
  return {
    key: [source, className, subject, teacherName, attendanceDate].map(fold).join('|'),
    source,
    className,
    subject,
    teacherName,
    attendanceDate,
  };
}

function sameText(left, right) {
  return fold(left) === fold(right);
}

function pickExtraSession(rows, descriptor) {
  const candidates = Array.isArray(rows) ? rows : [];
  return candidates.find((row) => sameText(row.subject, descriptor.subject) && sameText(row.teacher_name, descriptor.teacherName))
    || candidates.find((row) => sameText(row.subject, descriptor.subject))
    || candidates[0]
    || null;
}

function pickSupplementalSession(rows, descriptor) {
  const candidates = (Array.isArray(rows) ? rows : []).filter((row) => {
    const className = row?.groupName || row?.title || '';
    return text(row?.date).slice(0, 10) === descriptor.attendanceDate && sameText(className, descriptor.className);
  });
  return candidates.find((row) => sameText(row.subject, descriptor.subject) && sameText(row.teacherName, descriptor.teacherName))
    || candidates.find((row) => sameText(row.subject, descriptor.subject))
    || candidates[0]
    || null;
}

function nativeSetValue(input, value) {
  if (!input) return;
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitFor(getter, timeout = DOM_SYNC_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const probe = () => {
      const value = getter();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        reject(new Error('Giao diện Điểm danh chưa sẵn sàng. Vui lòng thử lại.'));
        return;
      }
      window.setTimeout(probe, 60);
    };
    probe();
  });
}

function serverClockOffset(access) {
  const serverNow = new Date(access?.server_now || '');
  return Number.isFinite(serverNow.getTime()) ? serverNow.getTime() - Date.now() : 0;
}

export default function AttendanceHistoryPostConfirmAdjustBridge({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [desktopHost, setDesktopHost] = useState(null);
  const [mobileHost, setMobileHost] = useState(null);
  const [descriptor, setDescriptor] = useState(null);
  const [resolvedSession, setResolvedSession] = useState(null);
  const [serverAccess, setServerAccess] = useState(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [opening, setOpening] = useState(false);
  const requestTokenRef = useRef(0);

  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const isAdmin = systemRole === SYSTEM_ROLES.ADMIN;
  const hasReportPermission = isAdmin || hasAttendanceTabAccess(currentUser, 'report');
  const hasQuickPermission = isAdmin || hasAttendanceTabAccess(currentUser, 'quick') || hasReportPermission;
  const canAdjust = Boolean(currentUser?.id && hasQuickPermission);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let frame = 0;
    const syncFromDom = () => {
      frame = 0;
      const nextDesktopHost = document.querySelector('.ahv3__shell[data-attendance-history-v3="true"] .ahv3__hero .ahv3__actions');
      const nextMobileHost = document.querySelector('.ahv3__shell[data-attendance-history-v3="true"] .ahv3__mobile-sheet-actions');
      setDesktopHost((current) => current === nextDesktopHost ? current : nextDesktopHost);
      setMobileHost((current) => current === nextMobileHost ? current : nextMobileHost);
      const nextDescriptor = selectedHistoryDescriptor();
      setDescriptor((current) => current?.key === nextDescriptor?.key ? current : nextDescriptor);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncFromDom);
    };
    syncFromDom();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = ++requestTokenRef.current;
    setResolvedSession(null);
    setServerAccess(null);
    setClockOffsetMs(0);
    if (!client || !canAdjust || !descriptor) return undefined;

    let cancelled = false;
    const resolveSession = async () => {
      try {
        if (descriptor.source === 'supplemental') {
          const rows = await loadSupplementalHistory(client, {
            from: descriptor.attendanceDate,
            to: descriptor.attendanceDate,
          }, descriptor.className);
          const row = pickSupplementalSession(rows, descriptor);
          if (!row?.id || String(row.status || '').toLowerCase() === 'cancelled') return;
          const snapshot = await getSupplementalAttendanceEditSnapshot(client, row.id);
          if (cancelled || token !== requestTokenRef.current) return;
          const access = snapshot?.access || { allowed: false, reason: 'unknown' };
          const session = snapshot?.session || {};
          setResolvedSession({
            source: 'supplemental',
            id: row.id,
            groupId: row.groupId || session.group_id || '',
            className: descriptor.className,
            subject: descriptor.subject || row.subject || session.subject || '',
            attendanceDate: descriptor.attendanceDate,
            checkedAt: session.checked_at || row.attendanceConfirmedAt || row.checkedAt || '',
          });
          setServerAccess(access);
          setClockOffsetMs(serverClockOffset(access));
          return;
        }

        const { data, error } = await client
          .from('bes_extra_attendance_sessions')
          .select(EXTRA_SESSION_SELECT)
          .eq('class_name', descriptor.className)
          .eq('attendance_date', descriptor.attendanceDate)
          .eq('session_status', 'completed')
          .order('checked_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        const session = pickExtraSession(data, descriptor);
        if (!session?.id) return;
        const { data: access, error: accessError } = await client.rpc('bes_get_extra_attendance_edit_access', {
          p_session_id: session.id,
        });
        if (accessError) throw accessError;
        if (cancelled || token !== requestTokenRef.current) return;
        const resolvedAccess = access || { allowed: false, reason: 'unknown' };
        setResolvedSession({
          source: 'extra',
          id: session.id,
          classId: session.class_id,
          className: session.class_name,
          subject: session.subject || descriptor.subject || '',
          attendanceDate: session.attendance_date,
          checkedAt: session.checked_at,
        });
        setServerAccess(resolvedAccess);
        setClockOffsetMs(serverClockOffset(resolvedAccess));
      } catch (error) {
        if (!cancelled && token === requestTokenRef.current) {
          console.warn('[AttendanceHistoryAdjust] Không thể kiểm tra quyền điều chỉnh từ Lịch sử.', error);
        }
      }
    };

    void resolveSession();
    return () => { cancelled = true; };
  }, [client, canAdjust, descriptor?.key]);

  const displayAccess = useMemo(() => {
    if (!resolvedSession || !serverAccess?.allowed) return { allowed: false, bypass: false, remainingMs: 0 };
    const evaluated = evaluatePostConfirmEditAccess({
      session: {
        session_status: 'completed',
        checked_at: resolvedSession.checkedAt,
      },
      isAdmin,
      hasReportPermission,
      hasQuickPermission,
      now: new Date(nowMs + clockOffsetMs),
    });
    const bypass = Boolean(serverAccess.bypass || serverAccess.reason === 'admin_bypass' || serverAccess.reason === 'report_bypass');
    const serverExpiry = new Date(serverAccess.expires_at || '');
    const serverRemainingMs = Number.isFinite(serverExpiry.getTime())
      ? Math.max(0, serverExpiry.getTime() - (nowMs + clockOffsetMs))
      : Math.max(0, Number(serverAccess.remaining_seconds || 0) * 1000);
    const remainingMs = serverRemainingMs > 0
      ? Math.min(evaluated.remainingMs || serverRemainingMs, serverRemainingMs)
      : evaluated.remainingMs;
    const allowed = Boolean(serverAccess.allowed && (bypass || (evaluated.allowed && remainingMs > 0)));
    return { allowed, bypass, remainingMs };
  }, [resolvedSession, serverAccess, isAdmin, hasReportPermission, hasQuickPermission, nowMs, clockOffsetMs]);

  const openExistingEditor = useCallback(async () => {
    const openButton = await waitFor(() => document.querySelector('.bes-post-confirm-edit-card button[data-action="open"]'));
    openButton.click();
    await waitFor(() => document.querySelector('.bes-post-confirm-edit-card.is-editing'));
  }, []);

  const openExtraSession = useCallback(async (session) => {
    const quickTab = Array.from(document.querySelectorAll('.attendance-tabs button'))
      .find((button) => fold(button.textContent) === 'diem danh nhanh');
    if (!quickTab) throw new Error('Tài khoản không có quyền mở Điểm danh nhanh.');
    quickTab.click();

    await waitFor(() => document.querySelector('.attendance-quick-layout'));
    const searchInput = document.querySelector('.att-m3-class-search input');
    if (searchInput && text(searchInput.value)) nativeSetValue(searchInput, '');
    const allSubjectButton = Array.from(document.querySelectorAll('.att-m3-subject-hub button'))
      .find((button) => fold(button.querySelector('span')?.textContent || button.textContent) === 'tat ca');
    allSubjectButton?.click();

    const classButton = await waitFor(() => {
      const buttons = Array.from(document.querySelectorAll('.attendance-class-list button'));
      return buttons.find((button) => {
        const name = text(button.querySelector('.attendance-class-name-row b')?.textContent);
        const copy = fold(button.textContent);
        return sameText(name, session.className) && (!session.subject || copy.includes(fold(session.subject)));
      }) || buttons.find((button) => sameText(button.querySelector('.attendance-class-name-row b')?.textContent, session.className));
    });
    classButton.click();

    const rollcall = await waitFor(() => {
      const node = document.querySelector('.attendance-rollcall');
      return sameText(node?.querySelector('.attendance-rollcall-head h2')?.textContent, session.className) ? node : null;
    });
    const dateInput = rollcall.querySelector('.attendance-session-controls input[type="date"]');
    if (!dateInput) throw new Error('Không tìm thấy ngày điểm danh để mở lại buổi học.');
    if (dateInput.value !== session.attendanceDate) nativeSetValue(dateInput, session.attendanceDate);

    await waitFor(() => {
      const node = document.querySelector('.attendance-rollcall');
      return text(node?.dataset?.besAttendanceSessionId) === text(session.id) ? node : null;
    });
    await openExistingEditor();
  }, [openExistingEditor]);

  const openSupplementalSession = useCallback(async (session) => {
    window.dispatchEvent(new CustomEvent('bes-supplemental-open-rollcall', {
      detail: {
        sessionId: session.id,
        classId: session.groupId || undefined,
        source: 'history-adjustment',
      },
    }));
    await waitFor(() => {
      const rollcall = document.querySelector('.attendance-rollcall[data-bes-attendance-source="supplemental"]');
      return text(rollcall?.dataset?.besAttendanceSessionId) === text(session.id) ? rollcall : null;
    });
    await openExistingEditor();
  }, [openExistingEditor]);

  const openSelectedHistoryForAdjustment = useCallback(async () => {
    if (!resolvedSession || !displayAccess.allowed || opening) return;
    setOpening(true);
    try {
      if (resolvedSession.source === 'supplemental') await openSupplementalSession(resolvedSession);
      else await openExtraSession(resolvedSession);
    } catch (error) {
      console.warn('[AttendanceHistoryAdjust] Không thể mở điều chỉnh điểm danh.', error);
      window.alert(error?.message || 'Không thể mở điều chỉnh điểm danh. Vui lòng thử lại.');
    } finally {
      setOpening(false);
    }
  }, [resolvedSession, displayAccess.allowed, opening, openSupplementalSession, openExtraSession]);

  if (!displayAccess.allowed || !resolvedSession) return null;

  const label = opening
    ? 'Đang mở điều chỉnh…'
    : displayAccess.bypass
      ? 'Điều chỉnh điểm danh'
      : `Điều chỉnh điểm danh · Còn ${formatPostConfirmRemaining(displayAccess.remainingMs)}`;
  const action = (
    <button
      type="button"
      className="ahv3__adjust-button"
      disabled={opening}
      onClick={openSelectedHistoryForAdjustment}
      title="Mở lại buổi đã chốt bằng trình điều chỉnh điểm danh hiện có"
    >
      <span aria-hidden="true">✎</span>{label}
    </button>
  );

  return <>
    {desktopHost ? createPortal(action, desktopHost) : null}
    {mobileHost ? createPortal(React.cloneElement(action, { className: 'ahv3__adjust-button is-mobile-proxy' }), mobileHost) : null}
  </>;
}
