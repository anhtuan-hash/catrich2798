import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/navigation.js';
import { loadTeamWorkspace } from '../utils/personnelHub.js';
import { currentReportMonth, loadMonthlyReportContexts } from '../utils/monthlyReports.js';
import { deadlineState, loadMonthlyReportDeadline } from '../utils/monthlyReportAdmin.js';
import { listNavigationLearningDeadlineTasks } from '../features/learningReports/learningReportsService.js';
import { selectReportNavigationDeadlines, formatNavigationDeadline, navigationDeadlineSummary }
  from '../features/learningReports/navigationDeadlines.js';
import './GlobalReportsNavigationTab.css';

function compactCountdown(state, language) {
  if (!state.active) return '—';
  if (state.expired) return language === 'vi' ? 'Hết' : 'End';

  const totalMs = Math.max(0, Number(state.totalMs || 0));
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (days > 0) return language === 'vi' ? `${days}ng ${pad(hours)}:${pad(minutes)}` : `${days}d ${pad(hours)}:${pad(minutes)}`;
  return clock;
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

function reportMotionTargets(button) {
  if (!button) return {};
  return {
    wrapper: button.querySelector('.brian-nav__reports-svg-wrapper'),
    plane: button.querySelector('.brian-nav__reports-svg-wrapper svg'),
    copy: button.querySelector('.brian-nav__reports-copy'),
  };
}

function cancelReportMotion(button) {
  const { wrapper, plane, copy } = reportMotionTargets(button);
  [wrapper, plane, copy].forEach((element) => {
    element?.getAnimations?.().forEach((animation) => animation.cancel());
  });

  if (wrapper) wrapper.style.removeProperty('transform');
  if (plane) plane.style.removeProperty('transform');
  if (copy) {
    copy.style.removeProperty('transform');
    copy.style.removeProperty('opacity');
  }
}

function startReportMotion(button) {
  const { wrapper, plane, copy } = reportMotionTargets(button);
  if (!wrapper || !plane || !copy) return;

  cancelReportMotion(button);

  if (typeof plane.animate !== 'function') {
    wrapper.style.transform = 'translate3d(0, -0.1em, 0)';
    plane.style.transform = 'translate3d(1.35em, 0, 0) rotate(45deg) scale(1.12)';
    copy.style.transform = 'translate3d(5.5em, 0, 0)';
    copy.style.opacity = '0';
    return;
  }

  wrapper.animate([
    { transform: 'translate3d(0, 0.1em, 0)' },
    { transform: 'translate3d(0, -0.1em, 0)' },
  ], {
    duration: 600,
    easing: 'ease-in-out',
    direction: 'alternate',
    iterations: Infinity,
  });

  plane.animate([
    { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
    { transform: 'translate3d(1.35em, 0, 0) rotate(45deg) scale(1.12)' },
  ], {
    duration: 300,
    easing: 'ease-in-out',
    fill: 'forwards',
  });

  copy.animate([
    { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    { transform: 'translate3d(5.5em, 0, 0)', opacity: 0 },
  ], {
    duration: 300,
    easing: 'ease-in-out',
    fill: 'forwards',
  });
}

export default function GlobalReportsNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
  selectedTool = null,
}) {
  const [host, setHost] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [learningDeadlines, setLearningDeadlines] = useState([]);
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
    let frame = 0;
    let observer = null;
    let disposed = false;
    // Reports can mount before Utilities; watch only until its slot appears.
    const findHost = () => {
      if (disposed) return;
      const nextHost = document.querySelector('.brian-nav__utility-reports');
      setHost((current) => (current === nextHost ? current : nextHost));
      if (nextHost) observer?.disconnect();
    };
    findHost();
    if (!document.querySelector('.brian-nav__utility-reports')) {
      observer = new MutationObserver(() => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => { frame = 0; findHost(); });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [currentUser?.id]);

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

  // A second, independent source for HSG / remedial assignments. Keep the
  // monthly-report fetch unchanged and fail independently when one source errors.
  useEffect(() => {
    if (!allowed || !currentUser?.id) {
      setLearningDeadlines([]);
      return undefined;
    }
    let alive=true;
    setLearningDeadlines([]);
    const refresh=async()=>{
      try {
        const tasks=await listNavigationLearningDeadlineTasks(
          currentUser.id,isDepartmentLeaderRole(currentUser.role),
        );
        if(alive)setLearningDeadlines(tasks);
      } catch (error) {
        // A temporary reporting failure must never remove the monthly timer.
        if(alive)setLearningDeadlines([]);
      }
    };
    const onFocus=()=>refresh();
    const onVisibility=()=>{if(!document.hidden)refresh();};
    refresh();
    const timer=window.setInterval(refresh,60000);
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('bes-learning-report-deadline-change',refresh);
    return ()=>{
      alive=false;
      window.clearInterval(timer);
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('bes-learning-report-deadline-change',refresh);
    };
  },[allowed,currentUser?.id,currentUser?.role]);

  useEffect(() => {
    setNow(Date.now());
    if (!deadline && learningDeadlines.length===0) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline, learningDeadlines.length]);

  if (!host || !allowed) return null;

  const label = language === 'vi' ? 'Báo cáo' : 'Reports';
  const picked = selectReportNavigationDeadlines({
    monthlyDeadline:deadline,learningTasks:learningDeadlines,
    userId:currentUser?.id,isLeader:isDepartmentLeaderRole(currentUser?.role),now,
  });
  const selectedDeadline=picked.primary?.dueAt||null;
  const countdown=deadlineState(selectedDeadline,now);
  const deadlineStatus=!countdown.active?'unset':countdown.expired?'expired':'active';
  const showCountdownUnderLabel=countdown.active;
  const countdownLabel=picked.primary?.kind==='monthly'
    ?compactCountdown(countdown,language)
    :formatNavigationDeadline(picked.primary,language,now);
  const countdownAccessibleLabel=accessibleCountdown(countdown,language);
  const deadlineDetails=navigationDeadlineSummary(picked.items,language,now);
  const accessibleLabel=label+' · '+(picked.items.length
    ? picked.items.map(item=>formatNavigationDeadline(item,language,now)).join(' · ')
    :countdownAccessibleLabel);
  const buttonTitle=deadlineDetails||accessibleLabel;

  return createPortal(
    <button
      type="button"
      className={`brian-nav__reports-tab brian-nav__reports-send ${active ? 'is-active' : ''} ${showCountdownUnderLabel ? 'shows-countdown' : ''} is-deadline-${deadlineStatus}`.trim()}
      data-deadline-status={deadlineStatus}
      data-report-kind={picked.primary?.kind||'none'}
      data-pending-report-deadlines={picked.items.length}
      aria-current={active ? 'page' : undefined}
      aria-label={accessibleLabel}
      title={buttonTitle}
      onClick={(event) => launchRoute({
        target: '#/tool/brian-team',
        label: language === 'vi' ? 'BC' : 'RP',
        color: '#4169e1',
        sourceEl: event.currentTarget,
      })}
    >
      <span className="brian-nav__reports-svg-wrapper-1" aria-hidden="true">
        <span className="brian-nav__reports-svg-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="none" d="M0 0h24v24H0z" />
            <path
              fill="currentColor"
              d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
            />
          </svg>
        </span>
      </span>
      <span className="brian-nav__reports-copy">
        <span className="brian-nav__reports-label">{label}</span>
        {showCountdownUnderLabel ? (
          <span className="brian-nav__reports-countdown" aria-hidden="true">{countdownLabel}</span>
        ) : null}
        {picked.otherCount>0&&(
          <span className="brian-nav__reports-more" aria-hidden="true">+{picked.otherCount}</span>
        )}
      </span>
    </button>,
    host,
  );
}
