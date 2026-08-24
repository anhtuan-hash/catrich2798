import React, { useEffect, useMemo, useState } from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import { SHARED_GAME_APPS } from '../data/sharedGameApps.js';
import { CUSTOM_GAMES_EVENT, listCustomGames } from '../utils/customGames.js';
import '../styles/apps-hero-clean-v3.css';
import '../styles/apps-hero-flat-relief-v4.css';
// Final Material permission layer: locked apps stay legible and open a focused access dialog.
import '../styles/apps-permission-request-material.css';
// The Applications page now uses a normal list instead of the legacy app-drawer grid.
import '../styles/apps-list-view.css';
// Paint/performance guard keeps the Applications route responsive on Safari and classroom displays.
import '../styles/apps-performance-recovery.css';
// Final Google Material list layer: consistent colours, readable rows and no duplicate pinned drawer.
import '../styles/apps-google-material-list-v2.css';

function sharedCustomGame(game) {
  return {
    slug: `shared-game-${game.id}`,
    title: game.label,
    titleVi: game.label,
    icon: game.icon || '🎮',
    desc: 'Shared classroom game approved for the English department.',
    descVi: 'Trò chơi lớp học dùng chung đã được TTCM duyệt.',
    status: 'Shared',
    statusVi: 'Dùng chung',
    group: 'Shared classroom apps',
    groupVi: 'Ứng dụng dùng chung',
    groupId: 'create',
    externalUrl: game.home,
    shared: true,
    sharedGameId: game.id,
  };
}

export default function WebAppsAndroidDrawer(props) {
  const { apps, currentUser } = props;
  const [approvedCustomGames, setApprovedCustomGames] = useState([]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const games = await listCustomGames(currentUser);
        if (!active) return;
        setApprovedCustomGames(
          (Array.isArray(games) ? games : [])
            .filter((game) => game?.status === 'approved' && game?.label && game?.home)
            .map(sharedCustomGame),
        );
      } catch (error) {
        console.warn('[Apps] Could not load approved shared games:', error);
        if (active) setApprovedCustomGames([]);
      }
    };

    refresh();
    window.addEventListener(CUSTOM_GAMES_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(CUSTOM_GAMES_EVENT, refresh);
    };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  const mergedApps = useMemo(() => {
    const base = Array.isArray(apps) ? apps : [];
    const merged = [...base, ...SHARED_GAME_APPS, ...approvedCustomGames];
    const seen = new Set();
    return merged.filter((item) => {
      const key = String(item?.slug || item?.route || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [apps, approvedCustomGames]);

  return <WebAppsRedesign {...props} apps={mergedApps} />;
}
