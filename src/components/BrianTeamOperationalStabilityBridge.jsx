import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing, CheckCircle2, Clock3, ExternalLink, FileText, History,
  Radio, RefreshCw, RotateCcw, ShieldCheck, X,
} from 'lucide-react';
import { subscribeTable } from '../services/runtime/core.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import {
  formatWorkHubFileSize,
  rememberWorkHubItem,
  resolveWorkHubCommentAttachments,
} from '../utils/workHubDelivery.js';

const WORKSPACE_PREFIX = 'bes-brian-team-workspace-v1';
const FORWARD_LINK_PREFIX = 'bes-brian-team-workhub-links-v1';
const TEACHER_READ_PREFIX = 'bes-brian-team-teacher-notification-read-v1';
const CLOUD_WORKSPACE_TABLE = 'department_team_workspaces';
const SOURCE_MODULE = 'brian-team';
const LEADER_FALLBACK_INTERVAL = 60_000;
const TEACHER_FALLBACK_INTERVAL = 120_000;
const WORK_ITEM_COLUMNS = 'id,title,description,status,priority,due_at,owner_id,assignee_ids,metadata,source_module,created_at,updated_at,submitted_at,reviewed_at,completed_at';
const WORK_ITEM_COLUMNS_FALLBACK = 'id,title,description,status,priority,due_at,owner_id,assignee_ids,metadata,source_module,updated_at,submitted_at,reviewed_at,completed_at';
const COMMENT_COLUMNS = 'id,item_id,author_id,body,comment_type,attachments,created_at';
const TERMINAL = new Set(['approved', 'completed', 'archived']);
const TEACHER_NOTICE_STATUSES = new Set(['assigned', 'changes_requested', 'approved', 'completed', 'archived']);

function scopeOf(user) {
  return String(user?.id || user?.email || 'department-leader')
    .trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'department-leader';
}

function workspaceKey(user) { return `${WORKSPACE_PREFIX}:${scopeOf(user)}`; }
function forwardLinkKey(user) { return `${FORWARD_LINK_PREFIX}:${scopeOf(user)}`; }
function teacherReadKey(user) { return `${TEACHER_READ_PREFIX}:${scopeOf(user)}`; }

function safeRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeWrite(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional cache */ }
}

function unique(values = []) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function normalizeDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function sameArray(a = [], b = []) {
  const left = unique(a).sort();
  const right = unique(b).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assignmentSignature(entry) {
  return JSON.stringify({
    title: entry.title,
    description: entry.description,
    dueDate: entry.dueDate,
    priority: entry.priority,
    status: entry.status,
    assigneeAccountIds: entry.assigneeAccountIds,
    departmentId: entry.departmentId,
  });
}

function flattenAssignments(workspace) {
  const result = [];
  (workspace?.departments || []).forEach((department) => {
    const accounts = new Map((department.members || []).map((member) => [
      String(member.id), String(member.teacherAccountId || ''),
    ]));
    (department.assignments || []).forEach((assignment) => {
      result.push({
        id: String(assignment.id || ''),
        title: String(assignment.title || '').trim(),
        description: String(assignment.description || '').trim(),
        dueDate: String(assignment.dueDate || ''),
        priority: ['low', 'normal', 'high', 'urgent'].includes(assignment.priority) ? assignment.priority : 'normal',
        status: assignment.status || 'progress',
        assigneeAccountIds: unique((assignment.assigneeIds || [])
          .map((memberId) => accounts.get(String(memberId))).filter(Boolean)),
        departmentId: String(department.id || ''),
      });
    });
  });
  return result.filter((entry) => entry.id && entry.title);
}

function contentMatchesRemote(entry, rows) {
  if (!rows.length) return false;
  const first = rows[0];
  const remoteAssignees = rows.map((row) => (
    row.metadata?.brian_team_assignee_id || row.assignee_ids?.[0]
  )).filter(Boolean);
  return String(first.title || '') === entry.title
    && String(first.description || '') === entry.description
    && String(first.priority || 'normal') === entry.priority
    && normalizeDateOnly(first.due_at) === entry.dueDate
    && sameArray(remoteAssignees, entry.assigneeAccountIds);
}

function summaryOf(rows) {
  const counts = {
    total: rows.length, assigned: 0, accepted: 0, inProgress: 0, submitted: 0,
    changesRequested: 0, approved: 0, completed: 0, archived: 0,
  };
  rows.forEach((row) => {
    const status = String(row.status || 'assigned');
    if (status === 'assigned' || status === 'draft') counts.assigned += 1;
    else if (status === 'accepted') counts.accepted += 1;
    else if (status === 'in_progress') counts.inProgress += 1;
    else if (status === 'submitted') counts.submitted += 1;
    else if (status === 'changes_requested') counts.changesRequested += 1;
    else if (status === 'approved') counts.approved += 1;
    else if (status === 'completed') counts.completed += 1;
    else if (status === 'archived') counts.archived += 1;
  });
  const statuses = rows.map((row) => String(row.status || 'assigned'));
  let aggregateStatus = 'progress';
  if (statuses.length && statuses.every((status) => TERMINAL.has(status))) aggregateStatus = 'done';
  else if (
    statuses.length
    && statuses.every((status) => status === 'submitted' || TERMINAL.has(status))
    && statuses.some((status) => status === 'submitted')
  ) aggregateStatus = 'review';
  return {
    ...counts,
    finished: counts.approved + counts.completed + counts.archived,
    waitingReview: counts.submitted,
    aggregateStatus,
    updatedAt: rows.reduce((latest, row) => {
      const value = String(row.updated_at || '');
      return value > latest ? value : latest;
    }, '') || new Date().toISOString(),
  };
}

function summaryKey(summary) {
  return JSON.stringify({
    total: summary?.total || 0,
    assigned: summary?.assigned || 0,
    accepted: summary?.accepted || 0,
    inProgress: summary?.inProgress || 0,
    submitted: summary?.submitted || 0,
    changesRequested: summary?.changesRequested || 0,
    approved: summary?.approved || 0,
    completed: summary?.completed || 0,
    archived: summary?.archived || 0,
    aggregateStatus: summary?.aggregateStatus || 'progress',
  });
}

function teacherIdOf(item) {
  return String(item?.metadata?.brian_team_assignee_id || item?.assignee_ids?.[0] || '');
}

function belongsToTeacher(item, userId) {
  const target = String(userId || '');
  return Boolean(target) && (
    teacherIdOf(item) === target
    || (Array.isArray(item?.assignee_ids) && item.assignee_ids.map(String).includes(target))
  );
}

function statusMeta(status, language = 'vi') {
  const english = language === 'en';
  const labels = {
    draft: english ? 'Draft' : 'Nháp',
    assigned: english ? 'New assignment' : 'Nhiệm vụ mới',
    accepted: english ? 'Accepted' : 'Đã tiếp nhận',
    in_progress: english ? 'In progress' : 'Đang thực hiện',
    submitted: english ? 'Submitted' : 'Đã nộp',
    changes_requested: english ? 'Revision requested' : 'Cần chỉnh sửa',
    approved: english ? 'Approved' : 'Đã phê duyệt',
    completed: english ? 'Completed' : 'Đã hoàn thành',
    archived: english ? 'Archived' : 'Đã lưu trữ',
  };
  const tones = {
    assigned: 'blue', accepted: 'blue', in_progress: 'blue', submitted: 'amber',
    changes_requested: 'red', approved: 'green', completed: 'green', archived: 'green',
  };
  return { label: labels[status] || status, tone: tones[status] || 'neutral' };
}

function noticeText(item, language = 'vi') {
  const english = language === 'en';
  const title = item?.title || (english ? 'Brian Team assignment' : 'Nhiệm vụ Brian Team');
  const messages = {
    assigned: english ? `A new assignment was sent: ${title}` : `Bạn có nhiệm vụ mới: ${title}`,
    changes_requested: english ? `Revision was requested: ${title}` : `TTCM yêu cầu chỉnh sửa: ${title}`,
    approved: english ? `Your submission was approved: ${title}` : `Sản phẩm đã được phê duyệt: ${title}`,
    completed: english ? `The assignment was completed: ${title}` : `Nhiệm vụ đã được hoàn thành: ${title}`,
    archived: english ? `The assignment was archived: ${title}` : `Nhiệm vụ đã được lưu trữ: ${title}`,
  };
  return messages[item?.status] || title;
}

function formatDateTime(value, language = 'vi') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(date);
}

function notificationSignature(item) {
  return `${item?.id || ''}:${item?.status || ''}:${item?.updated_at || ''}`;
}

function readSignatures(user) {
  const raw = safeRead(teacherReadKey(user), []);
  return new Set(Array.isArray(raw) ? raw.map(String) : []);
}

function saveReadSignatures(user, signatures) {
  safeWrite(teacherReadKey(user), [...signatures].slice(-600));
}

async function queryWithCreatedAt(build) {
  let result = await build(supabase.from('work_hub_items').select(WORK_ITEM_COLUMNS));
  if (result.error && /created_at|42703|does not exist/i.test(result.error.message || '')) {
    result = await build(supabase.from('work_hub_items').select(WORK_ITEM_COLUMNS_FALLBACK));
  }
  return result;
}

async function loadPeople(ids = []) {
  const wanted = unique(ids);
  if (!wanted.length || !supabase) return new Map();
  const attempts = [
    ['id,full_name,email,avatar_url', 'id'],
    ['id,full_name,email', 'id'],
    ['user_id,full_name,email,avatar_url', 'user_id'],
    ['user_id,full_name,email', 'user_id'],
    ['profile_id,full_name,email', 'profile_id'],
  ];
  for (const [columns, key] of attempts) {
    const { data, error } = await supabase.from('profiles').select(columns).in(key, wanted).limit(500);
    if (!error) {
      return new Map((data || []).map((profile) => {
        const id = String(profile.id || profile.user_id || profile.profile_id || '');
        return [id, {
          id,
          name: profile.full_name || profile.name || profile.email || 'Giáo viên',
          email: profile.email || '',
          avatarUrl: profile.avatar_url || '',
        }];
      }).filter(([id]) => id));
    }
    if (!/column .* does not exist|42703/i.test(error.message || '')) break;
  }
  return new Map();
}

function openWorkItem(itemId) {
  if (itemId) rememberWorkHubItem(itemId);
  window.location.hash = '#/work-hub';
}

function buildTimeline(item, comments, people, currentUser, language) {
  const english = language === 'en';
  const events = [];
  const push = (event) => { if (event?.at) events.push({ ...event, at: String(event.at) }); };
  push({
    id: `created-${item.id}`,
    at: item.created_at || item.metadata?.created_at || item.updated_at,
    tone: 'blue',
    title: english ? 'Assignment created' : 'Nhiệm vụ được giao',
    body: item.description || '',
    actor: english ? 'Department leader' : 'TTCM',
  });
  (comments || []).forEach((comment) => {
    const submission = comment.comment_type === 'submission'
      || (Array.isArray(comment.attachments) && comment.attachments.length > 0);
    const author = String(comment.author_id || '') === String(currentUser?.id || '')
      ? (english ? 'You' : 'Bạn')
      : (people.get(String(comment.author_id || ''))?.name
        || people.get(String(comment.author_id || ''))?.email
        || (submission ? (english ? 'Teacher' : 'Giáo viên') : (english ? 'Department leader' : 'TTCM')));
    push({
      id: `comment-${comment.id}`,
      at: comment.created_at,
      tone: submission ? 'amber' : 'red',
      title: submission
        ? (english ? 'Submission recorded' : 'Giáo viên đã nộp sản phẩm')
        : (english ? 'Review comment' : 'Trao đổi hoặc yêu cầu chỉnh sửa'),
      body: comment.body || '',
      actor: author,
      attachments: comment.attachments || [],
    });
  });
  if (item.reviewed_at) {
    push({
      id: `reviewed-${item.id}`,
      at: item.reviewed_at,
      tone: item.status === 'changes_requested' ? 'red' : 'green',
      title: item.status === 'changes_requested'
        ? (english ? 'Revision requested' : 'TTCM yêu cầu chỉnh sửa')
        : (english ? 'Submission reviewed' : 'Sản phẩm đã được xem xét'),
      actor: english ? 'Department leader' : 'TTCM',
    });
  }
  if (item.completed_at) {
    push({
      id: `completed-${item.id}`,
      at: item.completed_at,
      tone: 'green',
      title: english ? 'Assignment completed' : 'Nhiệm vụ hoàn thành',
      actor: english ? 'Department leader' : 'TTCM',
    });
  }
  const recorded = new Set(events.map((event) => event.at));
  if (item.updated_at && !recorded.has(String(item.updated_at))) {
    const meta = statusMeta(item.status, language);
    push({
      id: `status-${item.id}`,
      at: item.updated_at,
      tone: meta.tone,
      title: english ? `Current status: ${meta.label}` : `Trạng thái hiện tại: ${meta.label}`,
      actor: 'Work Hub',
    });
  }
  return events.sort((left, right) => new Date(left.at) - new Date(right.at));
}

function TimelineModal({ item, comments, people, currentUser, language, onClose }) {
  const english = language === 'en';
  const events = useMemo(
    () => buildTimeline(item, comments, people, currentUser, language),
    [item, comments, people, currentUser, language],
  );
  const meta = statusMeta(item.status, language);
  return (
    <div className="bes-bt-op-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bes-bt-timeline-modal" role="dialog" aria-modal="true" aria-label={english ? 'Assignment timeline' : 'Lịch sử nhiệm vụ'}>
        <header>
          <div>
            <span><History /> {english ? 'OPERATIONAL TIMELINE' : 'NHẬT KÝ XỬ LÝ NHIỆM VỤ'}</span>
            <h2>{item.title || (english ? 'Assignment timeline' : 'Lịch sử nhiệm vụ')}</h2>
            <p>{english
              ? 'Reconstructed from Work Hub timestamps, submissions, review comments, and the current status.'
              : 'Được tổng hợp từ các mốc Work Hub, bài nộp, phản hồi duyệt và trạng thái hiện tại.'}</p>
          </div>
          <button type="button" onClick={onClose}><X /></button>
        </header>
        <div className="bes-bt-timeline-meta">
          <span data-tone={meta.tone}><b>{meta.label}</b><small>{english ? 'Current status' : 'Trạng thái hiện tại'}</small></span>
          <span><b>{formatDateTime(item.due_at, language)}</b><small>{english ? 'Deadline' : 'Hạn hoàn thành'}</small></span>
          <button type="button" onClick={() => openWorkItem(item.id)}><ExternalLink />{english ? 'Open Work Hub' : 'Mở Work Hub'}</button>
        </div>
        <div className="bes-bt-timeline-list">
          {events.length ? events.map((event) => (
            <article key={event.id} data-tone={event.tone || 'neutral'}>
              <i>{event.tone === 'green' ? <CheckCircle2 /> : event.tone === 'red' ? <RotateCcw /> : event.tone === 'amber' ? <FileText /> : <Clock3 />}</i>
              <div>
                <header><b>{event.title}</b><time>{formatDateTime(event.at, language)}</time></header>
                {event.actor && <small>{event.actor}</small>}
                {event.body && <p>{event.body}</p>}
                {Array.isArray(event.attachments) && event.attachments.length > 0 && (
                  <div className="bes-bt-timeline-files">
                    {event.attachments.map((file, index) => (
                      <a key={`${file.path || file.name}-${index}`} href={file.signed_url || file.url || '#'} target="_blank" rel="noreferrer">
                        <FileText /><span><b>{file.name || (english ? 'Attachment' : 'Tệp đính kèm')}</b><small>{formatWorkHubFileSize(file.size)}</small></span><ExternalLink />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )) : (
            <div className="bes-bt-timeline-empty"><History /><b>{english ? 'No timeline events yet' : 'Chưa có mốc xử lý'}</b></div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function BrianTeamOperationalStabilityBridge({ currentUser, language = 'vi' }) {
  const english = language === 'en';
  const leader = Boolean(currentUser?.id && isDepartmentLeaderRole(currentUser.role));
  const teacher = Boolean(currentUser?.id && !leader);
  const enabled = Boolean(currentUser?.id && isSupabaseConfigured && supabase);

  const [teacherItems, setTeacherItems] = useState([]);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');
  const [teacherToast, setTeacherToast] = useState(null);
  const [readSet, setReadSet] = useState(() => new Set());
  const [activeAssignmentId, setActiveAssignmentId] = useState('');
  const [leaderItems, setLeaderItems] = useState([]);
  const [timelineComments, setTimelineComments] = useState([]);
  const [timelinePeople, setTimelinePeople] = useState(new Map());
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const previousTeacherStatuses = useRef(new Map());
  const teacherInitialized = useRef(false);
  const toastTimer = useRef(0);
  const reverseFingerprint = useRef('');
  const reverseBusy = useRef(false);

  const selectedTimelineItem = useMemo(() => {
    const all = leader ? leaderItems : teacherItems;
    return all.find((item) => String(item.id) === String(selectedTimelineItemId)) || null;
  }, [leader, leaderItems, teacherItems, selectedTimelineItemId]);

  const unreadItems = useMemo(() => teacherItems.filter((item) => (
    TEACHER_NOTICE_STATUSES.has(String(item.status || ''))
    && !readSet.has(notificationSignature(item))
  )), [teacherItems, readSet]);

  const persistSoftWorkspace = useCallback(async (workspace) => {
    const key = workspaceKey(currentUser);
    const oldValue = window.localStorage.getItem(key);
    safeWrite(key, workspace);
    const newValue = window.localStorage.getItem(key);
    const { error } = await supabase.from(CLOUD_WORKSPACE_TABLE).upsert({
      owner_id: currentUser.id,
      payload: workspace,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' });
    const detail = { source: 'work-hub-realtime', workspace, cloudError: error?.message || '', softUpdate: true };
    window.dispatchEvent(new CustomEvent('bes-brian-team-workspace-updated', { detail }));
    window.dispatchEvent(new CustomEvent('bes-brian-team-operational-updated', { detail }));
    window.dispatchEvent(new CustomEvent('bes-brian-team-review-updated', { detail }));
    try {
      window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue, storageArea: window.localStorage }));
    } catch { /* Safari may reject synthetic storageArea */ }
  }, [currentUser]);

  const syncReverse = useCallback(async () => {
    if (!enabled || !leader || reverseBusy.current) return;
    const workspace = safeRead(workspaceKey(currentUser), null);
    if (!workspace?.departments) return;
    reverseBusy.current = true;
    try {
      const { data, error } = await supabase
        .from('work_hub_items')
        .select('id,title,description,status,priority,due_at,assignee_ids,metadata,updated_at')
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE)
        .limit(900);
      if (error) throw error;
      const rows = data || [];
      const fingerprint = JSON.stringify(rows.map((row) => [
        row.id, row.status, row.updated_at, row.title, row.priority, row.due_at,
      ]));
      if (fingerprint === reverseFingerprint.current) return;
      const byAssignment = new Map();
      rows.forEach((row) => {
        const assignmentId = String(row.metadata?.brian_team_assignment_id || '');
        if (!assignmentId) return;
        const bucket = byAssignment.get(assignmentId) || [];
        bucket.push(row);
        byAssignment.set(assignmentId, bucket);
      });
      const flat = new Map(flattenAssignments(workspace).map((entry) => [entry.id, entry]));
      const forwardLinks = safeRead(forwardLinkKey(currentUser), { version: 1, assignments: {} });
      let changed = false;
      const nextWorkspace = {
        ...workspace,
        departments: workspace.departments.map((department) => ({
          ...department,
          assignments: (department.assignments || []).map((assignment) => {
            const assignmentId = String(assignment.id || '');
            const entry = flat.get(assignmentId);
            const linkedRows = byAssignment.get(assignmentId) || [];
            if (!entry || !linkedRows.length || !contentMatchesRemote(entry, linkedRows)) return assignment;
            const summary = summaryOf(linkedRows);
            if (assignment.status === summary.aggregateStatus
              && summaryKey(assignment.workHubSummary) === summaryKey(summary)) return assignment;
            changed = true;
            const linked = forwardLinks.assignments?.[assignmentId];
            if (linked) linked.signature = assignmentSignature({ ...entry, status: summary.aggregateStatus });
            return {
              ...assignment,
              status: summary.aggregateStatus,
              workHubSummary: summary,
              workHubStatusSource: 'work-hub-realtime',
              workHubSyncedAt: new Date().toISOString(),
            };
          }),
        })),
        updatedAt: new Date().toISOString(),
      };
      reverseFingerprint.current = fingerprint;
      if (!changed) return;
      safeWrite(forwardLinkKey(currentUser), {
        ...forwardLinks,
        version: 1,
        assignments: forwardLinks.assignments || {},
        updatedAt: new Date().toISOString(),
      });
      await persistSoftWorkspace(nextWorkspace);
    } catch (error) {
      console.warn('[BrianTeamOperationalStability] reverse sync failed', error);
    } finally {
      reverseBusy.current = false;
    }
  }, [currentUser, enabled, leader, persistSoftWorkspace]);

  useEffect(() => {
    if (!enabled || !leader) return undefined;
    syncReverse();
    const unsubscribe = subscribeTable({
      key: `brian-team-operational-reverse-${currentUser.id}`,
      table: 'work_hub_items',
      filter: `owner_id=eq.${currentUser.id}`,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
        if (!row || row.source_module === SOURCE_MODULE) syncReverse();
      },
    });
    const interval = window.setInterval(syncReverse, LEADER_FALLBACK_INTERVAL);
    const onFocus = () => syncReverse();
    const onVisibility = () => { if (document.visibilityState === 'visible') syncReverse(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe?.();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser?.id, enabled, leader, syncReverse]);

  const loadTeacherItems = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !teacher) return;
    if (!silent) setTeacherLoading(true);
    try {
      let result = await queryWithCreatedAt((builder) => builder
        .eq('source_module', SOURCE_MODULE)
        .contains('assignee_ids', [currentUser.id])
        .limit(400));
      if (result.error && /operator|contains|array|400|PGRST/i.test(result.error.message || '')) {
        result = await queryWithCreatedAt((builder) => builder.eq('source_module', SOURCE_MODULE).limit(400));
      }
      if (result.error) throw result.error;
      const rows = (result.data || []).filter((item) => belongsToTeacher(item, currentUser.id));
      rows.forEach((item) => previousTeacherStatuses.current.set(String(item.id), String(item.status || '')));
      teacherInitialized.current = true;
      setTeacherItems(rows);
      setTeacherError('');
    } catch (error) {
      if (!silent) setTeacherError(error.message || String(error));
    } finally {
      if (!silent) setTeacherLoading(false);
    }
  }, [currentUser?.id, enabled, teacher]);

  useEffect(() => {
    setReadSet(readSignatures(currentUser));
    previousTeacherStatuses.current = new Map();
    teacherInitialized.current = false;
  }, [currentUser?.id]);

  useEffect(() => {
    if (!enabled || !teacher) {
      setTeacherItems([]);
      setTeacherOpen(false);
      return undefined;
    }
    loadTeacherItems();
    const unsubscribe = subscribeTable({
      key: `brian-team-teacher-notifications-${currentUser.id}`,
      table: 'work_hub_items',
      filter: `source_module=eq.${SOURCE_MODULE}`,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
        if (!row?.id) {
          loadTeacherItems({ silent: true });
          return;
        }
        if (payload?.eventType === 'DELETE') {
          setTeacherItems((current) => current.filter((item) => item.id !== row.id));
          previousTeacherStatuses.current.delete(String(row.id));
          return;
        }
        if (row.source_module !== SOURCE_MODULE || !belongsToTeacher(row, currentUser.id)) return;
        const previousStatus = previousTeacherStatuses.current.get(String(row.id));
        const nextStatus = String(row.status || '');
        previousTeacherStatuses.current.set(String(row.id), nextStatus);
        setTeacherItems((current) => [
          { ...current.find((item) => item.id === row.id), ...row },
          ...current.filter((item) => item.id !== row.id),
        ]);
        if (teacherInitialized.current
          && TEACHER_NOTICE_STATUSES.has(nextStatus)
          && (payload?.eventType === 'INSERT' || (previousStatus && previousStatus !== nextStatus))) {
          setTeacherToast(row);
          window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setTeacherToast(null), 7600);
        }
      },
    });
    const interval = window.setInterval(() => loadTeacherItems({ silent: true }), TEACHER_FALLBACK_INTERVAL);
    const onOnline = () => loadTeacherItems({ silent: true });
    window.addEventListener('online', onOnline);
    return () => {
      unsubscribe?.();
      window.clearInterval(interval);
      window.clearTimeout(toastTimer.current);
      window.removeEventListener('online', onOnline);
    };
  }, [currentUser?.id, enabled, teacher, loadTeacherItems]);

  const markItemsRead = useCallback((items) => {
    const next = new Set(readSet);
    (items || []).forEach((item) => next.add(notificationSignature(item)));
    setReadSet(next);
    saveReadSignatures(currentUser, next);
  }, [currentUser, readSet]);

  const openTeacherInbox = useCallback(() => {
    setTeacherOpen(true);
    markItemsRead(teacherItems.filter((item) => TEACHER_NOTICE_STATUSES.has(String(item.status || ''))));
  }, [markItemsRead, teacherItems]);

  const loadTimelineForItems = useCallback(async (items) => {
    const targets = items || [];
    const itemIds = targets.map((item) => item.id).filter(Boolean);
    if (!itemIds.length) {
      setTimelineComments([]);
      setTimelinePeople(new Map());
      return;
    }
    setTimelineLoading(true);
    try {
      const { data, error } = await supabase.from('work_hub_comments')
        .select(COMMENT_COLUMNS).in('item_id', itemIds).order('created_at', { ascending: true });
      if (error) throw error;
      const comments = await resolveWorkHubCommentAttachments(data || []);
      setTimelineComments(comments);
      setTimelinePeople(await loadPeople(unique([
        ...targets.map(teacherIdOf),
        ...comments.map((comment) => comment.author_id),
        ...targets.map((item) => item.owner_id),
      ])));
    } catch (error) {
      console.warn('[BrianTeamOperationalStability] timeline load failed', error);
      setTimelineComments([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const loadLeaderAssignment = useCallback(async (assignmentId) => {
    if (!enabled || !leader || !assignmentId) return;
    const result = await queryWithCreatedAt((builder) => builder
      .eq('owner_id', currentUser.id).eq('source_module', SOURCE_MODULE).limit(900));
    if (result.error) return;
    const items = (result.data || []).filter((item) => (
      String(item.metadata?.brian_team_assignment_id || '') === String(assignmentId)
    ));
    setLeaderItems(items);
    await loadTimelineForItems(items);
  }, [currentUser?.id, enabled, leader, loadTimelineForItems]);

  useEffect(() => {
    if (activeAssignmentId) loadLeaderAssignment(activeAssignmentId);
  }, [activeAssignmentId, loadLeaderAssignment]);

  useEffect(() => {
    if (!enabled || !leader) return undefined;
    const onClick = (event) => {
      const trigger = event.target?.closest?.('.bes-bt-review-trigger');
      if (trigger?.dataset.assignmentId) setActiveAssignmentId(String(trigger.dataset.assignmentId));
    };
    const onReviewUpdated = () => {
      if (activeAssignmentId) loadLeaderAssignment(activeAssignmentId);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('bes-brian-team-review-updated', onReviewUpdated);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('bes-brian-team-review-updated', onReviewUpdated);
    };
  }, [activeAssignmentId, enabled, leader, loadLeaderAssignment]);

  const scanTimelineButtons = useCallback(() => {
    if (!leader || !activeAssignmentId) {
      document.querySelectorAll('.bes-bt-timeline-trigger').forEach((node) => node.remove());
      return;
    }
    const cards = [...document.querySelectorAll('.bes-bt-review-card')];
    if (!cards.length) return;
    const identifiers = new Map();
    leaderItems.forEach((item) => {
      const teacherId = teacherIdOf(item);
      const person = timelinePeople.get(teacherId);
      [teacherId, person?.email].filter(Boolean).forEach((value) => {
        identifiers.set(String(value).trim().toLowerCase(), item);
      });
    });
    cards.forEach((card, index) => {
      const footer = card.querySelector('footer');
      if (!footer) return;
      const identifier = String(card.querySelector('.bes-bt-review-person small')?.textContent || '')
        .trim().toLowerCase();
      const item = identifiers.get(identifier) || leaderItems[index];
      if (!item) return;
      let button = footer.querySelector('.bes-bt-timeline-trigger');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'bes-bt-timeline-trigger';
        footer.prepend(button);
      }
      button.dataset.itemId = String(item.id);
      const nextLabel = english ? '◷ Timeline' : '◷ Lịch sử';
      if (button.textContent !== nextLabel) button.textContent = nextLabel;
      button.onclick = () => setSelectedTimelineItemId(String(item.id));
    });
  }, [activeAssignmentId, english, leader, leaderItems, timelinePeople]);

  useEffect(() => {
    scanTimelineButtons();
    const observer = new MutationObserver(scanTimelineButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll('.bes-bt-timeline-trigger').forEach((node) => node.remove());
    };
  }, [scanTimelineButtons]);

  const openTeacherTimeline = useCallback(async (item) => {
    markItemsRead([item]);
    setSelectedTimelineItemId(String(item.id));
    await loadTimelineForItems([item]);
  }, [loadTimelineForItems, markItemsRead]);

  if (!enabled) return null;
  const selectedComments = timelineComments.filter((comment) => (
    String(comment.item_id) === String(selectedTimelineItemId)
  ));

  return (
    <>
      {teacher && (
        <button type="button" className={`bes-bt-teacher-bell ${unreadItems.length ? 'has-unread' : ''}`} onClick={openTeacherInbox} aria-label={english ? 'Brian Team notifications' : 'Thông báo Brian Team'}>
          <BellRing /><span>Brian Team</span>{unreadItems.length > 0 && <b>{unreadItems.length > 99 ? '99+' : unreadItems.length}</b>}
        </button>
      )}

      {teacherOpen && (
        <div className="bes-bt-op-layer is-drawer" onMouseDown={(event) => event.target === event.currentTarget && setTeacherOpen(false)}>
          <aside className="bes-bt-teacher-drawer" role="dialog" aria-modal="true" aria-label={english ? 'Brian Team notifications' : 'Thông báo Brian Team'}>
            <header>
              <div><span><Radio /> BRIAN TEAM</span><h2>{english ? 'Your work updates' : 'Cập nhật công việc của bạn'}</h2><p>{english ? 'Direct Supabase updates; no Vercel proxy or server polling.' : 'Cập nhật trực tiếp từ Supabase; không qua proxy hoặc polling máy chủ Vercel.'}</p></div>
              <button type="button" onClick={() => setTeacherOpen(false)}><X /></button>
            </header>
            <div className="bes-bt-teacher-tools">
              <b>{teacherItems.length}</b><span>{english ? 'linked assignments' : 'nhiệm vụ được liên kết'}</span>
              <button type="button" onClick={() => loadTeacherItems()} disabled={teacherLoading}>{teacherLoading ? <RefreshCw className="spin" /> : <RefreshCw />}{english ? 'Refresh' : 'Làm mới'}</button>
            </div>
            {teacherError && <div className="bes-bt-op-error">{teacherError}</div>}
            <div className="bes-bt-teacher-list">
              {teacherItems.length ? teacherItems.slice()
                .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                .map((item) => {
                  const meta = statusMeta(item.status, language);
                  return (
                    <article key={item.id} data-tone={meta.tone}>
                      <header><span><b>{item.title || (english ? 'Untitled assignment' : 'Nhiệm vụ chưa đặt tên')}</b><small>{formatDateTime(item.updated_at, language)}</small></span><em>{meta.label}</em></header>
                      <p>{noticeText(item, language)}</p>
                      <footer>
                        <button type="button" onClick={() => { markItemsRead([item]); openWorkItem(item.id); }}><ExternalLink />{english ? 'Open work' : 'Mở công việc'}</button>
                        <button type="button" onClick={() => openTeacherTimeline(item)}><History />{english ? 'Timeline' : 'Lịch sử'}</button>
                      </footer>
                    </article>
                  );
                }) : (
                  <div className="bes-bt-teacher-empty"><ShieldCheck /><h3>{english ? 'No Brian Team assignments' : 'Chưa có nhiệm vụ Brian Team'}</h3><p>{english ? 'Assignments linked to your approved teacher account will appear here.' : 'Nhiệm vụ liên kết với tài khoản giáo viên của bạn sẽ xuất hiện tại đây.'}</p></div>
                )}
            </div>
          </aside>
        </div>
      )}

      {teacherToast && (
        <div className="bes-bt-teacher-toast" role="status" data-tone={statusMeta(teacherToast.status, language).tone}>
          <BellRing />
          <span><b>{statusMeta(teacherToast.status, language).label}</b><small>{noticeText(teacherToast, language)}</small></span>
          <button type="button" onClick={() => { markItemsRead([teacherToast]); openWorkItem(teacherToast.id); }}>{english ? 'Open' : 'Mở ngay'}</button>
          <button type="button" className="is-close" onClick={() => setTeacherToast(null)}><X /></button>
        </div>
      )}

      {selectedTimelineItem && (
        <TimelineModal item={selectedTimelineItem} comments={selectedComments} people={timelinePeople} currentUser={currentUser} language={language} onClose={() => setSelectedTimelineItemId('')} />
      )}

      {timelineLoading && selectedTimelineItemId && !selectedTimelineItem && (
        <div className="bes-bt-op-layer"><div className="bes-bt-op-loading"><RefreshCw className="spin" /><b>{english ? 'Loading timeline…' : 'Đang tải lịch sử…'}</b></div></div>
      )}

      <style>{`
        .bes-bt-timeline-trigger{display:flex!important;align-items:center;gap:7px!important;border-color:rgba(83,99,44,.2)!important;background:#f1f5e6!important;color:#43521c!important}
        .bes-bt-teacher-bell{position:fixed;right:22px;bottom:92px;z-index:100010;display:flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;border:1px solid rgba(70,85,40,.17);border-radius:17px;background:#2d381d;color:#fff;box-shadow:0 16px 42px rgba(31,39,23,.25);font-family:var(--bes-personal-font,inherit);font-weight:850}.bes-bt-teacher-bell svg{width:20px;height:20px;color:#c8d95c}.bes-bt-teacher-bell>b{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#d77b16;color:#fff;font-size:.72em}.bes-bt-teacher-bell.has-unread{animation:besBtBellPulse 2.4s ease-in-out infinite}@keyframes besBtBellPulse{0%,100%{box-shadow:0 16px 42px rgba(31,39,23,.25)}50%{box-shadow:0 16px 42px rgba(31,39,23,.25),0 0 0 8px rgba(194,208,80,.14)}}
        .bes-bt-op-layer{position:fixed;z-index:140000;inset:0;display:grid;place-items:center;padding:22px;background:rgba(17,23,13,.58);backdrop-filter:blur(9px);font-family:var(--bes-personal-font,inherit)}.bes-bt-op-layer.is-drawer{display:flex;justify-content:flex-end;padding:0;background:rgba(18,24,14,.34)}
        .bes-bt-teacher-drawer{display:flex;flex-direction:column;width:min(560px,100vw);height:100%;padding:22px;background:#f7f9f2;color:#28301f;box-shadow:-28px 0 80px rgba(27,35,20,.25)}.bes-bt-teacher-drawer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:4px 3px 18px}.bes-bt-teacher-drawer>header>div>span{display:flex;align-items:center;gap:7px;color:#687747;font-size:.7em;font-weight:900;letter-spacing:.13em}.bes-bt-teacher-drawer>header h2{margin:7px 0 4px;font-size:2em;letter-spacing:-.04em}.bes-bt-teacher-drawer>header p{margin:0;color:#71796a;font-size:.82em}.bes-bt-teacher-drawer>header>button{display:grid;place-items:center;width:42px;height:42px;border:0;border-radius:13px;background:#fff;color:#44503a}
        .bes-bt-teacher-tools{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:13px 14px;border:1px solid rgba(57,70,38,.12);border-radius:17px;background:#fff}.bes-bt-teacher-tools>b{font-size:1.6em}.bes-bt-teacher-tools>span{color:#737a6b;font-size:.8em}.bes-bt-teacher-tools>button{display:flex;align-items:center;gap:7px;min-height:38px;padding:0 11px;border:1px solid rgba(61,75,40,.14);border-radius:11px;background:#f3f6ea;color:#40501c;font-weight:820}.bes-bt-teacher-tools svg{width:17px;height:17px}.bes-bt-op-error{margin-top:10px;padding:11px 13px;border-radius:12px;background:#ffebe7;color:#8c382f}
        .bes-bt-teacher-list{display:grid;gap:10px;overflow:auto;margin-top:13px;padding:1px 1px 28px}.bes-bt-teacher-list>article{display:grid;gap:9px;padding:15px;border:1px solid rgba(58,70,39,.12);border-left:5px solid #87927a;border-radius:18px;background:#fff}.bes-bt-teacher-list>article[data-tone="blue"]{border-left-color:#3978b8}.bes-bt-teacher-list>article[data-tone="amber"]{border-left-color:#c58a24}.bes-bt-teacher-list>article[data-tone="red"]{border-left-color:#c65a4a}.bes-bt-teacher-list>article[data-tone="green"]{border-left-color:#5a934d}.bes-bt-teacher-list article>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.bes-bt-teacher-list article>header>span{display:flex;flex-direction:column;min-width:0}.bes-bt-teacher-list article>header b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bes-bt-teacher-list article>header small{margin-top:3px;color:#798071;font-size:.72em}.bes-bt-teacher-list article>header em{padding:6px 8px;border-radius:9px;background:#f1f3ec;color:#58604f;font-size:.7em;font-style:normal;font-weight:850}.bes-bt-teacher-list article>p{margin:0;color:#5f6758;font-size:.84em}.bes-bt-teacher-list article>footer{display:flex;gap:8px;flex-wrap:wrap}.bes-bt-teacher-list article>footer button{display:flex;align-items:center;gap:7px;min-height:36px;padding:0 10px;border:1px solid rgba(60,73,40,.14);border-radius:10px;background:#f4f7ec;color:#40501c;font-weight:820}.bes-bt-teacher-list article>footer button:first-child{background:#2e381e;color:#fff}.bes-bt-teacher-list article>footer svg{width:16px;height:16px}.bes-bt-teacher-empty{display:grid;place-items:center;align-content:center;min-height:290px;padding:26px;border:1px dashed rgba(64,78,42,.24);border-radius:21px;background:#fff;text-align:center}.bes-bt-teacher-empty svg{width:46px;height:46px;color:#76893c}.bes-bt-teacher-empty h3{margin:12px 0 4px}.bes-bt-teacher-empty p{max-width:360px;margin:0;color:#737b6c}
        .bes-bt-teacher-toast{position:fixed;right:22px;bottom:22px;z-index:140010;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:11px;width:min(570px,calc(100vw - 32px));padding:14px;border:1px solid rgba(74,90,43,.18);border-radius:19px;background:#2b351e;color:#fff;box-shadow:0 24px 65px rgba(24,31,18,.34);font-family:var(--bes-personal-font,inherit)}.bes-bt-teacher-toast[data-tone="red"]{background:#793e35}.bes-bt-teacher-toast[data-tone="green"]{background:#2f5b2a}.bes-bt-teacher-toast>svg{color:#cfdf6b}.bes-bt-teacher-toast>span{display:flex;flex-direction:column;min-width:0}.bes-bt-teacher-toast small{overflow:hidden;margin-top:2px;color:rgba(255,255,255,.76);text-overflow:ellipsis;white-space:nowrap}.bes-bt-teacher-toast>button{min-height:36px;padding:0 12px;border:0;border-radius:10px;background:#c4d353;color:#263015;font-weight:850}.bes-bt-teacher-toast>button.is-close{display:grid;place-items:center;width:36px;padding:0;background:rgba(255,255,255,.1);color:#fff}
        .bes-bt-timeline-modal{display:grid;grid-template-rows:auto auto minmax(0,1fr);width:min(920px,calc(100vw - 28px));max-height:min(900px,calc(100vh - 28px));overflow:hidden;border:1px solid rgba(79,94,43,.2);border-radius:28px;background:#f7f9f2;color:#28301f;box-shadow:0 34px 100px rgba(19,26,13,.34)}.bes-bt-timeline-modal>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:23px 25px 19px;background:linear-gradient(135deg,#2c361e,#4c5b29);color:#fff}.bes-bt-timeline-modal>header span{display:flex;align-items:center;gap:8px;font-size:.7em;font-weight:900;letter-spacing:.13em}.bes-bt-timeline-modal>header h2{margin:8px 0 5px;font-size:clamp(27px,4vw,44px);line-height:1;letter-spacing:-.045em}.bes-bt-timeline-modal>header p{max-width:700px;margin:0;color:rgba(255,255,255,.73);font-size:.85em}.bes-bt-timeline-modal>header>button{display:grid;place-items:center;width:43px;height:43px;border:1px solid rgba(255,255,255,.18);border-radius:13px;background:rgba(255,255,255,.1);color:#fff}
        .bes-bt-timeline-meta{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:9px;padding:13px 18px;border-bottom:1px solid rgba(59,72,38,.12);background:#fff}.bes-bt-timeline-meta>span{display:flex;flex-direction:column;padding:9px 11px;border-radius:12px;background:#f1f4ea}.bes-bt-timeline-meta>span b{font-size:.85em}.bes-bt-timeline-meta>span small{margin-top:2px;color:#737b6c;font-size:.7em}.bes-bt-timeline-meta>button{display:flex;align-items:center;gap:7px;padding:0 12px;border:0;border-radius:12px;background:#b6c64d;color:#263015;font-weight:850}
        .bes-bt-timeline-list{display:grid;gap:0;overflow:auto;padding:18px 22px 28px}.bes-bt-timeline-list>article{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;padding:0 0 20px}.bes-bt-timeline-list>article:not(:last-child)::after{content:"";position:absolute;left:19px;top:40px;bottom:0;width:2px;background:#dfe5d5}.bes-bt-timeline-list>article>i{z-index:1;display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:#e8eefc;color:#326da8}.bes-bt-timeline-list>article[data-tone="amber"]>i{background:#fff0ca;color:#8a5d13}.bes-bt-timeline-list>article[data-tone="red"]>i{background:#ffebe7;color:#9a4035}.bes-bt-timeline-list>article[data-tone="green"]>i{background:#e5f4df;color:#35692d}.bes-bt-timeline-list>article>i svg{width:19px;height:19px}.bes-bt-timeline-list article>div{min-width:0;padding:9px 12px 11px;border:1px solid rgba(61,74,41,.11);border-radius:14px;background:#fff}.bes-bt-timeline-list article header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.bes-bt-timeline-list article time{color:#7b8274;font-size:.7em}.bes-bt-timeline-list article small{display:block;margin-top:3px;color:#77806e;font-size:.72em}.bes-bt-timeline-list article p{margin:8px 0 0;color:#50594b;white-space:pre-wrap}.bes-bt-timeline-files{display:grid;gap:6px;margin-top:9px}.bes-bt-timeline-files>a{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(63,77,43,.12);border-radius:11px;background:#f7f9f2;color:#344019;text-decoration:none}.bes-bt-timeline-files>a>svg{width:17px;height:17px}.bes-bt-timeline-files>a>span{display:flex;flex-direction:column;min-width:0}.bes-bt-timeline-files>a b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bes-bt-timeline-empty,.bes-bt-op-loading{display:grid;place-items:center;align-content:center;gap:10px;min-height:280px;padding:28px;border-radius:22px;background:#fff;color:#56604a}.bes-bt-op-loading{width:min(360px,calc(100vw - 32px));min-height:190px}.spin{animation:besBtOpSpin .8s linear infinite}@keyframes besBtOpSpin{to{transform:rotate(360deg)}}
        @media(max-width:720px){.bes-bt-teacher-bell{right:14px;bottom:82px}.bes-bt-teacher-bell>span{display:none}.bes-bt-teacher-drawer{padding:16px}.bes-bt-teacher-toast{right:16px;bottom:16px;grid-template-columns:auto minmax(0,1fr) auto}.bes-bt-teacher-toast>button:not(.is-close){grid-column:2/-1}.bes-bt-teacher-toast>button.is-close{grid-column:3;grid-row:1}.bes-bt-timeline-meta{grid-template-columns:1fr}.bes-bt-timeline-meta>button{min-height:42px;justify-content:center}.bes-bt-timeline-modal>header{padding:19px}.bes-bt-timeline-list{padding:15px}}
      `}</style>
    </>
  );
}
