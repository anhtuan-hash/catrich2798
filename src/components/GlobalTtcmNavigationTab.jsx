import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  WORK_HUB_ATTACHMENT_ACCEPT,
  WORK_HUB_MAX_ATTACHMENTS,
  createWorkHubAttachmentEditUrl,
  createWorkHubAttachmentUrl,
  downloadWorkHubAttachment,
  fetchWorkHubAttachmentBlob,
  getWorkHubAttachmentExtension,
  removeWorkHubSubmissionFiles,
  uploadWorkHubSubmissionFiles,
  validateWorkHubFiles,
} from '../utils/workHubDelivery.js';
import GlobalWorkScheduleCompatibleCenter from './GlobalWorkScheduleCompatibleCenter.jsx';
import PersonnelLookup from './PersonnelLookupGoogleV2.jsx';
import './GlobalWorkScheduleModern.css';
import './GlobalTtcmNavigationTab.css';
import './GlobalTtcmMultiAttachments.css';
import './GlobalTtcmPersonnel.css';
import './GlobalTtcmTeacherReaderV2.css';

const WORK_ITEM_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,attachments,metadata,source_module,created_at,updated_at,submitted_at,reviewed_at,completed_at';
const LOCAL_FEED_PREFIX = 'bes-ttcm-feed-v1';
const READ_PREFIX = 'bes-ttcm-read-v1';

const CONTENT_TYPES = [
  { id: 'announcement', label: 'Thông báo', helper: 'Thông tin chỉ cần đọc', glyph: 'campaign', action: false },
  { id: 'resource', label: 'Gửi tài liệu', helper: 'Tệp dùng chung của tổ', glyph: 'folder', action: false },
  { id: 'feedback', label: 'Xin góp ý', helper: 'Giáo viên phản hồi ngay tại TTCM', glyph: 'edit', action: true },
  { id: 'acknowledgement', label: 'Yêu cầu xác nhận', helper: 'Cần xác nhận đã nhận', glyph: 'check', action: true },
  { id: 'task', label: 'Yêu cầu thực hiện', helper: 'Theo dõi và phản hồi ngay tại TTCM', glyph: 'task', action: true },
];

const GLYPHS = {
  campaign: 'M3 10v4h3l4 4V6L6 10H3Zm9-3.5v11l7 3V3.5l-7 3Z',
  folder: 'M3 5h7l2 2h9v12H3V5Zm2 4v8h14V9H5Z',
  edit: 'm4 16.5 9.9-9.9 3.5 3.5-9.9 9.9H4v-3.5ZM15.3 5.2l1.5-1.5a1 1 0 0 1 1.4 0l2.1 2.1a1 1 0 0 1 0 1.4l-1.5 1.5-3.5-3.5Z',
  check: 'm9.2 17.2-5-5 1.4-1.4 3.6 3.6 8.9-8.9 1.4 1.4-10.3 10.3Z',
  task: 'M5 3h14v18H5V3Zm3 4v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z',
  bell: 'M12 22a2.4 2.4 0 0 0 2.3-2h-4.6a2.4 2.4 0 0 0 2.3 2Zm7-5H5l1.7-2.6V10a5.3 5.3 0 0 1 10.6 0v4.4L19 17Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  refresh: 'M18.4 5.6A8 8 0 1 0 20 14h-2.1a6 6 0 1 1-1-6.8L14 10h7V3l-2.6 2.6Z',
  people: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 13c-3.3 0-6 1.7-6 3.8V20h12v-3.2C14 14.7 11.3 13 8 13Zm8 0c-.8 0-1.6.1-2.3.3 1.4 1 2.3 2.2 2.3 3.5V20h6v-2.8c0-2.3-2.7-4.2-6-4.2Z',
  arrow: 'm10 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6L10 6Z',
  download: 'M11 3h2v9l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3V3ZM5 18h14v2H5v-2Z',
  eye: 'M12 5c-5.5 0-9.5 5-10 7 .5 2 4.5 7 10 7s9.5-5 10-7c-.5-2-4.5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  delete: 'M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm1-11v8h2v-8H8Zm6 0v8h2v-8h-2ZM8 4l1-1h6l1 1h4v2H4V4h4Z',
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14h18V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',
};

function Icon({ name, size = 20 }) {
  return <svg className="ttcm-m3-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={GLYPHS[name] || GLYPHS.task} /></svg>;
}

function localFeedKey(user) { return `${LOCAL_FEED_PREFIX}:${user?.id || user?.email || 'guest'}`; }
function readKey(user) { return `${READ_PREFIX}:${user?.id || user?.email || 'guest'}`; }
function readLocalItems(user) {
  try { const parsed = JSON.parse(localStorage.getItem(localFeedKey(user)) || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function writeLocalItems(user, items) { try { localStorage.setItem(localFeedKey(user), JSON.stringify(items.slice(0, 180))); } catch { /* optional */ } }
function readReadIds(user) {
  try { const parsed = JSON.parse(localStorage.getItem(readKey(user)) || '[]'); return new Set(Array.isArray(parsed) ? parsed.map(String) : []); }
  catch { return new Set(); }
}
function writeReadIds(user, ids) { try { localStorage.setItem(readKey(user), JSON.stringify([...ids].slice(-500))); } catch { /* optional */ } }
function uniqueIds(values = []) { return [...new Set((values || []).filter(Boolean).map(String))]; }
function userIsAssignee(item, userId) { return Boolean(userId && uniqueIds(item?.assignee_ids).includes(String(userId))); }
function normalizeRole(value) { return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); }
function departmentKey(person) {
  return String(person?.department_id || person?.department || person?.subject_group || person?.group_name || person?.subject || '').trim().toLowerCase();
}
function normalizePerson(profile) {
  return {
    id: profile?.id || profile?.user_id || profile?.profile_id || '',
    name: profile?.full_name || profile?.name || profile?.email || 'Giáo viên',
    email: profile?.email || '', role: profile?.role || 'teacher',
    department_id: profile?.department_id || profile?.departmentId || '',
    department: profile?.department || profile?.department_name || '',
    subject_group: profile?.subject_group || profile?.team || profile?.group_name || '',
    subject: profile?.subject || '',
  };
}
function formatDate(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}
function formatFullDate(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function dateTimeLocalValue(value) {
  if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16);
}
function dueLabel(value) {
  if (!value) return ''; const due = new Date(value); if (Number.isNaN(due.getTime())) return '';
  const ms = due.getTime() - Date.now(); if (ms <= 0) return 'Đã đến hạn';
  const days = Math.floor(ms / 86400000); const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `Còn ${days} ngày`; if (hours > 0) return `Còn ${hours} giờ`; return 'Sắp đến hạn';
}
function typeForItem(item) {
  const kind = item?.metadata?.ttcm_kind || String(item?.item_type || '').replace(/^ttcm_/, '');
  return CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0];
}
function isActionItem(item) { return Boolean(item?.metadata?.ttcm_action_required || typeForItem(item).action); }
function isDoneItem(item) { return ['completed', 'approved', 'archived'].includes(String(item?.status || '').toLowerCase()); }
function formatFileSize(value) {
  const bytes = Number(value || 0); if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
function selectedFileKey(file) { return `${file?.name || ''}:${Number(file?.size || 0)}:${Number(file?.lastModified || 0)}`; }

export default function GlobalTtcmNavigationTab({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [workspaceView, setWorkspaceView] = useState('feed');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [responseItem, setResponseItem] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFiles, setResponseFiles] = useState([]);
  const [responses, setResponses] = useState([]);
  const [responseViewerItem, setResponseViewerItem] = useState(null);
  const [fileViewer, setFileViewer] = useState(null);
  const [items, setItems] = useState(() => readLocalItems(currentUser));
  const [people, setPeople] = useState([]);
  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));
  const [filter, setFilter] = useState('all');
  const [kind, setKind] = useState('announcement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rootRef = useRef(null);

  const systemRole = normalizeSystemRole(currentUser?.role, SYSTEM_ROLES.GUEST);
  const allowed = Boolean(currentUser && [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.DEPARTMENT_HEAD, SYSTEM_ROLES.TEACHER].includes(systemRole));
  const manager = isDepartmentLeaderRole(currentUser?.role);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__primary');
      setHost((current) => current === nextHost ? current : nextHost);
    };
    findHost(); const frame = window.requestAnimationFrame(findHost);
    const observer = new MutationObserver(findHost); observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const openTtcm = (event) => {
      const requestedView = event?.detail?.view;
      const nextView = ['schedule', 'personnel'].includes(requestedView) ? requestedView : 'feed';
      setWorkspaceView(nextView); setFilter(manager ? 'all' : 'unread'); setSelectedItemId('');
      setOpen(true); setComposeOpen(false); setError('');
    };
    window.addEventListener('bes-ttcm-open', openTtcm);
    try {
      const pending = window.sessionStorage.getItem('bes-ttcm-open-on-load');
      if (pending) { window.sessionStorage.removeItem('bes-ttcm-open-on-load'); window.setTimeout(() => openTtcm({ detail: { view: pending } }), 0); }
    } catch { /* optional */ }
    return () => window.removeEventListener('bes-ttcm-open', openTtcm);
  }, [manager]);

  useEffect(() => { setItems(readLocalItems(currentUser)); setReadIds(readReadIds(currentUser)); }, [currentUser?.id, currentUser?.email]);
  useEffect(() => () => { if (fileViewer?.objectUrl) URL.revokeObjectURL(fileViewer.objectUrl); }, [fileViewer?.objectUrl]);

  const loadFeed = useCallback(async ({ silent = false } = {}) => {
    if (!allowed || !currentUser?.id) return;
    if (!silent) setLoading(true); setError('');
    try {
      if (!client || !runtime.ready || !runtime.session) { setItems(readLocalItems(currentUser)); return; }
      const { data, error: loadError } = await client.from('work_hub_items').select(WORK_ITEM_COLUMNS)
        .eq('source_module', 'ttcm').order('created_at', { ascending: false }).limit(180);
      if (loadError) throw loadError;
      const visible = (data || []).filter((item) => {
        const assignees = uniqueIds(item.assignee_ids);
        if (manager) return item.created_by === currentUser.id || item.owner_id === currentUser.id || assignees.includes(currentUser.id);
        return assignees.includes(currentUser.id) || item.owner_id === currentUser.id;
      });
      setItems(visible); writeLocalItems(currentUser, visible);
    } catch (loadError) {
      setError(loadError?.message || 'Không thể đồng bộ kênh TTCM.'); setItems(readLocalItems(currentUser));
    } finally { if (!silent) setLoading(false); }
  }, [allowed, client, currentUser, manager, runtime.ready, runtime.session]);

  const loadResponses = useCallback(async () => {
    if (!manager || !client || !runtime.ready || !runtime.session) { setResponses([]); return; }
    const actionIds = items.filter(isActionItem).map((item) => item.id).filter(Boolean);
    if (!actionIds.length) { setResponses([]); return; }
    const { data, error: responseError } = await client.from('work_hub_comments')
      .select('id,item_id,author_id,body,comment_type,attachments,created_at').in('item_id', actionIds).order('created_at', { ascending: true });
    if (!responseError) setResponses(data || []);
  }, [client, items, manager, runtime.ready, runtime.session]);

  const loadPeople = useCallback(async () => {
    if (!manager || !client || !runtime.ready || !runtime.session) return;
    const attempts = ['id,full_name,email,role,department_id,department,subject_group,subject','id,full_name,email,role,department_id','id,full_name,email,role','id,email,role','user_id,full_name,email,role,department_id','profile_id,full_name,email,role,department_id'];
    let profiles = null;
    for (const columns of attempts) {
      const { data, error: peopleError } = await client.from('profiles').select(columns).limit(500);
      if (!peopleError) { profiles = data || []; break; }
      if (!/column .* does not exist|42703/i.test(peopleError.message || '')) break;
    }
    if (profiles) setPeople(profiles.map(normalizePerson).filter((person) => person.id));
  }, [client, manager, runtime.ready, runtime.session]);

  useEffect(() => {
    if (!allowed) return undefined;
    loadFeed({ silent: true }); if (manager) loadPeople();
    return subscribeTable({ key: `ttcm-feed-${currentUser?.id || 'guest'}`, table: 'work_hub_items', filter: 'source_module=eq.ttcm', onChange: () => loadFeed({ silent: true }) });
  }, [allowed, currentUser?.id, loadFeed, loadPeople, manager]);

  useEffect(() => {
    if (!open || !manager) return undefined;
    loadResponses();
    return subscribeTable({ key: `ttcm-responses-${currentUser?.id || 'manager'}`, table: 'work_hub_comments', onChange: () => loadResponses() });
  }, [currentUser?.id, loadResponses, manager, open]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ttcm-hub-open');
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (fileViewer) setFileViewer(null); else if (responseViewerItem) setResponseViewerItem(null); else if (responseItem) { setResponseItem(null); setResponseFiles([]); }
      else if (composeOpen) setComposeOpen(false); else setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.documentElement.classList.remove('bes-ttcm-hub-open'); window.removeEventListener('keydown', onKey); };
  }, [composeOpen, fileViewer, open, responseItem, responseViewerItem]);

  const eligibleTeachers = useMemo(() => people.filter((person) => {
    if (!person?.id) return false;
    return !['student','learner','pupil','parent','guardian','guest','admin','administrator'].includes(normalizeRole(person.role));
  }), [people]);
  const currentProfile = useMemo(() => people.find((person) => String(person.id) === String(currentUser?.id)) || normalizePerson(currentUser), [currentUser, people]);
  const currentDepartment = departmentKey(currentProfile);
  const departmentTeachers = useMemo(() => {
    const others = eligibleTeachers.filter((person) => String(person.id) !== String(currentUser?.id));
    if (!currentDepartment) return others;
    const matched = others.filter((person) => departmentKey(person) === currentDepartment); return matched.length ? matched : others;
  }, [currentDepartment, currentUser?.id, eligibleTeachers]);
  const departmentRecipients = useMemo(() => {
    const byId = new Map();
    [currentProfile, ...departmentTeachers].forEach((person) => { if (person?.id) byId.set(String(person.id), person); });
    return [...byId.values()];
  }, [currentProfile, departmentTeachers]);
  const visibleRecipients = useMemo(() => {
    const needle = recipientQuery.trim().toLowerCase(); if (!needle) return departmentRecipients;
    return departmentRecipients.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));
  }, [departmentRecipients, recipientQuery]);

  const unseenCount = useMemo(() => items.filter((item) => userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id))).length, [currentUser?.id, items, readIds]);
  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: items.length,
      unread: items.filter((item) => userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id))).length,
      action: items.filter(isActionItem).length,
      due: items.filter((item) => { const due = item.due_at ? new Date(item.due_at).getTime() : 0; return Boolean(due && due >= now && !isDoneItem(item)); }).length,
      done: items.filter(isDoneItem).length,
    };
  }, [currentUser?.id, items, readIds]);

  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id));
    if (filter === 'action') return isActionItem(item);
    if (filter === 'due') { const due = item.due_at ? new Date(item.due_at).getTime() : 0; return Boolean(due && due >= Date.now() && !isDoneItem(item)); }
    if (filter === 'done') return isDoneItem(item);
    return true;
  }), [currentUser?.id, filter, items, readIds]);

  const selectedItem = useMemo(() => filteredItems.find((item) => String(item.id) === String(selectedItemId)) || filteredItems[0] || null, [filteredItems, selectedItemId]);
  const editingAttachments = useMemo(() => {
    if (!editingId) return []; const editingItem = items.find((item) => String(item.id) === String(editingId));
    return Array.isArray(editingItem?.attachments) ? editingItem.attachments : [];
  }, [editingId, items]);

  useEffect(() => {
    if (!filteredItems.length) { setSelectedItemId(''); return; }
    if (!filteredItems.some((item) => String(item.id) === String(selectedItemId))) setSelectedItemId(String(filteredItems[0].id));
  }, [filteredItems, selectedItemId]);

  function responsesForItem(itemId) { return responses.filter((entry) => String(entry.item_id) === String(itemId)); }
  function responseAuthor(authorId) { const person = people.find((entry) => String(entry.id) === String(authorId)); return person?.name || person?.email || 'Giáo viên'; }
  function markRead(itemId) {
    const id = String(itemId || ''); if (!id) return;
    setReadIds((current) => { const next = new Set(current); next.add(id); writeReadIds(currentUser, next); return next; });
  }
  function markAllRead() { const next = new Set(readIds); items.forEach((item) => { if (userIsAssignee(item, currentUser?.id)) next.add(String(item.id)); }); setReadIds(next); writeReadIds(currentUser, next); }
  function openItem(item) { if (!item) return; setSelectedItemId(String(item.id)); markRead(item.id); }

  function beginCompose() {
    setEditingId(''); setComposeOpen(true); setKind('announcement'); setTitle(''); setDescription(''); setDueAt(''); setFiles([]);
    setRecipientQuery(''); setSelectedRecipients(departmentRecipients.map((person) => person.id)); setError(''); setNotice('');
  }
  function beginEdit(item) {
    if (!manager || !item) return; const canManage = item.created_by === currentUser?.id || item.owner_id === currentUser?.id; if (!canManage) return;
    setEditingId(String(item.id)); setKind(typeForItem(item).id); setTitle(item.title || ''); setDescription(item.description || '');
    setDueAt(dateTimeLocalValue(item.due_at)); setFiles([]); setRecipientQuery(''); setSelectedRecipients(uniqueIds([...(item.assignee_ids || []), currentUser?.id])); setError(''); setNotice(''); setComposeOpen(true);
  }
  function selectComposerFiles(event) {
    const incoming = Array.from(event.target.files || []); event.target.value = ''; if (!incoming.length) return;
    const seen = new Set(); const nextFiles = [...files, ...incoming].filter((candidate) => { const key = selectedFileKey(candidate); if (seen.has(key)) return false; seen.add(key); return true; });
    const validation = validateWorkHubFiles(nextFiles); if (!validation.ok) { setError(validation.message); return; }
    setFiles(nextFiles); setError('');
  }
  function removeComposerFile(index) { setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)); setError(''); }
  function selectResponseFiles(event) {
    const incoming = Array.from(event.target.files || []); event.target.value = ''; if (!incoming.length) return;
    const seen = new Set(); const nextFiles = [...responseFiles, ...incoming].filter((candidate) => { const key = selectedFileKey(candidate); if (seen.has(key)) return false; seen.add(key); return true; });
    const validation = validateWorkHubFiles(nextFiles); if (!validation.ok) { setError(validation.message); return; }
    setResponseFiles(nextFiles); setError('');
  }
  function removeResponseFile(index) { setResponseFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)); setError(''); }
  function toggleRecipient(id) {
    if (String(id) === String(currentUser?.id)) return;
    setSelectedRecipients((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function saveEditedCommunication(event) {
    event.preventDefault(); if (!manager || busy || !editingId) return;
    const existing = items.find((item) => String(item.id) === String(editingId)); if (!existing) { setError('Không tìm thấy nội dung cần chỉnh sửa.'); return; }
    if (!(existing.created_by === currentUser?.id || existing.owner_id === currentUser?.id)) { setError('Bạn không có quyền chỉnh sửa nội dung này.'); return; }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    const recipients = uniqueIds([...selectedRecipients, currentUser?.id]); if (!recipients.length) { setError('Vui lòng chọn ít nhất một người nhận nội dung.'); return; }
    const fileValidation = validateWorkHubFiles(files); if (!fileValidation.ok) { setError(fileValidation.message); return; }
    if (files.length && (!client || !runtime.ready || !runtime.session)) { setError('Cần kết nối hệ thống để tải các tệp đính kèm mới.'); return; }
    const type = CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0];
    setBusy(true); setError(''); setNotice('');
    try {
      const editedAt = new Date().toISOString();
      const patch = { title: title.trim(), description: description.trim(), item_type: `ttcm_${kind}`,
        status: type.action ? (isDoneItem(existing) ? 'assigned' : (existing.status || 'assigned')) : 'completed', priority: kind === 'task' ? 'high' : 'normal',
        assignee_ids: recipients, due_at: dueAt ? new Date(dueAt).toISOString() : null,
        metadata: { ...(existing.metadata || {}), ttcm: true, ttcm_kind: kind, ttcm_action_required: type.action, notify_assignee: type.action, recipient_count: recipients.length, ttcm_edited_at: editedAt, ttcm_edited_by: currentUser.id }, updated_at: editedAt };
      let updated = { ...existing, ...patch };
      if (client && runtime.ready && runtime.session) {
        let replacements = [];
        if (files.length) { const upload = await uploadWorkHubSubmissionFiles({ files, itemId: existing.id, userId: currentUser.id }); if (!upload.ok) throw new Error(upload.message || 'Không thể tải các tệp đính kèm mới.'); replacements = upload.attachments || []; patch.attachments = replacements; }
        const { data, error: updateError } = await client.from('work_hub_items').update(patch).eq('id', existing.id).eq('created_by', currentUser.id).select(WORK_ITEM_COLUMNS).single();
        if (updateError) { if (replacements.length) await removeWorkHubSubmissionFiles(replacements).catch(() => {}); throw updateError; }
        updated = data;
        if (files.length) { const previous = Array.isArray(existing.attachments) ? existing.attachments : []; if (previous.length) removeWorkHubSubmissionFiles(previous).catch(() => {}); }
      }
      const next = items.map((item) => String(item.id) === String(updated.id) ? updated : item); setItems(next); writeLocalItems(currentUser, next);
      setEditingId(''); setComposeOpen(false); setFiles([]); setSelectedItemId(String(updated.id)); setNotice('Đã cập nhật nội dung và đồng bộ đến toàn bộ người nhận.'); window.setTimeout(() => setNotice(''), 3600);
    } catch (editError) { setError(editError?.message || 'Không thể cập nhật nội dung TTCM.'); } finally { setBusy(false); }
  }

  async function deleteCommunication(item) {
    if (!manager || busy || !item) return; if (!(item.created_by === currentUser?.id || item.owner_id === currentUser?.id)) return;
    if (!window.confirm(`Xóa “${item.title}”?\n\nNội dung sẽ biến mất khỏi Kênh TTCM. Hành động này không thể hoàn tác.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (client && runtime.ready && runtime.session) {
        const attachments = Array.isArray(item.attachments) ? item.attachments : []; if (attachments.length) { const result = await removeWorkHubSubmissionFiles(attachments); if (!result.ok) throw new Error(result.message || 'Không thể xóa tệp đính kèm.'); }
        const { error: deleteError } = await client.from('work_hub_items').delete().eq('id', item.id).eq('created_by', currentUser.id); if (deleteError) throw deleteError;
      }
      const next = items.filter((entry) => String(entry.id) !== String(item.id)); setItems(next); writeLocalItems(currentUser, next); setSelectedItemId('');
      setNotice('Đã xóa nội dung TTCM.'); window.setTimeout(() => setNotice(''), 3200);
    } catch (deleteError) { setError(deleteError?.message || 'Không thể xóa nội dung TTCM.'); } finally { setBusy(false); }
  }

  async function saveCommunication(event) {
    event.preventDefault(); if (!manager || busy) return; if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    const recipients = uniqueIds([...selectedRecipients, currentUser?.id]); if (!recipients.length) { setError('Vui lòng chọn ít nhất một người nhận nội dung.'); return; }
    const fileValidation = validateWorkHubFiles(files); if (!fileValidation.ok) { setError(fileValidation.message); return; }
    if (files.length && (!client || !runtime.ready || !runtime.session)) { setError('Cần kết nối hệ thống để tải tệp đính kèm.'); return; }
    const type = CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0]; setBusy(true); setError(''); setNotice('');
    try {
      const now = new Date().toISOString();
      const payload = { title: title.trim(), description: description.trim(), item_type: `ttcm_${kind}`, status: type.action ? 'assigned' : 'completed', priority: kind === 'task' ? 'high' : 'normal', visibility: 'department', owner_id: currentUser.id, created_by: currentUser.id, assignee_ids: recipients, watcher_ids: [], due_at: dueAt ? new Date(dueAt).toISOString() : null, attachments: [], metadata: { ttcm: true, ttcm_kind: kind, ttcm_action_required: type.action, notify_assignee: type.action, recipient_count: recipients.length, created_in: 'ttcm-material3-hub' }, source_module: 'ttcm' };
      let created = null;
      if (client && runtime.ready && runtime.session) {
        const { data, error: insertError } = await client.from('work_hub_items').insert(payload).select(WORK_ITEM_COLUMNS).single(); if (insertError) throw insertError; created = data;
        if (files.length && created?.id) {
          const upload = await uploadWorkHubSubmissionFiles({ files, itemId: created.id, userId: currentUser.id });
          if (!upload.ok) { await client.from('work_hub_items').delete().eq('id', created.id).eq('created_by', currentUser.id); throw new Error(upload.message || 'Không thể tải các tệp đính kèm.'); }
          const uploaded = upload.attachments || []; const { data: updated, error: attachmentError } = await client.from('work_hub_items').update({ attachments: uploaded, updated_at: new Date().toISOString() }).eq('id', created.id).select(WORK_ITEM_COLUMNS).single();
          if (attachmentError) { if (uploaded.length) await removeWorkHubSubmissionFiles(uploaded).catch(() => {}); await client.from('work_hub_items').delete().eq('id', created.id).eq('created_by', currentUser.id); throw attachmentError; } created = updated;
        }
      } else created = { ...payload, id: `ttcm-${Date.now()}`, created_at: now, updated_at: now };
      const next = [created, ...items.filter((item) => item.id !== created.id)]; setItems(next); writeLocalItems(currentUser, next); setComposeOpen(false); setFiles([]); setFilter('all'); setSelectedItemId(String(created.id));
      setNotice(type.action ? 'Đã gửi đến toàn bộ người nhận và bật theo dõi phản hồi.' : 'Đã gửi nội dung đến Kênh TTCM, bao gồm tài khoản TTCM.'); window.setTimeout(() => setNotice(''), 3600);
    } catch (saveError) { setError(saveError?.message || 'Không thể gửi nội dung TTCM.'); } finally { setBusy(false); }
  }

  function closeFileViewer() { setFileViewer(null); }
  async function previewAttachment(item, attachment) {
    markRead(item.id); setError(''); const target = { ...attachment, item_id: item.id }; const ext = getWorkHubAttachmentExtension(target);
    const base = { item, attachment: target, name: target.name || 'Tài liệu', ext, loading: true, kind: 'loading', error: '' }; setFileViewer(base);
    try {
      if (['doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp'].includes(ext)) {
        const signedUrl = await createWorkHubAttachmentUrl(target); if (signedUrl) { const absoluteUrl = new URL(signedUrl, window.location.origin).href; const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`; setFileViewer({ ...base, loading: false, kind: 'iframe', url: officeUrl, externalOffice: true }); return; }
      }
      const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
      if (['txt','rtf','csv'].includes(ext) || String(blob.type || '').startsWith('text/')) { setFileViewer({ ...base, loading: false, kind: 'text', text: await blob.text() }); return; }
      const objectUrl = URL.createObjectURL(blob);
      if (['jpg','jpeg','png','webp','gif','svg'].includes(ext) || String(blob.type || '').startsWith('image/')) setFileViewer({ ...base, loading: false, kind: 'image', url: objectUrl, objectUrl });
      else if (['mp3','wav','ogg','m4a'].includes(ext) || String(blob.type || '').startsWith('audio/')) setFileViewer({ ...base, loading: false, kind: 'audio', url: objectUrl, objectUrl });
      else if (['mp4','webm','mov'].includes(ext) || String(blob.type || '').startsWith('video/')) setFileViewer({ ...base, loading: false, kind: 'video', url: objectUrl, objectUrl });
      else setFileViewer({ ...base, loading: false, kind: 'iframe', url: objectUrl, objectUrl });
    } catch (attachmentError) { setFileViewer({ ...base, loading: false, kind: 'error', error: attachmentError?.message || 'Không thể xem trước tệp.' }); }
  }
  async function downloadAttachment(item, attachment) { markRead(item.id); setError(''); const result = await downloadWorkHubAttachment({ ...attachment, item_id: item.id }, { itemId: item.id, fileName: attachment.name }); if (!result.ok) setError(result.message || 'Không thể tải tệp về máy.'); }
  async function downloadAllAttachments(item) {
    const attachments = Array.isArray(item?.attachments) ? item.attachments : []; if (!attachments.length) return; markRead(item.id);
    for (const attachment of attachments) { const result = await downloadWorkHubAttachment({ ...attachment, item_id: item.id }, { itemId: item.id, fileName: attachment.name }); if (!result.ok) { setError(result.message || `Không thể tải ${attachment.name || 'tệp'}.`); break; } await new Promise((resolve) => window.setTimeout(resolve, 180)); }
  }
  async function editAttachment(item, attachment) {
    markRead(item.id); setError(''); const popup = window.open('', '_blank', 'noopener,noreferrer');
    const result = await createWorkHubAttachmentEditUrl({ ...attachment, item_id: item.id }, { itemId: item.id });
    if (!result.ok) { if (popup) popup.close(); setError(result.message || 'Không thể mở tệp để chỉnh sửa.'); return; }
    if (popup) popup.location.href = result.url; else window.open(result.url, '_blank', 'noopener,noreferrer');
  }
  function beginResponse(item) { markRead(item.id); setResponseItem(item); setResponseText(''); setResponseFiles([]); setError(''); }

  async function submitResponse(event) {
    event.preventDefault(); if (!responseItem || busy) return;
    if (!responseText.trim() && !responseFiles.length) { setError('Vui lòng nhập phản hồi hoặc đính kèm tệp.'); return; }
    const validation = validateWorkHubFiles(responseFiles); if (!validation.ok) { setError(validation.message); return; }
    if (!client || !runtime.ready || !runtime.session) { setNotice('Phản hồi cần kết nối hệ thống để gửi đến TTCM.'); return; }
    setBusy(true); setError('');
    let attachments = [];
    try {
      if (responseFiles.length) {
        const upload = await uploadWorkHubSubmissionFiles({ files: responseFiles, itemId: responseItem.id, userId: currentUser.id });
        if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp phản hồi.');
        attachments = upload.attachments || [];
      }
      const responseType = typeForItem(responseItem).id === 'feedback' ? 'feedback' : 'submission';
      const { error: responseError } = await client.from('work_hub_comments').insert({ item_id: responseItem.id, author_id: currentUser.id, body: responseText.trim() || 'Đã hoàn thành yêu cầu.', comment_type: responseType === 'feedback' ? 'review' : 'submission', attachments });
      if (responseError) { if (attachments.length) await removeWorkHubSubmissionFiles(attachments).catch(() => {}); throw responseError; }
      markRead(responseItem.id); setResponseItem(null); setResponseText(''); setResponseFiles([]); setNotice(responseType === 'feedback' ? 'Đã gửi góp ý trực tiếp đến TTCM.' : 'Đã gửi phản hồi/hoàn thành đến TTCM.'); window.setTimeout(() => setNotice(''), 3200);
    } catch (responseError) { setError(responseError?.message || 'Không thể gửi phản hồi đến TTCM.'); } finally { setBusy(false); }
  }
  async function acknowledge(item) {
    markRead(item.id); if (!client || !runtime.ready || !runtime.session) { setNotice('Đã ghi nhận xác nhận trên thiết bị này.'); return; }
    setBusy(true); setError('');
    try { const { error: ackError } = await client.from('work_hub_comments').insert({ item_id: item.id, author_id: currentUser.id, body: 'Đã xác nhận đã nhận thông tin.', comment_type: 'comment', attachments: [] }); if (ackError) throw ackError; setNotice('Đã xác nhận với TTCM.'); window.setTimeout(() => setNotice(''), 2800); }
    catch (ackError) { setError(ackError?.message || 'Không thể gửi xác nhận.'); } finally { setBusy(false); }
  }

  if (!host || !allowed) return null;

  const tab = createPortal(
    <button type="button" className={`brian-nav__ttcm-tab ${open ? 'is-active' : ''}`} aria-expanded={open} aria-haspopup="dialog"
      onClick={() => { setOpen((value) => !value); setComposeOpen(false); setError(''); if (!open) { setWorkspaceView('feed'); setFilter(manager ? 'all' : 'unread'); setSelectedItemId(''); loadFeed(); } }}>
      <Icon name="campaign" size={18} /><span>TTCM</span>{unseenCount > 0 ? <b className="brian-nav__ttcm-badge" aria-label={`${unseenCount} nội dung chưa đọc`}>{unseenCount > 99 ? '99+' : unseenCount}</b> : null}
    </button>, host,
  );

  const selectedType = selectedItem ? typeForItem(selectedItem) : null;
  const selectedAttachments = Array.isArray(selectedItem?.attachments) ? selectedItem.attachments : [];
  const selectedUnread = Boolean(selectedItem && userIsAssignee(selectedItem, currentUser?.id) && !readIds.has(String(selectedItem.id)));
  const canManageSelected = Boolean(selectedItem && manager && (selectedItem.created_by === currentUser?.id || selectedItem.owner_id === currentUser?.id));
  const canActOnSelected = Boolean(selectedItem && userIsAssignee(selectedItem, currentUser?.id) && isActionItem(selectedItem));

  const panel = open && typeof document !== 'undefined' ? createPortal(
    <div className="ttcm-m3-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !composeOpen) setOpen(false); }}>
      <section ref={rootRef} className="ttcm-m3-shell ttcm-reader-shell" role="dialog" aria-modal="true" aria-label="Kênh TTCM">
        <header className="ttcm-m3-topbar">
          <div className="ttcm-m3-title"><span className="ttcm-m3-title-icon"><Icon name="campaign" size={22} /></span><div><strong>Kênh TTCM</strong><small>{manager ? 'Điều hành và giao tiếp với tổ chuyên môn' : 'Thông báo, tài liệu và yêu cầu từ TTCM'}</small></div></div>
          <div className="ttcm-m3-top-actions">
            {workspaceView === 'feed' && unseenCount > 0 ? <button type="button" className="ttcm-reader-mark-all" onClick={markAllRead}><Icon name="check" size={18} />Đánh dấu tất cả đã đọc</button> : null}
            <button type="button" className="ttcm-m3-icon-button" onClick={() => loadFeed()} title="Làm mới" aria-label="Làm mới"><Icon name="refresh" /></button>
            {manager && workspaceView === 'feed' ? <button type="button" className="ttcm-m3-filled-button" onClick={beginCompose}><Icon name="add" size={18} />Tạo nội dung</button> : null}
            <button type="button" className="ttcm-m3-icon-button" onClick={() => setOpen(false)} title="Đóng" aria-label="Đóng"><Icon name="close" /></button>
          </div>
        </header>

        <div className="ttcm-m3-toolbar ttcm-reader-toolbar">
          <div className="ttcm-m3-workspace-tabs" role="tablist" aria-label="Khu vực TTCM">
            <button type="button" className={workspaceView === 'feed' ? 'is-selected' : ''} onClick={() => setWorkspaceView('feed')}><Icon name="campaign" size={18} />Trao đổi</button>
            <button type="button" className={workspaceView === 'schedule' ? 'is-selected' : ''} onClick={() => setWorkspaceView('schedule')}><Icon name="calendar" size={18} />Lịch làm việc</button>
            <button type="button" className={workspaceView === 'personnel' ? 'is-selected' : ''} onClick={() => setWorkspaceView('personnel')}><Icon name="people" size={18} />Nhân sự</button>
          </div>
        </div>

        {notice ? <div className="ttcm-m3-banner is-success">{notice}</div> : null}
        {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}

        {workspaceView === 'feed' ? (
          <main className="ttcm-reader-workspace">
            <aside className="ttcm-reader-sidebar" aria-label="Hộp thư TTCM">
              <div className="ttcm-reader-sidebar-title">HỘP THƯ</div>
              {[
                ['all', 'Tất cả', '#64748b'],
                ['unread', 'Chưa đọc', '#1795e6'],
                ['action', 'Cần xử lý', '#e6a21a'],
                ['due', 'Sắp đến hạn', '#e45d4f'],
                ['done', 'Hoàn tất', '#32a76d'],
              ].map(([id, label, color]) => (
                <button key={id} type="button" className={filter === id ? 'is-selected' : ''} onClick={() => { setFilter(id); setSelectedItemId(''); }}>
                  <span className="ttcm-reader-dot" style={{ '--dot': color }} /><span>{label}</span><b>{counts[id]}</b>
                </button>
              ))}
              <div className="ttcm-reader-brand">Brian English</div>
            </aside>

            <section className="ttcm-reader-list" aria-label="Danh sách thông báo">
              <header className="ttcm-reader-list-head"><div><span>{filter === 'unread' ? 'Thông báo chưa đọc' : filter === 'action' ? 'Nội dung cần xử lý' : filter === 'due' ? 'Nội dung sắp đến hạn' : filter === 'done' ? 'Nội dung hoàn tất' : 'Thông báo mới nhất'}</span><small>{filteredItems.length} nội dung</small></div></header>
              <div className="ttcm-reader-list-scroll">
                {loading ? <div className="ttcm-reader-empty">Đang đồng bộ kênh TTCM…</div> : null}
                {!loading && filteredItems.map((item) => {
                  const type = typeForItem(item); const unread = userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id));
                  const active = String(selectedItem?.id || '') === String(item.id); const attachments = Array.isArray(item.attachments) ? item.attachments : [];
                  return (
                    <article key={item.id} role="button" tabIndex={0} className={`ttcm-reader-card is-${type.id} ${unread ? 'is-unread' : ''} ${active ? 'is-selected' : ''}`}
                      onClick={() => openItem(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openItem(item); } }}>
                      <span className="ttcm-reader-card-icon"><Icon name={type.glyph} size={20} /></span>
                      <div className="ttcm-reader-card-body">
                        <div className="ttcm-reader-card-meta"><span>{type.label}</span><time>{formatDate(item.created_at || item.updated_at)}</time>{unread ? <b>Mới</b> : null}</div>
                        <h3>{item.title}</h3>
                        {item.description ? <p>{item.description}</p> : <p className="is-muted">Nhấn để xem nội dung chi tiết.</p>}
                        <div className="ttcm-reader-card-foot">
                          {item.due_at ? <span className="ttcm-reader-due">Hạn {formatDate(item.due_at)} · {dueLabel(item.due_at)}</span> : null}
                          {attachments.length ? <span>{attachments.length} tệp đính kèm</span> : null}
                        </div>
                      </div>
                      <span className="ttcm-reader-chevron">›</span>
                    </article>
                  );
                })}
                {!loading && !filteredItems.length ? <div className="ttcm-reader-empty"><Icon name="campaign" size={30} /><strong>Không có nội dung trong mục này</strong><span>{manager ? 'Tạo nội dung mới hoặc chọn bộ lọc khác.' : 'Thông báo mới từ TTCM sẽ xuất hiện tại đây.'}</span></div> : null}
              </div>
            </section>

            <section className="ttcm-reader-detail" aria-label="Nội dung thông báo">
              {selectedItem ? (
                <>
                  <header className="ttcm-reader-detail-head">
                    <button type="button" className="ttcm-reader-back" onClick={() => setSelectedItemId('')}>← Quay lại danh sách</button>
                    <div className="ttcm-reader-detail-actions">
                      {canManageSelected ? <button type="button" onClick={() => beginEdit(selectedItem)} title="Chỉnh sửa"><Icon name="edit" size={18} /></button> : null}
                    </div>
                  </header>
                  <div className="ttcm-reader-detail-scroll">
                    <div className="ttcm-reader-detail-meta"><span className={`is-${selectedType?.id || 'announcement'}`}>{selectedType?.label || 'Thông báo'}</span><time>{formatFullDate(selectedItem.created_at || selectedItem.updated_at)}</time>{selectedUnread ? <b>Mới</b> : null}</div>
                    <h2>{selectedItem.title}</h2>
                    {selectedItem.due_at ? <div className="ttcm-reader-detail-due"><Icon name="calendar" size={18} /><div><span>Hạn xử lý</span><b>{formatFullDate(selectedItem.due_at)}</b></div><em>{dueLabel(selectedItem.due_at)}</em></div> : null}
                    <div className="ttcm-reader-message">{selectedItem.description ? selectedItem.description : 'TTCM chưa nhập nội dung mô tả bổ sung cho thông báo này.'}</div>

                    {selectedAttachments.length ? (
                      <section className="ttcm-reader-files">
                        <header><div><strong>Tệp đính kèm</strong><small>{selectedAttachments.length} tệp</small></div><button type="button" onClick={() => downloadAllAttachments(selectedItem)}><Icon name="download" size={17} />Tải xuống tất cả</button></header>
                        <div>
                          {selectedAttachments.map((attachment, index) => {
                            const ext = getWorkHubAttachmentExtension(attachment); const meta = [ext ? ext.toUpperCase() : 'FILE', formatFileSize(attachment.size)].filter(Boolean).join(' · ');
                            return (
                              <article key={`${attachment.path || attachment.name}-${index}`} className="ttcm-reader-file-row">
                                <span className={`ttcm-reader-file-type is-${ext || 'file'}`}>{ext ? ext.slice(0, 4).toUpperCase() : 'FILE'}</span>
                                <div><b>{attachment.name || `Tệp ${index + 1}`}</b><small>{meta}</small></div>
                                <div className="ttcm-reader-file-actions">
                                  <button type="button" onClick={() => previewAttachment(selectedItem, attachment)} title="Xem trước"><Icon name="eye" size={18} /></button>
                                  {canManageSelected ? <button type="button" onClick={() => editAttachment(selectedItem, attachment)} title="Sửa trực tiếp"><Icon name="edit" size={18} /></button> : null}
                                  <button type="button" onClick={() => downloadAttachment(selectedItem, attachment)} title="Tải về"><Icon name="download" size={18} /></button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}
                  </div>
                  <footer className="ttcm-reader-detail-footer">
                    {selectedAttachments.length ? <button type="button" className="ttcm-reader-secondary" onClick={() => previewAttachment(selectedItem, selectedAttachments[0])}><Icon name="eye" size={18} />Xem tệp</button> : <span />}
                    {canActOnSelected ? (
                      <div className={manager ? 'ttcm-reader-manager-footer' : undefined}>
                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button> : null}
                        {selectedType?.id === 'acknowledgement'
                          ? <button type="button" className="ttcm-reader-primary" disabled={busy} onClick={() => acknowledge(selectedItem)}><Icon name="check" size={18} />Xác nhận đã nhận</button>
                          : <button type="button" className="ttcm-reader-primary" onClick={() => beginResponse(selectedItem)}>{selectedType?.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}<Icon name="arrow" size={18} /></button>}
                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button> : null}
                      </div>
                    ) : canManageSelected ? (
                      <div className="ttcm-reader-manager-footer"><button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button><button type="button" className="ttcm-reader-primary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button></div>
                    ) : (
                      <button type="button" className={`ttcm-reader-primary ${selectedUnread ? '' : 'is-done'}`} onClick={() => markRead(selectedItem.id)} disabled={!selectedUnread}><Icon name="check" size={18} />{selectedUnread ? 'Đánh dấu đã đọc' : 'Đã đọc'}</button>
                    )}
                  </footer>
                </>
              ) : <div className="ttcm-reader-detail-empty"><span><Icon name="campaign" size={32} /></span><strong>Chọn một thông báo để đọc</strong><p>Nội dung đầy đủ, thời hạn và tệp đính kèm sẽ hiển thị tại đây.</p></div>}
            </section>
          </main>
        ) : workspaceView === 'schedule' ? <main className="ttcm-m3-schedule-view"><div className="ttcm-m3-schedule-host v1093-work-hub" data-ttcm-schedule-host="true" /><GlobalWorkScheduleCompatibleCenter currentUser={currentUser} language={language} route="ttcm" embedded mountSelector='[data-ttcm-schedule-host="true"]' /></main>
          : <main className="ttcm-m3-personnel-view" role="tabpanel" aria-label="Nhân sự tổ chuyên môn"><PersonnelLookup currentUser={currentUser} language={language} /></main>}

        {fileViewer ? (
          <div className="ttcm-m3-compose-layer ttcm-m3-file-viewer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFileViewer(); }}>
            <section className="ttcm-m3-file-viewer" role="dialog" aria-modal="true" aria-label={`Xem trước ${fileViewer.name || 'tài liệu'}`}>
              <header><div className="ttcm-m3-file-viewer-title"><span><Icon name="folder" size={21} /></span><div><strong>{fileViewer.name || 'Tài liệu'}</strong><small>{[fileViewer.ext ? fileViewer.ext.toUpperCase() : '', formatFileSize(fileViewer.attachment?.size)].filter(Boolean).join(' · ') || 'Tệp đính kèm TTCM'}</small></div></div><button type="button" className="ttcm-m3-icon-button" onClick={closeFileViewer} aria-label="Đóng"><Icon name="close" /></button></header>
              <div className={`ttcm-m3-file-viewer-body is-${fileViewer.kind || 'loading'}`}>
                {fileViewer.loading ? <div className="ttcm-m3-file-viewer-state"><span className="ttcm-m3-file-spinner" /><strong>Đang chuẩn bị bản xem trước…</strong></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'error' ? <div className="ttcm-m3-file-viewer-state is-error"><Icon name="folder" size={30} /><strong>Chưa thể xem trước tệp này</strong><small>{fileViewer.error}</small></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'text' ? <pre className="ttcm-m3-text-preview">{fileViewer.text || ''}</pre> : null}
                {!fileViewer.loading && fileViewer.kind === 'image' ? <img className="ttcm-m3-image-preview" src={fileViewer.url} alt={fileViewer.name || 'Tài liệu'} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'audio' ? <audio className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'video' ? <video className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'iframe' ? <iframe className="ttcm-m3-iframe-preview" title={fileViewer.name || 'Xem trước tài liệu'} src={fileViewer.url} allow="fullscreen" /> : null}
              </div>
              <footer><div><span>Bản xem trước</span><small>{fileViewer.externalOffice ? 'Hiển thị bằng Microsoft Office Viewer' : 'Hiển thị trực tiếp trong Brian'}</small></div><div>{manager && (fileViewer.item?.created_by === currentUser?.id || fileViewer.item?.owner_id === currentUser?.id) ? <button type="button" className="ttcm-m3-tonal-button" onClick={() => editAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="edit" size={17} />Sửa trực tiếp</button> : null}<button type="button" className="ttcm-m3-filled-button" onClick={() => downloadAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="download" size={17} />Tải về</button></div></footer>
            </section>
          </div>
        ) : null}

        {responseViewerItem && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation"><section className="ttcm-m3-response-dialog ttcm-m3-response-viewer" aria-label="Phản hồi của tổ viên"><header><div><strong>Phản hồi của tổ viên</strong><small>{responseViewerItem.title}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => setResponseViewerItem(null)} aria-label="Đóng"><Icon name="close" /></button></header><div className="ttcm-m3-response-list">{responsesForItem(responseViewerItem.id).map((entry) => <article key={entry.id}><header><span className="ttcm-m3-avatar">{String(responseAuthor(entry.author_id)).trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><div><b>{responseAuthor(entry.author_id)}</b><small>{formatDate(entry.created_at)}</small></div></header><p>{entry.body || 'Đã xác nhận.'}</p>{Array.isArray(entry.attachments) && entry.attachments.length ? <div className="ttcm-m3-attachments">{entry.attachments.map((attachment, index) => <button key={`${entry.id}-${index}`} type="button" onClick={() => previewAttachment(responseViewerItem, attachment)}><Icon name="download" size={17} /><span>{attachment.name || `Tệp ${index + 1}`}</span></button>)}</div> : null}</article>)}{!responsesForItem(responseViewerItem.id).length ? <div className="ttcm-m3-response-empty"><Icon name="people" size={28} /><strong>Chưa có phản hồi</strong><span>Phản hồi, xác nhận và tệp của tổ viên sẽ xuất hiện tại đây.</span></div> : null}</div><footer><button type="button" className="ttcm-m3-filled-button" onClick={() => setResponseViewerItem(null)}>Đóng</button></footer></section></div>
        ) : null}

        {responseItem && userIsAssignee(responseItem, currentUser?.id) ? (
          <div className="ttcm-m3-compose-layer" role="presentation"><form className="ttcm-m3-response-dialog" onSubmit={submitResponse}><header><div><strong>{typeForItem(responseItem).id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi yêu cầu'}</strong><small>{responseItem.title}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => { setResponseItem(null); setResponseFiles([]); }} aria-label="Đóng"><Icon name="close" /></button></header><label className="ttcm-m3-field"><span>Nội dung phản hồi</span><textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} rows={5} placeholder="Nhập góp ý, kết quả thực hiện hoặc nội dung cần phản hồi…" /></label><div className="ttcm-m3-field ttcm-m3-multi-upload"><span>Tệp đính kèm <small>({responseFiles.length}/{WORK_HUB_MAX_ATTACHMENTS} tệp · tối đa 50 MB/tệp · hỗ trợ tệp nén)</small></span><input type="file" multiple accept={WORK_HUB_ATTACHMENT_ACCEPT} aria-label="Chọn tối đa 10 tệp phản hồi" onChange={selectResponseFiles} /><div className="ttcm-m3-upload-copy"><span>PDF, Word, Excel/CSV, PowerPoint, ảnh, văn bản, ZIP/RAR/7Z/TAR/GZ, âm thanh và video.</span>{responseFiles.length ? <button type="button" className="ttcm-m3-text-button" onClick={() => { setResponseFiles([]); setError(''); }}>Xóa tất cả</button> : null}</div>{responseFiles.length ? <div className="ttcm-m3-selected-files">{responseFiles.map((selectedFile, index) => <div className="ttcm-m3-selected-file" key={selectedFileKey(selectedFile)}><div className="ttcm-m3-selected-file-main"><span className="ttcm-m3-selected-file-icon"><Icon name="folder" size={18} /></span><span><b>{selectedFile.name}</b><small>{String(selectedFile.name || '').split('.').pop()?.toUpperCase() || 'FILE'} · {formatFileSize(selectedFile.size)}</small></span></div><button type="button" className="ttcm-m3-selected-file-remove" onClick={() => removeResponseFile(index)}>Xóa</button></div>)}</div> : null}</div>{error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}<footer><button type="button" className="ttcm-m3-text-button" onClick={() => { setResponseItem(null); setResponseFiles([]); }}>Hủy</button><button type="submit" className="ttcm-m3-filled-button" disabled={busy}>{busy ? `Đang gửi${responseFiles.length ? ` ${responseFiles.length} tệp` : ''}…` : 'Gửi phản hồi'}</button></footer></form></div>
        ) : null}

        {composeOpen && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation"><form className="ttcm-m3-compose" onSubmit={editingId ? saveEditedCommunication : saveCommunication}>
            <header><div><strong>{editingId ? 'Chỉnh sửa nội dung TTCM' : 'Tạo nội dung TTCM'}</strong><small>{editingId ? 'Thay đổi sẽ cập nhật cùng một nội dung đã gửi.' : 'Chọn đúng loại nội dung và người nhận.'}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => { setComposeOpen(false); setEditingId(''); setFiles([]); }} aria-label="Đóng"><Icon name="close" /></button></header>
            <div className="ttcm-m3-type-grid">{CONTENT_TYPES.map((entry) => <button key={entry.id} type="button" className={kind === entry.id ? 'is-selected' : ''} onClick={() => setKind(entry.id)}><span><Icon name={entry.glyph} size={20} /></span><b>{entry.label}</b><small>{entry.helper}</small></button>)}</div>
            <label className="ttcm-m3-field"><span>Tiêu đề</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Nhập tiêu đề ngắn gọn" /></label>
            <label className="ttcm-m3-field"><span>Nội dung</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Mô tả nội dung, yêu cầu hoặc hướng dẫn cần thiết" /></label>
            <div className="ttcm-m3-field-row"><label className="ttcm-m3-field"><span>Hạn xử lý <small>(nếu có)</small></span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><div className="ttcm-m3-field ttcm-m3-multi-upload"><span>Tệp đính kèm <small>({files.length}/{WORK_HUB_MAX_ATTACHMENTS} tệp · tối đa 50 MB/tệp)</small></span><input type="file" multiple accept={WORK_HUB_ATTACHMENT_ACCEPT} aria-label="Chọn tối đa 10 tệp đính kèm" onChange={selectComposerFiles} /><div className="ttcm-m3-upload-copy"><span>PDF, Word, Excel/CSV, PowerPoint, ảnh, văn bản, file nén, âm thanh và video.</span>{files.length ? <button type="button" className="ttcm-m3-text-button" onClick={() => { setFiles([]); setError(''); }}>Xóa tất cả</button> : null}</div>{editingId && !files.length && editingAttachments.length ? <div className="ttcm-m3-upload-existing">Đang giữ {editingAttachments.length} tệp hiện tại. Chọn tệp mới nếu muốn thay toàn bộ.</div> : null}{files.length ? <div className="ttcm-m3-selected-files">{files.map((selectedFile, index) => <div className="ttcm-m3-selected-file" key={selectedFileKey(selectedFile)}><div className="ttcm-m3-selected-file-main"><span className="ttcm-m3-selected-file-icon"><Icon name="folder" size={18} /></span><span><b>{selectedFile.name}</b><small>{String(selectedFile.name || '').split('.').pop()?.toUpperCase() || 'FILE'} · {formatFileSize(selectedFile.size)}</small></span></div><button type="button" className="ttcm-m3-selected-file-remove" onClick={() => removeComposerFile(index)}>Xóa</button></div>)}</div> : null}</div></div>
            <section className="ttcm-m3-recipients"><header><div><strong>Người nhận</strong><small>{selectedRecipients.length}/{departmentRecipients.length} người được chọn · TTCM luôn được nhận</small></div><div><button type="button" className="ttcm-m3-text-button" onClick={() => setSelectedRecipients(departmentRecipients.map((person) => person.id))}>Toàn bộ tổ</button><button type="button" className="ttcm-m3-text-button" onClick={() => setSelectedRecipients(uniqueIds([currentUser?.id]))}>Bỏ chọn tổ viên</button></div></header><input className="ttcm-m3-search" value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} placeholder="Tìm giáo viên…" /><div className="ttcm-m3-recipient-list">{visibleRecipients.map((person) => { const isSelf = String(person.id) === String(currentUser?.id); return <label key={person.id}><input type="checkbox" checked={isSelf || selectedRecipients.includes(person.id)} disabled={isSelf} onChange={() => toggleRecipient(person.id)} /><span className="ttcm-m3-avatar">{String(person.name || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><span><b>{person.name}{isSelf ? ' · TTCM' : ''}</b><small>{person.email || 'Giáo viên'}{isSelf ? ' · luôn nhận nội dung' : ''}</small></span></label>; })}{!visibleRecipients.length ? <div className="ttcm-m3-recipient-empty">Chưa tìm thấy giáo viên phù hợp.</div> : null}</div></section>
            {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}<footer><button type="button" className="ttcm-m3-text-button" onClick={() => { setComposeOpen(false); setEditingId(''); setFiles([]); }}>Hủy</button><button type="submit" className="ttcm-m3-filled-button" disabled={busy}>{busy ? (editingId ? 'Đang lưu…' : `Đang gửi ${files.length ? `${files.length} tệp…` : '…'}`) : (editingId ? 'Lưu thay đổi' : 'Gửi đến người nhận')}</button></footer>
          </form></div>
        ) : null}
      </section>
    </div>, document.body,
  ) : null;

  return <>{tab}{panel}</>;
}
