import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { listManagedWeeklyPractices } from '../utils/weeklyPractice.js';
import WeeklyPracticeStatisticsPanel from './WeeklyPracticeStatisticsPanel.jsx';

const HOST_ID = 'bes-weekly-statistics-button-host';
const MODERN_ACTIONS_SELECTOR = '.metro-clean-system[data-route="home"] .bha-practice .bha-practice-header-actions';
const MODERN_HEADER_SELECTOR = '.metro-clean-system[data-route="home"] .bha-practice > header';
const MODERN_MANAGER_SELECTOR = '.metro-clean-system[data-route="home"] .bha-practice .bha-manage-practice';
const LEGACY_MANAGER_SELECTOR = '#bes-weekly-practice-root .bes-weekly-manage-button';
const LEGACY_HEADING_SELECTOR = '#bes-weekly-practice-root .bes-weekly-heading';

function managerIsVisible() {
  const button = document.querySelector(`${MODERN_MANAGER_SELECTOR}, ${LEGACY_MANAGER_SELECTOR}`);
  if (!button) return false;
  const style = window.getComputedStyle(button);
  return style.display !== 'none' && style.visibility !== 'hidden' && button.getClientRects().length > 0;
}

function ensureHost() {
  const modernActions = document.querySelector(MODERN_ACTIONS_SELECTOR);
  const modernHeader = document.querySelector(MODERN_HEADER_SELECTOR);
  const legacyHeading = document.querySelector(LEGACY_HEADING_SELECTOR);
  const target = modernActions || modernHeader || legacyHeading;
  if (!target) return null;

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'bes-weekly-stat-launch-host';
  }

  host.dataset.surface = modernActions || modernHeader ? 'modern' : 'legacy';
  if (host.parentElement !== target) target.appendChild(host);
  return host;
}

export default function GlobalWeeklyPracticeStatisticsBridge({ route = 'home', currentUser }) {
  const roleAllows = isDepartmentLeaderRole(currentUser?.role);
  const [eligible, setEligible] = useState(roleAllows);
  const [host, setHost] = useState(null);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route !== 'home') {
      setEligible(false);
      setHost(null);
      document.getElementById(HOST_ID)?.remove();
      return undefined;
    }

    let frame = 0;
    const attach = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const allowed = roleAllows || managerIsVisible();
        setEligible(allowed);
        if (!allowed) {
          setHost(null);
          document.getElementById(HOST_ID)?.remove();
          return;
        }
        const nextHost = ensureHost();
        setHost((current) => (current === nextHost ? current : nextHost));
      });
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });
    window.addEventListener('resize', attach);
    window.addEventListener('focus', attach);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', attach);
      window.removeEventListener('focus', attach);
      document.getElementById(HOST_ID)?.remove();
    };
  }, [route, roleAllows]);

  const launch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listManagedWeeklyPractices());
      setOpen(true);
    } catch (loadError) {
      const message = String(loadError?.message || loadError || '').trim();
      setError(message || 'Không thể tải danh sách bài luyện tập.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!host || !eligible) {
    return open ? <WeeklyPracticeStatisticsPanel items={items} onClose={() => setOpen(false)} /> : null;
  }

  return <>
    {createPortal(
      <>
        <button className="bes-weekly-stat-launch" type="button" onClick={launch} disabled={loading}>
          <span className="bes-weekly-stat-launch__icon" aria-hidden="true">▦</span>
          <span>{loading ? 'Đang tải…' : 'Thống kê TTCM'}</span>
        </button>
        {error ? <span className="bes-weekly-stat-launch-error" title={error}>!</span> : null}
      </>,
      host,
    )}
    {open ? <WeeklyPracticeStatisticsPanel items={items} onClose={() => setOpen(false)} /> : null}
  </>;
}
