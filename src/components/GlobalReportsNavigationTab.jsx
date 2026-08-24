import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/motion.js';
import { loadTeamWorkspace } from '../utils/personnelHub.js';
import { currentReportMonth, loadMonthlyReportContexts } from '../utils/monthlyReports.js';
import { deadlineState, loadMonthlyReportDeadline } from '../utils/monthlyReportAdmin.js';
import './GlobalReportsNavigationTab.css';

function compactCountdown(state, language) {
  if (!state.active) return language === 'vi' ? 'Chưa đặt hạn' : 'No deadline';
  if (state.expired) return language === 'vi' ? 'Hết hạn' : 'Expired';

  const totalMs = Math.max(0, Number(state.totalMs || 0));
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return days > 0 ? `${days}n ${clock}` : clock;
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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__primary');
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    findHost();
    const frame = window.requestAnimationFrame(findHost);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
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

  const active = route === 'tool' && selectedTool?.slug === 'brian-team';
  const label = language === 'vi' ? 'Báo cáo' : 'Reports';
  const countdown = deadlineState(deadline, now);
  const countdownLabel = compactCountdown(countdown, language);
  const countdownClass = countdown.expired ? 'is-expired' : (!countdown.active ? 'is-unset' : '');
  const deadlineTitle = deadline
    ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(deadline))
    : (language === 'vi' ? 'Chưa đặt thời hạn báo cáo tháng này' : 'No report deadline set for this month');

  return createPortal(
    <button
      type="button"
      className={`brian-nav__reports-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      aria-label={`${label} · ${countdownLabel}`}
      title={deadlineTitle}
      onClick={(event) => launchRoute({
        target: '#/tool/brian-team',
        label: language === 'vi' ? 'BC' : 'RP',
        color: '#0f766e',
        sourceEl: event.currentTarget,
      })}
    >
      <span className="brian-nav__reports-label">{label}</span>
      <span className={`brian-nav__reports-countdown ${countdownClass}`}>{countdownLabel}</span>
    </button>,
    host,
  );
}
