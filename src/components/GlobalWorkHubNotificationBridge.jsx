import React, { useCallback, useEffect, useRef } from 'react';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import {
  listWorkHubNotifications,
  subscribeWorkHubNotifications,
} from '../utils/workHubDelivery.js';

const HIDDEN_TASK_STATUSES = new Set(['draft', 'completed', 'approved', 'archived', 'cancelled']);
const FOCUS_REFRESH_INTERVAL = 60 * 60 * 1000;
const ASSIGNED_ITEMS_CACHE_MAX_AGE = 60 * 60 * 1000;
const BOOT_IDLE_TIMEOUT = 2_000;
const assignedItemsCache = new Map();
const assignedItemsPromises = new Map();

function notificationStorageKey(currentUser) {
  return `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function readStoredNotifications(currentUser) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(notificationStorageKey(currentUser)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storedReadState(currentUser) {
  return new Map(readStoredNotifications(currentUser).map((item) => [String(item?.id || ''), Boolean(item?.read)]));
}

function normalizeIds(values) {
  return Array.isArray(values) ? values.filter(Boolean).map(String) : [];
}

function formatDueDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

function mapDatabaseNotification(row, language, readStates) {
  const itemId = String(row?.item_id || '');
  const id = `work-hub:${itemId || row?.id}`;
  const notificationType = String(row?.notification_type || '').toLowerCase();
  return {
    id,
    title: String(row?.title || (language === 'vi' ? 'Công việc mới' : 'New task')),
    message: String(row?.body || (language === 'vi'
      ? 'Bạn có cập nhật mới từ Trung tâm công việc.'
      : 'You have a new update from Work Hub.')),
    target: '#/work-hub',
    createdAt: row?.created_at || new Date().toISOString(),
    read: Boolean(row?.read_at) || Boolean(readStates.get(id)),
    itemId,
    notificationId: row?.id ?? null,
    category: 'work',
    status: notificationType,
    chip: notificationType === 'changes_requested'
      ? (language === 'vi' ? 'Cần phản hồi' : 'Needs reply')
      : '',
    source: 'work-hub-notification',
  };
}

function mapAssignedTask(item, language, readStates) {
  const itemId = String(item?.id || '');
  const id = `work-hub:${itemId}`;
  const due = formatDueDate(item?.due_at, language);
  const intro = language === 'vi'
    ? 'Tổ trưởng đã giao cho bạn một công việc'
    : 'A department leader assigned you a task';
  const message = [intro, due ? `${language === 'vi' ? 'Hạn' : 'Due'}: ${due}` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    id,
    title: String(item?.title || (language === 'vi' ? 'Công việc mới' : 'New task')),
    message,
    target: '#/work-hub',
    createdAt: item?.created_at || item?.updated_at || new Date().toISOString(),
    read: Boolean(readStates.get(id)),
    itemId,
    category: 'work',
    priority: String(item?.priority || '').toLowerCase(),
    status: String(item?.status || '').toLowerCase(),
    source: 'work-hub-item',
  };
}

function isVisibleAssignedItem(item, userId) {
  const assignees = normalizeIds(item?.assignee_ids);
  if (!assignees.includes(String(userId))) return false;
  if (String(item?.owner_id || '') === String(userId)) return false;
  if (HIDDEN_TASK_STATUSES.has(String(item?.status || '').toLowerCase())) return false;
  if (item?.metadata?.notify_assignee === false) return false;
  return true;
}

async function listAssignedWorkItems(userId, { force = false } = {}) {
  const client = getRuntimeClient();
  if (!client || !userId) return [];
  const key = String(userId);
  const cached = assignedItemsCache.get(key);
  if (!force && cached && Date.now() - cached.storedAt < ASSIGNED_ITEMS_CACHE_MAX_AGE) return cached.items;
  if (!force && assignedItemsPromises.has(key)) return assignedItemsPromises.get(key);

  const task = (async () => {
    const columns = 'id,title,status,priority,due_at,owner_id,assignee_ids,metadata,created_at,updated_at';
    const result = await client
      .from('work_hub_items')
      .select(columns)
      .contains('assignee_ids', [userId])
      .order('created_at', { ascending: false })
      .limit(40);

    const items = result.error
      ? (cached?.items || [])
      : (result.data || []).filter((item) => isVisibleAssignedItem(item, userId));
    assignedItemsCache.set(key, { items, storedAt: Date.now() });
    return items;
  })();
  assignedItemsPromises.set(key, task);
  try { return await task; }
  finally { assignedItemsPromises.delete(key); }
}

function realtimeRow(payload) {
  return payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
}

function dispatchNotifications(items) {
  if (typeof window === 'undefined' || !items.length) return;
  const sorted = [...items].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  window.setTimeout(() => {
    sorted.forEach((item) => {
      window.dispatchEvent(new CustomEvent('bes-global-notification', { detail: item }));
    });
  }, 0);
}

export default function GlobalWorkHubNotificationBridge({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const userId = currentUser?.id || '';
  const refreshInFlightRef = useRef(null);
  const lastRefreshAtRef = useRef(0);
  const refreshTimerRef = useRef(0);

  const refresh = useCallback(({ force = false } = {}) => {
    if (!userId || !runtime.ready || !runtime.session) return Promise.resolve();
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const task = (async () => {
      const readStates = storedReadState(currentUser);
      const databaseRows = await listWorkHubNotifications(userId, 30, { force });
      const assignedItems = databaseRows?.length
        ? []
        : await listAssignedWorkItems(userId, { force });

      const databaseNotifications = (databaseRows || []).map((row) => mapDatabaseNotification(row, language, readStates));
      const databaseItemIds = new Set(databaseNotifications.map((item) => item.itemId).filter(Boolean));
      const fallbackNotifications = (assignedItems || [])
        .filter((item) => !databaseItemIds.has(String(item?.id || '')))
        .map((item) => mapAssignedTask(item, language, readStates));

      dispatchNotifications([...databaseNotifications, ...fallbackNotifications]);
      lastRefreshAtRef.current = Date.now();
    })().finally(() => {
      refreshInFlightRef.current = null;
    });

    refreshInFlightRef.current = task;
    return task;
  }, [currentUser, language, runtime.ready, runtime.session, userId]);

  useEffect(() => {
    if (!userId || !runtime.ready || !runtime.session) return undefined;

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => refresh(), { timeout: BOOT_IDLE_TIMEOUT });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timerId = window.setTimeout(() => refresh(), 750);
    return () => window.clearTimeout(timerId);
  }, [refresh, runtime.ready, runtime.session, userId]);

  useEffect(() => {
    if (!userId || !runtime.ready || !runtime.session) return () => {};

    const refreshSoon = ({ force = false, delay = 150 } = {}) => {
      if (!force && Date.now() - lastRefreshAtRef.current < FOCUS_REFRESH_INTERVAL) return;
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => refresh({ force }), delay);
    };

    const unsubscribeNotifications = subscribeWorkHubNotifications(userId, (payload) => {
      const row = realtimeRow(payload);
      if (!row?.id || payload?.eventType === 'DELETE' || row.read_at) return;
      dispatchNotifications([mapDatabaseNotification(row, language, storedReadState(currentUser))]);
    });

    const onFocus = () => refreshSoon();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshSoon();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(refreshTimerRef.current);
      unsubscribeNotifications();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser, language, refresh, runtime.ready, runtime.session, userId]);

  return null;
}
