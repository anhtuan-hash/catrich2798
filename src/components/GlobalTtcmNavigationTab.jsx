import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  createWorkHubAttachmentEditUrl,
  createWorkHubAttachmentUrl,
  downloadWorkHubAttachment,
  fetchWorkHubAttachmentBlob,
  getWorkHubAttachmentExtension,
  removeWorkHubSubmissionFiles,
  uploadWorkHubSubmissionFile,
  validateWorkHubFile,
} from '../utils/workHubDelivery.js';
import GlobalWorkScheduleCompatibleCenter from './GlobalWorkScheduleCompatibleCenter.jsx';
import PersonnelLookup from './PersonnelLookupGoogleV2.jsx';
import './GlobalWorkScheduleModern.css';
import './GlobalTtcmNavigationTab.css';
import './GlobalTtcmPersonnel.css';

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

function localFeedKey(user) {
  return `${LOCAL_FEED_PREFIX}:${user?.id || user?.email || 'guest'}`;
}

function readKey(user) {
  return `${READ_PREFIX}:${user?.id || user?.email || 'guest'}`;
}

function readLocalItems(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(localFeedKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItems(user, items) {
  try { localStorage.setItem(localFeedKey(user), JSON.stringify(items.slice(0, 180))); } catch { /* optional cache */ }
}

function readReadIds(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(readKey(user)) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeReadIds(user, ids) {
  try { localStorage.setItem(readKey(user), JSON.stringify([...ids].slice(-500))); } catch { /* optional preference */ }
}

function uniqueIds(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function departmentKey(person) {
  return String(
    person?.department_id || person?.department || person?.subject_group
    || person?.group_name || person?.subject || '',
  ).trim().toLowerCase();
}

function normalizePerson(profile) {
  return {
    id: profile?.id || profile?.user_id || profile?.profile_id || '',
    name: profile?.full_name || profile?.name || profile?.email || 'Giáo viên',
    email: profile?.email || '',
    role: profile?.role || 'teacher',
    department_id: profile?.department_id || profile?.departmentId || '',
    department: profile?.department || profile?.department_name || '',
    subject_group: profile?.subject_group || profile?.team || profile?.group_name || '',
    subject: profile?.subject || '',
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function dateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function dueLabel(value) {
  if (!value) return '';
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return '';
  const ms = due.getTime() - Date.now();
  if (ms <= 0) return 'Đã đến hạn';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `Còn ${days} ngày`;
  if (hours > 0) return `Còn ${hours} giờ`;
  return 'Sắp đến hạn';
}

function typeForItem(item) {
  const kind = item?.metadata?.ttcm_kind || String(item?.item_type || '').replace(/^ttcm_/, '');
  return CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0];
}

function isActionItem(item) {
  return Boolean(item?.metadata?.ttcm_action_required || typeForItem(item).action);
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function sanitizePreviewHtml(value) {
  if (typeof DOMParser === 'undefined') return String(value || '');
  const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,meta,link').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const attrValue = String(attribute.value || '').trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && attrValue.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return doc.body.innerHTML;
}

export default function GlobalTtcmNavigationTab({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [workspaceView, setWorkspaceView] = useState('feed');
  const [responseItem, setResponseItem] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responseViewerItem, setResponseViewerItem] = useState(null);
  const [fileViewer, setFileViewer] = useState(null);
  const [items, setItems] = useState(() => readLocalItems(currentUser));
  const [people, setPeople] = useState([]);
  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));
  const [filter, setFilter] = useState('action');
  const [kind, setKind] = useState('announcement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [file, setFile] = useState(null);
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
  const vi = language !== 'en';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__primary');
      setHost((current) => current === nextHost ? current : nextHost);
    };
    findHost();
    const frame = window.requestAnimationFrame(findHost);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const openTtcm = (event) => {
      const requestedView = event?.detail?.view;
      const nextView = ['schedule', 'personnel'].includes(requestedView) ? requestedView : 'feed';
      setWorkspaceView(nextView);
      if (nextView === 'feed') setFilter('action');
      setOpen(true);
      setComposeOpen(false);
      setError('');
    };
    window.addEventListener('bes-ttcm-open', openTtcm);
    try {
      const pending = window.sessionStorage.getItem('bes-ttcm-open-on-load');
      if (pending) {
        window.sessionStorage.removeItem('bes-ttcm-open-on-load');
        window.setTimeout(() => openTtcm({ detail: { view: pending } }), 0);
      }
    } catch { /* optional */ }
    return () => window.removeEventListener('bes-ttcm-open', openTtcm);
  }, []);

  useEffect(() => {
    setItems(readLocalItems(currentUser));
    setReadIds(readReadIds(currentUser));
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => () => {
    if (fileViewer?.objectUrl) URL.revokeObjectURL(fileViewer.objectUrl);
  }, [fileViewer?.objectUrl]);

  const loadFeed = useCallback(async ({ silent = false } = {}) => {
    if (!allowed || !currentUser?.id) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      if (!client || !runtime.ready || !runtime.session) {
        setItems(readLocalItems(currentUser));
        return;
      }
      const { data, error: loadError } = await client
        .from('work_hub_items')
        .select(WORK_ITEM_COLUMNS)
        .eq('source_module', 'ttcm')
        .order('created_at', { ascending: false })
        .limit(180);
      if (loadError) throw loadError;
      const visible = (data || []).filter((item) => {
        const assignees = uniqueIds(item.assignee_ids);
        if (manager) return item.created_by === currentUser.id || item.owner_id === currentUser.id || assignees.includes(currentUser.id);
        return assignees.includes(currentUser.id) || item.owner_id === currentUser.id;
      });
      setItems(visible);
      writeLocalItems(currentUser, visible);
    } catch (loadError) {
      setError(loadError?.message || 'Không thể đồng bộ kênh TTCM.');
      setItems(readLocalItems(currentUser));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [allowed, client, currentUser, manager, runtime.ready, runtime.session]);

  const loadResponses = useCallback(async () => {
    if (!manager || !client || !runtime.ready || !runtime.session) {
      setResponses([]);
      return;
    }
    const actionIds = items.filter(isActionItem).map((item) => item.id).filter(Boolean);
    if (!actionIds.length) {
      setResponses([]);
      return;
    }
    const { data, error: responseError } = await client
      .from('work_hub_comments')
      .select('id,item_id,author_id,body,comment_type,attachments,created_at')
      .in('item_id', actionIds)
      .order('created_at', { ascending: true });
    if (responseError) return;
    setResponses(data || []);
  }, [client, items, manager, runtime.ready, runtime.session]);

  const loadPeople = useCallback(async () => {
    if (!manager || !client || !runtime.ready || !runtime.session) return;
    const attempts = [
      'id,full_name,email,role,department_id,department,subject_group,subject',
      'id,full_name,email,role,department_id',
      'id,full_name,email,role',
      'id,email,role',
      'user_id,full_name,email,role,department_id',
      'profile_id,full_name,email,role,department_id',
    ];
    let profiles = null;
    for (const columns of attempts) {
      const { data, error: peopleError } = await client.from('profiles').select(columns).limit(500);
      if (!peopleError) { profiles = data || []; break; }
      if (!/column .* does not exist|42703/i.test(peopleError.message || '')) break;
    }
    if (!profiles) return;
    setPeople(profiles.map(normalizePerson).filter((person) => person.id));
  }, [client, manager, runtime.ready, runtime.session]);

  useEffect(() => {
    if (!allowed) return undefined;
    loadFeed({ silent: true });
    if (manager) loadPeople();
    return subscribeTable({
      key: `ttcm-feed-${currentUser?.id || 'guest'}`,
      table: 'work_hub_items',
      filter: 'source_module=eq.ttcm',
      onChange: () => loadFeed({ silent: true }),
    });
  }, [allowed, currentUser?.id, loadFeed, loadPeople, manager]);

  useEffect(() => {
    if (!open || !manager) return undefined;
    loadResponses();
    return subscribeTable({
      key: `ttcm-responses-${currentUser?.id || 'manager'}`,
      table: 'work_hub_comments',
      onChange: () => loadResponses(),
    });
  }, [currentUser?.id, loadResponses, manager, open]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ttcm-hub-open');
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (responseViewerItem) setResponseViewerItem(null);
      else if (responseItem) setResponseItem(null);
      else if (composeOpen) setComposeOpen(false);
      else setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ttcm-hub-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [composeOpen, open, responseItem, responseViewerItem]);

  const eligibleTeachers = useMemo(() => people.filter((person) => {
    if (!person?.id || person.id === currentUser?.id) return false;
    const role = normalizeRole(person.role);
    return !['student', 'learner', 'pupil', 'parent', 'guardian', 'guest', 'admin', 'administrator'].includes(role);
  }), [currentUser?.id, people]);

  const currentProfile = useMemo(
    () => people.find((person) => person.id === currentUser?.id) || normalizePerson(currentUser),
    [currentUser, people],
  );
  const currentDepartment = departmentKey(currentProfile);
  const departmentTeachers = useMemo(() => {
    if (!currentDepartment) return eligibleTeachers;
    const matched = eligibleTeachers.filter((person) => departmentKey(person) === currentDepartment);
    return matched.length ? matched : eligibleTeachers;
  }, [currentDepartment, eligibleTeachers]);

  const visibleRecipients = useMemo(() => {
    const needle = recipientQuery.trim().toLowerCase();
    const source = departmentTeachers;
    if (!needle) return source;
    return source.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));
  }, [departmentTeachers, recipientQuery]);

  const unseenCount = useMemo(() => {
    if (manager) return 0;
    return items.filter((item) => item.created_by !== currentUser?.id && !readIds.has(String(item.id))).length;
  }, [currentUser?.id, items, manager, readIds]);

  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'action') return isActionItem(item);
    return typeForItem(item).id === filter;
  }), [filter, items]);

  function responsesForItem(itemId) {
    return responses.filter((entry) => String(entry.item_id) === String(itemId));
  }

  function responseAuthor(authorId) {
    const person = people.find((entry) => String(entry.id) === String(authorId));
    return person?.name || person?.email || 'Giáo viên';
  }

  function markRead(itemId) {
    const id = String(itemId || '');
    if (!id) return;
    setReadIds((current) => {
      const next = new Set(current);
      next.add(id);
      writeReadIds(currentUser, next);
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(readIds);
    items.forEach((item) => next.add(String(item.id)));
    setReadIds(next);
    writeReadIds(currentUser, next);
  }

  function beginCompose() {
    setEditingId('');
    setComposeOpen(true);
    setKind('announcement');
    setTitle('');
    setDescription('');
    setDueAt('');
    setFile(null);
    setRecipientQuery('');
    setSelectedRecipients(departmentTeachers.map((person) => person.id));
    setError('');
    setNotice('');
  }

  function beginEdit(item) {
    if (!manager || !item) return;
    const canManage = item.created_by === currentUser?.id || item.owner_id === currentUser?.id;
    if (!canManage) return;
    setEditingId(String(item.id));
    setKind(typeForItem(item).id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setDueAt(dateTimeLocalValue(item.due_at));
    setFile(null);
    setRecipientQuery('');
    setSelectedRecipients(uniqueIds(item.assignee_ids));
    setError('');
    setNotice('');
    setComposeOpen(true);
  }

  async function saveEditedCommunication(event) {
    event.preventDefault();
    if (!manager || busy || !editingId) return;
    const existing = items.find((item) => String(item.id) === String(editingId));
    if (!existing) { setError('Không tìm thấy nội dung cần chỉnh sửa.'); return; }
    const canManage = existing.created_by === currentUser?.id || existing.owner_id === currentUser?.id;
    if (!canManage) { setError('Bạn không có quyền chỉnh sửa nội dung này.'); return; }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    const recipients = uniqueIds(selectedRecipients);
    if (!recipients.length) { setError('Vui lòng chọn ít nhất một giáo viên nhận nội dung.'); return; }
    if (file) {
      const validation = validateWorkHubFile(file);
      if (!validation.ok) { setError(validation.message); return; }
    }

    const type = CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0];
    setBusy(true); setError(''); setNotice('');
    try {
      const editedAt = new Date().toISOString();
      const patch = {
        title: title.trim(),
        description: description.trim(),
        item_type: `ttcm_${kind}`,
        status: type.action
          ? (['completed', 'approved', 'archived'].includes(String(existing.status || '').toLowerCase()) ? 'assigned' : (existing.status || 'assigned'))
          : 'completed',
        priority: kind === 'task' ? 'high' : 'normal',
        assignee_ids: recipients,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        metadata: {
          ...(existing.metadata || {}),
          ttcm: true,
          ttcm_kind: kind,
          ttcm_action_required: type.action,
          notify_assignee: type.action,
          recipient_count: recipients.length,
          ttcm_edited_at: editedAt,
          ttcm_edited_by: currentUser.id,
        },
        updated_at: editedAt,
      };

      let updated = { ...existing, ...patch };
      if (client && runtime.ready && runtime.session) {
        if (file) {
          const upload = await uploadWorkHubSubmissionFile({ file, itemId: existing.id, userId: currentUser.id });
          if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp đính kèm mới.');
          patch.attachments = [upload.attachment];
        }
        const { data, error: updateError } = await client
          .from('work_hub_items')
          .update(patch)
          .eq('id', existing.id)
          .eq('created_by', currentUser.id)
          .select(WORK_ITEM_COLUMNS)
          .single();
        if (updateError) throw updateError;
        updated = data;

        if (file) {
          const previousAttachments = Array.isArray(existing.attachments) ? existing.attachments : [];
          if (previousAttachments.length) {
            removeWorkHubSubmissionFiles(previousAttachments).catch(() => {});
          }
        }
      }

      const next = items.map((item) => String(item.id) === String(updated.id) ? updated : item);
      setItems(next);
      writeLocalItems(currentUser, next);
      setEditingId('');
      setComposeOpen(false);
      setFile(null);
      setNotice('Đã cập nhật nội dung đã gửi. Thay đổi được đồng bộ trực tiếp đến tổ viên trong Kênh TTCM.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (editError) {
      setError(editError?.message || 'Không thể cập nhật nội dung TTCM.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCommunication(item) {
    if (!manager || busy || !item) return;
    const canManage = item.created_by === currentUser?.id || item.owner_id === currentUser?.id;
    if (!canManage) return;
    const confirmed = window.confirm(`Xóa “${item.title}”?\n\nNội dung sẽ biến mất khỏi Kênh TTCM và dữ liệu theo dõi liên quan. Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    setBusy(true); setError(''); setNotice('');
    try {
      if (client && runtime.ready && runtime.session) {
        const attachments = Array.isArray(item.attachments) ? item.attachments : [];
        if (attachments.length) {
          const removeResult = await removeWorkHubSubmissionFiles(attachments);
          if (!removeResult.ok) throw new Error(removeResult.message || 'Không thể xóa tệp đính kèm.');
        }
        const { error: deleteError } = await client
          .from('work_hub_items')
          .delete()
          .eq('id', item.id)
          .eq('created_by', currentUser.id);
        if (deleteError) throw deleteError;
      }

      const next = items.filter((entry) => String(entry.id) !== String(item.id));
      setItems(next);
      writeLocalItems(currentUser, next);
      setReadIds((current) => {
        const updated = new Set(current);
        updated.delete(String(item.id));
        writeReadIds(currentUser, updated);
        return updated;
      });
      if (String(editingId) === String(item.id)) {
        setEditingId('');
        setComposeOpen(false);
      }
      setNotice('Đã xóa nội dung TTCM và dữ liệu theo dõi liên quan.');
      window.setTimeout(() => setNotice(''), 3200);
    } catch (deleteError) {
      setError(deleteError?.message || 'Không thể xóa nội dung TTCM.');
    } finally {
      setBusy(false);
    }
  }

  function toggleRecipient(id) {
    setSelectedRecipients((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  async function saveCommunication(event) {
    event.preventDefault();
    if (!manager || busy) return;
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    const recipients = uniqueIds(selectedRecipients);
    if (!recipients.length) { setError('Vui lòng chọn ít nhất một giáo viên nhận nội dung.'); return; }
    if (file) {
      const validation = validateWorkHubFile(file);
      if (!validation.ok) { setError(validation.message); return; }
    }

    const type = CONTENT_TYPES.find((entry) => entry.id === kind) || CONTENT_TYPES[0];
    setBusy(true); setError(''); setNotice('');
    try {
      const now = new Date().toISOString();
      const payload = {
        title: title.trim(),
        description: description.trim(),
        item_type: `ttcm_${kind}`,
        status: type.action ? 'assigned' : 'completed',
        priority: kind === 'task' ? 'high' : 'normal',
        visibility: 'department',
        owner_id: currentUser.id,
        created_by: currentUser.id,
        assignee_ids: recipients,
        watcher_ids: [],
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        attachments: [],
        metadata: {
          ttcm: true,
          ttcm_kind: kind,
          ttcm_action_required: type.action,
          notify_assignee: type.action,
          recipient_count: recipients.length,
          created_in: 'ttcm-material3-hub',
        },
        source_module: 'ttcm',
      };

      let created = null;
      if (client && runtime.ready && runtime.session) {
        const { data, error: insertError } = await client
          .from('work_hub_items')
          .insert(payload)
          .select(WORK_ITEM_COLUMNS)
          .single();
        if (insertError) throw insertError;
        created = data;

        if (file && created?.id) {
          const upload = await uploadWorkHubSubmissionFile({ file, itemId: created.id, userId: currentUser.id });
          if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp đính kèm.');
          const { data: updated, error: attachmentError } = await client
            .from('work_hub_items')
            .update({ attachments: [upload.attachment], updated_at: new Date().toISOString() })
            .eq('id', created.id)
            .select(WORK_ITEM_COLUMNS)
            .single();
          if (attachmentError) throw attachmentError;
          created = updated;
        }
      } else {
        created = {
          ...payload,
          id: `ttcm-${Date.now()}`,
          created_at: now,
          updated_at: now,
        };
      }

      const next = [created, ...items.filter((item) => item.id !== created.id)];
      setItems(next);
      writeLocalItems(currentUser, next);
      setComposeOpen(false);
      setNotice(type.action
        ? 'Đã gửi đến tổ viên và bật theo dõi phản hồi ngay trong Kênh TTCM.'
        : 'Đã gửi nội dung đến kênh TTCM.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (saveError) {
      setError(saveError?.message || 'Không thể gửi nội dung TTCM.');
    } finally {
      setBusy(false);
    }
  }

  function closeFileViewer() {
    setFileViewer(null);
  }

  async function previewAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const target = { ...attachment, item_id: item.id };
    const ext = getWorkHubAttachmentExtension(target);
    const base = { item, attachment: target, name: target.name || 'Tài liệu', ext, loading: true, kind: 'loading', error: '' };
    setFileViewer(base);

    try {
      if (ext === 'docx') {
        try {
          const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
          const arrayBuffer = await blob.arrayBuffer();
          const jsZipModule = await import('jszip');
          const JSZip = jsZipModule.default || jsZipModule;
          const zip = await JSZip.loadAsync(arrayBuffer);
          const documentEntry = zip.file('word/document.xml');
          if (!documentEntry || typeof documentEntry.async !== 'function') {
            throw new Error('DOCX không có word/document.xml hợp lệ.');
          }
          const xmlText = await documentEntry.async('string');
          const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
          if (xml.getElementsByTagName('parsererror').length) {
            throw new Error('Không thể đọc cấu trúc XML của DOCX.');
          }

          const elementChildren = (node, localName) => Array.from(node?.childNodes || [])
            .filter((child) => child?.nodeType === 1 && (!localName || child.localName === localName));
          const firstChild = (node, localName) => elementChildren(node, localName)[0] || null;
          const descendants = (node, localName) => Array.from(node?.getElementsByTagNameNS?.('*', localName) || []);
          const wordValue = (node) => node?.getAttribute?.('w:val') || node?.getAttributeNS?.('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'val') || '';
          const escapePreviewText = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          const renderRun = (run) => {
            let content = '';
            elementChildren(run).forEach((child) => {
              if (child.localName === 't' || child.localName === 'instrText') content += escapePreviewText(child.textContent || '');
              else if (child.localName === 'tab') content += '<span style="display:inline-block;width:2em"></span>';
              else if (child.localName === 'br' || child.localName === 'cr') content += '<br>';
              else if (child.localName === 'drawing' || child.localName === 'pict') content += '<span style="color:#5f6368">[Hình ảnh]</span>';
            });
            if (!content) {
              const fallbackText = descendants(run, 't').map((node) => node.textContent || '').join('');
              content = escapePreviewText(fallbackText);
            }
            const props = firstChild(run, 'rPr');
            if (props) {
              if (firstChild(props, 'b')) content = `<strong>${content}</strong>`;
              if (firstChild(props, 'i')) content = `<em>${content}</em>`;
              if (firstChild(props, 'u')) content = `<u>${content}</u>`;
              if (firstChild(props, 'strike')) content = `<s>${content}</s>`;
              const vertAlign = firstChild(props, 'vertAlign');
              const vertValue = wordValue(vertAlign);
              if (vertValue === 'superscript') content = `<sup>${content}</sup>`;
              if (vertValue === 'subscript') content = `<sub>${content}</sub>`;
            }
            return content;
          };

          const renderParagraph = (paragraph) => {
            const runs = descendants(paragraph, 'r');
            let content = runs.map(renderRun).join('');
            if (!content.trim()) content = '&nbsp;';
            const props = firstChild(paragraph, 'pPr');
            const align = wordValue(firstChild(props, 'jc'));
            const style = wordValue(firstChild(props, 'pStyle')).toLowerCase();
            const css = [];
            if (align === 'center') css.push('text-align:center');
            else if (align === 'right' || align === 'end') css.push('text-align:right');
            else if (align === 'both' || align === 'distribute') css.push('text-align:justify');
            if (firstChild(props, 'numPr')) content = `<span style="margin-right:.45em">•</span>${content}`;
            if (style.includes('title')) return `<h2 style="${css.join(';')}">${content}</h2>`;
            if (style.includes('heading') || style.includes('head')) return `<h3 style="${css.join(';')}">${content}</h3>`;
            return `<p style="margin:.35em 0;${css.join(';')}">${content}</p>`;
          };

          const renderTable = (table) => {
            const rows = elementChildren(table, 'tr').map((row) => {
              const cells = elementChildren(row, 'tc').map((cell) => {
                const props = firstChild(cell, 'tcPr');
                const span = Math.max(1, Number(wordValue(firstChild(props, 'gridSpan'))) || 1);
                const inner = elementChildren(cell)
                  .filter((child) => child.localName === 'p' || child.localName === 'tbl')
                  .map((child) => child.localName === 'tbl' ? renderTable(child) : renderParagraph(child))
                  .join('');
                return `<td${span > 1 ? ` colspan="${span}"` : ''}>${inner || '&nbsp;'}</td>`;
              }).join('');
              return `<tr>${cells}</tr>`;
            }).join('');
            return `<table style="width:100%;border-collapse:collapse;margin:.7em 0"><tbody>${rows}</tbody></table>`;
          };

          const body = descendants(xml, 'body')[0];
          if (!body) throw new Error('DOCX không có phần nội dung chính.');
          const html = elementChildren(body)
            .filter((child) => child.localName === 'p' || child.localName === 'tbl')
            .map((child) => child.localName === 'tbl' ? renderTable(child) : renderParagraph(child))
            .join('');
          if (!html.trim()) throw new Error('DOCX không có nội dung có thể hiển thị.');
          setFileViewer({ ...base, loading: false, kind: 'html', html: sanitizePreviewHtml(html), previewEngine: 'brian-docx' });
          return;
        } catch (docxError) {
          console.warn('[TTCM] Brian DOCX preview fallback', docxError);
          const signedUrl = await createWorkHubAttachmentUrl(target);
          if (signedUrl) {
            const absoluteUrl = new URL(signedUrl, window.location.origin).href;
            const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
            setFileViewer({ ...base, loading: false, kind: 'iframe', url: officeUrl, externalOffice: true, previewEngine: 'office' });
            return;
          }
          throw new Error('Chưa thể dựng bản xem trước DOCX. Bạn vẫn có thể dùng “Sửa trực tiếp” hoặc “Tải về”.');
        }
      }

      if (ext === 'xlsx') {
        const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
        const readExcelModule = await import('read-excel-file');
        const readXlsxFile = readExcelModule.default || readExcelModule;
        const rows = await readXlsxFile(blob);
        setFileViewer({ ...base, loading: false, kind: 'table', rows: (rows || []).slice(0, 250) });
        return;
      }

      if (['doc', 'xls', 'ppt', 'pptx'].includes(ext)) {
        const signedUrl = await createWorkHubAttachmentUrl(target);
        if (signedUrl) {
          const absoluteUrl = new URL(signedUrl, window.location.origin).href;
          const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
          setFileViewer({ ...base, loading: false, kind: 'iframe', url: officeUrl, externalOffice: true });
          return;
        }
      }

      const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
      if (['txt', 'rtf'].includes(ext) || String(blob.type || '').startsWith('text/')) {
        setFileViewer({ ...base, loading: false, kind: 'text', text: await blob.text() });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || String(blob.type || '').startsWith('image/')) {
        setFileViewer({ ...base, loading: false, kind: 'image', url: objectUrl, objectUrl });
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || String(blob.type || '').startsWith('audio/')) {
        setFileViewer({ ...base, loading: false, kind: 'audio', url: objectUrl, objectUrl });
      } else if (['mp4', 'webm', 'mov'].includes(ext) || String(blob.type || '').startsWith('video/')) {
        setFileViewer({ ...base, loading: false, kind: 'video', url: objectUrl, objectUrl });
      } else {
        setFileViewer({ ...base, loading: false, kind: 'iframe', url: objectUrl, objectUrl });
      }
    } catch (attachmentError) {
      setFileViewer({ ...base, loading: false, kind: 'error', error: attachmentError?.message || 'Không thể xem trước tệp.' });
    }
  }

  async function downloadAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const result = await downloadWorkHubAttachment({ ...attachment, item_id: item.id }, { itemId: item.id, fileName: attachment.name });
    if (!result.ok) setError(result.message || 'Không thể tải tệp về máy.');
  }

  async function editAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    const result = await createWorkHubAttachmentEditUrl({ ...attachment, item_id: item.id }, { itemId: item.id });
    if (!result.ok) {
      if (popup) popup.close();
      setError(result.message || 'Không thể mở tệp để chỉnh sửa.');
      return;
    }
    if (result.warning) {
      setNotice(`Đã mở Google Drive. ${result.warning}`);
      window.setTimeout(() => setNotice(''), 4200);
    }
    if (popup) popup.location.href = result.url;
    else window.open(result.url, '_blank', 'noopener,noreferrer');
  }

  async function openAttachment(item, attachment) {
    return previewAttachment(item, attachment);
  }

  function beginResponse(item) {
    markRead(item.id);
    setResponseItem(item);
    setResponseText('');
    setResponseFile(null);
    setError('');
  }

  async function submitResponse(event) {
    event.preventDefault();
    if (!responseItem || busy) return;
    if (!responseText.trim() && !responseFile) {
      setError('Vui lòng nhập phản hồi hoặc đính kèm tệp.');
      return;
    }
    if (responseFile) {
      const validation = validateWorkHubFile(responseFile);
      if (!validation.ok) { setError(validation.message); return; }
    }
    if (!client || !runtime.ready || !runtime.session) {
      setNotice('Phản hồi cần kết nối Supabase để gửi đến TTCM.');
      return;
    }

    setBusy(true); setError('');
    try {
      let attachments = [];
      if (responseFile) {
        const upload = await uploadWorkHubSubmissionFile({ file: responseFile, itemId: responseItem.id, userId: currentUser.id });
        if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp phản hồi.');
        attachments = [upload.attachment];
      }
      const responseType = typeForItem(responseItem).id === 'feedback' ? 'feedback' : 'submission';
      const { error: responseError } = await client.from('work_hub_comments').insert({
        item_id: responseItem.id,
        author_id: currentUser.id,
        body: responseText.trim() || 'Đã hoàn thành yêu cầu.',
        type: responseType === 'submission' ? 'submission' : 'comment',
        comment_type: `ttcm_${responseType}`,
        attachments,
      });
      if (responseError) throw responseError;
      markRead(responseItem.id);
      setResponseItem(null);
      setResponseText('');
      setResponseFile(null);
      setNotice(responseType === 'feedback' ? 'Đã gửi góp ý trực tiếp đến TTCM.' : 'Đã gửi phản hồi/hoàn thành đến TTCM.');
      window.setTimeout(() => setNotice(''), 3200);
    } catch (responseError) {
      setError(responseError?.message || 'Không thể gửi phản hồi đến TTCM.');
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge(item) {
    markRead(item.id);
    if (!client || !runtime.ready || !runtime.session) {
      setNotice('Đã ghi nhận xác nhận trên thiết bị này.');
      return;
    }
    setBusy(true); setError('');
    try {
      const { error: ackError } = await client.from('work_hub_comments').insert({
        item_id: item.id,
        author_id: currentUser.id,
        body: 'Đã xác nhận đã nhận thông tin.',
        type: 'comment',
        comment_type: 'acknowledgement',
        attachments: [],
      });
      if (ackError) throw ackError;
      setNotice('Đã xác nhận với TTCM.');
      window.setTimeout(() => setNotice(''), 2800);
    } catch (ackError) {
      setError(ackError?.message || 'Không thể gửi xác nhận.');
    } finally {
      setBusy(false);
    }
  }

  if (!host || !allowed) return null;

  const tab = createPortal(
    <button
      type="button"
      className={`brian-nav__ttcm-tab ${open ? 'is-active' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => {
        setOpen((value) => !value);
        setComposeOpen(false);
        setError('');
        if (!open) { setWorkspaceView('feed'); setFilter('action'); loadFeed(); }
      }}
    >
      <Icon name="campaign" size={18} />
      <span>TTCM</span>
      {unseenCount > 0 ? <b className="brian-nav__ttcm-badge" aria-label={`${unseenCount} nội dung chưa đọc`}>{unseenCount > 99 ? '99+' : unseenCount}</b> : null}
    </button>,
    host,
  );

  const panel = open && typeof document !== 'undefined' ? createPortal(
    <div className="ttcm-m3-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !composeOpen) setOpen(false);
    }}>
      <section ref={rootRef} className="ttcm-m3-shell" role="dialog" aria-modal="true" aria-label="Kênh TTCM">
        <header className="ttcm-m3-topbar">
          <div className="ttcm-m3-title">
            <span className="ttcm-m3-title-icon"><Icon name="campaign" size={22} /></span>
            <div>
              <strong>Kênh TTCM</strong>
              <small>{manager ? 'Điều hành và giao tiếp với tổ chuyên môn' : 'Thông báo, tài liệu và yêu cầu từ TTCM'}</small>
            </div>
          </div>
          <div className="ttcm-m3-top-actions">
            <button type="button" className="ttcm-m3-icon-button" onClick={() => loadFeed()} title="Làm mới" aria-label="Làm mới"><Icon name="refresh" /></button>
            {manager && workspaceView === 'feed' ? <button type="button" className="ttcm-m3-filled-button" onClick={beginCompose}><Icon name="add" size={18} />Tạo nội dung</button> : null}
            <button type="button" className="ttcm-m3-icon-button" onClick={() => setOpen(false)} title="Đóng" aria-label="Đóng"><Icon name="close" /></button>
          </div>
        </header>

        <div className="ttcm-m3-toolbar">
          <div className="ttcm-m3-workspace-tabs" role="tablist" aria-label="Khu vực TTCM">
            <button type="button" className={workspaceView === 'feed' ? 'is-selected' : ''} onClick={() => setWorkspaceView('feed')}><Icon name="campaign" size={18} />Trao đổi</button>
            <button type="button" className={workspaceView === 'schedule' ? 'is-selected' : ''} onClick={() => setWorkspaceView('schedule')}><Icon name="calendar" size={18} />Lịch làm việc</button>
            <button type="button" className={workspaceView === 'personnel' ? 'is-selected' : ''} onClick={() => setWorkspaceView('personnel')}><Icon name="people" size={18} />Nhân sự</button>
          </div>
          {workspaceView === 'feed' ? <>
            <div className="ttcm-m3-filters" role="tablist" aria-label="Lọc nội dung TTCM">
              {[
                ['all', 'Tất cả'],
                ['announcement', 'Thông báo'],
                ['resource', 'Tài liệu'],
                ['action', 'Cần xử lý'],
              ].map(([id, label]) => (
                <button key={id} type="button" className={filter === id ? 'is-selected' : ''} onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
            {!manager && unseenCount > 0 ? <button type="button" className="ttcm-m3-text-button" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button> : null}
          </> : workspaceView === 'schedule' ? <span className="ttcm-m3-schedule-caption">Lịch dùng chung của tổ chuyên môn</span> : <span className="ttcm-m3-schedule-caption">Hồ sơ, chuyên môn và phân công tổ viên</span>}
        </div>

        {notice ? <div className="ttcm-m3-banner is-success">{notice}</div> : null}
        {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}

        {workspaceView === 'feed' ? <main className="ttcm-m3-feed">
          {loading ? <div className="ttcm-m3-empty">Đang đồng bộ kênh TTCM…</div> : null}
          {!loading && filteredItems.map((item) => {
            const type = typeForItem(item);
            const unread = !manager && item.created_by !== currentUser?.id && !readIds.has(String(item.id));
            const attachments = Array.isArray(item.attachments) ? item.attachments : [];
            const canManageItem = manager && (item.created_by === currentUser?.id || item.owner_id === currentUser?.id);
            return (
              <article key={item.id} className={`ttcm-m3-card ${unread ? 'is-unread' : ''}`} onClick={() => markRead(item.id)}>
                <div className={`ttcm-m3-card-icon is-${type.id}`}><Icon name={type.glyph} size={22} /></div>
                <div className="ttcm-m3-card-main">
                  <div className="ttcm-m3-card-meta">
                    <span className="ttcm-m3-type-chip">{type.label}</span>
                    <span>{formatDate(item.created_at || item.updated_at)}</span>
                    {manager ? <span><Icon name="people" size={15} /> {uniqueIds(item.assignee_ids).length} giáo viên</span> : null}
                    {item.metadata?.ttcm_edited_at ? <span className="ttcm-m3-edited-chip">Đã chỉnh sửa {formatDate(item.metadata.ttcm_edited_at)}</span> : null}
                    {unread ? <i>Mới</i> : null}
                  </div>
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.due_at ? <div className="ttcm-m3-due"><b>Hạn:</b> {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.due_at))}<span>{dueLabel(item.due_at)}</span></div> : null}
                  {attachments.length ? (
                    <div className="ttcm-m3-file-list">
                      {attachments.map((attachment, index) => {
                        const fileExt = getWorkHubAttachmentExtension(attachment);
                        const fileMeta = [fileExt ? fileExt.toUpperCase() : '', formatFileSize(attachment.size)].filter(Boolean).join(' · ');
                        return <div className="ttcm-m3-file-row" key={`${attachment.path || attachment.name}-${index}`}>
                          <button type="button" className="ttcm-m3-file-main" onClick={(event) => { event.stopPropagation(); previewAttachment(item, attachment); }}>
                            <span className="ttcm-m3-file-icon"><Icon name="folder" size={20} /></span>
                            <span><b>{attachment.name || `Tài liệu ${index + 1}`}</b>{fileMeta ? <small>{fileMeta}</small> : null}</span>
                          </button>
                          <div className="ttcm-m3-file-actions">
                            <button type="button" onClick={(event) => { event.stopPropagation(); previewAttachment(item, attachment); }}><Icon name="eye" size={17} />Xem trước</button>
                            {canManageItem ? <button type="button" onClick={(event) => { event.stopPropagation(); editAttachment(item, attachment); }}><Icon name="edit" size={17} />Sửa trực tiếp</button> : null}
                            <button type="button" onClick={(event) => { event.stopPropagation(); downloadAttachment(item, attachment); }}><Icon name="download" size={17} />Tải về</button>
                          </div>
                        </div>;
                      })}
                    </div>
                  ) : null}
                  {canManageItem ? (
                    <div className="ttcm-m3-manager-actions" aria-label="Quản lý nội dung đã gửi">
                      <button type="button" className="ttcm-m3-manager-button" disabled={busy} onClick={(event) => { event.stopPropagation(); beginEdit(item); }}>
                        <Icon name="edit" size={17} />Sửa
                      </button>
                      {isActionItem(item) ? <button type="button" className="ttcm-m3-manager-button" onClick={(event) => { event.stopPropagation(); setResponseViewerItem(item); loadResponses(); }}>
                        <Icon name="people" size={17} />Phản hồi ({responsesForItem(item.id).length})
                      </button> : null}
                      <button type="button" className="ttcm-m3-manager-button is-danger" disabled={busy} onClick={(event) => { event.stopPropagation(); deleteCommunication(item); }}>
                        <Icon name="delete" size={17} />Xóa
                      </button>
                    </div>
                  ) : null}
                  {!manager && isActionItem(item) ? (
                    <div className="ttcm-m3-card-actions">
                      {type.id === 'acknowledgement' ? <button type="button" className="ttcm-m3-tonal-button" disabled={busy} onClick={(event) => { event.stopPropagation(); acknowledge(item); }}><Icon name="check" size={18} />Xác nhận đã nhận</button> : null}
                      {type.id !== 'acknowledgement' ? <button type="button" className="ttcm-m3-filled-button" onClick={(event) => { event.stopPropagation(); beginResponse(item); }}>{type.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}<Icon name="arrow" size={18} /></button> : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!loading && !filteredItems.length ? (
            <div className="ttcm-m3-empty">
              <span><Icon name="campaign" size={30} /></span>
              <strong>Chưa có nội dung trong mục này</strong>
              <small>{manager ? 'Tạo thông báo, gửi tài liệu hoặc giao yêu cầu cho tổ viên.' : 'Nội dung mới từ TTCM sẽ xuất hiện tại đây.'}</small>
            </div>
          ) : null}
        </main> : workspaceView === 'schedule' ? <main className="ttcm-m3-schedule-view">
          <div className="ttcm-m3-schedule-host v1093-work-hub" data-ttcm-schedule-host="true" />
          <GlobalWorkScheduleCompatibleCenter currentUser={currentUser} language={language} route="ttcm" embedded mountSelector='[data-ttcm-schedule-host="true"]' />
        </main> : <main className="ttcm-m3-personnel-view" role="tabpanel" aria-label="Nhân sự tổ chuyên môn">
          <PersonnelLookup currentUser={currentUser} language={language} />
        </main>}

        {fileViewer ? (
          <div className="ttcm-m3-compose-layer ttcm-m3-file-viewer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFileViewer(); }}>
            <section className="ttcm-m3-file-viewer" role="dialog" aria-modal="true" aria-label={`Xem trước ${fileViewer.name || 'tài liệu'}`}>
              <header>
                <div className="ttcm-m3-file-viewer-title"><span><Icon name="folder" size={21} /></span><div><strong>{fileViewer.name || 'Tài liệu'}</strong><small>{[fileViewer.ext ? fileViewer.ext.toUpperCase() : '', formatFileSize(fileViewer.attachment?.size)].filter(Boolean).join(' · ') || 'Tệp đính kèm TTCM'}</small></div></div>
                <button type="button" className="ttcm-m3-icon-button" onClick={closeFileViewer} aria-label="Đóng"><Icon name="close" /></button>
              </header>
              <div className={`ttcm-m3-file-viewer-body is-${fileViewer.kind || 'loading'}`}>
                {fileViewer.loading ? <div className="ttcm-m3-file-viewer-state"><span className="ttcm-m3-file-spinner" /><strong>Đang chuẩn bị bản xem trước…</strong><small>Tệp được đọc qua kết nối bảo mật của Brian.</small></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'error' ? <div className="ttcm-m3-file-viewer-state is-error"><Icon name="folder" size={30} /><strong>Chưa thể xem trước tệp này</strong><small>{fileViewer.error}</small></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'html' ? <article className="ttcm-m3-docx-preview" dangerouslySetInnerHTML={{ __html: fileViewer.html || '' }} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'text' ? <pre className="ttcm-m3-text-preview">{fileViewer.text || ''}</pre> : null}
                {!fileViewer.loading && fileViewer.kind === 'table' ? <div className="ttcm-m3-sheet-preview"><table><tbody>{(fileViewer.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{(row || []).map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? '')}</td>)}</tr>)}</tbody></table></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'image' ? <img className="ttcm-m3-image-preview" src={fileViewer.url} alt={fileViewer.name || 'Tài liệu'} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'audio' ? <audio className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'video' ? <video className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'iframe' ? <iframe className="ttcm-m3-iframe-preview" title={fileViewer.name || 'Xem trước tài liệu'} src={fileViewer.url} allow="fullscreen" /> : null}
              </div>
              <footer>
                <div><span>Bản xem trước</span><small>{fileViewer.externalOffice ? 'Hiển thị bằng Microsoft Office Viewer' : 'Hiển thị trực tiếp trong Brian'}</small></div>
                <div>
                  {manager && (fileViewer.item?.created_by === currentUser?.id || fileViewer.item?.owner_id === currentUser?.id) ? <button type="button" className="ttcm-m3-tonal-button" onClick={() => editAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="edit" size={17} />Sửa trực tiếp</button> : null}
                  <button type="button" className="ttcm-m3-filled-button" onClick={() => downloadAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="download" size={17} />Tải về</button>
                </div>
              </footer>
            </section>
          </div>
        ) : null}

        {responseViewerItem && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation">
            <section className="ttcm-m3-response-dialog ttcm-m3-response-viewer" aria-label="Phản hồi của tổ viên">
              <header><div><strong>Phản hồi của tổ viên</strong><small>{responseViewerItem.title}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => setResponseViewerItem(null)} aria-label="Đóng"><Icon name="close" /></button></header>
              <div className="ttcm-m3-response-list">
                {responsesForItem(responseViewerItem.id).map((entry) => (
                  <article key={entry.id}>
                    <header><span className="ttcm-m3-avatar">{String(responseAuthor(entry.author_id)).trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><div><b>{responseAuthor(entry.author_id)}</b><small>{formatDate(entry.created_at)}</small></div></header>
                    <p>{entry.body || 'Đã xác nhận.'}</p>
                    {Array.isArray(entry.attachments) && entry.attachments.length ? <div className="ttcm-m3-attachments">{entry.attachments.map((attachment, index) => <button key={`${entry.id}-${index}`} type="button" onClick={() => openAttachment(responseViewerItem, attachment)}><Icon name="download" size={17} /><span>{attachment.name || `Tệp ${index + 1}`}</span></button>)}</div> : null}
                  </article>
                ))}
                {!responsesForItem(responseViewerItem.id).length ? <div className="ttcm-m3-response-empty"><Icon name="people" size={28} /><strong>Chưa có phản hồi</strong><span>Phản hồi, xác nhận và tệp của tổ viên sẽ xuất hiện tại đây theo thời gian thực.</span></div> : null}
              </div>
              <footer><button type="button" className="ttcm-m3-filled-button" onClick={() => setResponseViewerItem(null)}>Đóng</button></footer>
            </section>
          </div>
        ) : null}

        {responseItem && !manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation">
            <form className="ttcm-m3-response-dialog" onSubmit={submitResponse}>
              <header><div><strong>{typeForItem(responseItem).id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi yêu cầu'}</strong><small>{responseItem.title}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => setResponseItem(null)} aria-label="Đóng"><Icon name="close" /></button></header>
              <label className="ttcm-m3-field"><span>Nội dung phản hồi</span><textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} rows={5} placeholder="Nhập góp ý, kết quả thực hiện hoặc nội dung cần phản hồi…" /></label>
              <label className="ttcm-m3-field"><span>Tệp đính kèm <small>(nếu có, tối đa 10 MB)</small></span><input type="file" onChange={(event) => setResponseFile(event.target.files?.[0] || null)} /></label>
              {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}
              <footer><button type="button" className="ttcm-m3-text-button" onClick={() => setResponseItem(null)}>Hủy</button><button type="submit" className="ttcm-m3-filled-button" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi đến TTCM'}</button></footer>
            </form>
          </div>
        ) : null}

        {composeOpen && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation">
            <form className="ttcm-m3-compose" onSubmit={editingId ? saveEditedCommunication : saveCommunication}>
              <header>
                <div>
                  <strong>{editingId ? 'Chỉnh sửa nội dung TTCM' : 'Tạo nội dung TTCM'}</strong>
                  <small>{editingId ? 'Thay đổi sẽ cập nhật cùng một nội dung đã gửi và đồng bộ sang Trung tâm công việc.' : 'Chọn đúng loại để hệ thống quyết định có đưa sang Trung tâm công việc hay không.'}</small>
                </div>
                <button type="button" className="ttcm-m3-icon-button" onClick={() => { setComposeOpen(false); setEditingId(''); }} aria-label="Đóng"><Icon name="close" /></button>
              </header>

              <div className="ttcm-m3-type-grid">
                {CONTENT_TYPES.map((entry) => (
                  <button key={entry.id} type="button" className={kind === entry.id ? 'is-selected' : ''} onClick={() => setKind(entry.id)}>
                    <span><Icon name={entry.glyph} size={20} /></span>
                    <b>{entry.label}</b>
                    <small>{entry.helper}</small>
                  </button>
                ))}
              </div>

              <label className="ttcm-m3-field">
                <span>Tiêu đề</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Nhập tiêu đề ngắn gọn" />
              </label>
              <label className="ttcm-m3-field">
                <span>Nội dung</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Mô tả nội dung, yêu cầu hoặc hướng dẫn cần thiết" />
              </label>

              <div className="ttcm-m3-field-row">
                <label className="ttcm-m3-field">
                  <span>Hạn xử lý <small>(nếu có)</small></span>
                  <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                </label>
                <label className="ttcm-m3-field">
                  <span>Tệp đính kèm <small>{editingId ? '(để trống nếu giữ tệp hiện tại)' : '(tối đa 10 MB)'}</small></span>
                  <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                </label>
              </div>

              <section className="ttcm-m3-recipients">
                <header>
                  <div>
                    <strong>Người nhận</strong>
                    <small>{selectedRecipients.length}/{departmentTeachers.length} giáo viên được chọn</small>
                  </div>
                  <div>
                    <button type="button" className="ttcm-m3-text-button" onClick={() => setSelectedRecipients(departmentTeachers.map((person) => person.id))}>Toàn bộ tổ</button>
                    <button type="button" className="ttcm-m3-text-button" onClick={() => setSelectedRecipients([])}>Bỏ chọn</button>
                  </div>
                </header>
                <input className="ttcm-m3-search" value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} placeholder="Tìm giáo viên…" />
                <div className="ttcm-m3-recipient-list">
                  {visibleRecipients.map((person) => (
                    <label key={person.id}>
                      <input type="checkbox" checked={selectedRecipients.includes(person.id)} onChange={() => toggleRecipient(person.id)} />
                      <span className="ttcm-m3-avatar">{String(person.name || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span>
                      <span><b>{person.name}</b><small>{person.email || 'Giáo viên'}</small></span>
                    </label>
                  ))}
                  {!visibleRecipients.length ? <div className="ttcm-m3-recipient-empty">Chưa tìm thấy giáo viên phù hợp.</div> : null}
                </div>
              </section>

              {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}
              <footer>
                <button type="button" className="ttcm-m3-text-button" onClick={() => { setComposeOpen(false); setEditingId(''); }}>Hủy</button>
                <button type="submit" className="ttcm-m3-filled-button" disabled={busy}>{busy ? (editingId ? 'Đang lưu…' : 'Đang gửi…') : (editingId ? 'Lưu thay đổi' : 'Gửi đến tổ viên')}</button>
              </footer>
            </form>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  ) : null;

  return <>{tab}{panel}</>;
}
