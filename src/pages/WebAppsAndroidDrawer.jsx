import React, { useEffect, useMemo, useState } from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import { SHARED_GAME_APPS } from '../data/sharedGameApps.js';
import { canPublishDepartment } from '../utils/permissions.js';
import { CUSTOM_GAMES_EVENT, isCustomGameOwner, listCustomGames } from '../utils/customGames.js';
// Functional route layers retained: permissions, list behavior/performance and
// the single current editorial authority. Older V3/V4/V6/V7 visuals are retired.
import '../styles/apps-permission-request-material.css';
import '../styles/apps-list-view.css';
import '../styles/apps-performance-recovery.css';
import '../styles/apps-google-material-list-v2.css';
import '../styles/games-route-retired.css';
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
