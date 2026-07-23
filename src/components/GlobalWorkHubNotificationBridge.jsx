import React, { useCallback, useEffect } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import {
  listWorkHubNotifications,
  subscribeWorkHubNotifications,
  WORK_HUB_DELIVERY_EVENT,
} from '../utils/workHubDelivery.js';

const HIDDEN_TASK_STATUSES = new Set(['draft', 'completed', 'approved', 'archived', 'cancelled']);

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
  const details = String(item?.description || '').trim();
  const message = [intro, due ? `${language === 'vi' ? 'Hạn' : 'Due'}: ${due}` : '', details]
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
    source: 'work-hub-item',
  };
}

async function listAssignedWorkItems(userId) {
  const client = getRuntimeClient();
  if (!client || !userId) return [];

  const columns = 'id,title,description,status,priority,due_at,owner_id,created_by,assignee_ids,metadata,created_at,updated_at';
  let result = await client
    .from('work_hub_items')
    .select(columns)
    .contains('assignee_ids', [userId])
    .order('created_at', { ascending: false })
    .limit(80);

  if (result.error) {
    result = await client
      .from('work_hub_items')
      .select(columns)
      .order('created_at', { ascending: false })
      .limit(300);
  }

  if (result.error) return [];
  return (result.data || []).filter((item) => {
    const assignees = normalizeIds(item?.assignee_ids);
    if (!assignees.includes(String(userId))) return false;
    if (String(item?.owner_id || '') === String(userId)) return false;
    if (HIDDEN_TASK_STATUSES.has(String(item?.status || '').toLowerCase())) return false;
    if (item?.metadata?.notify_assignee === false) return false;
    return true;
  });
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

  const refresh = useCallback(async () => {
    if (!userId || !runtime.ready || !runtime.session) return;
    const readStates = storedReadState(currentUser);
    const [databaseRows, assignedItems] = await Promise.all([
      listWorkHubNotifications(userId, 60),
      listAssignedWorkItems(userId),
    ]);

    const databaseNotifications = (databaseRows || []).map((row) => mapDatabaseNotification(row, language, readStates));
    const databaseItemIds = new Set(databaseNotifications.map((item) => item.itemId).filter(Boolean));
    const fallbackNotifications = (assignedItems || [])
      .filter((item) => !databaseItemIds.has(String(item?.id || '')))
      .map((item) => mapAssignedTask(item, language, readStates));

    dispatchNotifications([...databaseNotifications, ...fallbackNotifications]);
  }, [currentUser, language, runtime.ready, runtime.session, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId || !runtime.ready || !runtime.session) return () => {};
    const refreshSoon = () => window.setTimeout(() => refresh(), 80);
    const unsubscribeNotifications = subscribeWorkHubNotifications(userId, refreshSoon);
    const unsubscribeItems = subscribeTable({
      key: `global-work-hub-items-${userId}`,
      table: 'work_hub_items',
      onChange: refreshSoon,
    });
    const onDeliveryUpdate = () => refreshSoon();
    const onFocus = () => refreshSoon();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshSoon();
    };

    window.addEventListener(WORK_HUB_DELIVERY_EVENT, onDeliveryUpdate);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribeNotifications();
      unsubscribeItems();
      window.removeEventListener(WORK_HUB_DELIVERY_EVENT, onDeliveryUpdate);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, runtime.ready, runtime.session, userId]);

  return null;
}
