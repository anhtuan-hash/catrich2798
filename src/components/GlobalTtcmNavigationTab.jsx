import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import { launchRoute } from '../utils/navigation.js';
import {
  createWorkHubAttachmentUrl,
  rememberWorkHubItem,
  uploadWorkHubSubmissionFile,
  validateWorkHubFile,
} from '../utils/workHubDelivery.js';
import './GlobalTtcmNavigationTab.css';

const WORK_ITEM_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,attachments,metadata,source_module,created_at,updated_at,submitted_at,reviewed_at,completed_at';
const LOCAL_FEED_PREFIX = 'bes-ttcm-feed-v1';
const READ_PREFIX = 'bes-ttcm-read-v1';

const CONTENT_TYPES = [
  { id: 'announcement', label: 'Thông báo', helper: 'Thông tin chỉ cần đọc', glyph: 'campaign', action: false },
  { id: 'resource', label: 'Gửi tài liệu', helper: 'Tệp dùng chung của tổ', glyph: 'folder', action: false },
  { id: 'feedback', label: 'Xin góp ý', helper: 'Giáo viên phản hồi trong Công việc', glyph: 'edit', action: true },
  { id: 'acknowledgement', label: 'Yêu cầu xác nhận', helper: 'Cần xác nhận đã nhận', glyph: 'check', action: true },
  { id: 'task', label: 'Yêu cầu thực hiện', helper: 'Theo dõi trong Trung tâm công việc', glyph: 'task', action: true },
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

export default function GlobalTtcmNavigationTab({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [items, setItems] = useState(() => readLocalItems(currentUser));
  const [people, setPeople] = useState([]);
  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));
  const [filter, setFilter] = useState('all');
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
    setItems(readLocalItems(currentUser));
    setReadIds(readReadIds(currentUser));
  }, [currentUser?.id, currentUser?.email]);

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
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ttcm-hub-open');
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (composeOpen) setComposeOpen(false);
      else setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ttcm-hub-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [composeOpen, open]);

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
        ? 'Đã gửi đến tổ viên và tạo mục theo dõi trong Trung tâm công việc.'
        : 'Đã gửi nội dung đến kênh TTCM.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (saveError) {
      setError(saveError?.message || 'Không thể gửi nội dung TTCM.');
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(item, attachment) {
    markRead(item.id);
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const url = await createWorkHubAttachmentUrl({ ...attachment, item_id: item.id });
      if (!url) throw new Error('Không thể tạo đường dẫn tải tệp.');
      if (popup) popup.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (attachmentError) {
      if (popup) popup.close();
      setError(attachmentError?.message || 'Không thể mở tệp.');
    }
  }

  function openWorkItem(item) {
    markRead(item.id);
    rememberWorkHubItem(item.id);
    setOpen(false);
    launchRoute({ target: '#/work-hub', label: 'CV', color: '#0b57d0' });
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
        if (!open) loadFeed();
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
            {manager ? <button type="button" className="ttcm-m3-filled-button" onClick={beginCompose}><Icon name="add" size={18} />Tạo nội dung</button> : null}
            <button type="button" className="ttcm-m3-icon-button" onClick={() => setOpen(false)} title="Đóng" aria-label="Đóng"><Icon name="close" /></button>
          </div>
        </header>

        <div className="ttcm-m3-toolbar">
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
        </div>

        {notice ? <div className="ttcm-m3-banner is-success">{notice}</div> : null}
        {error ? <div className="ttcm-m3-banner is-error">{error}</div> : null}

        <main className="ttcm-m3-feed">
          {loading ? <div className="ttcm-m3-empty">Đang đồng bộ kênh TTCM…</div> : null}
          {!loading && filteredItems.map((item) => {
            const type = typeForItem(item);
            const unread = !manager && item.created_by !== currentUser?.id && !readIds.has(String(item.id));
            const attachments = Array.isArray(item.attachments) ? item.attachments : [];
            return (
              <article key={item.id} className={`ttcm-m3-card ${unread ? 'is-unread' : ''}`} onClick={() => markRead(item.id)}>
                <div className={`ttcm-m3-card-icon is-${type.id}`}><Icon name={type.glyph} size={22} /></div>
                <div className="ttcm-m3-card-main">
                  <div className="ttcm-m3-card-meta">
                    <span className="ttcm-m3-type-chip">{type.label}</span>
                    <span>{formatDate(item.created_at || item.updated_at)}</span>
                    {manager ? <span><Icon name="people" size={15} /> {uniqueIds(item.assignee_ids).length} giáo viên</span> : null}
                    {unread ? <i>Mới</i> : null}
                  </div>
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.due_at ? <div className="ttcm-m3-due"><b>Hạn:</b> {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.due_at))}<span>{dueLabel(item.due_at)}</span></div> : null}
                  {attachments.length ? (
                    <div className="ttcm-m3-attachments">
                      {attachments.map((attachment, index) => (
                        <button key={`${attachment.path || attachment.name}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); openAttachment(item, attachment); }}>
                          <Icon name="download" size={17} />
                          <span>{attachment.name || `Tài liệu ${index + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!manager && isActionItem(item) ? (
                    <div className="ttcm-m3-card-actions">
                      {type.id === 'acknowledgement' ? <button type="button" className="ttcm-m3-tonal-button" disabled={busy} onClick={(event) => { event.stopPropagation(); acknowledge(item); }}><Icon name="check" size={18} />Xác nhận đã nhận</button> : null}
                      <button type="button" className="ttcm-m3-filled-button" onClick={(event) => { event.stopPropagation(); openWorkItem(item); }}>Mở trong Công việc<Icon name="arrow" size={18} /></button>
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
        </main>

        {composeOpen && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation">
            <form className="ttcm-m3-compose" onSubmit={saveCommunication}>
              <header>
                <div>
                  <strong>Tạo nội dung TTCM</strong>
                  <small>Chọn đúng loại để hệ thống quyết định có đưa sang Trung tâm công việc hay không.</small>
                </div>
                <button type="button" className="ttcm-m3-icon-button" onClick={() => setComposeOpen(false)} aria-label="Đóng"><Icon name="close" /></button>
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
                  <span>Tệp đính kèm <small>(tối đa 10 MB)</small></span>
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
                <button type="button" className="ttcm-m3-text-button" onClick={() => setComposeOpen(false)}>Hủy</button>
                <button type="submit" className="ttcm-m3-filled-button" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi đến tổ viên'}</button>
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
