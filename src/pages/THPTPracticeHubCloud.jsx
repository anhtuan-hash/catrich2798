import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../utils/supabase.js';
import {
  fromCloudRow,
  getAccessToken,
  updateResourceLibrary,
} from '../utils/resourceLibrary.js';
import THPTPracticeHub from './THPTPracticeHub.jsx';
import './THPTPracticeHubCloud.css';

const HUB_TAG = 'thpt-interactive-html';

function isHubLesson(item) {
  const fileName = String(item?.fileName || '').toLowerCase();
  const mimeType = String(item?.mimeType || '').toLowerCase();
  const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
  return item?.category === 'thpt-exam'
    && (mimeType.includes('text/html') || /\.html?$/.test(fileName) || tags.includes(HUB_TAG));
}

function getLessonTitle(card) {
  return String(card?.querySelector('.thpt-lesson-main strong')?.textContent || '').trim();
}

function applyLessonSort(root, sortOrder) {
  const list = root?.querySelector('.thpt-lesson-list');
  if (!list) return;

  const cards = Array.from(list.children).filter((node) => node.classList?.contains('thpt-lesson'));
  cards.forEach((card) => card.style.removeProperty('order'));

  if (sortOrder === 'newest') return;

  const direction = sortOrder === 'name-desc' ? -1 : 1;
  cards
    .sort((left, right) => direction * getLessonTitle(left).localeCompare(
      getLessonTitle(right),
      'vi',
      { numeric: true, sensitivity: 'base' },
    ))
    .forEach((card, index) => {
      card.style.order = String(index);
    });
}

async function syncRoleAwareCatalog() {
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'auth' };
  const response = await fetch('/api/resource-sync?scope=thpt-html-lessons', {
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
  const vi = props.language !== 'en';
  const rootRef = useRef(null);
  const sortHostRef = useRef(null);
  const sortOrderRef = useRef('newest');
  const [sortOrder, setSortOrder] = useState('newest');
  const [sortHost, setSortHost] = useState(null);

  sortOrderRef.current = sortOrder;

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const updateControlsAndSort = () => {
      const search = root.querySelector('.thpt-search');
      if (search && !sortHostRef.current) {
        const host = document.createElement('div');
        host.className = 'thpt-sort-portal';
        search.insertAdjacentElement('afterend', host);
        sortHostRef.current = host;
        setSortHost(host);
      }
      applyLessonSort(root, sortOrderRef.current);
    };

    updateControlsAndSort();
    const observer = new MutationObserver(updateControlsAndSort);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      sortHostRef.current?.remove();
      sortHostRef.current = null;
      setSortHost(null);
    };
  }, []);

  useEffect(() => {
    applyLessonSort(rootRef.current, sortOrder);
  }, [sortOrder]);

  return (
    <div ref={rootRef} className="thpt-cloud-shell">
      <THPTPracticeHub {...props} />
      {sortHost ? createPortal(
        <div className="thpt-sort-control">
          <label htmlFor="thpt-lesson-sort">{vi ? 'Sắp xếp' : 'Sort'}</label>
          <select
            id="thpt-lesson-sort"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label={vi ? 'Sắp xếp danh sách bài học' : 'Sort lesson list'}
          >
            <option value="newest">{vi ? 'Mới nhất' : 'Newest'}</option>
            <option value="name-asc">{vi ? 'Tên A → Z' : 'Name A → Z'}</option>
            <option value="name-desc">{vi ? 'Tên Z → A' : 'Name Z → A'}</option>
          </select>
        </div>,
        sortHost,
      ) : null}
    </div>
  );
}
