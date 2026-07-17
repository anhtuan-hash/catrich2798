import React, { useEffect } from 'react';
import { supabase } from '../utils/supabase.js';
import {
  fromCloudRow,
  getAccessToken,
  updateResourceLibrary,
} from '../utils/resourceLibrary.js';
import THPTPracticeHub from './THPTPracticeHub.jsx';

const HUB_TAG = 'thpt-interactive-html';

function isHubLesson(item) {
  const fileName = String(item?.fileName || '').toLowerCase();
  const mimeType = String(item?.mimeType || '').toLowerCase();
  const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
  return item?.category === 'thpt-exam'
    && (mimeType.includes('text/html') || /\.html?$/.test(fileName) || tags.includes(HUB_TAG));
}

async function syncRoleAwareCatalog() {
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'auth' };
  const response = await fetch('/api/thpt-html-lessons', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, reason: data.error || 'sync' };
  const cloudItems = (data.items || []).map(fromCloudRow).filter(isHubLesson);
  updateResourceLibrary((store) => {
    const otherItems = store.items.filter((item) => !isHubLesson(item));
    store.items = [...cloudItems, ...otherItems];
  });
  return { ok: true, count: cloudItems.length };
}

export default function THPTPracticeHubCloud(props) {
  const userKey = props.currentUser?.id || props.currentUser?.email || '';

  useEffect(() => {
    if (!userKey) return undefined;
    let active = true;
    const sync = () => syncRoleAwareCatalog().catch(() => ({ ok: false }));
    sync();
    const onFocus = () => { if (active) sync(); };
    const timer = window.setInterval(() => { if (active) sync(); }, 30000);
    window.addEventListener('focus', onFocus);

    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('thpt-practice-role-aware-catalog')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_items' }, () => { if (active) sync(); })
        .subscribe();
    }

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [userKey]);

  return <THPTPracticeHub {...props} />;
}
