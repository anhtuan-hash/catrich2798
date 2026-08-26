import React, { useEffect, useMemo, useState } from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import { SHARED_GAME_APPS } from '../data/sharedGameApps.js';
import { canPublishDepartment } from '../utils/permissions.js';
import { CUSTOM_GAMES_EVENT, isCustomGameOwner, listCustomGames } from '../utils/customGames.js';
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
// Games now live in Applications, so the old Games tab is no longer shown here.
import '../styles/games-route-retired.css';
// Legacy editorial layer kept for safe fallbacks.
import '../styles/apps-editorial-two-column-v3.css';
// Previous stabilization layers.
import '../styles/apps-editorial-five-column-stable-v6.css';
import '../styles/apps-editorial-five-column-v7.css';
// FINAL route authority using new V8 markup. Keep this import last.
import '../styles/apps-editorial-five-column-v8.css';

const LEGACY_SAVED_GAMES_KEY = 'bes-game-hub-links-v1';

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
      : 'Game link migrated from the former Games workspace.',
    descVi: status === 'approved'
      ? 'Trò chơi lớp học dùng chung đã được TTCM duyệt.'
      : 'Liên kết trò chơi được chuyển từ không gian Trò chơi cũ.',
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

function stableLegacyId(value = '') {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}

function readLegacySavedGames() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEGACY_SAVED_GAMES_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed).flatMap(([platformKey, links]) => {
      if (!Array.isArray(links)) return [];
      const platform = SHARED_GAME_APPS.find((item) => item.slug === `shared-game-${platformKey}`);
      return links
        .filter((link) => link && /^https?:\/\//i.test(String(link.url || '')))
        .map((link) => ({
          slug: `saved-game-${platformKey}-${stableLegacyId(String(link.url || ''))}`,
          title: String(link.title || platform?.title || 'Saved game').trim(),
          titleVi: String(link.title || platform?.titleVi || platform?.title || 'Trò chơi đã lưu').trim(),
          icon: platform?.icon || '🎮',
          desc: `Saved game link from ${platform?.title || platformKey}.`,
          descVi: `Liên kết trò chơi đã lưu từ ${platform?.titleVi || platform?.title || platformKey}.`,
          status: 'Saved',
          statusVi: 'Đã lưu',
          group: 'Saved game apps',
          groupVi: 'Ứng dụng trò chơi đã lưu',
          groupId: 'create',
          externalUrl: String(link.url),
          legacySavedGame: true,
        }));
    });
  } catch {
    return [];
  }
}

export default function WebAppsAndroidDrawer(props) {
  const { apps, currentUser } = props;
  const [customGameApps, setCustomGameApps] = useState([]);
  const [legacySavedGames, setLegacySavedGames] = useState(() => readLegacySavedGames());

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

  useEffect(() => {
    const onStorage = (event) => {
      if (!event.key || event.key === LEGACY_SAVED_GAMES_KEY) setLegacySavedGames(readLegacySavedGames());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const mergedApps = useMemo(() => {
    const base = Array.isArray(apps) ? apps : [];
    const merged = [...base, ...SHARED_GAME_APPS, ...customGameApps, ...legacySavedGames];
    const seen = new Set();
    return merged.filter((item) => {
      const key = String(item?.slug || item?.route || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [apps, customGameApps, legacySavedGames]);

  return <WebAppsRedesign {...props} apps={mergedApps} />;
}
