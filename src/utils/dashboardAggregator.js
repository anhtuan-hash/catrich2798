import { getRuntimeClient } from '../services/runtime/core.js';
import {
  getCurrentHomeroomWorkspaceId,
  HOMEROOM_STORE_EVENT,
  loadHomeroomWorkspace,
} from './homeroomStore.js';
import { APP_USAGE_EVENT, getRecentAppUsage } from './appUsage.js';
import { AUTOSAVE_EVENT } from './autosave.js';
import { RESOURCE_EVENT, loadResourceLibrary } from './resourceLibrary.js';
import {
  WORK_HUB_DELIVERY_EVENT,
  listWorkHubNotifications,
  rememberWorkHubItem,
} from './workHubDelivery.js';
import { isAdminRole, isDepartmentLeaderRole } from './roles.js';

const DAY = 86400000;
const DONE = new Set(['completed', 'approved', 'archived', 'cancelled']);
const WORK_LOCAL_PREFIX = 'bes-work-hub-v1093-local';
const DRAFT_PREFIX = 'bes-global-draft-v1084';
const WORKSPACE_EVENT = 'bes-workspace-updated';

export const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';
export const DASHBOARD_SOURCE_EVENTS = [
  HOMEROOM_STORE_EVENT,
  APP_USAGE_EVENT,
  AUTOSAVE_EVENT,
  RESOURCE_EVENT,
  WORK_HUB_DELIVERY_EVENT,
  WORKSPACE_EVENT,
  DASHBOARD_REFRESH_EVENT,
];

const array = (value) => (Array.isArray(value) ? value : []);
const text = (value, fallback = '') => String(value ?? '').trim() || fallback;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value = new Date()) {
  const date = parseDate(value) || new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayDistance(value, now = new Date()) {
  const target = parseDate(value);
  if (!target) return null;
  return Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / DAY);
}

export function getDashboardDueState(value, done = false, now = new Date()) {
  if (!value || done) return 'normal';
  const days = dayDistance(value, now);
  if (days === null) return 'normal';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'normal';
}

export function formatDashboardDate(value, language = 'vi', { time = false } = {}) {
  const date = parseDate(value);
  if (!date) return language === 'vi' ? 'Chưa đặt hạn' : 'No date';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', time
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function dashboardDueLabel(value, done = false, language = 'vi', now = new Date()) {
  const state = getDashboardDueState(value, done, now);
  const days = dayDistance(value, now);
  if (language !== 'vi') {
    if (state === 'overdue') return `${Math.abs(days)}d overdue`;
    if (state === 'today') return 'Due today';
    if (state === 'soon') return `Due in ${days}d`;
    return formatDashboardDate(value, language);
  }
  if (state === 'overdue') return `Quá hạn ${Math.abs(days)} ngày`;
  if (state === 'today') return 'Đến hạn hôm nay';
  if (state === 'soon') return `Còn ${days} ngày`;
  return formatDashboardDate(value, language);
}

function safeLocalJson(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function readLocalWork(user) {
  return array(safeLocalJson(`${WORK_LOCAL_PREFIX}:${user?.id || user?.email || 'guest'}`, []));
}

function normalizeWork(item, user) {
  const assignees = array(item?.assignee_ids).map(String);
  const mine = assignees.includes(String(user?.id || '')) || item?.created_by === user?.id;
  const status = text(item?.status, 'assigned');
  return {
    id: `work:${item?.id || item?.localId || Math.random().toString(36).slice(2)}`,
    source: 'work',
    sourceLabel: 'Trung tâm công việc',
    tone: item?.priority === 'urgent' ? 'danger' : item?.priority === 'high' ? 'warning' : 'work',
    title: text(item?.title, 'Công việc chưa đặt tên'),
    description: text(item?.description),
    date: item?.due_at || item?.date || item?.deadline || '',
    owner: mine ? 'Của tôi' : text(item?.owner_name || item?.created_by_email),
    status,
    priority: text(item?.priority, 'normal'),
    done: DONE.has(status.toLowerCase()),
    route: 'work-hub',
    entityId: item?.id || '',
    mine,
    raw: item,
  };
}

function normalizeResource(item) {
  return {
    id: `resource:${item?.cloudId || item?.id}`,
    source: 'resource',
    sourceLabel: 'Kho học liệu',
    tone: item?.status === 'pending' ? 'approval' : 'resource',
    title: text(item?.title || item?.fileName, 'Học liệu chưa đặt tên'),
    description: text(item?.description || item?.aiSummary || item?.category),
    date: item?.updatedAt || item?.createdAt || item?.created_at || '',
    owner: text(item?.uploaderName || item?.uploader_name),
    status: text(item?.status, 'pending'),
    done: item?.status === 'approved',
    route: 'resource-library',
    entityId: item?.cloudId || item?.id || '',
    raw: item,
  };
}

function collectDrafts(user) {
  if (typeof window === 'undefined') return [];
  const token = text(user?.id || user?.email, 'guest').replace(/[^a-zA-Z0-9._/-]+/g, '-').slice(0, 180);
  const prefix = `${DRAFT_PREFIX}:${token}:`;
  const drafts = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const value = safeLocalJson(key);
    if (!value || typeof value !== 'object') continue;
    const route = key.slice(prefix.length);
    drafts.push({
      id: `draft:${route}`,
      target: `#/${route}`,
      title: text(value.titleVi || value.title || value.formTitle || route),
      icon: 'DR',
      accent: '#d86f38',
      updatedAt: value.savedAt || value.updatedAt || 0,
      kind: 'draft',
    });
  }
  return drafts.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 5);
}

function attendanceRows(workspace, isoDate) {
  const daily = workspace?.attendance?.[isoDate];
  if (Array.isArray(daily)) return daily;
  if (daily && typeof daily === 'object') return Object.values(daily);
  return Object.entries(workspace?.attendanceSessions || {})
    .filter(([key]) => key.startsWith(isoDate))
    .flatMap(([, value]) => array(value?.rows || value));
}

function buildHomeroom(workspace, now = new Date()) {
  if (!workspace) return null;
  const iso = now.toISOString().slice(0, 10);
  const students = array(workspace.students).filter((item) => item?.active !== false);
  const absentToday = attendanceRows(workspace, iso).filter((row) => {
    const status = text(row?.status || row?.attendance).toLowerCase();
    return ['absent', 'vắng', 'unexcused', 'excused', 'late'].includes(status);
  }).length;
  const reminders = array(workspace.reminders).filter((item) => !item?.done && item?.status !== 'done');
  const alerts = array(workspace.alerts).filter((item) => !item?.resolved && item?.status !== 'resolved');
  const upcoming = array(workspace.schedule).filter((item) => {
    const days = dayDistance(item?.date || item?.startAt, now);
    return days !== null && days >= 0 && days <= 14;
  });
  return {
    className: text(workspace.classProfile?.className, 'Lớp chủ nhiệm'),
    studentCount: students.length,
    absentToday,
    reminders: reminders.length,
    alerts: alerts.length,
    upcoming,
    route: 'homeroom',
  };
}

async function loadWork(user) {
  const client = getRuntimeClient();
  if (client && user?.id) {
    try {
      const { data, error } = await client.from('work_hub_items').select('*').order('updated_at', { ascending: false }).limit(300);
      if (!error) return { items: data || [], source: 'cloud' };
    } catch { /* local fallback */ }
  }
  return { items: readLocalWork(user), source: 'local' };
}

async function loadResources() {
  const local = loadResourceLibrary();
  return { items: array(local?.items).map(normalizeResource), source: array(local?.items).length ? 'local' : 'empty' };
}

async function loadHomeroom(user) {
  try {
    const id = getCurrentHomeroomWorkspaceId(user);
    const result = await loadHomeroomWorkspace(user, id);
    return { workspace: result?.workspace || null, source: result?.source || (result?.workspace ? 'cloud-or-local' : 'empty') };
  } catch {
    return { workspace: null, source: 'empty' };
  }
}

function workflowHealth(items, now = new Date()) {
  const open = items.filter((item) => !item.done);
  const completed = items.length - open.length;
  return {
    progress: items.length ? Math.round((completed / items.length) * 100) : 0,
    open: open.length,
    overdue: open.filter((item) => getDashboardDueState(item.date, false, now) === 'overdue').length,
    pending: items.filter((item) => item.status === 'submitted').length,
    completed,
    total: items.length,
  };
}

export function createEmptyDashboardSnapshot(currentUser) {
  const leader = isDepartmentLeaderRole(currentUser?.role);
  return {
    generatedAt: '',
    role: leader ? 'leader' : 'teacher',
    leader,
    admin: isAdminRole(currentUser?.role),
    stats: { today: 0, overdue: 0, dueSoon: 0, pendingApproval: 0, upcoming: 0, notifications: 0 },
    timeline: [],
    attention: [],
    professional: [],
    approvals: [],
    continueItems: [],
    recentResources: [],
    homeroom: null,
    workflowHealth: { progress: 0, open: 0, overdue: 0, pending: 0, completed: 0, total: 0 },
    notifications: [],
    sourceErrors: [],
    sources: { workHub: 'loading', resources: 'loading', homeroom: 'loading' },
  };
}

export async function loadDashboardSnapshot(currentUser, now = new Date()) {
  const leader = isDepartmentLeaderRole(currentUser?.role);
  const sourceErrors = [];
  const settled = await Promise.allSettled([
    loadWork(currentUser),
    loadResources(),
    loadHomeroom(currentUser),
    listWorkHubNotifications(currentUser?.id, 30),
  ]);
  const value = (index, fallback, source) => {
    const result = settled[index];
    if (result.status === 'fulfilled') return result.value;
    sourceErrors.push({ source, message: result.reason?.message || String(result.reason || source) });
    return fallback;
  };
  const workResult = value(0, { items: readLocalWork(currentUser), source: 'local' }, 'workHub');
  const resourceResult = value(1, { items: [], source: 'empty' }, 'resources');
  const homeroomResult = value(2, { workspace: null, source: 'empty' }, 'homeroom');
  const notifications = value(3, [], 'notifications');
  const workItems = array(workResult.items).map((item) => normalizeWork(item, currentUser));
  const relevantWork = leader ? workItems : workItems.filter((item) => item.mine);
  const resources = array(resourceResult.items);
  const homeroom = buildHomeroom(homeroomResult.workspace, now);
  const homeroomTimeline = array(homeroom?.upcoming).map((item, index) => ({
    id: `homeroom:schedule:${item?.id || index}`,
    source: 'homeroom', sourceLabel: homeroom.className, tone: 'homeroom',
    title: text(item?.title || item?.name, 'Lịch lớp'),
    description: text(item?.description || item?.note),
    date: item?.date || item?.startAt || '', owner: '', status: text(item?.status),
    done: item?.status === 'completed', route: 'homeroom', entityId: item?.id || '',
  }));
  const timeline = [...relevantWork.filter((item) => !item.done), ...homeroomTimeline]
    .filter((item) => { const days = dayDistance(item.date, now); return days !== null && days >= 0 && days <= 14; })
    .sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0))
    .slice(0, 18);
  const attention = [...relevantWork.filter((item) => !item.done), ...(leader ? resources.filter((item) => item.status === 'pending') : [])]
    .sort((a, b) => {
      const rank = { overdue: 0, today: 1, soon: 2, normal: 3 };
      return rank[getDashboardDueState(a.date, a.done, now)] - rank[getDashboardDueState(b.date, b.done, now)];
    }).slice(0, 18);
  const approvals = leader
    ? [...resources.filter((item) => item.status === 'pending'), ...workItems.filter((item) => item.status === 'submitted')].slice(0, 8)
    : [];
  const drafts = collectDrafts(currentUser);
  const recentApps = getRecentAppUsage(currentUser, 8);
  const continueMap = new Map();
  [...drafts, ...recentApps].forEach((item) => {
    const target = item.target || '#/apps';
    if (!continueMap.has(target)) continueMap.set(target, {
      id: item.id || target, target,
      title: text(item.titleVi || item.title, 'Tiếp tục công việc'),
      icon: text(item.icon, 'GO'), accent: item.accent || item.color || '#315fc4',
      updatedAt: item.savedAt || item.lastActiveAt || item.lastUsedAt || item.openedAt || 0,
      kind: item.kind || 'workspace',
    });
  });
  const stats = {
    today: attention.filter((item) => getDashboardDueState(item.date, item.done, now) === 'today').length,
    overdue: attention.filter((item) => getDashboardDueState(item.date, item.done, now) === 'overdue').length,
    dueSoon: attention.filter((item) => getDashboardDueState(item.date, item.done, now) === 'soon').length,
    pendingApproval: approvals.length,
    upcoming: timeline.length,
    notifications: array(notifications).length,
  };
  return {
    generatedAt: new Date().toISOString(),
    role: leader ? 'leader' : 'teacher', leader, admin: isAdminRole(currentUser?.role),
    stats, timeline, attention,
    professional: [...relevantWork].sort((a, b) => (parseDate(b.raw?.updated_at || b.date)?.getTime() || 0) - (parseDate(a.raw?.updated_at || a.date)?.getTime() || 0)).slice(0, 10),
    approvals,
    continueItems: [...continueMap.values()].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 6),
    recentResources: [...resources].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0)).slice(0, 6),
    homeroom,
    workflowHealth: workflowHealth(relevantWork, now),
    notifications: array(notifications), sourceErrors,
    sources: { workHub: workResult.source, resources: resourceResult.source, homeroom: homeroomResult.source },
  };
}

export function openDashboardTarget(item) {
  if (!item) return;
  if (item.route === 'work-hub' && item.entityId) rememberWorkHubItem(item.entityId);
  const target = item.target || (item.route ? `#/${item.route}` : '#/dashboard');
  if (window.location.hash === target) window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
  else window.location.hash = target;
}
