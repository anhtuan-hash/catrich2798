import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import readXlsxFile from 'read-excel-file/browser';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { emitAutomationEvent } from '../utils/automationEngine.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';
import { isLeader, uid } from '../pages/v1093/shared.js';
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
const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;
const MAX_EVENTS = 600;
const EXCLUDED_PROFILE_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest']);
const PRIORITY_LABEL = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn' };

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
      connected_modules: ['work-hub', 'dashboard', 'notifications', 'automation'],
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
          target: `#/work-hub?view=schedule&event=${encodeURIComponent(event.id)}`,
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
}) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const fileInputRef = useRef(null);
  const [hashState, setHashState] = useState(parseHashState);
  const [mountNode, setMountNode] = useState(null);
  const [hubNode, setHubNode] = useState(null);
  const [view, setView] = useState(hashState.view);
  const [items, setItems] = useState(readCachedSchedule);
  const [profiles, setProfiles] = useState([]);
  const [calendarMode, setCalendarMode] = useState('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('upcoming');
  const [selectedId, setSelectedId] = useState(hashState.eventId);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const routeActive = route === 'work-hub' || hashState.route === 'work-hub';

  useEffect(() => {
    const onHashChange = () => setHashState(parseHashState());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!routeActive) return;
    setView(hashState.view);
    if (hashState.eventId) setSelectedId(hashState.eventId);
  }, [hashState.eventId, hashState.view, routeActive]);

  useEffect(() => {
    if (!routeActive || typeof document === 'undefined') {
      setMountNode(null);
      setHubNode(null);
      return undefined;
    }

    let inserted = null;
    const attach = () => {
      const hub = document.querySelector('.v1093-work-hub');
      if (!hub) return;
      let node = hub.querySelector(':scope > [data-work-schedule-mount="true"]');
      if (!node) {
        node = document.createElement('div');
        node.dataset.workScheduleMount = 'true';
        node.className = 'work-schedule-mount';
        const hero = hub.querySelector(':scope > .v1093-hero');
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
  }, [routeActive]);

  useEffect(() => {
    if (!hubNode) return undefined;
    hubNode.classList.toggle('work-schedule-view-active', view === 'schedule');
    return () => hubNode.classList.remove('work-schedule-view-active');
  }, [hubNode, view]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!currentUser) return;
    if (!client || !runtime.ready || !runtime.session) {
      setItems(readCachedSchedule());
      return;
    }
    if (!silent) setError('');

    const columns = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,source_module,metadata,created_at,updated_at';
    let result = await client
      .from('work_hub_items')
      .select(columns)
      .eq('item_type', WORK_SCHEDULE_ITEM_TYPE)
      .order('due_at', { ascending: true })
      .limit(MAX_EVENTS);

    if (result.error) {
      result = await client
        .from('work_hub_items')
        .select(columns)
        .order('due_at', { ascending: true })
        .limit(MAX_EVENTS);
    }

    if (result.error) {
      if (!silent) setError(result.error.message || 'Không thể tải lịch làm việc.');
      setItems(readCachedSchedule());
      return;
    }

    const scheduleItems = (result.data || []).filter(isScheduleItem);
    setItems(scheduleItems);
    writeCachedSchedule(scheduleItems);

    if (leader) {
      const { data: profileRows, error: profileError } = await client.from('profiles').select('*').limit(500);
      if (!profileError) setProfiles((profileRows || []).filter((profile) => profileId(profile)));
    }
  }, [client, currentUser, leader, runtime.ready, runtime.session]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!currentUser?.id || !runtime.ready || !runtime.session) return () => {};
    const refresh = () => window.setTimeout(() => load({ silent: true }), 80);
    const unsubscribe = subscribeTable({
      key: `global-work-schedule-${currentUser.id}`,
      table: 'work_hub_items',
      onChange: refresh,
    });
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

  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const key = dayKey(event.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [filteredEvents]);

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
      const rows = parsed.validRows.map((row) => ({
        ...row,
        duplicate: existingFingerprints.has(row.fingerprint),
      }));
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
    if (!leader || !importPreview) return;
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
          schedule_imported_at: new Date().toISOString(),
        },
      };
    });

    try {
      const created = [];
      for (let index = 0; index < payloads.length; index += 50) {
        const batch = payloads.slice(index, index + 50);
        const { data, error: insertError } = await client.from('work_hub_items').insert(batch).select('*');
        if (insertError) throw insertError;
        created.push(...(data || []));
      }

      await recordAuditEvent({
        action: 'schedule.file_imported',
        entity_type: 'work_schedule_import',
        entity_id: importId,
        source_module: 'work-schedule',
        after_data: {
          file_name: importPreview.fileName,
          imported_count: created.length,
          skipped_duplicates: importPreview.rows.filter((row) => row.duplicate).length,
          invalid_count: importPreview.invalidRows.length,
          item_ids: created.map((item) => item.id),
        },
      }, currentUser);
      await emitAutomationEvent('schedule_imported', {
        source: 'work-schedule',
        import_id: importId,
        count: created.length,
        summary: `Đã nhập ${created.length} mục vào lịch làm việc dùng chung.`,
      }, currentUser);

      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, {
        detail: { importId, count: created.length },
      }));
      window.dispatchEvent(new CustomEvent('bes-global-notification', {
        detail: {
          id: `work-schedule-import:${importId}`,
          title: 'Lịch làm việc đã được cập nhật',
          message: `${created.length} hoạt động mới từ file ${importPreview.fileName}`,
          target: '#/work-hub?view=schedule',
          createdAt: new Date().toISOString(),
          read: false,
          category: 'schedule',
          status: 'imported',
          chip: 'Lịch chung',
          source: 'work-schedule-import',
        },
      }));
      setImportPreview(null);
      setImportOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice(`Đã nhận diện và đồng bộ ${created.length} hoạt động vào lịch chung toàn hệ thống.`);
      await load({ silent: true });
    } catch (importError) {
      setError(importError.message || 'Không thể nhập lịch làm việc.');
    } finally {
      setBusy(false);
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
      let saved;
      if (editor.id) {
        const { data, error: updateError } = await client
          .from('work_hub_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editor.id)
          .select('*')
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
          .select('*')
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
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: { itemId: saved.id } }));
      setEditor(null);
      setSelectedId(saved.id);
      setNotice(editor.id ? 'Đã cập nhật lịch làm việc.' : 'Đã thêm hoạt động vào lịch chung.');
      await load({ silent: true });
    } catch (saveError) {
      setError(saveError.message || 'Không thể lưu lịch làm việc.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(target) {
    if (!leader || !target || !client || !runtime.session) return;
    if (!window.confirm(`Xoá lịch “${target.title}”? Hành động này sẽ cập nhật trên toàn hệ thống.`)) return;
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
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: { itemId: target.id, deleted: true } }));
      await load({ silent: true });
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
      <nav className="work-schedule-tabs" aria-label="Chế độ Trung tâm công việc">
        <button type="button" className={view === 'tasks' ? 'active' : ''} onClick={() => switchView('tasks')}>
          <span>✓</span><b>Công việc</b><small>Giao việc và nộp tệp</small>
        </button>
        <button type="button" className={view === 'schedule' ? 'active' : ''} onClick={() => switchView('schedule')}>
          <span>▦</span><b>Lịch làm việc</b><small>{events.length} hoạt động đã đồng bộ</small>
        </button>
      </nav>

      {view === 'schedule' ? <section className="work-schedule-center" aria-label="Lịch làm việc dùng chung">
        <header className="work-schedule-toolbar">
          <div>
            <span className="work-schedule-eyebrow">SYSTEM-WIDE WORK CALENDAR</span>
            <h2>Lịch làm việc dùng chung</h2>
            <p>Mọi hoạt động được lưu bằng dữ liệu Trung tâm công việc để đồng bộ với Dashboard, thông báo và Automation Center.</p>
          </div>
          <div className="work-schedule-actions">
            {leader ? <>
              <button type="button" className="secondary" onClick={() => downloadTextFile('mau-lich-lam-viec.csv', makeScheduleTemplateCsv())}>⇩ File mẫu</button>
              <input ref={fileInputRef} hidden type="file" accept=".xlsx,.csv" onChange={(event) => readImportFile(event.target.files?.[0] || null)} />
              <button type="button" className="secondary" disabled={busy} onClick={() => fileInputRef.current?.click()}>⇧ Upload lịch</button>
              <button type="button" className="primary" onClick={() => setEditor(defaultEditor())}>＋ Thêm lịch</button>
            </> : <span className="work-schedule-readonly">Chế độ xem lịch chung</span>}
          </div>
        </header>

        {error ? <div className="work-schedule-alert error"><b>Không thể xử lý</b><span>{error}</span><button type="button" onClick={() => setError('')}>×</button></div> : null}
        {notice ? <div className="work-schedule-alert success"><span>{notice}</span><button type="button" onClick={() => setNotice('')}>×</button></div> : null}

        <div className="work-schedule-metrics">
          <article><strong>{metrics.today}</strong><span>Hôm nay</span></article>
          <article><strong>{metrics.nextSeven}</strong><span>7 ngày tới</span></article>
          <article><strong>{metrics.month}</strong><span>Trong tháng</span></article>
          <article><strong>{metrics.imported}</strong><span>Đợt upload</span></article>
        </div>

        <div className="work-schedule-controls">
          <div className="work-schedule-month-nav">
            <button type="button" onClick={() => setCursor(addMonths(cursor, -1))}>‹</button>
            <strong>{formatMonth(cursor, language)}</strong>
            <button type="button" onClick={() => setCursor(addMonths(cursor, 1))}>›</button>
            <button type="button" className="today" onClick={() => setCursor(startOfMonth(new Date()))}>Hôm nay</button>
          </div>
          <div className="work-schedule-filterbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung, địa điểm, phụ trách…" />
            <select value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="upcoming">Sắp tới</option>
              <option value="all">Tất cả</option>
              <option value="past">Đã qua</option>
            </select>
            <div className="work-schedule-view-toggle">
              <button type="button" className={calendarMode === 'month' ? 'active' : ''} onClick={() => setCalendarMode('month')}>Tháng</button>
              <button type="button" className={calendarMode === 'agenda' ? 'active' : ''} onClick={() => setCalendarMode('agenda')}>Danh sách</button>
            </div>
          </div>
        </div>

        {calendarMode === 'month' ? <div className="work-schedule-calendar">
          <div className="work-schedule-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="work-schedule-grid">{cells.map((date) => {
            const key = dayKey(date);
            const dayEvents = eventsByDay.get(key) || [];
            const outside = date.getMonth() !== cursor.getMonth();
            const today = key === dayKey(new Date());
            return <article key={key} className={`${outside ? 'outside' : ''} ${today ? 'today' : ''}`}>
              <header><time>{date.getDate()}</time>{dayEvents.length ? <span>{dayEvents.length}</span> : null}</header>
              <div>{dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" className={`priority-${event.priority}`} onClick={() => setSelectedId(event.id)} title={event.title}>
                <time>{formatTime(event.startAt, language)}</time><span>{event.title}</span>
              </button>)}</div>
              {dayEvents.length > 3 ? <button type="button" className="more" onClick={() => setCalendarMode('agenda')}>+{dayEvents.length - 3} hoạt động</button> : null}
            </article>;
          })}</div>
        </div> : <div className="work-schedule-agenda">
          {filteredEvents.map((event) => <article key={event.id} onClick={() => setSelectedId(event.id)}>
            <div className="work-schedule-date-tile"><strong>{new Date(event.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(new Date(event.startAt))}</span></div>
            <div className="work-schedule-agenda-main"><div><span className={`work-schedule-priority priority-${event.priority}`}>{PRIORITY_LABEL[event.priority] || event.priority}</span><time>{formatTime(event.startAt, language)}{event.endAt ? ` – ${formatTime(event.endAt, language)}` : ''}</time></div><h3>{event.title}</h3><p>{event.description || event.note || 'Không có ghi chú bổ sung.'}</p><footer>{event.location ? <span>⌖ {event.location}</span> : null}{event.ownerText ? <span>◎ {event.ownerText}</span> : null}{event.attendees ? <span>◉ {event.attendees}</span> : null}</footer></div>
            <button type="button" className="open">›</button>
          </article>)}
          {!filteredEvents.length ? <div className="work-schedule-empty"><strong>Chưa có hoạt động phù hợp</strong><span>TTCM/Admin có thể upload file mẫu hoặc thêm lịch thủ công.</span></div> : null}
        </div>}
      </section> : null}

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
            <div className="work-schedule-preview-table"><table><thead><tr><th>Dòng</th><th>Ngày giờ</th><th>Nội dung</th><th>Địa điểm</th><th>Phụ trách</th><th>Trạng thái</th></tr></thead><tbody>{importPreview.rows.slice(0, 100).map((row) => <tr key={`${row.sourceRow}-${row.fingerprint}`} className={row.duplicate ? 'duplicate' : ''}><td>{row.sourceRow}</td><td>{formatScheduleDateTime(row.startAt)}</td><td><strong>{row.title}</strong></td><td>{row.location || '—'}</td><td>{row.ownerText || '—'}</td><td>{row.duplicate ? 'Trùng dữ liệu' : 'Sẵn sàng'}</td></tr>)}</tbody></table></div>
            {importPreview.invalidRows.length ? <details className="work-schedule-invalid"><summary>{importPreview.invalidRows.length} dòng không hợp lệ</summary>{importPreview.invalidRows.map((row) => <p key={row.sourceRow}><b>Dòng {row.sourceRow}:</b> {row.errors.join(', ')}</p>)}</details> : null}
          </> : <div className="work-schedule-empty"><strong>Chưa có dữ liệu xem trước</strong></div>}
          <footer><button type="button" className="secondary" disabled={busy} onClick={() => setImportOpen(false)}>Huỷ</button><button type="button" className="primary" disabled={busy || !importableCount} onClick={importSchedule}>{busy ? 'Đang đồng bộ…' : `Nhập ${importableCount} hoạt động`}</button></footer>
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
