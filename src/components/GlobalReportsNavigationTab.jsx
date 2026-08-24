import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/motion.js';
import { loadTeamWorkspace } from '../utils/personnelHub.js';
import { currentReportMonth, loadMonthlyReportContexts } from '../utils/monthlyReports.js';
import { deadlineState, loadMonthlyReportDeadline } from '../utils/monthlyReportAdmin.js';
import usePrimaryNavigationHost from './usePrimaryNavigationHost.js';
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
  const host = usePrimaryNavigationHost();
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());

  const allowed = useMemo(() => Boolean(
    currentUser && (
      isDepartmentLeaderRole(currentUser.role)
      || hasToolAccess(currentUser, 'brian-team')
    )
  ), [currentUser]);

  useEffect(() => {
    if (!allowed || !currentUser?.id) {
      setDeadline(null);
      return undefined;
    }

    let alive = true;
    let scopePromise = null;

    const resolveScope = async () => {
      if (isDepartmentLeaderRole(currentUser.role)) {
        const workspaceResult = await loadTeamWorkspace(currentUser);
        const workspace = workspaceResult?.workspace;
        const department = workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId)
          || workspace?.departments?.[0]
          || null;
        return {
          departmentHeadId: currentUser.id,
          departmentId: department?.id || '',
        };
      }

      const contextResult = await loadMonthlyReportContexts(currentUser);
      const context = contextResult?.contexts?.[0] || null;
      return {
        departmentHeadId: context?.departmentHeadId || '',
        departmentId: context?.departmentId || '',
      };
    };

    const getScope = () => {
      scopePromise ||= resolveScope();
      return scopePromise;
    };

    const refreshDeadline = async () => {
      try {
        const { departmentHeadId, departmentId } = await getScope();
        if (!departmentHeadId || !departmentId) {
          if (alive) setDeadline(null);
          return;
        }

        const result = await loadMonthlyReportDeadline({
          departmentHeadId,
          departmentId,
          month: currentReportMonth(),
        });
        if (alive) setDeadline(result?.deadline || null);
      } catch {
        scopePromise = null;
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
