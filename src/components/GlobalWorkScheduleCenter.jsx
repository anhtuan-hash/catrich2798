import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import readXlsxFile from 'read-excel-file/browser';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { emitAutomationEvent } from '../utils/automationEngine.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';
import { isLeader, uid } from '../pages/v1093/shared.js';
import { isAdminRole } from '../utils/roles.js';
import {
  scheduleWeekWindow, moveScheduleWeek, eligibleScheduleWeekRows,
  deletionPreviewIsCurrent, scheduleDeleteBatches, isImportedScheduleItem,
  LEGACY_SCHEDULE_SOURCE,
} from '../utils/scheduleWeekBulkDelete.mjs';
import { detectScheduleEvent } from '../utils/scheduleEventDetection.mjs';
import { createDraftsForScheduleItems } from '../features/events/services/scheduleEventDrafts.js';
import {
  WORK_SCHEDULE_ITEM_TYPE,
  WORK_SCHEDULE_SOURCE,
  formatScheduleDateTime,
  makeScheduleTemplateCsv,
  parseDelimitedText,
  scheduleFingerprint,
  scheduleItemToEvent,
  scheduleRowsFromGrid,
  toLocalDateTimeInput,
} from '../utils/workScheduleImport.js';
import './GlobalWorkScheduleCenter.css';

const SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';

const deleteI18n = {
  vi: {
    button: 'Xóa theo tuần', title: 'Xóa nhanh lịch theo tuần', heading: 'CHỌN TUẦN CẦN XÓA',
    warning: 'Hành động này xóa vĩnh viễn công việc trong lịch chung của tuần đã chọn, không thể hoàn tác. Sự kiện đã tạo trong Quản lý sự kiện vẫn được giữ nguyên.',
    manual: 'Bao gồm mục thêm thủ công (mặc định chỉ xóa mục đã tải từ kế hoạch)',
    selected: 'Mục được chọn', eligible: 'Mục trong tuần', imported: 'Từ file', linked: 'Có bản nháp sự kiện',
    none: 'Tuần này không có công việc thuộc phạm vi xóa.', all: 'Chọn tất cả', clear: 'Bỏ chọn',
    key: 'Nhập XOA để xác nhận', placeholder: 'Nhập XOA', cancel: 'Đóng',
    deleting: 'Đang xóa…', submit: 'Xóa {n} công việc', confirm: 'Chọn công việc, sau đó nhập XOA để xác nhận.',
    loading: 'Đang đọc dữ liệu mới nhất từ Supabase…', navPrev: 'Tuần trước', navNext: 'Tuần sau',
    noSession: 'Cần kết nối Supabase và đăng nhập để xóa công việc.',
    changed: 'Danh sách công việc đã thay đổi trên máy chủ. Hãy đóng và mở lại để kiểm tra trước khi xóa.',
    success: 'Đã xóa {n} công việc của tuần {week}; các tuần khác không bị ảnh hưởng.',
    partial: 'Đã xóa {n} mục, nhưng một số mục chưa xóa được. Vui lòng kiểm tra lại.',
    tooMany: 'Tuần có quá nhiều mục; vui lòng liên hệ quản trị viên để rà soát trước khi xóa.',
  },
  en: {
    button: 'Delete by week', title: 'Quick weekly schedule cleanup', heading: 'SELECT A WEEK TO DELETE',
    warning: 'This permanently deletes selected items from the shared weekly schedule and cannot be undone. Events already created in Event Manager are left untouched.',
    manual: 'Include manually added items (default: uploaded work-plan items only)',
    selected: 'Selected', eligible: 'This week', imported: 'Uploaded', linked: 'Linked event draft',
    none: 'No eligible schedule items in this week.', all: 'Select all', clear: 'Clear selection',
    key: 'Type XOA to confirm', placeholder: 'Type XOA', cancel: 'Close',
    deleting: 'Deleting…', submit: 'Delete {n} items', confirm: 'Select items and type XOA to confirm.',
    loading: 'Loading current records from Supabase…', navPrev: 'Previous week', navNext: 'Next week',
    noSession: 'An authenticated Supabase connection is required.',
    changed: 'Schedule items changed on the server. Close and reopen the review to confirm the latest data.',
    success: 'Deleted {n} items in week {week}. Other weeks were not changed.',
    partial: 'Deleted {n} items, but some could not be removed. Review the remaining items.',
    tooMany: 'This week contains too many records for safe bulk removal. Ask an administrator to review.',
  },
};
function labelForWeek(key) {
  if (!key) return '';
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}
async function loadScheduleWeekFromServer(client, window) {
  const list = [];
  const pageSize = 500;
  // Include correctly typed schedules AND legacy imported schedules written
  // as item_type='task'. A metadata flag alone never qualifies normal tasks.
  for (const itemType of [WORK_SCHEDULE_ITEM_TYPE, 'task']) {
    let complete = false;
    for (let offset = 0; offset < 4000; offset += pageSize) {
      let query = client.from('work_hub_items')
        .select('id,title,item_type,source_module,due_at,metadata,created_at')
        .eq('item_type', itemType)
        .gte('due_at', window.startAt).lt('due_at', window.endAt);
      if (itemType === 'task') {
        query = query.eq('source_module', LEGACY_SCHEDULE_SOURCE)
          .contains('metadata', { schedule_event: true });
      }
      const { data, error } = await query
        .order('due_at', { ascending: true }).order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      list.push(...(data || []));
      if ((data || []).length < pageSize) { complete = true; break; }
    }
    if (!complete) throw new Error(deleteI18n.vi.tooMany);
  }
  return eligibleScheduleWeekRows(list, window, true);
}
// An import that completed its SQL insert but stalled on posters may have
// committed the whole file already. Check current Supabase rows, not merely
// the 15-minute in-memory calendar cache, before offering to reimport.
async function fetchServerScheduleFingerprints(client, parsedRows) {
  if (!client) throw new Error('Cần kết nối Supabase trước khi nhập lịch.');
  const dates = parsedRows.map((row) => new Date(row.startAt).getTime()).filter(Number.isFinite);
  if (!dates.length) return new Set();
  const start = new Date(Math.min(...dates) - 86400000).toISOString();
  const end = new Date(Math.max(...dates) + 86400000).toISOString();
  const fingerprints = new Set();
  for (let index = 0; index < 5000; index += 500) {
    const { data, error } = await client.from('work_hub_items')
      .select('metadata')
      .eq('item_type', WORK_SCHEDULE_ITEM_TYPE)
      .gte('due_at', start).lte('due_at', end)
      .order('due_at', { ascending: true })
      .range(index, index + 499);
    if (error) throw new Error('Không xác minh được hoạt động đã lưu: ' + error.message);
    for (const item of data || []) {
      if (item?.metadata?.schedule_fingerprint)
        fingerprints.add(item.metadata.schedule_fingerprint);
    }
    if ((data || []).length < 500) return fingerprints;
  }
  throw new Error('Quá nhiều hoạt động trong khoảng thời gian đã chọn; không thể xác minh trùng an toàn.');
}

const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const SCHEDULE_SYNC_KEY = 'bes-system-work-schedule-sync-v1';
const SCHEDULE_CACHE_MAX_AGE = 15 * 60 * 1000;
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;
const MAX_EVENTS = 600;
const SCHEDULE_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,source_module,metadata,created_at,updated_at';
const PROFILE_CACHE_KEY = 'bes-work-schedule-profile-cache-v1';
const PROFILE_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
const EXCLUDED_PROFILE_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest']);
const PRIORITY_LABEL = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn' };

const TIMELINE_CATEGORIES = [
  ['all', 'Tất cả', '#2f7df4'],
  ['meeting', 'Họp', '#2f7df4'],
  ['training', 'Đào tạo', '#1cab78'],
  ['student', 'Học sinh', '#ef8b4a'],
  ['deadline', 'Hạn nộp', '#8359e8'],
  ['other', 'Khác', '#92a7bc'],
];

function normalizeTimelineText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

function scheduleCategoryForEvent(event) {
  const text = normalizeTimelineText(
    `${event?.title || ''} ${event?.description || ''} ${event?.note || ''} ${event?.ownerText || ''}`,
  );
  if (/\b(hop|hoi nghi|du hop|trien khai)\b/.test(text)) return 'meeting';
  if (/tap huan|thao giang|dao tao|chuyen de|boi duong/.test(text)) return 'training';
  if (/hoc sinh|lop truong|khen thuong|\bhs\b/.test(text)) return 'student';
  if (/han nop|nop bai|nop bao cao|hoan tat|deadline|bao cao/.test(text)) return 'deadline';
  return 'other';
}

function timelineCategoryGlyph(category) {
  if (category === 'meeting') return '●●';
  if (category === 'training') return '◆';
  if (category === 'student') return '●';
  if (category === 'deadline') return '▣';
  return '✦';
}

function formatTimelineDay(value, language) {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }).format(value);
}

function timelineWeekday(value, language) {
  const labelsVi = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  if (language === 'vi') return labelsVi[value.getDay()] || '';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(value);
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function profileId(profile) {
  return profile?.id || profile?.user_id || profile?.profile_id || '';
}

function isScheduleItem(item) {
  return item?.item_type === WORK_SCHEDULE_ITEM_TYPE || item?.metadata?.schedule_event === true;
}

function readCachedSchedule() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SCHEDULE_CACHE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedSchedule(items) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(items)); } catch { /* optional cache */ }
}


function readScheduleSyncStamp() {
  if (typeof window === 'undefined') return 0;
  try { return Number(window.localStorage.getItem(SCHEDULE_SYNC_KEY) || 0); } catch { return 0; }
}

function writeScheduleSyncStamp(value = Date.now()) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SCHEDULE_SYNC_KEY, String(Number(value) || Date.now())); } catch { /* optional cache */ }
}

function hasFreshProfileCache() {
  if (typeof window === 'undefined') return false;
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
    return Boolean(value && Date.now() - Number(value.storedAt || 0) <= PROFILE_CACHE_MAX_AGE);
  } catch {
    return false;
  }
}


function sortScheduleItems(items = []) {
  return [...items].sort((left, right) => new Date(left?.due_at || 0) - new Date(right?.due_at || 0));
}

function mergeScheduleItems(current = [], incoming = []) {
  const map = new Map(current.filter((item) => item?.id).map((item) => [item.id, item]));
  incoming.filter((item) => item?.id && isScheduleItem(item)).forEach((item) => {
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  });
  return sortScheduleItems([...map.values()]);
}

function readCachedProfiles() {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
    if (!value || Date.now() - Number(value.storedAt || 0) > PROFILE_CACHE_MAX_AGE) return [];
    return Array.isArray(value.items) ? value.items : [];
  } catch {
    return [];
  }
}

function writeCachedProfiles(items) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ storedAt: Date.now(), items })); } catch { /* optional cache */ }
}

function parseHashState() {
  if (typeof window === 'undefined') return { route: '', view: 'tasks', eventId: '' };
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [route = '', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  return {
    route,
    view: params.get('view') === 'schedule' ? 'schedule' : 'tasks',
    eventId: params.get('event') || '',
  };
}

function replaceWorkHubHash(view) {
  if (typeof window === 'undefined') return;
  const next = view === 'schedule' ? '#/work-hub?view=schedule' : '#/work-hub';
  window.history.replaceState(null, '', next);
}

function downloadTextFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function startOfMonth(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(value, amount) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const mondayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayIndex);
  return date;
}

function addWeeks(value, amount) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + amount * 7);
  return date;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + amount);
  return date;
}

function formatDailyHeading(value, language) {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const weekday = language === 'vi'
    ? timelineWeekday(value, language)
    : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(value);
  const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
  return `${weekday}  •  ${date}`;
}

function weekCells(cursor) {
  const monday = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatWeekRange(value, language) {
  const monday = startOfWeek(value);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const startLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(monday);
  const endLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(sunday);
  return language === 'vi' ? 'Tuần ' + startLabel + ' – ' + endLabel : startLabel + ' – ' + endLabel;
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthCells(cursor) {
  const first = startOfMonth(cursor);
  const mondayIndex = (first.getDay() + 6) % 7;
  const firstCell = new Date(first);
  firstCell.setDate(first.getDate() - mondayIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
}

function formatMonth(value, language) {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'long', year: 'numeric',
  }).format(value);
}

function formatTime(value, language) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function scheduleChip(startAt, language) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return '';
  const today = dayKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dayKey(start) === today) return language === 'vi' ? 'Hôm nay' : 'Today';
  if (dayKey(start) === dayKey(tomorrowDate)) return language === 'vi' ? 'Ngày mai' : 'Tomorrow';
  return language === 'vi' ? 'Sắp tới' : 'Upcoming';
}

function defaultEditor(event = null) {
  const start = event?.startAt ? new Date(event.startAt) : new Date(Date.now() + 60 * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = event?.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60000);
  return {
    id: event?.id || '',
    title: event?.title || '',
    description: event?.description || '',
    startAt: toLocalDateTimeInput(start),
    endAt: toLocalDateTimeInput(end),
    location: event?.location || '',
    ownerText: event?.ownerText || '',
    attendees: event?.attendees || '',
    note: event?.note || '',
    priority: event?.priority || 'normal',
    visibility: event?.visibility || 'department',
  };
}

function eventPayload(event, currentUser, assigneeIds, existingMetadata = {}) {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60000);
  const normalizedEnd = Number.isNaN(end.getTime()) || end <= start
    ? new Date(start.getTime() + 60 * 60000)
    : end;
  const fingerprint = scheduleFingerprint({ ...event, startAt: start.toISOString() });
  return {
    title: event.title.trim(),
    description: event.description.trim(),
    item_type: WORK_SCHEDULE_ITEM_TYPE,
    status: 'assigned',
    priority: event.priority || 'normal',
    visibility: event.visibility || 'department',
    owner_id: currentUser.id,
    created_by: currentUser.id,
    assignee_ids: assigneeIds,
    watcher_ids: [],
    due_at: start.toISOString(),
    source_module: WORK_SCHEDULE_SOURCE,
    metadata: {
      ...existingMetadata,
      schedule_event: true,
      schedule_start_at: start.toISOString(),
      schedule_end_at: normalizedEnd.toISOString(),
      schedule_location: event.location?.trim() || '',
      schedule_owner_text: event.ownerText?.trim() || '',
      schedule_attendees: event.attendees?.trim() || '',
      schedule_note: event.note?.trim() || '',
      schedule_fingerprint: fingerprint,
      schedule_notify_all: true,
      notify_assignee: false,
      connected_modules: ['ttcm', 'dashboard', 'automation'],
    },
  };
}

function dispatchScheduleNotifications(events, language) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const horizon = now + 72 * 60 * 60 * 1000;
  const upcoming = events.filter((event) => {
    const start = new Date(event.startAt).getTime();
    return Number.isFinite(start) && start >= now - 2 * 60 * 60 * 1000 && start <= horizon;
  });

  window.setTimeout(() => {
    upcoming.forEach((event) => {
      const location = event.location ? ` · ${event.location}` : '';
      window.dispatchEvent(new CustomEvent('bes-global-notification', {
        detail: {
          id: `work-schedule:${event.id}:${dayKey(event.startAt)}`,
          title: event.title,
          message: `${formatScheduleDateTime(event.startAt, language === 'vi' ? 'vi-VN' : 'en-US')}${location}`,
          target: '#/dashboard',
          createdAt: event.updatedAt || event.createdAt || event.startAt,
          read: false,
          category: 'schedule',
          priority: event.priority,
          status: 'upcoming',
          chip: scheduleChip(event.startAt, language),
          source: 'work-schedule',
        },
      }));
    });
  }, 0);
}

export default function GlobalWorkScheduleCenter({
  currentUser,
  language = 'vi',
  route = '',
  embedded = false,
  mountSelector = '',
}) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const fileInputRef = useRef(null);
  const loadPromiseRef = useRef(null);
  const [hashState, setHashState] = useState(parseHashState);
  const [mountNode, setMountNode] = useState(null);
  const [hubNode, setHubNode] = useState(null);
  const [view, setView] = useState(() => embedded ? 'schedule' : hashState.view);
  const [items, setItems] = useState(readCachedSchedule);
  const [profiles, setProfiles] = useState(readCachedProfiles);
  const [calendarMode, setCalendarMode] = useState(() => embedded ? 'week' : 'month');
  const [cursor, setCursor] = useState(() => embedded ? startOfWeek(new Date()) : startOfMonth(new Date()));
  const [dailyCursor, setDailyCursor] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(() => embedded ? 'all' : 'upcoming');
  const [timelineCategory, setTimelineCategory] = useState('all');
  const [expandedTimelineDays, setExpandedTimelineDays] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(hashState.eventId);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importStage, setImportStage] = useState('');
  const [eventDraftProgress, setEventDraftProgress] = useState(null);
  const [autoDetectEvents, setAutoDetectEvents] = useState(true);
  const [candidateSelection, setCandidateSelection] = useState(() => new Set());
  const [deleteWeekOpen, setDeleteWeekOpen] = useState(false);
  const [deleteWeekAnchor, setDeleteWeekAnchor] = useState('');
  const [deleteWeekItems, setDeleteWeekItems] = useState([]);
  const [deleteWeekSelected, setDeleteWeekSelected] = useState(() => new Set());
  const [deleteWeekIncludeManual, setDeleteWeekIncludeManual] = useState(false);
  const [deleteWeekConfirm, setDeleteWeekConfirm] = useState('');
  const [deleteWeekLoading, setDeleteWeekLoading] = useState(false);
  const [deleteWeekError, setDeleteWeekError] = useState('');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const routeActive = embedded || route === 'work-hub' || hashState.route === 'work-hub';

  useEffect(() => {
    const onHashChange = () => setHashState(parseHashState());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!routeActive) return;
    if (embedded) {
      setView('schedule');
      return;
    }
    setView(hashState.view);
    if (hashState.eventId) setSelectedId(hashState.eventId);
  }, [embedded, hashState.eventId, hashState.view, routeActive]);

  useEffect(() => {
    if (!routeActive || typeof document === 'undefined') {
      setMountNode(null);
      setHubNode(null);
      return undefined;
    }

    let inserted = null;
    const attach = () => {
      const hub = embedded && mountSelector
        ? document.querySelector(mountSelector)
        : document.querySelector('.v1093-work-hub');
      if (!hub) return;
      let node = hub.querySelector(':scope > [data-work-schedule-mount="true"]');
      if (!node) {
        node = document.createElement('div');
        node.dataset.workScheduleMount = 'true';
        node.className = 'work-schedule-mount';
        const hero = embedded ? null : hub.querySelector(':scope > .v1093-hero');
        if (hero?.nextSibling) hub.insertBefore(node, hero.nextSibling);
        else hub.appendChild(node);
        inserted = node;
      }
      setHubNode((current) => (current === hub ? current : hub));
      setMountNode((current) => (current === node ? current : node));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      hubNode?.classList.remove('work-schedule-view-active');
      if (inserted?.isConnected) inserted.remove();
    };
  }, [embedded, mountSelector, routeActive]);

  useEffect(() => {
    if (!hubNode) return undefined;
    hubNode.classList.toggle('work-schedule-view-active', view === 'schedule');
    return () => hubNode.classList.remove('work-schedule-view-active');
  }, [hubNode, view]);

  const load = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!currentUser) return;
    if (!client || !runtime.ready || !runtime.session) {
      setItems(readCachedSchedule());
      return;
    }
    if (!force && readScheduleSyncStamp() && Date.now() - readScheduleSyncStamp() < SCHEDULE_CACHE_MAX_AGE) {
      setItems(readCachedSchedule());
      return;
    }
    if (loadPromiseRef.current) return loadPromiseRef.current;
    if (!silent) setError('');

    const task = (async () => {
      let result = await client
        .from('work_hub_items')
        .select(SCHEDULE_COLUMNS)
        .eq('item_type', WORK_SCHEDULE_ITEM_TYPE)
        .order('due_at', { ascending: true })
        .limit(MAX_EVENTS);

      if (result.error) {
        result = await client
          .from('work_hub_items')
          .select(SCHEDULE_COLUMNS)
          .order('due_at', { ascending: true })
          .limit(MAX_EVENTS);
      }

      if (result.error) {
        if (!silent) setError(result.error.message || 'Không thể tải lịch làm việc.');
        setItems(readCachedSchedule());
        return;
      }

      const scheduleItems = sortScheduleItems((result.data || []).filter(isScheduleItem));
      setItems(scheduleItems);
      writeCachedSchedule(scheduleItems);
      writeScheduleSyncStamp();
    })();

    loadPromiseRef.current = task;
    try { return await task; }
    finally { loadPromiseRef.current = null; }
  }, [client, currentUser, runtime.ready, runtime.session]);

  const loadProfiles = useCallback(async () => {
    if (!leader || !client || !runtime.ready || !runtime.session || hasFreshProfileCache()) return;
    const attempts = ['id,role', 'user_id,role', 'profile_id,role'];
    for (const columns of attempts) {
      const { data, error: profileError } = await client.from('profiles').select(columns).limit(500);
      if (!profileError) {
        const profileRows = (data || []).filter((profile) => profileId(profile));
        setProfiles(profileRows);
        writeCachedProfiles(profileRows);
        return;
      }
      if (!/column .* does not exist|42703/i.test(profileError.message || '')) return;
    }
  }, [client, leader, runtime.ready, runtime.session]);

  const deleteWeekWindow = useMemo(
    () => deleteWeekAnchor ? scheduleWeekWindow(deleteWeekAnchor) : null,
    [deleteWeekAnchor],
  );
  const deleteWeekCandidates = useMemo(
    () => eligibleScheduleWeekRows(deleteWeekItems, deleteWeekWindow, deleteWeekIncludeManual),
    [deleteWeekItems, deleteWeekWindow, deleteWeekIncludeManual],
  );
  const deleteWeekTargets = useMemo(
    () => deleteWeekCandidates.filter((item) => deleteWeekSelected.has(item.id)),
    [deleteWeekCandidates, deleteWeekSelected],
  );

  // Always preview a fresh week-scoped server read; never use a potentially stale
  // cached calendar page or its 600-entry cap to authorize deletion.
  useEffect(() => {
    if (!deleteWeekOpen || !deleteWeekWindow) return undefined;
    let active = true;
    setDeleteWeekLoading(true);
    setDeleteWeekError('');
    setDeleteWeekItems([]);
    setDeleteWeekSelected(new Set());
    setDeleteWeekConfirm('');
    (async () => {
      try {
        if (!client || !runtime.ready || !runtime.session) throw new Error(deleteI18n[language === 'en' ? 'en' : 'vi'].noSession);
        const rows = await loadScheduleWeekFromServer(client, deleteWeekWindow);
        if (!active) return;
        setDeleteWeekItems(rows);
        setDeleteWeekSelected(new Set(eligibleScheduleWeekRows(rows, deleteWeekWindow, deleteWeekIncludeManual).map((row) => row.id)));
      } catch (loadError) {
        if (active) setDeleteWeekError(loadError.message || 'Could not read this week.');
      } finally {
        if (active) setDeleteWeekLoading(false);
      }
    })();
    return () => { active = false; };
    // Scope changes are controlled by week navigation; manual inclusion updates selection separately.
  }, [client, runtime.ready, runtime.session, deleteWeekOpen, deleteWeekWindow, language]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  useEffect(() => {
    if (!currentUser?.id || !runtime.ready || !runtime.session) return () => {};
    const unsubscribe = subscribeTable({
      key: `global-work-schedule-${currentUser.id}`,
      table: 'work_hub_items',
      filter: `item_type=eq.${WORK_SCHEDULE_ITEM_TYPE}`,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
        if (!row?.id) { load({ silent: true, force: true }); return; }
        setItems((current) => {
          const next = payload?.eventType === 'DELETE' || !isScheduleItem(row)
            ? current.filter((item) => item.id !== row.id)
            : mergeScheduleItems(current, [row]);
          writeCachedSchedule(next);
          writeScheduleSyncStamp();
          return next;
        });
      },
    });
    const refresh = (event) => {
      if (event?.detail?.localApplied) return;
      window.setTimeout(() => load({ silent: true, force: true }), 80);
    };
    window.addEventListener(SCHEDULE_UPDATE_EVENT, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(SCHEDULE_UPDATE_EVENT, refresh);
    };
  }, [currentUser?.id, load, runtime.ready, runtime.session]);

  const events = useMemo(
    () => items.map(scheduleItemToEvent).filter((event) => event.id && event.startAt),
    [items],
  );

  useEffect(() => {
    if (currentUser?.id && events.length) dispatchScheduleNotifications(events, language);
  }, [currentUser?.id, events, language]);

  const assigneeIds = useMemo(() => {
    const ids = profiles
      .filter((profile) => !EXCLUDED_PROFILE_ROLES.has(normalizeRole(profile.role)))
      .map(profileId)
      .filter(Boolean);
    if (currentUser?.id) ids.push(currentUser.id);
    return [...new Set(ids.map(String))];
  }, [currentUser?.id, profiles]);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = Date.now();
    return events
      .filter((event) => {
        const start = new Date(event.startAt).getTime();
        if (scope === 'upcoming' && start < now - 2 * 60 * 60 * 1000) return false;
        if (scope === 'past' && start >= now - 2 * 60 * 60 * 1000) return false;
        if (!needle) return true;
        return `${event.title} ${event.description} ${event.location} ${event.ownerText} ${event.attendees}`
          .toLowerCase().includes(needle);
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [events, query, scope]);

  const cells = useMemo(() => calendarMode === 'week' ? weekCells(cursor) : monthCells(cursor), [calendarMode, cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const key = dayKey(event.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [filteredEvents]);

  const timelineEvents = useMemo(
    () => filteredEvents.filter((event) => timelineCategory === 'all' || scheduleCategoryForEvent(event) === timelineCategory),
    [filteredEvents, timelineCategory],
  );
  const timelineEventsByDay = useMemo(() => {
    const map = new Map();
    timelineEvents.forEach((event) => {
      const key = dayKey(event.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [timelineEvents]);

  const dailyKey = dayKey(dailyCursor);
  const dailyAllEvents = useMemo(
    () => filteredEvents.filter((event) => dayKey(event.startAt) === dailyKey),
    [dailyKey, filteredEvents],
  );
  const dailyEvents = useMemo(
    () => dailyAllEvents.filter((event) => timelineCategory === 'all' || scheduleCategoryForEvent(event) === timelineCategory),
    [dailyAllEvents, timelineCategory],
  );
  const dailyCategoryCounts = useMemo(() => {
    const counts = { meeting: 0, training: 0, student: 0, deadline: 0, other: 0 };
    dailyAllEvents.forEach((event) => {
      const category = scheduleCategoryForEvent(event);
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [dailyAllEvents]);
  const dailyNextEvents = useMemo(() => {
    const selectedIsToday = dailyKey === dayKey(new Date());
    const now = Date.now();
    const future = dailyAllEvents.filter((event) => !selectedIsToday || new Date(event.startAt).getTime() >= now);
    return (future.length ? future : dailyAllEvents).slice(0, 2);
  }, [dailyAllEvents, dailyKey]);

  const selectedEvent = events.find((event) => event.id === selectedId) || null;
  const existingFingerprints = useMemo(() => new Set(events.map((event) => event.fingerprint).filter(Boolean)), [events]);

  const metrics = useMemo(() => {
    const today = dayKey(new Date());
    const sevenDays = Date.now() + 7 * 86400000;
    return {
      today: events.filter((event) => dayKey(event.startAt) === today).length,
      nextSeven: events.filter((event) => {
        const start = new Date(event.startAt).getTime();
        return start >= Date.now() - 2 * 60 * 60 * 1000 && start <= sevenDays;
      }).length,
      month: events.filter((event) => {
        const start = new Date(event.startAt);
        return start.getFullYear() === cursor.getFullYear() && start.getMonth() === cursor.getMonth();
      }).length,
      imported: new Set(events.map((event) => event.importId).filter(Boolean)).size,
    };
  }, [cursor, events]);

  function switchView(nextView) {
    if (embedded) {
      setView('schedule');
      return;
    }
    setView(nextView);
    replaceWorkHubHash(nextView);
    if (nextView === 'schedule') setHashState((current) => ({ ...current, route: 'work-hub', view: 'schedule' }));
  }

  async function readImportFile(file) {
    if (!file) return;
    setError('');
    setNotice('');
    if (file.size > MAX_IMPORT_SIZE) {
      setError('File lịch vượt quá 10 MB.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(extension)) {
      setError('Hiện hệ thống nhận file Excel .xlsx hoặc .csv theo mẫu.');
      return;
    }

    setBusy(true);
    try {
      const grid = extension === 'csv'
        ? parseDelimitedText(await file.text())
        : await readXlsxFile(file);
      const parsed = scheduleRowsFromGrid(grid, { fileName: file.name });
      if (!parsed.ok) throw new Error(parsed.message);
      if (!client || !runtime.ready || !runtime.session)
        throw new Error('Cần kết nối Supabase để kiểm tra trùng trước khi nhập lịch.');
      const serverFingerprints = await fetchServerScheduleFingerprints(client, parsed.validRows);
      const rows = parsed.validRows.map((row) => ({
        ...row,
        duplicate: serverFingerprints.has(row.fingerprint),
      }));
      setCandidateSelection(new Set(rows.filter((row) => !row.duplicate && detectScheduleEvent(row)).map((row) => row.fingerprint)));
      setAutoDetectEvents(true);
      setImportPreview({ ...parsed, fileName: file.name, rows });
      setImportOpen(true);
    } catch (fileError) {
      setImportPreview(null);
      setError(fileError.message || 'Không thể đọc file lịch.');
    } finally {
      setBusy(false);
    }
  }

  async function importSchedule() {
    if (!leader || !importPreview || busy) return;
    if (!client || !runtime.ready || !runtime.session) {
      setError('Cần kết nối Supabase để đồng bộ lịch với toàn hệ thống.');
      return;
    }
    const rows = importPreview.rows.filter((row) => !row.duplicate);
    if (!rows.length) {
      setError('Không còn dòng hợp lệ mới để nhập.');
      return;
    }
    setBusy(true);
    setImportStage('Đang lưu lịch chung…');
    setError('');
    setNotice('');
    const importId = uid('schedule-import');
    const recipients = assigneeIds.length ? assigneeIds : [currentUser.id];
    const payloads = rows.map((row) => {
      const payload = eventPayload(row, currentUser, recipients);
      return {
        ...payload,
        metadata: {
          ...payload.metadata,
          schedule_import_id: importId,
          schedule_source_file: importPreview.fileName,
          schedule_source_row: row.sourceRow,
          schedule_has_explicit_time: row.timeKnown === true,
          schedule_has_explicit_end_time: row.endTimeKnown === true,
          ...(autoDetectEvents && candidateSelection.has(row.fingerprint) && detectScheduleEvent(row)
            ? { schedule_event_detection: detectScheduleEvent(row) }
            : {}),
          schedule_imported_at: new Date().toISOString(),
        },
      };
    });
    const created = [];
    try {
      for (let index = 0; index < payloads.length; index += 50) {
        setImportStage((language === 'en' ? 'Saving ' : 'Đang lưu ') +
          Math.min(index + 50, payloads.length) + '/' + payloads.length +
          (language === 'en' ? ' activities…' : ' hoạt động…'));
        const { data, error: insertError } = await client.from('work_hub_items')
          .insert(payloads.slice(index, index + 50)).select(SCHEDULE_COLUMNS);
        if (insertError) throw insertError;
        created.push(...(data || []));
      }
    } catch (importError) {
      if (created.length) {
        setItems((current) => {
          const next = mergeScheduleItems(current, created);
          writeCachedSchedule(next);
          writeScheduleSyncStamp();
          return next;
        });
        window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, {
          detail: { importId, count: created.length, localApplied: true },
        }));
      }
      const partial = created.length
        ? ' Đã xác nhận lưu ' + created.length + '/' + payloads.length +
          ' hoạt động; hãy kiểm tra lịch trước khi nhập lại.'
        : ' Hãy kiểm tra lịch trước khi tải lại file để tránh tạo trùng.';
      setError((importError.message || 'Không thể nhập lịch làm việc.') + partial);
      setImportStage('');
      setBusy(false);
      return;
    }

    // Primary operation ends here. Do NOT await poster generation, draft
    // creation, audit logs or automation before confirming the import.
    setItems((current) => {
      const next = mergeScheduleItems(current, created);
      writeCachedSchedule(next);
      writeScheduleSyncStamp();
      return next;
    });
    window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, {
      detail: { importId, count: created.length, localApplied: true },
    }));
    window.dispatchEvent(new CustomEvent('bes-global-notification', {
      detail: {
        id: 'work-schedule-import:' + importId,
        title: 'Lịch làm việc đã được cập nhật',
        message: created.length + ' hoạt động mới từ file ' + importPreview.fileName,
        target: '#/dashboard', createdAt: new Date().toISOString(),
        read: false, category: 'schedule', status: 'imported',
        chip: 'Lịch chung', source: 'work-schedule-import',
      },
    }));
    const suggestionCount = created.filter((item) => item.metadata?.schedule_event_detection).length;
    const sourceFile = importPreview.fileName;
    const duplicated = importPreview.rows.filter((row) => row.duplicate).length;
    const invalid = importPreview.invalidRows.length;
    setImportPreview(null);
    setImportOpen(false);
    setImportStage('');
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNotice(language === 'en'
      ? 'Saved ' + created.length + ' activities. ' + suggestionCount +
        ' event candidates detected; drafts and posters are processed separately.'
      : 'Đã lưu ' + created.length + ' hoạt động vào lịch chung. Nhận diện ' +
        suggestionCount + ' ứng viên; bản nháp/poster được xử lý riêng.');

    // Supplementary calls cannot turn a successful save into an import error.
    void Promise.allSettled([
      recordAuditEvent({
        action: 'schedule.file_imported', entity_type: 'work_schedule_import',
        entity_id: importId, source_module: 'work-schedule',
        after_data: {
          file_name: sourceFile, imported_count: created.length,
          skipped_duplicates: duplicated, invalid_count: invalid,
          detected_count: suggestionCount, item_ids: created.map((item) => item.id),
        },
      }, currentUser),
      emitAutomationEvent('schedule_imported', {
        source: 'work-schedule', import_id: importId, count: created.length,
        summary: 'Đã nhập ' + created.length + ' mục vào lịch làm việc dùng chung.',
      }, currentUser),
    ]).then((outcomes) => {
      if (outcomes.some((outcome) => outcome.status === 'rejected'))
        console.warn('[Brian Schedule] Supplementary import actions did not all complete:', outcomes);
    }).catch((error) => console.warn('[Brian Schedule] Follow-up failure:', error));

    if (isAdminRole(currentUser?.role) && autoDetectEvents && suggestionCount) {
      const candidates = created.filter((item) =>
        item.metadata?.schedule_event_detection?.approvalStatus === 'pending');
      setEventDraftProgress({ total: candidates.length, completed: 0, created: 0, failed: 0, state: 'running' });
      // Browser-tab best effort only. Unfinished candidates stay pending for
      // explicit retry from Event Manager; no fake durable worker claim.
      void createDraftsForScheduleItems(candidates, {
        onProgress: (progress) => setEventDraftProgress({ ...progress, state: 'running' }),
      }).then((result) => {
        setEventDraftProgress({
          total: candidates.length, completed: candidates.length,
          created: result.created, failed: result.errors.length, state: 'done',
        });
        if (result.errors.length)
          setError('Lịch đã lưu. Một số bản nháp/poster chưa hoàn tất: ' +
            result.errors.slice(0, 2).join(' | ') +
            '. Có thể kiểm tra và xử lý lại trong Quản lý sự kiện.');
      }).catch((error) => {
        setEventDraftProgress({total:candidates.length,completed:0,created:0,failed:1,state:'error'});
        setError('Lịch đã lưu. Việc tạo bản nháp/poster gặp lỗi: ' +
          (error.message || 'Không xác định') + '. Hãy kiểm tra trong Quản lý sự kiện.');
      });
    }
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!leader || !editor) return;
    if (!editor.title.trim() || !editor.startAt) {
      setError('Vui lòng nhập nội dung và thời gian bắt đầu.');
      return;
    }
    if (!client || !runtime.ready || !runtime.session) {
      setError('Cần kết nối Supabase để đồng bộ lịch với toàn hệ thống.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const recipients = assigneeIds.length ? assigneeIds : [currentUser.id];
      const existing = editor.id ? events.find((entry) => entry.id === editor.id) : null;
      const payload = eventPayload(editor, currentUser, recipients, existing?.raw?.metadata || {});
      // A manual edit of the datetime input is explicit, unlike the importer's calendar fallback.
      if (existing?.raw?.metadata?.schedule_event_detection) {
        payload.metadata.schedule_has_explicit_time = true;
        payload.metadata.schedule_has_explicit_end_time = Boolean(editor.endAt);
        payload.metadata.schedule_event_detection = {
          ...existing.raw.metadata.schedule_event_detection,
          timeKnown: true,
          needsTimeReview: false,
        };
      }
      let saved;
      if (editor.id) {
        const { data, error: updateError } = await client
          .from('work_hub_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editor.id)
          .select(SCHEDULE_COLUMNS)
          .single();
        if (updateError) throw updateError;
        saved = data;
      } else {
        const { data, error: insertError } = await client
          .from('work_hub_items')
          .insert({
            ...payload,
            metadata: {
              ...payload.metadata,
              schedule_manual: true,
              schedule_created_at: new Date().toISOString(),
            },
          })
          .select(SCHEDULE_COLUMNS)
          .single();
        if (insertError) throw insertError;
        saved = data;
      }

      await recordAuditEvent({
        action: editor.id ? 'schedule.updated' : 'schedule.created',
        entity_type: 'work_hub_item',
        entity_id: saved.id,
        source_module: 'work-schedule',
        after_data: saved,
      }, currentUser);
      setItems((current) => {
        const next = mergeScheduleItems(current, [saved]);
        writeCachedSchedule(next);
        writeScheduleSyncStamp();
        return next;
      });
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: { itemId: saved.id, localApplied: true } }));
      setEditor(null);
      setSelectedId(saved.id);
      setNotice(editor.id ? 'Đã cập nhật lịch làm việc.' : 'Đã thêm hoạt động vào lịch chung.');
    } catch (saveError) {
      setError(saveError.message || 'Không thể lưu lịch làm việc.');
    } finally {
      setBusy(false);
    }
  }

  function openDeleteWeek() {
    if (!leader || busy) return;
    const now = new Date();
    const anchor = embedded ? dailyCursor
      : calendarMode === 'week' ? cursor
        : cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth() ? now : cursor;
    setDeleteWeekIncludeManual(false);
    setDeleteWeekItems([]);
    setDeleteWeekSelected(new Set());
    setDeleteWeekConfirm('');
    setDeleteWeekError('');
    setDeleteWeekAnchor(dayKey(anchor));
    setDeleteWeekOpen(true);
    setError('');
    setNotice('');
  }

  function toggleWeekManual(enabled) {
    setDeleteWeekIncludeManual(enabled);
    setDeleteWeekSelected(new Set(eligibleScheduleWeekRows(deleteWeekItems, deleteWeekWindow, enabled).map((item) => item.id)));
    setDeleteWeekConfirm('');
  }

  async function deleteSelectedWeekItems() {
    if (!leader || !currentUser?.id || !deleteWeekWindow || deleteWeekLoading || busy ||
        deleteWeekConfirm.trim().toUpperCase() !== 'XOA' || !deleteWeekTargets.length) return;
    const txt = deleteI18n[language === 'en' ? 'en' : 'vi'];
    if (!client || !runtime.ready || !runtime.session) { setDeleteWeekError(txt.noSession); return; }
    setBusy(true);
    setDeleteWeekLoading(true);
    setDeleteWeekError('');
    let removed = [];
    let issue = null;
    try {
      const rows = await loadScheduleWeekFromServer(client, deleteWeekWindow);
      const chosen = new Set(deleteWeekTargets.map((item) => item.id));
      const fresh = eligibleScheduleWeekRows(rows, deleteWeekWindow, deleteWeekIncludeManual)
        .filter((item) => chosen.has(item.id));
      if (!deletionPreviewIsCurrent(deleteWeekTargets, fresh)) throw new Error(txt.changed);
      for (const itemType of [WORK_SCHEDULE_ITEM_TYPE, 'task']) {
        const typeTargets = deleteWeekTargets.filter((item) => item.item_type === itemType);
        for (const batch of scheduleDeleteBatches(typeTargets)) {
          let query = client.from('work_hub_items')
            .delete().eq('item_type', itemType)
            .gte('due_at', deleteWeekWindow.startAt).lt('due_at', deleteWeekWindow.endAt)
            .in('id', batch);
          if (itemType === 'task') {
            // Critical: never delete an ordinary task even if its ID was submitted.
            query = query.eq('source_module', LEGACY_SCHEDULE_SOURCE)
              .contains('metadata', { schedule_event: true });
          }
          const { data, error: deletionError } = await query.select('id');
          if (deletionError) throw deletionError;
          const got = (data || []).map((item) => item.id);
          removed.push(...got);
          if (got.length !== batch.length) throw new Error(txt.changed);
        }
      }
      // Event Center is intentionally not touched here, including already
      // published announcements and separately stored event drafts.
    } catch (deleteError) {
      issue = deleteError;
    }
    if (removed.length) {
      const gone = new Set(removed);
      setItems((current) => {
        const next = current.filter((item) => !gone.has(item.id));
        writeCachedSchedule(next);
        writeScheduleSyncStamp();
        return next;
      });
      setDeleteWeekItems((current) => current.filter((item) => !gone.has(item.id)));
      setDeleteWeekSelected((current) => new Set([...current].filter((id) => !gone.has(id))));
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, {
        detail: { deleted: true, itemIds: removed, localApplied: true, week: deleteWeekWindow.monday },
      }));
      try {
        await recordAuditEvent({
          action: 'schedule.week_bulk_deleted',
          entity_type: 'work_schedule_week',
          entity_id: uid('schedule-week-delete'),
          source_module: 'work-schedule',
          before_data: { week_start: deleteWeekWindow.monday, week_end: deleteWeekWindow.sunday,
            deleted_ids: removed, deleted_count: removed.length, include_manual: deleteWeekIncludeManual },
        }, currentUser);
      } catch (auditError) {
        console.warn('[Work schedule] Unable to save the weekly deletion audit', auditError);
      }
    }
    setBusy(false);
    setDeleteWeekLoading(false);
    setDeleteWeekConfirm('');
    if (issue) {
      setDeleteWeekError(removed.length
        ? txt.partial.replace('{n}', String(removed.length)) + ' ' + (issue.message || '')
        : issue.message || txt.changed);
      return;
    }
    setNotice(txt.success.replace('{n}', String(removed.length))
      .replace('{week}', `${labelForWeek(deleteWeekWindow.monday)} – ${labelForWeek(deleteWeekWindow.sunday)}`));
    setDeleteWeekOpen(false);
    await load({ force: true, silent: true });
  }

  async function deleteEvent(target) {
    if (!leader || !target || !client || !runtime.session) return;
    if (!window.confirm(language === 'en' ? `Delete schedule “${target.title}”? This change will be reflected across the system.` : `Xoá lịch “${target.title}”? Hành động này sẽ cập nhật trên toàn hệ thống.`)) return;
    setBusy(true);
    setError('');
    try {
      const { error: deleteError } = await client.from('work_hub_items').delete().eq('id', target.id);
      if (deleteError) throw deleteError;
      await recordAuditEvent({
        action: 'schedule.deleted',
        entity_type: 'work_hub_item',
        entity_id: target.id,
        source_module: 'work-schedule',
        before_data: target.raw,
      }, currentUser);
      setSelectedId('');
      setNotice('Đã xoá lịch và đồng bộ thay đổi trên toàn hệ thống.');
      setItems((current) => {
        const next = current.filter((item) => item.id !== target.id);
        writeCachedSchedule(next);
        writeScheduleSyncStamp();
        return next;
      });
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: { itemId: target.id, deleted: true, localApplied: true } }));
    } catch (deleteError) {
      setError(deleteError.message || 'Không thể xoá lịch làm việc.');
    } finally {
      setBusy(false);
    }
  }

  if (!mountNode || !routeActive) return null;

  const duplicateCount = importPreview?.rows.filter((row) => row.duplicate).length || 0;
  const importableCount = importPreview?.rows.filter((row) => !row.duplicate).length || 0;

  return createPortal(
    <div className="work-schedule-integration">
      {!embedded ? <nav className="work-schedule-tabs" aria-label="Chế độ Trung tâm công việc">
        <button type="button" className={view === 'tasks' ? 'active' : ''} onClick={() => switchView('tasks')}>
          <span>✓</span><b>Công việc</b><small>Giao việc và nộp tệp</small>
        </button>
        <button type="button" className={view === 'schedule' ? 'active' : ''} onClick={() => switchView('schedule')}>
          <span>▦</span><b>Lịch làm việc</b><small>{events.length} hoạt động đã đồng bộ</small>
        </button>
      </nav> : null}

      {view === 'schedule' ? <section className="work-schedule-center" aria-label="Lịch làm việc dùng chung">
        {leader ? <input ref={fileInputRef} hidden type="file" accept=".xlsx,.csv" onChange={(event) => readImportFile(event.target.files?.[0] || null)} /> : null}
        <header className="work-schedule-toolbar">
          <div>
            <span className="work-schedule-eyebrow">SYSTEM-WIDE WORK CALENDAR</span>
            <h2>Lịch làm việc dùng chung</h2>
            <p>Lịch chung của tổ được đồng bộ trực tiếp giữa Kênh TTCM, Dashboard và Automation Center.</p>
          </div>
          <div className="work-schedule-hero-art" aria-hidden="true" />
          <div className="work-schedule-actions">
            {leader ? <>
              <button type="button" className="secondary" onClick={() => downloadTextFile('mau-lich-lam-viec.csv', makeScheduleTemplateCsv())}>⇩ File mẫu</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => fileInputRef.current?.click()}>⇧ Upload lịch</button>
              <button type="button" className="primary" onClick={() => setEditor(defaultEditor())}>＋ Thêm lịch</button>
              <button type="button" className="work-schedule-week-delete-button" disabled={busy} onClick={openDeleteWeek}>🗑 {deleteI18n[language === 'en' ? 'en' : 'vi'].button}</button>
            </> : <span className="work-schedule-readonly">Chế độ xem lịch chung</span>}
          </div>
        </header>

        {error ? <div className="work-schedule-alert error"><b>Không thể xử lý</b><span>{error}</span><button type="button" onClick={() => setError('')}>×</button></div> : null}
        {notice ? <div className="work-schedule-alert success"><span>{notice}</span><button type="button" onClick={() => setNotice('')}>×</button></div> : null}

        {eventDraftProgress ? <div className="work-schedule-import-progress" role="status" aria-live="polite">
          <strong>{language === 'en' ? 'Event drafts & posters' : 'Bản nháp sự kiện & poster'}</strong>
          <span>{eventDraftProgress.state === 'running'
            ? (language === 'en' ? 'Processing ' : 'Đang xử lý ') +
              eventDraftProgress.completed + '/' + eventDraftProgress.total +
              (language === 'en' ? ' candidates. You can use the calendar.' : ' ứng viên. Bạn có thể tiếp tục dùng lịch.')
            : (language === 'en' ? 'Finished: ' : 'Đã xử lý: ') +
              eventDraftProgress.created + (language === 'en' ? ' drafts; ' : ' bản nháp; ') +
              eventDraftProgress.failed + (language === 'en' ? ' issues. Check Event Manager.' : ' lỗi. Xem Quản lý sự kiện.')}</span>
          {eventDraftProgress.state !== 'running' ? <button type="button" aria-label="Đóng trạng thái tạo sự kiện" onClick={() => setEventDraftProgress(null)}>×</button> : null}
          <div className="work-schedule-import-progress-track" aria-hidden="true"><i style={{width: String(eventDraftProgress.total ? Math.round(eventDraftProgress.completed / eventDraftProgress.total * 100) : 0) + '%'}} /></div>
        </div> : null}

        <div className="work-schedule-metrics">
          <article><strong>{metrics.today}</strong><span>Hôm nay</span></article>
          <article><strong>{metrics.nextSeven}</strong><span>7 ngày tới</span></article>
          <article><strong>{metrics.month}</strong><span>Trong tháng</span></article>
          <article><strong>{metrics.imported}</strong><span>Đợt upload</span></article>
        </div>

        <div className="work-schedule-controls">
          {embedded ? <div className="work-schedule-daily-nav" aria-label="Điều hướng lịch theo ngày">
            <button type="button" className="work-schedule-daily-arrow" aria-label="Ngày trước" onClick={() => setDailyCursor((value) => addDays(value, -1))}>‹</button>
            <strong>{formatDailyHeading(dailyCursor, language)}</strong>
            <button type="button" className="work-schedule-daily-arrow" aria-label="Ngày sau" onClick={() => setDailyCursor((value) => addDays(value, 1))}>›</button>
            <button type="button" className="today" onClick={() => { const today = new Date(); today.setHours(0, 0, 0, 0); setDailyCursor(today); }}>Hôm nay</button>
          </div> : <div className="work-schedule-month-nav">
            <button type="button" aria-label={calendarMode === 'week' ? 'Tuần trước' : 'Tháng trước'} onClick={() => setCursor(calendarMode === 'week' ? addWeeks(cursor, -1) : addMonths(cursor, -1))}>‹</button>
            <strong>{calendarMode === 'week' ? formatWeekRange(cursor, language) : formatMonth(cursor, language)}</strong>
            <button type="button" aria-label={calendarMode === 'week' ? 'Tuần sau' : 'Tháng sau'} onClick={() => setCursor(calendarMode === 'week' ? addWeeks(cursor, 1) : addMonths(cursor, 1))}>›</button>
            <button type="button" className="today" onClick={() => setCursor(calendarMode === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date()))}>Hôm nay</button>
          </div>}
          {embedded ? <div className="work-schedule-embedded-tools">
            {leader ? <div className="work-schedule-embedded-actions" aria-label="Quản lý lịch làm việc">
              <button type="button" className="is-template" onClick={() => downloadTextFile('mau-lich-lam-viec.csv', makeScheduleTemplateCsv())} title="Tải file CSV mẫu">⇩ Mẫu</button>
              <button type="button" className="is-upload" disabled={busy} onClick={() => fileInputRef.current?.click()} title="Tải lên lịch làm việc từ XLSX hoặc CSV">⇧ Tải lên lịch</button>
              <button type="button" className="is-add" disabled={busy} onClick={() => setEditor(defaultEditor())} title="Thêm hoạt động thủ công">＋ Thêm</button>
              <button type="button" className="is-week-delete" disabled={busy} onClick={openDeleteWeek}>🗑 {deleteI18n[language === 'en' ? 'en' : 'vi'].button}</button>
            </div> : null}
            <div className="work-schedule-category-filters" aria-label="Lọc lịch theo loại hoạt động">
              {TIMELINE_CATEGORIES.map(([id, label, color]) => <button type="button" key={id} className={timelineCategory === id ? 'is-selected' : ''} aria-pressed={timelineCategory === id} style={{ '--category': color }} onClick={() => setTimelineCategory(id)}><i />{label}</button>)}
            </div>
          </div> : <div className="work-schedule-filterbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung, địa điểm, phụ trách…" />
            <select value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="upcoming">Sắp tới</option>
              <option value="all">Tất cả</option>
              <option value="past">Đã qua</option>
            </select>
            <div className="work-schedule-view-toggle">
              <button type="button" className={calendarMode === 'week' ? 'active' : ''} onClick={() => { setCalendarMode('week'); setCursor(startOfWeek(cursor)); }}>Tuần</button>
              <button type="button" className={calendarMode === 'month' ? 'active' : ''} onClick={() => { setCalendarMode('month'); setCursor(startOfMonth(cursor)); }}>Tháng</button>
              <button type="button" className={calendarMode === 'agenda' ? 'active' : ''} onClick={() => setCalendarMode('agenda')}>Danh sách</button>
            </div>
          </div>}
        </div>

        {calendarMode !== 'agenda' ? (
          embedded ? <section className="work-schedule-daily-shell" aria-label="Lịch làm việc theo ngày">
            <div className="work-schedule-daily-main">
              <div className="work-schedule-daily-list">
                {dailyEvents.map((event) => {
                  const category = scheduleCategoryForEvent(event);
                  const categoryMeta = TIMELINE_CATEGORIES.find(([id]) => id === category);
                  return <button key={event.id} type="button" className={`work-schedule-daily-event is-${category}`} onClick={() => setSelectedId(event.id)} title={event.title}>
                    <span className="work-schedule-daily-time">
                      <strong>{formatTime(event.startAt, language)}</strong>
                      <small>{event.endAt ? formatTime(event.endAt, language) : '—'}</small>
                    </span>
                    <span className="work-schedule-daily-node" aria-hidden="true"><i /></span>
                    <span className="work-schedule-daily-card">
                      <span className="work-schedule-event-icon" aria-hidden="true">{timelineCategoryGlyph(category)}</span>
                      <span className="work-schedule-daily-card-copy">
                        <strong>{event.title}</strong>
                        <span>
                          {event.location ? <small>⌖ {event.location}</small> : null}
                          {(event.attendees || event.ownerText) ? <small>♟ {event.attendees || event.ownerText}</small> : null}
                        </span>
                      </span>
                      <span className={`work-schedule-daily-category is-${category}`}><i />{categoryMeta?.[1] || 'Khác'}</span>
                      <span className="work-schedule-daily-more" aria-hidden="true">•••</span>
                    </span>
                  </button>;
                })}
                {!dailyEvents.length ? <div className="work-schedule-daily-empty"><span aria-hidden="true">☕</span><strong>Không có lịch làm việc</strong><small>{timelineCategory === 'all' ? 'Hãy tận hưởng ngày nghỉ thật ý nghĩa!' : 'Không có hoạt động thuộc bộ lọc đang chọn.'}</small></div> : null}
              </div>
            </div>

            <aside className="work-schedule-daily-sidebar">
              <section className="work-schedule-daily-summary">
                <header>
                  <span className="work-schedule-daily-summary-icon" aria-hidden="true">▣</span>
                  <div><strong>{dailyKey === dayKey(new Date()) ? 'Hoạt động hôm nay' : 'Hoạt động trong ngày'}</strong><small>{timelineWeekday(dailyCursor, language)}, {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dailyCursor)}</small></div>
                  <b>{dailyAllEvents.length}<small>hoạt động</small></b>
                </header>
                <div className="work-schedule-daily-summary-grid">
                  {['student', 'meeting', 'training', 'deadline', 'other'].map((id) => {
                    const [, label, color] = TIMELINE_CATEGORIES.find(([categoryId]) => categoryId === id) || [id, id, '#92a7bc'];
                    return <article key={id} style={{ '--summary': color }}><strong>{dailyCategoryCounts[id] || 0}</strong><span>{label}</span></article>;
                  })}
                </div>
              </section>

              <section className="work-schedule-daily-quote">
                <b aria-hidden="true">“</b>
                <p>Mỗi ngày chủ động một kế hoạch,<br />là thêm một bước gần tới môi trường học tập tốt đẹp hơn.</p>
                <span className="work-schedule-daily-quote-art" aria-hidden="true" />
              </section>

              <section className="work-schedule-daily-next">
                <header><div><span aria-hidden="true">◷</span><strong>Tiếp theo</strong></div><button type="button" onClick={() => setTimelineCategory('all')}>Xem tất cả →</button></header>
                <div>
                  {dailyNextEvents.map((event) => {
                    const category = scheduleCategoryForEvent(event);
                    const categoryMeta = TIMELINE_CATEGORIES.find(([id]) => id === category);
                    return <button key={event.id} type="button" className="work-schedule-daily-next-item" onClick={() => setSelectedId(event.id)}>
                      <time><strong>{formatTime(event.startAt, language)}</strong><small>{event.endAt ? formatTime(event.endAt, language) : '—'}</small></time>
                      <span className={`is-${category}`} aria-hidden="true"><i /></span>
                      <div><strong>{event.title}</strong><small>{event.location || event.ownerText || 'Lịch làm việc dùng chung'}</small></div>
                      <em className={`is-${category}`}>{categoryMeta?.[1] || 'Khác'}</em>
                    </button>;
                  })}
                  {!dailyNextEvents.length ? <div className="work-schedule-daily-next-empty">Không còn hoạt động tiếp theo trong ngày.</div> : null}
                </div>
              </section>

              <section className="work-schedule-daily-footer-note">
                <span aria-hidden="true">◎</span>
                <div><strong>Giáo dục là hành trình cùng nhau lớn lên ♡</strong><small>Những kế hoạch hôm nay tạo nên những giá trị tốt đẹp hơn ngày mai.</small></div>
                <i aria-hidden="true" />
              </section>
            </aside>
          </section> : <div className={'work-schedule-calendar ' + (calendarMode === 'week' ? 'is-week' : '')}>
            <div className="work-schedule-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="work-schedule-grid">{cells.map((date) => {
              const key = dayKey(date);
              const dayEvents = eventsByDay.get(key) || [];
              const outside = calendarMode === 'month' && date.getMonth() !== cursor.getMonth();
              const today = key === dayKey(new Date());
              return <article key={key} className={`${outside ? 'outside ' : ''}${today ? 'today ' : ''}`}>
                <header><time>{date.getDate()}</time>{dayEvents.length ? <span>{dayEvents.length}</span> : null}</header>
                <div>{dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" className={`priority-${event.priority}`} onClick={() => setSelectedId(event.id)} title={event.title}><time>{formatTime(event.startAt, language)}</time><span>{event.title}</span></button>)}</div>
                {dayEvents.length > 3 ? <button type="button" className="more" onClick={() => setCalendarMode('agenda')}>+{dayEvents.length - 3} hoạt động</button> : null}
              </article>;
            })}</div>
          </div>
        ) : <div className="work-schedule-agenda">
          {filteredEvents.map((event) => <article key={event.id} onClick={() => setSelectedId(event.id)}>
            <div className="work-schedule-date-tile"><strong>{new Date(event.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(new Date(event.startAt))}</span></div>
            <div className="work-schedule-agenda-main"><div><span className={`work-schedule-priority priority-${event.priority}`}>{PRIORITY_LABEL[event.priority] || event.priority}</span><time>{formatTime(event.startAt, language)}{event.endAt ? ` – ${formatTime(event.endAt, language)}` : ''}</time></div><h3>{event.title}</h3><p>{event.description || event.note || 'Không có ghi chú bổ sung.'}</p><footer>{event.location ? <span>⌖ {event.location}</span> : null}{event.ownerText ? <span>◎ {event.ownerText}</span> : null}{event.attendees ? <span>◉ {event.attendees}</span> : null}</footer></div>
            <button type="button" className="open">›</button>
          </article>)}
          {!filteredEvents.length ? <div className="work-schedule-empty"><strong>Chưa có hoạt động phù hợp</strong><span>TTCM/Admin có thể upload file mẫu hoặc thêm lịch thủ công.</span></div> : null}
        </div>}
      </section> : null}

      {deleteWeekOpen && deleteWeekWindow ? <div className="work-schedule-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleteWeekLoading) setDeleteWeekOpen(false); }}>
        <section className="work-schedule-modal work-schedule-delete-week" role="dialog" aria-modal="true" aria-label={deleteI18n[language === 'en' ? 'en' : 'vi'].title} onKeyDown={(event) => { if (event.key === 'Escape' && !deleteWeekLoading) setDeleteWeekOpen(false); }}>
          <header><div><span>{deleteI18n[language === 'en' ? 'en' : 'vi'].heading}</span><h2>{deleteI18n[language === 'en' ? 'en' : 'vi'].title}</h2></div><button type="button" disabled={deleteWeekLoading} onClick={() => setDeleteWeekOpen(false)} aria-label="Close">×</button></header>
          <div className="work-schedule-delete-week-body">
            <div className="work-schedule-delete-week-nav">
              <button type="button" disabled={deleteWeekLoading} aria-label={deleteI18n[language === 'en' ? 'en' : 'vi'].navPrev} onClick={() => setDeleteWeekAnchor(moveScheduleWeek(deleteWeekAnchor, -1))}>‹</button>
              <strong>{labelForWeek(deleteWeekWindow.monday)} – {labelForWeek(deleteWeekWindow.sunday)}</strong>
              <button type="button" disabled={deleteWeekLoading} aria-label={deleteI18n[language === 'en' ? 'en' : 'vi'].navNext} onClick={() => setDeleteWeekAnchor(moveScheduleWeek(deleteWeekAnchor, 1))}>›</button>
            </div>
            <p className="work-schedule-delete-week-warning">⚠ {deleteI18n[language === 'en' ? 'en' : 'vi'].warning}</p>
            <label className="work-schedule-delete-week-manual"><input type="checkbox" checked={deleteWeekIncludeManual} disabled={deleteWeekLoading} onChange={(event) => toggleWeekManual(event.target.checked)}/><span>{deleteI18n[language === 'en' ? 'en' : 'vi'].manual}</span></label>
            <div className="work-schedule-delete-week-summary">
              <span><strong>{deleteWeekCandidates.length}</strong> {deleteI18n[language === 'en' ? 'en' : 'vi'].eligible}</span>
              <span><strong>{deleteWeekTargets.length}</strong> {deleteI18n[language === 'en' ? 'en' : 'vi'].selected}</span>
              <div>
                <button type="button" disabled={deleteWeekLoading} onClick={() => { setDeleteWeekSelected(new Set(deleteWeekCandidates.map((item) => item.id))); setDeleteWeekConfirm(''); }}>{deleteI18n[language === 'en' ? 'en' : 'vi'].all}</button>
                <button type="button" disabled={deleteWeekLoading} onClick={() => { setDeleteWeekSelected(new Set()); setDeleteWeekConfirm(''); }}>{deleteI18n[language === 'en' ? 'en' : 'vi'].clear}</button>
              </div>
            </div>
            {deleteWeekLoading ? <p className="work-schedule-delete-week-loading">{deleteI18n[language === 'en' ? 'en' : 'vi'].loading}</p> : null}
            {deleteWeekError ? <p className="work-schedule-delete-week-error" role="alert">{deleteWeekError}</p> : null}
            {!deleteWeekLoading && !deleteWeekCandidates.length ? <p className="work-schedule-delete-week-empty">{deleteI18n[language === 'en' ? 'en' : 'vi'].none}</p> : null}
            <div className="work-schedule-delete-week-list">
              {deleteWeekCandidates.map((item) => <label key={item.id} className="work-schedule-delete-week-item">
                <input type="checkbox" disabled={deleteWeekLoading} checked={deleteWeekSelected.has(item.id)} onChange={(event) => { setDeleteWeekSelected((prev) => { const next = new Set(prev); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; }); setDeleteWeekConfirm(''); }} />
                <span><strong>{item.title}</strong><small>{formatScheduleDateTime(item.due_at)} · {isImportedScheduleItem(item) ? deleteI18n[language === 'en' ? 'en' : 'vi'].imported : (language === 'en' ? 'Manual' : 'Thêm thủ công')}{item.metadata?.schedule_event_draft_id ? ' · ' + deleteI18n[language === 'en' ? 'en' : 'vi'].linked : ''}</small></span>
              </label>)}
            </div>
            <label className="work-schedule-delete-week-confirm"><span>{deleteI18n[language === 'en' ? 'en' : 'vi'].key}</span><input value={deleteWeekConfirm} disabled={deleteWeekLoading || !deleteWeekTargets.length} onChange={(event) => setDeleteWeekConfirm(event.target.value)} placeholder={deleteI18n[language === 'en' ? 'en' : 'vi'].placeholder} autoComplete="off" spellCheck={false}/></label>
          </div>
          <footer>
            <button type="button" className="secondary" disabled={deleteWeekLoading} onClick={() => setDeleteWeekOpen(false)}>{deleteI18n[language === 'en' ? 'en' : 'vi'].cancel}</button>
            <button type="button" className="work-schedule-delete-confirm-button" disabled={deleteWeekLoading || !deleteWeekTargets.length || deleteWeekConfirm.trim().toUpperCase() !== 'XOA'} onClick={deleteSelectedWeekItems}>{deleteWeekLoading ? deleteI18n[language === 'en' ? 'en' : 'vi'].deleting : deleteI18n[language === 'en' ? 'en' : 'vi'].submit.replace('{n}', String(deleteWeekTargets.length))}</button>
          </footer>
        </section>
      </div> : null}

      {importOpen ? <div className="work-schedule-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setImportOpen(false); }}>
        <section className="work-schedule-modal import-modal">
          <header><div><span>NHẬN DIỆN FILE LỊCH</span><h2>{importPreview?.fileName || 'Upload lịch làm việc'}</h2></div><button type="button" disabled={busy} onClick={() => setImportOpen(false)}>×</button></header>
          {importPreview ? <>
            <div className="work-schedule-import-summary">
              <article><strong>{importableCount}</strong><span>Dòng sẽ nhập</span></article>
              <article><strong>{duplicateCount}</strong><span>Dòng trùng bỏ qua</span></article>
              <article><strong>{importPreview.invalidRows.length}</strong><span>Dòng cần sửa</span></article>
              <article><strong>{importPreview.recognized.length}</strong><span>Cột đã nhận diện</span></article>
            </div>
            <div className="work-schedule-detected-columns"><b>Đã nhận diện:</b> {importPreview.recognized.join(' · ')}</div>
            <div className="work-schedule-event-detection" role="group" aria-label="Tạo sự kiện liên quan TTCM và Tổ Tiếng Anh THPT">
              <label className="work-schedule-detection-switch">
                <input type="checkbox" checked={autoDetectEvents} onChange={(event) => setAutoDetectEvents(event.target.checked)} />
                <span><strong>Tự động nhận diện sự kiện TTCM / Tổ Tiếng Anh THPT</strong><small>Không dùng AI, không phát sinh phí. Chỉ chuẩn bị bản nháp, admin duyệt trước khi thông báo.</small></span>
              </label>
              {autoDetectEvents ? <>
                <p className="work-schedule-detection-caption">Ứng viên phù hợp · chọn những mục cần chuyển thành sự kiện:</p>
                <div className="work-schedule-detection-list">
                  {importPreview.rows.filter((row) => !row.duplicate && detectScheduleEvent(row)).map((row) => {
                    const match = detectScheduleEvent(row);
                    return <label key={row.fingerprint} className="work-schedule-detection-item">
                      <input type="checkbox" checked={candidateSelection.has(row.fingerprint)} onChange={(event) => setCandidateSelection((current) => { const next = new Set(current); if (event.target.checked) next.add(row.fingerprint); else next.delete(row.fingerprint); return next; })} />
                      <span><strong>{row.title}</strong><small>{match.reason} · {match.needsTimeReview ? 'Chưa xác định giờ – chờ bổ sung' : 'Có giờ bắt đầu'}</small></span>
                    </label>;
                  })}
                  {!importPreview.rows.some((row) => !row.duplicate && detectScheduleEvent(row)) ? <p className="work-schedule-detection-empty">Không có nội dung khớp TTCM hoặc Tổ Tiếng Anh THPT trong các dòng mới.</p> : null}
                </div>
              </> : null}
            </div>
            <div className="work-schedule-preview-table"><table><thead><tr><th>Dòng</th><th>Ngày giờ</th><th>Nội dung</th><th>Địa điểm</th><th>Phụ trách</th><th>Trạng thái</th></tr></thead><tbody>{importPreview.rows.slice(0, 100).map((row) => <tr key={`${row.sourceRow}-${row.fingerprint}`} className={row.duplicate ? 'duplicate' : ''}><td>{row.sourceRow}</td><td>{formatScheduleDateTime(row.startAt)}</td><td><strong>{row.title}</strong></td><td>{row.location || '—'}</td><td>{row.ownerText || '—'}</td><td>{row.duplicate ? 'Trùng dữ liệu' : 'Sẵn sàng'}</td></tr>)}</tbody></table></div>
            {importPreview.invalidRows.length ? <details className="work-schedule-invalid"><summary>{importPreview.invalidRows.length} dòng không hợp lệ</summary>{importPreview.invalidRows.map((row) => <p key={row.sourceRow}><b>Dòng {row.sourceRow}:</b> {row.errors.join(', ')}</p>)}</details> : null}
          </> : <div className="work-schedule-empty"><strong>Chưa có dữ liệu xem trước</strong></div>}
          <footer><button type="button" className="secondary" disabled={busy} onClick={() => setImportOpen(false)}>Huỷ</button><button type="button" className="primary" disabled={busy || !importableCount} onClick={importSchedule}>{busy ? (importStage || 'Đang lưu lịch…') : `Nhập ${importableCount} hoạt động`}</button></footer>
        </section>
      </div> : null}

      {editor ? <div className="work-schedule-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditor(null); }}>
        <form className="work-schedule-modal editor-modal" onSubmit={saveEditor}>
          <header><div><span>LỊCH LÀM VIỆC</span><h2>{editor.id ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}</h2></div><button type="button" onClick={() => setEditor(null)}>×</button></header>
          <div className="work-schedule-editor-grid">
            <label className="wide"><span>Nội dung công việc *</span><input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} required /></label>
            <label><span>Bắt đầu *</span><input type="datetime-local" value={editor.startAt} onChange={(event) => setEditor({ ...editor, startAt: event.target.value })} required /></label>
            <label><span>Kết thúc</span><input type="datetime-local" value={editor.endAt} onChange={(event) => setEditor({ ...editor, endAt: event.target.value })} /></label>
            <label><span>Địa điểm</span><input value={editor.location} onChange={(event) => setEditor({ ...editor, location: event.target.value })} /></label>
            <label><span>Người phụ trách</span><input value={editor.ownerText} onChange={(event) => setEditor({ ...editor, ownerText: event.target.value })} /></label>
            <label><span>Thành phần</span><input value={editor.attendees} onChange={(event) => setEditor({ ...editor, attendees: event.target.value })} /></label>
            <label><span>Mức độ</span><select value={editor.priority} onChange={(event) => setEditor({ ...editor, priority: event.target.value })}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn</option></select></label>
            <label className="wide"><span>Mô tả / yêu cầu</span><textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
            <label className="wide"><span>Ghi chú</span><textarea value={editor.note} onChange={(event) => setEditor({ ...editor, note: event.target.value })} /></label>
          </div>
          <footer><button type="button" className="secondary" onClick={() => setEditor(null)}>Huỷ</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu vào lịch chung'}</button></footer>
        </form>
      </div> : null}

      {selectedEvent ? <div className="work-schedule-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(''); }}>
        <aside className="work-schedule-drawer">
          <button type="button" className="close" onClick={() => setSelectedId('')}>×</button>
          <span className={`work-schedule-priority priority-${selectedEvent.priority}`}>{PRIORITY_LABEL[selectedEvent.priority] || selectedEvent.priority}</span>
          <h2>{selectedEvent.title}</h2>
          <p>{selectedEvent.description || 'Không có mô tả bổ sung.'}</p>
          <dl><div><dt>Bắt đầu</dt><dd>{formatScheduleDateTime(selectedEvent.startAt)}</dd></div><div><dt>Kết thúc</dt><dd>{formatScheduleDateTime(selectedEvent.endAt)}</dd></div><div><dt>Địa điểm</dt><dd>{selectedEvent.location || '—'}</dd></div><div><dt>Phụ trách</dt><dd>{selectedEvent.ownerText || '—'}</dd></div><div><dt>Thành phần</dt><dd>{selectedEvent.attendees || '—'}</dd></div><div><dt>Nguồn</dt><dd>{selectedEvent.sourceFileName ? `${selectedEvent.sourceFileName}${selectedEvent.sourceRow ? ` · dòng ${selectedEvent.sourceRow}` : ''}` : 'Thêm thủ công'}</dd></div></dl>
          {selectedEvent.note ? <div className="work-schedule-note"><b>Ghi chú</b><span>{selectedEvent.note}</span></div> : null}
          {leader ? <footer><button type="button" className="secondary" onClick={() => setEditor(defaultEditor(selectedEvent))}>Chỉnh sửa</button><button type="button" className="danger" disabled={busy} onClick={() => deleteEvent(selectedEvent)}>Xoá lịch</button></footer> : null}
        </aside>
      </div> : null}
    </div>,
    mountNode,
  );
}
