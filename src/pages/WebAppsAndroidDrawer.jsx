import React, { useEffect, useMemo, useState } from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import { canPublishDepartment } from '../utils/permissions.js';
import { CUSTOM_GAMES_EVENT, isCustomGameOwner, listCustomGames } from '../utils/customGames.js';
// Functional route layers retained: permissions, list behavior/performance and
// the single current editorial authority. Older V3/V4/V6/V7 visuals are retired.
import '../styles/apps-permission-request-material.css';
import '../styles/apps-list-view.css';
import '../styles/apps-performance-recovery.css';
import '../styles/apps-google-material-list-v2.css';
import '../styles/apps-editorial-five-column-v8.css';
// Final launcher authority: no search/category rail, five columns × four visible rows,
// with a native draggable vertical scrollbar for the remaining applications.
import '../styles/apps-grid-5x4-scroll.css';

function customGameAsApp(game) {
  const status = String(game.status || '').toLowerCase();
  const statusCopy = {
    approved: ['Shared', 'Dùng chung'],
    pending: ['Pending review', 'Chờ duyệt'],
    private: ['Private', 'Riêng tư'],
    rejected: ['Rejected', 'Bị từ chối'],
  }[status] || ['Game app', 'Ứng dụng trò chơi'];

  return {
    slug: `shared-game-${game.id}`,
    title: game.label,
    titleVi: game.label,
    icon: game.icon || '🎮',
    desc: status === 'approved'
      ? 'Shared classroom game approved for the English department.'
      : 'Teacher-managed classroom game link.',
    descVi: status === 'approved'
      ? 'Trò chơi lớp học dùng chung đã được TTCM duyệt.'
      : 'Liên kết trò chơi lớp học do giáo viên quản lý.',
    status: statusCopy[0],
    statusVi: statusCopy[1],
    group: status === 'approved' ? 'Shared classroom apps' : 'Classroom game apps',
    groupVi: status === 'approved' ? 'Ứng dụng dùng chung' : 'Ứng dụng trò chơi',
    groupId: 'create',
    externalUrl: game.home,
    shared: status === 'approved',
    sharedGameId: game.id,
    legacyGameStatus: status,
  };
}

export default function WebAppsAndroidDrawer(props) {
  const { apps, currentUser } = props;
  const [customGameApps, setCustomGameApps] = useState([]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const games = await listCustomGames(currentUser);
        if (!active) return;
        const leader = canPublishDepartment(currentUser);
        setCustomGameApps(
          (Array.isArray(games) ? games : [])
            .filter((game) => game?.label && game?.home)
            .filter((game) => game.status === 'approved' || leader || isCustomGameOwner(currentUser, game))
            .map(customGameAsApp),
        );
      } catch (error) {
        console.warn('[Apps] Could not load migrated game apps:', error);
        if (active) setCustomGameApps([]);
      }
    };

    refresh();
    window.addEventListener(CUSTOM_GAMES_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(CUSTOM_GAMES_EVENT, refresh);
    };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, currentUser?.role]);


  const mergedApps = useMemo(() => {
    const base = Array.isArray(apps) ? apps : [];
    const merged = [...base, ...customGameApps];
    const seen = new Set();
    return merged.filter((item) => {
      const key = String(item?.slug || item?.route || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [apps, customGameApps]);

  return <WebAppsRedesign {...props} apps={mergedApps} />;
}
