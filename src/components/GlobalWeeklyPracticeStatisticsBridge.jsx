import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { listManagedWeeklyPractices } from '../utils/weeklyPractice.js';
import WeeklyPracticeStatisticsPanel from './WeeklyPracticeStatisticsPanel.jsx';

const HOST_ID = 'bes-weekly-statistics-button-host';

function ensureHost() {
  const heading = document.querySelector('#bes-weekly-practice-root .bes-weekly-heading');
  if (!heading) return null;
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'bes-weekly-stat-launch-host';
  }
  if (host.parentElement !== heading) heading.appendChild(host);
  return host;
}

export default function GlobalWeeklyPracticeStatisticsBridge({ route = 'home', currentUser }) {
  const canManage = isDepartmentLeaderRole(currentUser?.role);
  const [host, setHost] = useState(null);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route !== 'home' || !canManage) {
      setHost(null);
      return undefined;
    }
    let frame = 0;
    const attach = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHost(ensureHost()));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.getElementById(HOST_ID)?.remove();
    };
  }, [route, canManage]);

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

  if (!host || !canManage) return open ? <WeeklyPracticeStatisticsPanel items={items} onClose={() => setOpen(false)} /> : null;

  return <>
    {createPortal(<><button className="bes-weekly-stat-launch" type="button" onClick={launch} disabled={loading}>{loading ? 'Đang tải…' : 'Bài nộp TTCM'}</button>{error ? <span className="bes-weekly-stat-launch-error" title={error}>!</span> : null}</>, host)}
    {open ? <WeeklyPracticeStatisticsPanel items={items} onClose={() => setOpen(false)} /> : null}
  </>;
}
