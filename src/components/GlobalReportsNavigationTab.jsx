import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/navigation.js';
import { loadTeamWorkspace } from '../utils/personnelHub.js';
import { currentReportMonth, loadMonthlyReportContexts } from '../utils/monthlyReports.js';
import { deadlineState, loadMonthlyReportDeadline } from '../utils/monthlyReportAdmin.js';

function compactCountdown(state, language) {
  if (!state.active) return '—';
  if (state.expired) return language === 'vi' ? 'Hết' : 'End';

  const totalMs = Math.max(0, Number(state.totalMs || 0));
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor(totalMs / 1000);

  if (days > 0) return language === 'vi' ? `${days}n` : `${days}d`;
  if (hours > 0) return language === 'vi' ? `${hours}g` : `${hours}h`;
  if (minutes > 0) return language === 'vi' ? `${minutes}p` : `${minutes}m`;
  return `${Math.max(0, seconds)}s`;
}

function accessibleCountdown(state, language) {
  if (!state.active) return language === 'vi' ? 'Chưa đặt hạn' : 'No deadline';
  if (state.expired) return language === 'vi' ? 'Đã hết hạn' : 'Expired';

  const totalMs = Math.max(0, Number(state.totalMs || 0));
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);

  if (language === 'vi') {
    const parts = [];
    if (days) parts.push(`${days} ngày`);
    if (hours || days) parts.push(`${hours} giờ`);
    if (minutes || hours || days) parts.push(`${minutes} phút`);
    parts.push(`${seconds} giây`);
    return `Còn ${parts.join(' ')}`;
  }

  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours || days) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes || hours || days) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  return `${parts.join(' ')} left`;
}

export default function GlobalReportsNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
  selectedTool = null,
}) {
  const [host, setHost] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());

  const allowed = useMemo(() => Boolean(
    currentUser && (
      isDepartmentLeaderRole(currentUser.role)
      || hasToolAccess(currentUser, 'brian-team')
    )
  ), [currentUser]);
  const active = route === 'tool' && selectedTool?.slug === 'brian-team';

  useEffect(() => {
    if (!active) return;
    import('../styles/MonthlyReportsRouteBundle.css')
      .catch((error) => console.warn('[Reports] Could not load route visual bundle:', error));
  }, [active]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__primary');
      setHost((current) => (current === nextHost ? current : nextHost));
    };
    findHost();
    const frame = window.requestAnimationFrame(findHost);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!allowed || !currentUser?.id) {
      setDeadline(null);
      return undefined;
    }

    let alive = true;

    const refreshDeadline = async () => {
      try {
        const month = currentReportMonth();
        let departmentHeadId = '';
        let departmentId = '';

        if (isDepartmentLeaderRole(currentUser.role)) {
          const workspaceResult = await loadTeamWorkspace(currentUser);
          const workspace = workspaceResult?.workspace;
          const department = workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId)
            || workspace?.departments?.[0]
            || null;
          departmentHeadId = currentUser.id;
          departmentId = department?.id || '';
        } else {
          const contextResult = await loadMonthlyReportContexts(currentUser);
          const context = contextResult?.contexts?.[0] || null;
          departmentHeadId = context?.departmentHeadId || '';
          departmentId = context?.departmentId || '';
        }

        if (!departmentHeadId || !departmentId) {
          if (alive) setDeadline(null);
          return;
        }

        const result = await loadMonthlyReportDeadline({ departmentHeadId, departmentId, month });
        if (alive) setDeadline(result?.deadline || null);
      } catch {
        if (alive) setDeadline(null);
      }
    };

    const handleFocus = () => refreshDeadline();
    const handleVisibility = () => {
      if (!document.hidden) refreshDeadline();
    };
    const handleDeadlineChange = () => refreshDeadline();

    refreshDeadline();
    const refreshTimer = window.setInterval(refreshDeadline, 60000);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('bes-monthly-report-deadline-change', handleDeadlineChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      alive = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('bes-monthly-report-deadline-change', handleDeadlineChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [allowed, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    setNow(Date.now());
    if (!deadline) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (!host || !allowed) return null;

  const departmentLeader = isDepartmentLeaderRole(currentUser?.role);
  const label = language === 'vi' ? 'Báo cáo' : 'Reports';
  const countdown = deadlineState(deadline, now);
  const reportWindowOpen = Boolean(countdown.active && !countdown.expired);
  const showCountdownUnderLabel = active && departmentLeader && reportWindowOpen;
  const countdownLabel = reportWindowOpen ? compactCountdown(countdown, language) : '';
  const countdownAccessibleLabel = reportWindowOpen ? accessibleCountdown(countdown, language) : '';
  const deadlineTitle = reportWindowOpen
    ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(deadline))
    : '';
  const accessibleLabel = reportWindowOpen ? `${label} · ${countdownAccessibleLabel}` : label;
  const buttonTitle = reportWindowOpen ? `${deadlineTitle} · ${countdownAccessibleLabel}` : label;

  return createPortal(
    <button
      type="button"
      className={`brian-nav__reports-tab ${active ? 'is-active' : ''} ${showCountdownUnderLabel ? 'shows-countdown' : ''}`.trim()}
      aria-current={active ? 'page' : undefined}
      aria-label={accessibleLabel}
      title={buttonTitle}
      onClick={(event) => launchRoute({
        target: '#/tool/brian-team',
        label: language === 'vi' ? 'BC' : 'RP',
        color: '#0f766e',
        sourceEl: event.currentTarget,
      })}
    >
      <span className="brian-nav__reports-label">{label}</span>
      {showCountdownUnderLabel ? (
        <span className="brian-nav__reports-countdown" aria-hidden="true">{countdownLabel}</span>
      ) : null}
    </button>,
    host,
  );
}
