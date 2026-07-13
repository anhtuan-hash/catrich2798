import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getMyPermissionRequests,
  getPermissionRequests,
  PERMISSION_REQUESTS_EVENT,
  requestPermission,
  updatePermissionRequestStatus,
} from '../utils/permissionRequests.js';
import {
  getAccountYouTubeApiKey,
  getUsers,
  readLocalAccountYouTubeApiKey,
  saveAccountYouTubeApiKey,
  updateUserPermissions,
} from '../utils/auth.js';
import {
  createDepartmentSubmission,
  DEPARTMENT_SNAPSHOT_EVENT,
  DEPARTMENT_SUBMISSION_REQUESTS_EVENT,
  DEPARTMENT_SUBMISSIONS_EVENT,
  listDepartmentSubmissionRequests,
  listDepartmentSubmissions,
  loadDepartmentSnapshot,
  reviewDepartmentSubmission,
  updateDepartmentSubmissionRequestStatus,
} from '../utils/departmentStore.js';
import {
  createCustomPermissions,
  getAllowedIdsFromPermissions,
  getPermissionItem,
  normalizePermissions,
} from '../utils/permissions.js';
import {
  listWorkHubNotifications,
  markAllWorkHubNotificationsRead,
  markWorkHubNotificationRead,
  rememberWorkHubItem,
  subscribeWorkHubNotifications,
  WORK_HUB_DELIVERY_EVENT,
} from '../utils/workHubDelivery.js';

const SCHOOL_YEAR = '2026-2027';

const routeLabels = {
  vi: {
    home: 'Trang chủ',
    apps: 'Ứng dụng',
    games: 'Trò chơi',
    tools: 'Công cụ',
    department: 'Tổ chuyên môn',
    resources: 'Tài nguyên',
    library: 'Thư viện',
    practice: 'Luyện tập',
    qa: 'Kiểm tra',
    contact: 'Liên hệ',
    settings: 'Cài đặt',
    admin: 'Quản trị',
    setup: 'Supabase',
    login: 'Đăng nhập',
    register: 'Đăng kí',
    tool: 'Công cụ',
    nowAt: 'ĐANG Ở',
    role: 'VAI TRÒ',
    guest: 'KHÁCH',
    aiReady: 'AI ĐÃ SẴN SÀNG',
    aiMissing: 'CHƯA CÀI API KEY',
    dept: 'TỔ CHUYÊN MÔN',
    deptSub: 'Thông báo · hồ sơ · lịch',
    deptScheduleEmpty: 'Chưa có lịch tổ',
    deptSchedulePrefix: 'Lịch',
    notice: 'THÔNG BÁO',
    noNotice: 'Không có mới',
    newNotice: 'mới',
    openCurrent: 'Mở mục hiện tại',
    openSchedule: 'Mở lịch/tổ chuyên môn',
    openAccount: 'Mở tài khoản/quản trị',
    openAi: 'Mở cài đặt AI',
    openDept: 'Mở tổ chuyên môn',
    openNotice: 'Mở bảng thông báo',
    panelTitle: 'Thông báo',
    panelSubtitle: 'Thông báo giao việc, phản hồi, hồ sơ tổ chuyên môn và quyền truy cập.',
    close: 'Đóng',
    delete: 'Xoá',
    clearAll: 'Xoá tất cả',
    emptyTitle: 'Không có thông báo mới',
    emptyText: 'Thông báo đã xoá sẽ không hiện lại trên máy này.',
    loading: 'Đang tải thông báo...',
    permissionSource: 'Quản trị cấp quyền',
    departmentSource: 'Tổ chuyên môn',
    open: 'Mở',
    due: 'Hạn',
    pendingPermission: 'Yêu cầu cấp quyền mới',
    permissionApproved: 'Quyền truy cập đã được duyệt',
    permissionRejected: 'Yêu cầu quyền đã bị từ chối',
    pendingSubmission: 'Hồ sơ tổ viên chờ duyệt',
    departmentRequest: 'TTCM yêu cầu nộp hồ sơ',
    interactHint: 'Nhấn thẻ để mở thao tác trực tiếp',
    details: 'Chi tiết',
    markRead: 'Đã đọc',
    openRelated: 'Mở trang liên quan',
    approve: 'Duyệt',
    reject: 'Từ chối',
    requestChanges: 'Cần chỉnh sửa',
    retryPermission: 'Xin lại quyền',
    submitNow: 'Nộp ngay',
    closeRequest: 'Đóng yêu cầu',
    viewAttachment: 'Xem tệp',
    reviewNote: 'Ghi chú duyệt hoặc nội dung cần chỉnh sửa…',
    submissionTitle: 'Tên hồ sơ nộp',
    submissionNote: 'Ghi chú cho TTCM…',
    attachment: 'Tệp đính kèm',
    sending: 'Đang xử lý…',
  },
  en: {
    home: 'Home',
    apps: 'Apps',
    games: 'Games',
    tools: 'Tools',
    department: 'Department',
    resources: 'Resources',
    library: 'Library',
    practice: 'Practice',
    qa: 'Check',
    contact: 'Contact',
    settings: 'Settings',
    admin: 'Admin',
    setup: 'Setup',
    login: 'Login',
    register: 'Register',
    tool: 'Tool',
    nowAt: 'CURRENT',
    role: 'ROLE',
    guest: 'GUEST',
    aiReady: 'AI READY',
    aiMissing: 'ADD API KEY',
    dept: 'DEPARTMENT',
    deptSub: 'Notices · files · schedule',
    deptScheduleEmpty: 'No department schedule',
    deptSchedulePrefix: 'Schedule',
    notice: 'NOTICES',
    noNotice: 'No new notices',
    newNotice: 'new',
    openCurrent: 'Open current page',
    openSchedule: 'Open schedule/department',
    openAccount: 'Open account/admin',
    openAi: 'Open AI settings',
    openDept: 'Open department',
    openNotice: 'Open notification panel',
    panelTitle: 'Notifications',
    panelSubtitle: 'Only department and permission-management notices are shown here.',
    close: 'Close',
    delete: 'Delete',
    clearAll: 'Clear all',
    emptyTitle: 'No new notifications',
    emptyText: 'Deleted notifications will stay hidden on this device.',
    loading: 'Loading notifications...',
    permissionSource: 'Permission admin',
    departmentSource: 'Department',
    open: 'Open',
    due: 'Due',
    pendingPermission: 'New permission request',
    permissionApproved: 'Access approved',
    permissionRejected: 'Access rejected',
    pendingSubmission: 'Teacher submission pending review',
    departmentRequest: 'Department submission request',
    interactHint: 'Select a card to reveal direct actions',
    details: 'Details',
    markRead: 'Mark read',
    openRelated: 'Open related page',
    approve: 'Approve',
    reject: 'Reject',
    requestChanges: 'Request changes',
    retryPermission: 'Request again',
    submitNow: 'Submit now',
    closeRequest: 'Close request',
    viewAttachment: 'View file',
    reviewNote: 'Approval note or requested changes…',
    submissionTitle: 'Submission title',
    submissionNote: 'Note for the department leader…',
    attachment: 'Attachment',
    sending: 'Working…',
  },
};

function formatClock(language, date) {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
  return { time, day };
}

function routeName(route, language) {
  const t = routeLabels[language] || routeLabels.vi;
  if (route?.startsWith('tool')) return t.tool;
  return t[route] || t.home;
}

function userLabel(currentUser, language) {
  if (!currentUser) return (routeLabels[language] || routeLabels.vi).guest;
  return String(currentUser.name || currentUser.email || 'ACCOUNT').toUpperCase();
}

function navTo(route) {
  window.location.hash = `#/${route}`;
}

function safeCurrentRoute(route) {
  if (!route || route === 'tool') return 'apps';
  return route;
}

function userKey(currentUser) {
  return currentUser?.id || currentUser?.email || 'guest';
}

function dismissedStorageKey(currentUser) {
  return `bes-ios-notifications-dismissed:${userKey(currentUser)}`;
}
function youtubeStorageKey(base, currentUser) {
  return `${base}:${userKey(currentUser)}`;
}

function readAccountYouTubeVideo(currentUser) {
  try {
    return localStorage.getItem(youtubeStorageKey('bes-youtube-last-video', currentUser)) || '';
  } catch {
    return '';
  }
}

function saveAccountYouTubeVideo(currentUser, videoId) {
  try {
    const key = youtubeStorageKey('bes-youtube-last-video', currentUser);
    if (videoId) localStorage.setItem(key, videoId);
    else localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function readYouTubePlaybackMode(currentUser) {
  try {
    const value = localStorage.getItem(youtubeStorageKey('bes-youtube-playback-mode', currentUser));
    return value === 'audio' ? 'audio' : 'video';
  } catch {
    return 'video';
  }
}

function saveYouTubePlaybackMode(currentUser, mode) {
  try {
    localStorage.setItem(
      youtubeStorageKey('bes-youtube-playback-mode', currentUser),
      mode === 'audio' ? 'audio' : 'video',
    );
  } catch {
    // Ignore storage failures.
  }
}


function readDismissed(currentUser) {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(currentUser));
    const parsed = JSON.parse(raw || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(currentUser, setValue) {
  try {
    localStorage.setItem(dismissedStorageKey(currentUser), JSON.stringify([...setValue]));
  } catch {
    // Ignore storage failures.
  }
}

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

const DEPARTMENT_LOCAL_STORE_PREFIX = 'bes-department-workspace-v1';
const DEPARTMENT_SHARED_SUFFIX = 'shared';

function parseScheduleDateTime(item) {
  const dateText = String(item?.date || '').trim();
  if (!dateText) return null;
  const timeText = String(item?.startTime || '00:00').trim() || '00:00';
  const date = new Date(`${dateText}T${timeText.length === 5 ? timeText : '00:00'}`);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(dateText);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return date;
}

function formatScheduleDate(item, language) {
  const date = parseScheduleDateTime(item);
  if (!date) return '';
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const datePart = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(date);
  const timePart = item?.startTime ? ` ${item.startTime}${item.endTime ? `-${item.endTime}` : ''}` : '';
  return `${datePart}${timePart}`;
}

function getSharedScheduleKeys() {
  return [
    `${DEPARTMENT_LOCAL_STORE_PREFIX}:${DEPARTMENT_SHARED_SUFFIX}:${SCHOOL_YEAR}`,
    `${DEPARTMENT_LOCAL_STORE_PREFIX}:${DEPARTMENT_SHARED_SUFFIX}`,
  ];
}

function readLocalDepartmentPayloads(currentUser) {
  const preferred = [
    ...getSharedScheduleKeys(),
    `${DEPARTMENT_LOCAL_STORE_PREFIX}:${currentUser?.id || ''}`,
    `${DEPARTMENT_LOCAL_STORE_PREFIX}:${currentUser?.email || ''}`,
    `${DEPARTMENT_LOCAL_STORE_PREFIX}:guest`,
  ].filter(Boolean);
  const keys = new Set(preferred);
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${DEPARTMENT_LOCAL_STORE_PREFIX}:`)) keys.add(key);
    }
  } catch {
    // ignore storage enumeration failures
  }

  const payloads = [];
  keys.forEach((key) => {
    try {
      const payload = JSON.parse(localStorage.getItem(key) || 'null');
      if (payload && typeof payload === 'object') payloads.push(payload);
    } catch {
      // ignore bad local records
    }
  });
  return payloads;
}

function getUpcomingScheduleEntries(payload) {
  const schedules = Array.isArray(payload?.workSchedules) ? payload.workSchedules : [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return schedules
    .map((item) => ({ item, date: parseScheduleDateTime(item) }))
    .filter((entry) => entry.date && entry.date >= now)
    .filter((entry) => !/hoàn thành|completed|done/i.test(String(entry.item?.status || '')))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function summarizeDepartmentSchedule(payload, language) {
  const next = getUpcomingScheduleEntries(payload)[0];
  if (!next) return null;
  const schedules = Array.isArray(payload?.workSchedules) ? payload.workSchedules : [];
  const title = String(next.item.title || next.item.type || (language === 'vi' ? 'Lịch làm việc tổ' : 'Department schedule')).trim();
  const meta = formatScheduleDate(next.item, language);
  return { title, meta, total: schedules.length };
}

function readLocalDepartmentSchedule(currentUser, language) {
  const payloads = readLocalDepartmentPayloads(currentUser);
  for (const payload of payloads) {
    const summary = summarizeDepartmentSchedule(payload, language);
    if (summary) return summary;
  }
  return null;
}

async function loadDepartmentScheduleSummary(currentUser, language) {
  try {
    const cloud = await loadDepartmentSnapshot(SCHOOL_YEAR);
    const cloudSummary = summarizeDepartmentSchedule(cloud?.snapshot?.payload, language);
    if (cloudSummary) return cloudSummary;
  } catch {
    // Keep menu usable when cloud is unavailable.
  }
  return readLocalDepartmentSchedule(currentUser, language);
}

function isTargetedRequest(request, currentUser, isAdmin) {
  if (isAdmin) return true;
  if (!request) return false;
  if (request.status && request.status !== 'open') return false;
  if (request.target_mode !== 'selected') return true;
  const email = String(currentUser?.email || '').toLowerCase();
  const targets = Array.isArray(request.target_emails) ? request.target_emails : [];
  return targets.map((item) => String(item || '').toLowerCase()).includes(email);
}

function sortNotifications(a, b) {
  return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime();
}

function permissionTargetRoute(permissionId) {
  const id = String(permissionId || '');
  if (id.startsWith('tool:')) return `tool/${id.slice(5)}`;
  if (id.startsWith('route:')) return id.slice(6);
  if (id.startsWith('section:')) return id.slice(8);
  const item = getPermissionItem(id);
  if (item?.route) return item.route;
  if (item?.slug) return `tool/${item.slug}`;
  if (['apps', 'games', 'tools', 'department', 'library', 'resource-library', 'practice', 'qa', 'settings'].includes(item?.section)) return item.section;
  return 'apps';
}

async function buildNotificationList({ currentUser, language, isAdmin }) {
  const t = routeLabels[language] || routeLabels.vi;
  const notifications = [];
  if (!currentUser?.id) return notifications;

  try {
    if (isAdmin) {
      const requests = await getPermissionRequests();
      requests
        .filter((item) => item.status === 'pending')
        .slice(0, 25)
        .forEach((item) => notifications.push({
          id: `permission-admin:${item.id}`,
          kind: 'permission-admin',
          source: 'permission',
          sourceLabel: t.permissionSource,
          icon: '🔐',
          tone: 'purple',
          title: t.pendingPermission,
          body: `${item.requester_name || item.requester_email || 'Teacher'} · ${item.item_title || item.permission_id}`,
          meta: formatDate(item.created_at || item.updated_at, language),
          date: item.created_at || item.updated_at,
          target: 'admin',
          requestId: item.id,
          requesterId: item.requester_id,
          requesterName: item.requester_name || '',
          requesterEmail: item.requester_email || '',
          permissionId: item.permission_id,
          itemTitle: item.item_title || item.permission_id,
          message: item.message || '',
        }));
    } else {
      const mine = await getMyPermissionRequests(currentUser.id);
      mine
        .filter((item) => ['approved', 'rejected'].includes(item.status))
        .slice(0, 20)
        .forEach((item) => notifications.push({
          id: `permission-user:${item.id}:${item.status}`,
          kind: 'permission-user',
          source: 'permission',
          sourceLabel: t.permissionSource,
          icon: item.status === 'approved' ? '✅' : '⛔',
          tone: item.status === 'approved' ? 'green' : 'red',
          title: item.status === 'approved' ? t.permissionApproved : t.permissionRejected,
          body: item.item_title || item.permission_id,
          meta: formatDate(item.updated_at || item.created_at, language),
          date: item.updated_at || item.created_at,
          target: item.status === 'approved' ? permissionTargetRoute(item.permission_id) : 'settings',
          requestId: item.id,
          permissionId: item.permission_id,
          itemTitle: item.item_title || item.permission_id,
          requestStatus: item.status,
          message: item.message || '',
        }));
    }
  } catch {
    // Permission table may be unavailable. Keep panel usable.
  }

  try {
    const requestResult = await listDepartmentSubmissionRequests(SCHOOL_YEAR);
    if (requestResult?.ok) {
      requestResult.requests
        .filter((request) => request.status === 'open')
        .filter((request) => isTargetedRequest(request, currentUser, isAdmin))
        .slice(0, 25)
        .forEach((request) => notifications.push({
          id: `department-request:${request.id}`,
          kind: 'department-request',
          source: 'department',
          sourceLabel: t.departmentSource,
          icon: '🏫',
          tone: 'blue',
          title: t.departmentRequest,
          body: request.title || request.category || 'Department request',
          meta: request.due_date ? `${t.due}: ${formatDate(request.due_date, language)}` : formatDate(request.created_at || request.updated_at, language),
          date: request.created_at || request.updated_at || request.due_date,
          target: 'department',
          requestId: request.id,
          requestTitle: request.title || request.category || 'Department request',
          category: request.category || '',
          description: request.description || '',
          dueDate: request.due_date || '',
          semester: request.semester || '',
          fileName: request.file_name || '',
          fileUrl: request.file_signed_url || '',
        }));
    }
  } catch {
    // Department request table may be unavailable. Keep panel usable.
  }

  try {
    let schedulePayload = null;
    try {
      const cloud = await loadDepartmentSnapshot(SCHOOL_YEAR);
      schedulePayload = cloud?.snapshot?.payload || null;
    } catch {
      schedulePayload = null;
    }
    const schedulePayloads = schedulePayload ? [schedulePayload, ...readLocalDepartmentPayloads(currentUser)] : readLocalDepartmentPayloads(currentUser);
    const seenSchedules = new Set();
    schedulePayloads
      .flatMap((payload) => getUpcomingScheduleEntries(payload))
      .slice(0, 12)
      .forEach(({ item, date }) => {
        const id = `department-schedule:${item.id || item.title || date.toISOString()}`;
        if (seenSchedules.has(id)) return;
        seenSchedules.add(id);
        notifications.push({
          id,
          kind: 'department-schedule',
          source: 'department',
          sourceLabel: t.departmentSource,
          icon: '📅',
          tone: 'blue',
          title: language === 'vi' ? 'Lịch làm việc tổ chuyên môn' : 'Department work schedule',
          body: item.title || item.type || (language === 'vi' ? 'Lịch làm việc' : 'Work schedule'),
          meta: formatScheduleDate(item, language),
          date: date.toISOString(),
          target: 'department',
          scheduleItem: item,
        });
      });
  } catch {
    // Keep notifications usable if schedule cache is unavailable.
  }

  if (isAdmin) {
    try {
      const submissionResult = await listDepartmentSubmissions(SCHOOL_YEAR);
      if (submissionResult?.ok) {
        submissionResult.submissions
          .filter((submission) => submission.status === 'pending')
          .slice(0, 25)
          .forEach((submission) => notifications.push({
            id: `department-submission:${submission.id}`,
            kind: 'department-submission',
            source: 'department',
            sourceLabel: t.departmentSource,
            icon: '📄',
            tone: 'orange',
            title: t.pendingSubmission,
            body: `${submission.submitter_name || submission.submitter_email || 'Teacher'} · ${submission.title || submission.request_title || submission.category}`,
            meta: formatDate(submission.created_at || submission.updated_at, language),
            date: submission.created_at || submission.updated_at,
            target: 'department',
            submissionId: submission.id,
            submissionTitle: submission.title || submission.request_title || submission.category || '',
            requestTitle: submission.request_title || '',
            category: submission.category || submission.request_category || '',
            submitterName: submission.submitter_name || '',
            submitterEmail: submission.submitter_email || '',
            note: submission.note || '',
            link: submission.link || '',
            fileName: submission.file_name || '',
            fileUrl: submission.file_signed_url || '',
          }));
      }
    } catch {
      // Department submissions table may be unavailable.
    }
  }

  try {
    const workNotifications = await listWorkHubNotifications(currentUser.id, 50);
    workNotifications.forEach((item) => notifications.push({
      id: `work-hub:${item.id}`,
      kind: 'work-hub',
      source: 'work-hub',
      sourceLabel: language === 'vi' ? 'Trung tâm công việc' : 'Work Hub',
      icon: item.notification_type === 'work_item_assigned'
        ? '📌'
        : (item.notification_type === 'work_item_submission' ? '📤' : '💬'),
      tone: item.notification_type === 'work_item_submission' ? 'orange' : 'green',
      title: item.title || (language === 'vi' ? 'Cập nhật công việc' : 'Work update'),
      body: item.body || '',
      meta: formatDate(item.created_at, language),
      date: item.created_at,
      target: 'work-hub',
      workNotificationId: item.id,
      itemId: item.item_id,
      notificationType: item.notification_type,
    }));
  } catch {
    // Work Hub may not be migrated yet. Keep the notification center usable.
  }

  return notifications.sort(sortNotifications);
}

function readBooleanSetting(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function writeBooleanSetting(key, value) {
  try {
    localStorage.setItem(key, String(Boolean(value)));
  } catch {
    // Ignore storage failures.
  }
}


function readGlobalMusicEnabled(currentUser) {
  try {
    const key = `bes-global-music-v1:${userKey(currentUser)}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return Boolean(parsed?.enabled);
  } catch {
    return false;
  }
}

function requestGlobalMusicToggle() {
  window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'toggle' } }));
}

let noticeAudioContext = null;

function getNoticeAudioContext() {
  if (noticeAudioContext && noticeAudioContext.state !== 'closed') return noticeAudioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  noticeAudioContext = new AudioContextClass();
  return noticeAudioContext;
}

async function unlockNoticeTone() {
  try {
    const ctx = getNoticeAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();

    // A silent one-sample source unlocks audio reliably on Safari/iOS after
    // the first user interaction without producing an audible click.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, Math.max(8000, ctx.sampleRate || 44100));
    const gain = ctx.createGain();
    gain.gain.value = 0.00001;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Browsers may still defer audio until the next user interaction.
  }
}

async function playNoticeTone() {
  try {
    const ctx = getNoticeAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const start = ctx.currentTime + 0.015;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.075, start + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 0.58);
    master.connect(ctx.destination);

    const notes = [
      { frequency: 740, offset: 0, duration: 0.22 },
      { frequency: 988, offset: 0.18, duration: 0.30 },
    ];

    notes.forEach(({ frequency, offset, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = start + offset;
      const noteEnd = noteStart + duration;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, noteStart);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.035, noteEnd);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.85, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      osc.connect(gain);
      gain.connect(master);
      osc.start(noteStart);
      osc.stop(noteEnd + 0.02);
    });
  } catch {
    // Sound is optional and must never interrupt the notification center.
  }
}

function notificationCategory(item) {
  if (!item) return 'system';
  if (item.source === 'permission') return 'action';
  if (item.source === 'work-hub') return 'action';
  if (item.id?.startsWith('department-submission:')) return 'action';
  if (item.id?.startsWith('department-request:')) return 'action';
  return 'system';
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function relativeTime(value, language = 'vi') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Math.max(0, Date.now() - date.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return language === 'vi' ? 'Vừa xong' : 'Just now';
  if (min < 60) return language === 'vi' ? `${min} phút trước` : `${min} min ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return language === 'vi' ? `${hour} giờ trước` : `${hour} hr ago`;
  const day = Math.floor(hour / 24);
  return language === 'vi' ? `${day} ngày trước` : `${day} day${day > 1 ? 's' : ''} ago`;
}

function GlobalToggle({ icon, label, checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      className={`global-notice-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || label}
    >
      <span className="global-notice-toggle-icon" aria-hidden="true">{icon}</span>
      <span className="global-notice-toggle-label">{label}</span>
      <span className="global-notice-switch" aria-hidden="true"><i /></span>
    </button>
  );
}

function GlobalStatusPill({ tone, icon, label, value, onClick }) {
  return (
    <button type="button" className={`global-status-pill tone-${tone}`} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </button>
  );
}


function extractYouTubeVideoId(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || '';
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || '';
      return url.searchParams.get('v') || '';
    }
  } catch {}
  return '';
}

async function searchYouTubeVideos(query, apiKey) {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('type', 'video');
  endpoint.searchParams.set('maxResults', '8');
  endpoint.searchParams.set('safeSearch', 'strict');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint.toString());
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'YouTube search failed');
  return (payload.items || []).map((item) => ({
    id: item?.id?.videoId,
    title: item?.snippet?.title || 'YouTube video',
    channel: item?.snippet?.channelTitle || 'YouTube',
    thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || '',
    publishedAt: item?.snippet?.publishedAt || '',
  })).filter((item) => item.id);
}
export default function StatusMenuBar({
  language = 'vi',
  route = 'home',
  currentUser,
  hasApiKey,
  theme = 'light',
  setTheme,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => readDismissed(currentUser));
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [expandedNotificationId, setExpandedNotificationId] = useState('');
  const [notificationActionBusy, setNotificationActionBusy] = useState('');
  const [notificationDrafts, setNotificationDrafts] = useState({});
  const [panelFeedback, setPanelFeedback] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => readBooleanSetting('bes-global-notice-sound', true));
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(() => readBooleanSetting('bes-global-notice-live-sync', true));
  const [musicEnabled, setMusicEnabled] = useState(() => readGlobalMusicEnabled(currentUser));
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState(() => readAccountYouTubeVideo(currentUser));
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState('YouTube Classroom');
  const [youtubePlaybackMode, setYoutubePlaybackMode] = useState(() => readYouTubePlaybackMode(currentUser));
  const [youtubeSearching, setYoutubeSearching] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState(() => readLocalAccountYouTubeApiKey(currentUser));
  const [youtubeKeyDraft, setYoutubeKeyDraft] = useState(() => readLocalAccountYouTubeApiKey(currentUser));
  const [youtubeKeySaving, setYoutubeKeySaving] = useState(false);
  const [youtubeKeyStatus, setYoutubeKeyStatus] = useState('');
  const knownNotificationIdsRef = useRef(null);
  const notificationIdentityRef = useRef(userKey(currentUser));
  const notificationBaselineReadyRef = useRef(false);
  const noticeAnimationTimerRef = useRef(null);
  const [newNoticeAnimating, setNewNoticeAnimating] = useState(false);
  const t = routeLabels[language] || routeLabels.vi;
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    setDismissedIds(readDismissed(currentUser));
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    let alive = true;
    const localKey = readLocalAccountYouTubeApiKey(currentUser);
    setYoutubeApiKey(localKey);
    setYoutubeKeyDraft(localKey);
    setYoutubePlaybackMode(readYouTubePlaybackMode(currentUser));
    setYoutubeVideoId(readAccountYouTubeVideo(currentUser));
    setYoutubeKeyStatus('');

    getAccountYouTubeApiKey(currentUser).then((accountKey) => {
      if (!alive) return;
      const nextKey = accountKey || localKey;
      setYoutubeApiKey(nextKey);
      setYoutubeKeyDraft(nextKey);
    });
    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    writeBooleanSetting('bes-global-notice-sound', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const unlock = () => { void unlockNoticeTone(); };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  useEffect(() => {
    writeBooleanSetting('bes-global-notice-live-sync', liveSyncEnabled);
  }, [liveSyncEnabled]);

  useEffect(() => {
    const syncSystemSettings = () => {
      setSoundEnabled(readBooleanSetting('bes-global-notice-sound', true));
      setLiveSyncEnabled(readBooleanSetting('bes-global-notice-live-sync', true));
    };
    const openPanel = () => setPanelOpen(true);
    window.addEventListener('bes-system-settings-updated', syncSystemSettings);
    window.addEventListener('bes-global-notice-open', openPanel);
    return () => {
      window.removeEventListener('bes-system-settings-updated', syncSystemSettings);
      window.removeEventListener('bes-global-notice-open', openPanel);
    };
  }, []);

  useEffect(() => {
    const syncMusicState = () => setMusicEnabled(readGlobalMusicEnabled(currentUser));
    syncMusicState();
    window.addEventListener('bes-global-music-settings-updated', syncMusicState);
    return () => window.removeEventListener('bes-global-music-settings-updated', syncMusicState);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const refresh = () => setRefreshTick((value) => value + 1);
    const timer = liveSyncEnabled ? window.setInterval(refresh, 20000) : null;
    window.addEventListener(PERMISSION_REQUESTS_EVENT, refresh);
    window.addEventListener(DEPARTMENT_SNAPSHOT_EVENT, refresh);
    window.addEventListener(DEPARTMENT_SUBMISSION_REQUESTS_EVENT, refresh);
    window.addEventListener(DEPARTMENT_SUBMISSIONS_EVENT, refresh);
    window.addEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    const unsubscribeWorkHub = liveSyncEnabled && currentUser?.id
      ? subscribeWorkHubNotifications(currentUser.id, refresh)
      : () => {};
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener(PERMISSION_REQUESTS_EVENT, refresh);
      window.removeEventListener(DEPARTMENT_SNAPSHOT_EVENT, refresh);
      window.removeEventListener(DEPARTMENT_SUBMISSION_REQUESTS_EVENT, refresh);
      window.removeEventListener(DEPARTMENT_SUBMISSIONS_EVENT, refresh);
      window.removeEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      unsubscribeWorkHub();
    };
  }, [liveSyncEnabled, currentUser?.id]);

  useEffect(() => {
    let alive = true;
    const identity = userKey(currentUser);
    if (notificationIdentityRef.current !== identity) {
      notificationIdentityRef.current = identity;
      notificationBaselineReadyRef.current = false;
      knownNotificationIdsRef.current = null;
    }

    setLoading(true);
    buildNotificationList({ currentUser, language, isAdmin })
      .then((list) => {
        if (!alive) return;
        if (!notificationBaselineReadyRef.current) {
          knownNotificationIdsRef.current = new Set(list.map((item) => item.id));
          notificationBaselineReadyRef.current = true;
        }
        setNotifications(list);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, language, isAdmin, refreshTick]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [notifications, dismissedIds],
  );

  const actionNotifications = useMemo(
    () => visibleNotifications.filter((item) => notificationCategory(item) === 'action'),
    [visibleNotifications],
  );
  const systemNotifications = useMemo(
    () => visibleNotifications.filter((item) => notificationCategory(item) === 'system'),
    [visibleNotifications],
  );
  const todayNotifications = useMemo(
    () => visibleNotifications.filter((item) => isToday(item.date || item.createdAt)),
    [visibleNotifications],
  );
  const pendingPermissionCount = useMemo(
    () => visibleNotifications.filter((item) => item.source === 'permission' && item.target === 'admin').length,
    [visibleNotifications],
  );

  useEffect(() => {
    if (loading || !notificationBaselineReadyRef.current) return;

    const nextIds = new Set(visibleNotifications.map((item) => item.id));
    const knownIds = knownNotificationIdsRef.current;
    if (knownIds === null) {
      knownNotificationIdsRef.current = nextIds;
      return;
    }

    const hasNewNotification = [...nextIds].some((id) => !knownIds.has(id));
    knownNotificationIdsRef.current = nextIds;
    if (!hasNewNotification) return;

    if (soundEnabled) void playNoticeTone();

    // Restart the strong arrival animation even when notifications arrive
    // close together, while the regular unread pulse remains CSS-driven.
    setNewNoticeAnimating(false);
    window.requestAnimationFrame(() => setNewNoticeAnimating(true));
    if (noticeAnimationTimerRef.current) window.clearTimeout(noticeAnimationTimerRef.current);
    noticeAnimationTimerRef.current = window.setTimeout(() => {
      setNewNoticeAnimating(false);
      noticeAnimationTimerRef.current = null;
    }, 1800);
  }, [visibleNotifications, loading, soundEnabled]);

  useEffect(() => () => {
    if (noticeAnimationTimerRef.current) window.clearTimeout(noticeAnimationTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'action') return actionNotifications;
    if (activeTab === 'system') return systemNotifications;
    return visibleNotifications;
  }, [activeTab, actionNotifications, systemNotifications, visibleNotifications]);

  const groupedNotifications = useMemo(() => {
    if (activeTab !== 'all') return [{ key: activeTab, items: filteredNotifications }];
    return [
      { key: 'action', items: actionNotifications },
      { key: 'system', items: systemNotifications },
    ].filter((group) => group.items.length);
  }, [activeTab, actionNotifications, systemNotifications, filteredNotifications]);

  const dismissNotification = (event, id) => {
    event.stopPropagation();
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(id);
      saveDismissed(currentUser, next);
      return next;
    });
  };

  const clearAllNotifications = async () => {
    const next = new Set(dismissedIds);
    notifications.forEach((item) => next.add(item.id));
    saveDismissed(currentUser, next);
    setDismissedIds(next);
    if (currentUser?.id) await markAllWorkHubNotificationsRead(currentUser.id);
    refreshNotificationData();
  };

  const markNotificationRead = async (item) => {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(item.id);
      saveDismissed(currentUser, next);
      return next;
    });
    if (item?.kind === 'work-hub' && item.workNotificationId !== undefined) {
      await markWorkHubNotificationRead(item.workNotificationId);
      refreshNotificationData();
    }
    if (expandedNotificationId === item.id) setExpandedNotificationId('');
  };

  const updateNotificationDraft = (id, patch) => {
    setNotificationDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), ...patch },
    }));
  };

  const showPanelFeedback = (tone, text) => {
    setPanelFeedback({ tone, text });
    window.setTimeout(() => {
      setPanelFeedback((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  const refreshNotificationData = () => setRefreshTick((value) => value + 1);

  const openNotificationPage = (item) => {
    if (item?.kind === 'work-hub' && item.itemId) {
      rememberWorkHubItem(item.itemId);
      markNotificationRead(item);
    }
    setPanelOpen(false);
    navTo(item.target || 'department');
  };

  const openNotificationAttachment = (item) => {
    const url = item.fileUrl || item.link;
    if (!url) {
      showPanelFeedback('error', language === 'vi' ? 'Thông báo này không có tệp hoặc liên kết đính kèm.' : 'This notification has no attachment or link.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const approvePermissionNotification = async (item) => {
    const busyKey = `${item.id}:approve`;
    setNotificationActionBusy(busyKey);
    try {
      const users = await getUsers();
      const target = users.find((user) => user.id === item.requesterId);
      if (!target) throw new Error(language === 'vi' ? 'Không tìm thấy tài khoản gửi yêu cầu.' : 'The requesting account was not found.');
      const permissions = normalizePermissions(target.permissions);
      if (target.role !== 'admin' && permissions.mode === 'custom') {
        const nextAllowed = [...new Set([...getAllowedIdsFromPermissions(permissions), item.permissionId])];
        const grant = await updateUserPermissions(target.id, createCustomPermissions(nextAllowed));
        if (!grant?.ok) throw new Error(grant?.message || 'Could not grant permission.');
      }
      const result = await updatePermissionRequestStatus(item.requestId, 'approved');
      if (!result?.ok) throw new Error(result?.message || 'Could not approve permission.');
      showPanelFeedback('success', language === 'vi' ? `Đã duyệt quyền ${item.itemTitle}.` : `Approved access to ${item.itemTitle}.`);
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể duyệt yêu cầu.' : 'Could not approve the request.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const rejectPermissionNotification = async (item) => {
    const busyKey = `${item.id}:reject`;
    setNotificationActionBusy(busyKey);
    try {
      const result = await updatePermissionRequestStatus(item.requestId, 'rejected');
      if (!result?.ok) throw new Error(result?.message || 'Could not reject permission.');
      showPanelFeedback('success', language === 'vi' ? 'Đã từ chối yêu cầu quyền.' : 'Permission request rejected.');
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể từ chối yêu cầu.' : 'Could not reject the request.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const retryPermissionNotification = async (item) => {
    const busyKey = `${item.id}:retry`;
    setNotificationActionBusy(busyKey);
    try {
      const result = await requestPermission({
        user: currentUser,
        permissionId: item.permissionId,
        item: getPermissionItem(item.permissionId),
        language,
      });
      if (!result?.ok) throw new Error(result?.message || 'Could not send request.');
      showPanelFeedback('success', result.message || (language === 'vi' ? 'Đã gửi lại yêu cầu quyền.' : 'Permission request sent again.'));
      markNotificationRead(item);
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể gửi lại yêu cầu.' : 'Could not resend the request.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const reviewSubmissionNotification = async (item, status) => {
    const busyKey = `${item.id}:${status}`;
    setNotificationActionBusy(busyKey);
    try {
      const draft = notificationDrafts[item.id] || {};
      const defaultRejectNote = language === 'vi'
        ? 'Vui lòng kiểm tra và bổ sung nội dung theo yêu cầu của TTCM.'
        : 'Please review and complete the submission according to the department request.';
      const note = status === 'rejected' ? (draft.reviewNote?.trim() || defaultRejectNote) : (draft.reviewNote?.trim() || '');
      const result = await reviewDepartmentSubmission(item.submissionId, status, note, currentUser);
      if (!result?.ok) throw new Error(result?.message || 'Could not review submission.');
      showPanelFeedback('success', status === 'approved'
        ? (language === 'vi' ? 'Đã duyệt hồ sơ trực tiếp trong bảng thông báo.' : 'Submission approved inside the notification panel.')
        : (language === 'vi' ? 'Đã gửi yêu cầu chỉnh sửa cho giáo viên.' : 'Revision request sent to the teacher.'));
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể xử lý hồ sơ.' : 'Could not process the submission.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const closeDepartmentRequestNotification = async (item) => {
    const busyKey = `${item.id}:close`;
    setNotificationActionBusy(busyKey);
    try {
      const result = await updateDepartmentSubmissionRequestStatus(item.requestId, 'closed');
      if (!result?.ok) throw new Error(result?.message || 'Could not close request.');
      showPanelFeedback('success', language === 'vi' ? 'Đã đóng yêu cầu nộp hồ sơ.' : 'Submission request closed.');
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể đóng yêu cầu.' : 'Could not close the request.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const submitDepartmentRequestNotification = async (item) => {
    const busyKey = `${item.id}:submit`;
    setNotificationActionBusy(busyKey);
    try {
      const draft = notificationDrafts[item.id] || {};
      const title = String(draft.title || item.requestTitle || '').trim();
      if (!title) throw new Error(language === 'vi' ? 'Nhập tên hồ sơ trước khi nộp.' : 'Enter a submission title first.');
      const result = await createDepartmentSubmission({
        schoolYear: SCHOOL_YEAR,
        semester: item.semester || '',
        requestId: item.requestId,
        title,
        category: item.category || (language === 'vi' ? 'Hồ sơ theo thông báo' : 'Requested submission'),
        note: String(draft.note || '').trim(),
        relatedTask: item.requestTitle || '',
        file: draft.file || null,
      }, currentUser);
      if (!result?.ok) throw new Error(result?.message || 'Could not submit.');
      showPanelFeedback('success', language === 'vi' ? 'Đã nộp hồ sơ trực tiếp từ bảng thông báo.' : 'Submission sent directly from the notification panel.');
      markNotificationRead(item);
      refreshNotificationData();
    } catch (error) {
      showPanelFeedback('error', error?.message || (language === 'vi' ? 'Không thể nộp hồ sơ.' : 'Could not submit the file.'));
    } finally {
      setNotificationActionBusy('');
    }
  };

  const setDarkMode = (next) => {
    setTheme?.(next ? 'dark' : 'light');
  };

  const toggleSound = (next) => {
    setSoundEnabled(next);
    if (next) playNoticeTone();
  };

  const effectiveYouTubeApiKey = youtubeApiKey || import.meta.env.VITE_YOUTUBE_API_KEY || '';

  const playYouTubeVideo = (videoId, title = '') => {
    if (!videoId) return;
    setYoutubeVideoId(videoId);
    if (title) setYoutubeVideoTitle(title);
    saveAccountYouTubeVideo(currentUser, videoId);
  };

  const stopYouTubeVideo = () => {
    setYoutubeVideoId('');
    saveAccountYouTubeVideo(currentUser, '');
  };

  const changeYouTubePlaybackMode = (mode) => {
    const nextMode = mode === 'audio' ? 'audio' : 'video';
    setYoutubePlaybackMode(nextMode);
    saveYouTubePlaybackMode(currentUser, nextMode);
  };

  useEffect(() => {
    if (youtubePlaybackMode !== 'video' || !youtubeVideoId) return;
    if (panelOpen && activeTab === 'youtube') return;
    stopYouTubeVideo();
  }, [panelOpen, activeTab, youtubePlaybackMode, youtubeVideoId]);

  const submitYouTubeSearch = async (event) => {
    event?.preventDefault?.();
    const query = youtubeQuery.trim();
    if (!query) return;
    const directId = extractYouTubeVideoId(query);
    if (directId) {
      playYouTubeVideo(directId);
      setYoutubeError('');
      return;
    }
    if (!effectiveYouTubeApiKey) {
      setYoutubeError(language === 'vi'
        ? 'Chưa có YouTube API key. Bạn vẫn có thể dán link video để phát, hoặc thêm API key để tìm kiếm ngay trong bảng.'
        : 'No YouTube API key yet. Paste a video link to play it, or add an API key for in-panel search.');
      return;
    }
    setYoutubeSearching(true);
    setYoutubeError('');
    try {
      const items = await searchYouTubeVideos(query, effectiveYouTubeApiKey);
      setYoutubeResults(items);
      if (!items.length) setYoutubeError(language === 'vi' ? 'Không tìm thấy video phù hợp.' : 'No matching videos found.');
    } catch (error) {
      setYoutubeError(error?.message || (language === 'vi' ? 'Không thể tìm kiếm YouTube.' : 'Could not search YouTube.'));
    } finally {
      setYoutubeSearching(false);
    }
  };

  const saveYouTubeApiKey = async () => {
    setYoutubeKeySaving(true);
    setYoutubeKeyStatus('');
    const result = await saveAccountYouTubeApiKey(youtubeKeyDraft, currentUser);
    setYoutubeKeySaving(false);
    if (!result?.ok) {
      setYoutubeKeyStatus(result?.message || (language === 'vi' ? 'Không thể lưu API key.' : 'Could not save the API key.'));
      return;
    }
    const cleanKey = youtubeKeyDraft.trim();
    setYoutubeApiKey(cleanKey);
    setYoutubeKeyStatus(language === 'vi'
      ? (currentUser ? 'Đã lưu YouTube API key vào tài khoản.' : 'Đã lưu API key cho phiên khách trên trình duyệt này.')
      : (currentUser ? 'YouTube API key saved to your account.' : 'API key saved for this guest browser session.'));
  };

  const clearYouTubeApiKey = async () => {
    setYoutubeKeyDraft('');
    setYoutubeApiKey('');
    setYoutubeKeySaving(true);
    const result = await saveAccountYouTubeApiKey('', currentUser);
    setYoutubeKeySaving(false);
    setYoutubeKeyStatus(result?.ok
      ? (language === 'vi' ? 'Đã xoá YouTube API key khỏi tài khoản.' : 'YouTube API key removed from your account.')
      : (result?.message || (language === 'vi' ? 'Không thể xoá API key.' : 'Could not remove the API key.')));
  };

  const openPanel = () => {
    setPanelOpen(true);
    setActiveTab('all');
  };

  return (
    <div className="global-notice-shell" aria-label={language === 'vi' ? 'Trung tâm thông báo hệ thống' : 'System notification center'}>
      <div className="global-notice-bar">
        <button type="button" className="global-notice-title" onClick={openPanel}>
          <span className="global-notice-bell" aria-hidden="true">🔔</span>
          <span>{language === 'vi' ? 'Trung tâm thông báo' : 'Notification center'}</span>
        </button>

        <div className="global-notice-statuses" aria-label={language === 'vi' ? 'Tóm tắt thông báo' : 'Notification summary'}>
          <GlobalStatusPill
            tone="green"
            icon="✓"
            value={todayNotifications.length}
            label={language === 'vi' ? 'việc hôm nay' : 'today'}
            onClick={() => { setPanelOpen(true); setActiveTab('all'); }}
          />
          <GlobalStatusPill
            tone="blue"
            icon="👥"
            value={pendingPermissionCount}
            label={language === 'vi' ? 'tài khoản chờ duyệt' : 'accounts pending'}
            onClick={() => { setPanelOpen(true); setActiveTab('action'); }}
          />
          <GlobalStatusPill
            tone="amber"
            icon="☁"
            value={liveSyncEnabled ? 'OK' : 'OFF'}
            label={language === 'vi' ? 'Cloud sync' : 'Cloud sync'}
            onClick={() => setLiveSyncEnabled((value) => !value)}
          />
          <GlobalStatusPill
            tone="purple"
            icon="✦"
            value={hasApiKey ? 'ON' : 'OFF'}
            label="AI"
            onClick={() => navTo(currentUser ? 'settings' : 'login')}
          />
        </div>

        <div className="global-notice-utilities" aria-label={language === 'vi' ? 'Tiện ích nhanh' : 'Quick utilities'}>
          <GlobalToggle
            icon="◔"
            label={language === 'vi' ? 'Chế độ tối' : 'Dark mode'}
            checked={theme === 'dark'}
            onChange={setDarkMode}
          />
          <GlobalToggle
            icon="🔊"
            label={language === 'vi' ? 'Âm báo' : 'Sound'}
            checked={soundEnabled}
            onChange={toggleSound}
          />
          <GlobalToggle
            icon="⟳"
            label={language === 'vi' ? 'Đồng bộ live' : 'Live sync'}
            checked={liveSyncEnabled}
            onChange={setLiveSyncEnabled}
          />
          <GlobalToggle
            icon="♫"
            label={language === 'vi' ? 'Nhạc nền' : 'Music'}
            checked={musicEnabled}
            onChange={() => requestGlobalMusicToggle()}
          />
        </div>

        <button
          type="button"
          className={`global-notice-open ${panelOpen ? 'is-open' : ''} ${visibleNotifications.length ? 'has-unread' : ''} ${newNoticeAnimating ? 'has-new-notice' : ''}`}
          onClick={() => setPanelOpen((value) => !value)}
          aria-expanded={panelOpen}
        >
          <span aria-hidden="true">☷</span>
          <strong>{language === 'vi' ? 'Mở bảng thông báo' : 'Open notifications'}</strong>
          <b aria-label={language === 'vi' ? `${visibleNotifications.length} thông báo chưa đọc` : `${visibleNotifications.length} unread notifications`}>{visibleNotifications.length}</b>
        </button>
      </div>

      {panelOpen ? (
        <div className="global-notice-panel-layer" onMouseDown={(event) => event.target === event.currentTarget && setPanelOpen(false)}>
          <aside className={`global-notice-panel ${activeTab === 'youtube' ? 'youtube-open' : ''}`} aria-label={t.panelTitle}>
            <header className="global-notice-panel-header">
              <div>
                <span>{language === 'vi' ? 'Brian English Studio' : 'Brian English Studio'}</span>
                <h2>{t.panelTitle} <b>{visibleNotifications.length}</b></h2>
              </div>
              <button type="button" className="global-notice-panel-close" onClick={() => setPanelOpen(false)} aria-label={t.close}>×</button>
            </header>

            <div className="global-notice-tabs" role="tablist">
              <button type="button" className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
                {language === 'vi' ? 'Tất cả' : 'All'} <span>{visibleNotifications.length}</span>
              </button>
              <button type="button" className={activeTab === 'action' ? 'active' : ''} onClick={() => setActiveTab('action')}>
                {language === 'vi' ? 'Cần xử lý' : 'Action'} <span>{actionNotifications.length}</span>
              </button>
              <button type="button" className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>
                {language === 'vi' ? 'Hệ thống' : 'System'} <span>{systemNotifications.length}</span>
              </button>
              <button type="button" className={activeTab === 'youtube' ? 'active' : ''} onClick={() => setActiveTab('youtube')}>
                YouTube <span>▶</span>
              </button>
            </div>

            <div className={`global-notice-panel-scroll ${activeTab === 'youtube' ? 'youtube-mode' : ''}`}>
              {activeTab === 'youtube' ? (
                <section className="global-youtube-center">
                  <div className="global-youtube-heading">
                    <div>
                      <span>▶ YouTube Classroom</span>
                      <h3>{language === 'vi' ? 'Tìm nhanh và phát video' : 'Quick search and play'}</h3>
                      <p>{language === 'vi' ? 'Dán link YouTube hoặc nhập từ khóa để tìm video ngay trong bảng thông báo.' : 'Paste a YouTube link or search by keyword directly inside the notification panel.'}</p>
                    </div>
                  </div>

                  <form className="global-youtube-search" onSubmit={submitYouTubeSearch}>
                    <input
                      value={youtubeQuery}
                      onChange={(event) => setYoutubeQuery(event.target.value)}
                      placeholder={language === 'vi' ? 'Nhập từ khóa hoặc dán link YouTube…' : 'Search keywords or paste a YouTube link…'}
                    />
                    <button type="submit" disabled={youtubeSearching}>{youtubeSearching ? '…' : (language === 'vi' ? 'Tìm / Phát' : 'Search / Play')}</button>
                  </form>

                  <details className="global-youtube-key-box" open={!youtubeApiKey}>
                    <summary>
                      {language === 'vi' ? 'YouTube API key theo tài khoản' : 'Account YouTube API key'}
                      <span className={youtubeApiKey ? 'is-saved' : ''}>{youtubeApiKey ? (language === 'vi' ? 'Đã lưu' : 'Saved') : (language === 'vi' ? 'Chưa có' : 'Missing')}</span>
                    </summary>
                    <div className="global-youtube-key-fields">
                      <input
                        type="password"
                        value={youtubeKeyDraft}
                        onChange={(event) => { setYoutubeKeyDraft(event.target.value); setYoutubeKeyStatus(''); }}
                        placeholder="YouTube Data API v3 key"
                        autoComplete="off"
                      />
                      <button type="button" onClick={saveYouTubeApiKey} disabled={youtubeKeySaving || !youtubeKeyDraft.trim()}>
                        {youtubeKeySaving ? '…' : (language === 'vi' ? 'Lưu vào tài khoản' : 'Save to account')}
                      </button>
                      {youtubeApiKey ? <button type="button" className="danger" onClick={clearYouTubeApiKey} disabled={youtubeKeySaving}>{language === 'vi' ? 'Xoá' : 'Remove'}</button> : null}
                    </div>
                    <small>{language === 'vi'
                      ? 'Key được đồng bộ bằng tài khoản Supabase; khi chưa đăng nhập, key chỉ lưu theo phiên khách trên trình duyệt.'
                      : 'The key syncs through your Supabase account; while signed out, it remains scoped to this guest browser.'}</small>
                    {youtubeKeyStatus ? <div className={`global-youtube-key-status ${youtubeKeyStatus.includes('Đã') || youtubeKeyStatus.includes('saved') ? 'ok' : ''}`}>{youtubeKeyStatus}</div> : null}
                  </details>

                  {youtubeError ? <div className="global-youtube-error">{youtubeError}</div> : null}

                  <div className="global-youtube-mode-picker" role="group" aria-label={language === 'vi' ? 'Chế độ phát YouTube' : 'YouTube playback mode'}>
                    <button
                      type="button"
                      className={youtubePlaybackMode === 'audio' ? 'active audio' : 'audio'}
                      onClick={() => changeYouTubePlaybackMode('audio')}
                    >
                      <span>♫</span>
                      <div>
                        <strong>{language === 'vi' ? 'Phát âm thanh nền' : 'Background audio'}</strong>
                        <small>{language === 'vi' ? 'Đóng bảng thông báo, âm thanh vẫn tiếp tục phát.' : 'Audio keeps playing after the panel closes.'}</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={youtubePlaybackMode === 'video' ? 'active video' : 'video'}
                      onClick={() => changeYouTubePlaybackMode('video')}
                    >
                      <span>▶</span>
                      <div>
                        <strong>{language === 'vi' ? 'Phát video trong bảng' : 'Video inside panel'}</strong>
                        <small>{language === 'vi' ? 'Video chỉ phát tại đây và dừng khi đóng bảng.' : 'Video plays here and stops when the panel closes.'}</small>
                      </div>
                    </button>
                  </div>

                  {youtubeVideoId && youtubePlaybackMode === 'video' ? (
                    <div className="global-youtube-player-card">
                      <div className="global-youtube-player-toolbar">
                        <div>
                          <strong>{youtubeVideoTitle || 'YouTube Classroom'}</strong>
                          <small>{language === 'vi' ? 'Đang phát video trong bảng thông báo' : 'Playing inside the notification panel'}</small>
                        </div>
                        <nav>
                          <button type="button" onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeVideoId}`, '_blank', 'noopener,noreferrer')}>↗ {language === 'vi' ? 'YouTube' : 'YouTube'}</button>
                          <button type="button" className="danger" onClick={stopYouTubeVideo}>× {language === 'vi' ? 'Dừng' : 'Stop'}</button>
                        </nav>
                      </div>
                      <div className="global-youtube-player-wrap">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0&playsinline=1`}
                          title="YouTube classroom panel player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : null}

                  {youtubeVideoId && youtubePlaybackMode === 'audio' ? (
                    <div className="global-youtube-audio-status">
                      <div className="global-youtube-audio-icon">♫</div>
                      <div>
                        <strong>{youtubeVideoTitle || 'YouTube Classroom'}</strong>
                        <small>{language === 'vi' ? 'Đang phát như nhạc nền. Có thể đóng bảng thông báo.' : 'Playing as background audio. You may close the panel.'}</small>
                      </div>
                      <button type="button" onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeVideoId}`, '_blank', 'noopener,noreferrer')}>↗</button>
                      <button type="button" className="danger" onClick={stopYouTubeVideo}>×</button>
                    </div>
                  ) : null}

                  {youtubeResults.length ? (
                    <div className="global-youtube-results">
                      {youtubeResults.map((video) => (
                        <button key={video.id} type="button" className={video.id === youtubeVideoId ? 'active' : ''} onClick={() => playYouTubeVideo(video.id, video.title)}>
                          <img src={video.thumbnail} alt="" />
                          <span><strong>{video.title}</strong><small>{video.channel}</small></span>
                          <b>▶</b>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {activeTab !== 'youtube' && loading ? <div className="global-notice-empty"><strong>{t.loading}</strong></div> : null}
              {activeTab !== 'youtube' && !loading && !filteredNotifications.length ? (
                <div className="global-notice-empty">
                  <span>✨</span>
                  <strong>{t.emptyTitle}</strong>
                  <small>{t.emptyText}</small>
                </div>
              ) : null}

              {activeTab !== 'youtube' && panelFeedback ? (
                <div className={`global-notice-feedback is-${panelFeedback.tone || 'success'}`}>
                  <span>{panelFeedback.tone === 'error' ? '!' : '✓'}</span>
                  <strong>{panelFeedback.text}</strong>
                  <button type="button" onClick={() => setPanelFeedback(null)} aria-label={t.close}>×</button>
                </div>
              ) : null}

              {activeTab !== 'youtube' && !loading && filteredNotifications.length ? (
                <div className="global-notice-interaction-hint">
                  <span>↯</span>
                  <p><strong>{t.interactHint}</strong><small>{language === 'vi' ? 'Duyệt, từ chối, nộp hồ sơ, xem tệp hoặc đánh dấu đã đọc mà không cần rời bảng.' : 'Approve, reject, submit, open attachments or mark notifications read without leaving the panel.'}</small></p>
                </div>
              ) : null}

              {activeTab !== 'youtube' && !loading && groupedNotifications.map((group) => (
                <section className="global-notice-group" key={group.key}>
                  <div className="global-notice-group-head">
                    <strong>{group.key === 'action'
                      ? (language === 'vi' ? 'Cần xử lý' : 'Action required')
                      : (language === 'vi' ? 'Hệ thống' : 'System')}</strong>
                    <span>{group.items.length}</span>
                  </div>
                  <div className="global-notice-list">
                    {group.items.map((item) => {
                      const expanded = expandedNotificationId === item.id;
                      const draft = notificationDrafts[item.id] || {};
                      const itemBusy = notificationActionBusy.startsWith(`${item.id}:`);
                      const hasAttachment = Boolean(item.fileUrl || item.link);
                      return (
                        <article key={item.id} className={`global-notice-card tone-${item.tone} ${expanded ? 'is-expanded' : ''}`}>
                          <div className="global-notice-card-row">
                            <button
                              type="button"
                              className="global-notice-card-main"
                              onClick={() => setExpandedNotificationId((current) => (current === item.id ? '' : item.id))}
                              aria-expanded={expanded}
                            >
                              <span className="global-notice-card-icon" aria-hidden="true">{item.icon}</span>
                              <span className="global-notice-card-copy">
                                <span className="global-notice-card-title">
                                  <strong>{item.title}</strong>
                                  <small>{relativeTime(item.date || item.createdAt, language)}</small>
                                </span>
                                <span className="global-notice-card-body">{item.body}</span>
                                <span className="global-notice-card-meta">{item.meta || item.sourceLabel}</span>
                              </span>
                              <span className={`global-notice-card-chevron ${expanded ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
                            </button>
                            <button type="button" className="global-notice-dismiss" onClick={(event) => dismissNotification(event, item.id)} aria-label={t.delete}>×</button>
                          </div>

                          <div className="global-notice-quick-actions">
                            {item.kind === 'permission-admin' ? <>
                              <button type="button" className="is-success" disabled={itemBusy} onClick={() => approvePermissionNotification(item)}>{notificationActionBusy === `${item.id}:approve` ? t.sending : `✓ ${t.approve}`}</button>
                              <button type="button" className="is-danger" disabled={itemBusy} onClick={() => rejectPermissionNotification(item)}>{notificationActionBusy === `${item.id}:reject` ? t.sending : `× ${t.reject}`}</button>
                            </> : null}

                            {item.kind === 'permission-user' && item.requestStatus === 'approved' ? <>
                              <button type="button" className="is-primary" onClick={() => openNotificationPage(item)}>↗ {t.open}</button>
                              <button type="button" onClick={() => markNotificationRead(item)}>✓ {t.markRead}</button>
                            </> : null}

                            {item.kind === 'permission-user' && item.requestStatus === 'rejected' ? <>
                              <button type="button" className="is-primary" disabled={itemBusy} onClick={() => retryPermissionNotification(item)}>{notificationActionBusy === `${item.id}:retry` ? t.sending : `↻ ${t.retryPermission}`}</button>
                              <button type="button" onClick={() => openNotificationPage(item)}>⚙ {language === 'vi' ? 'Cài đặt' : 'Settings'}</button>
                            </> : null}

                            {item.kind === 'department-submission' ? <>
                              <button type="button" className="is-success" disabled={itemBusy} onClick={() => reviewSubmissionNotification(item, 'approved')}>{notificationActionBusy === `${item.id}:approved` ? t.sending : `✓ ${t.approve}`}</button>
                              <button type="button" className="is-danger" disabled={itemBusy} onClick={() => reviewSubmissionNotification(item, 'rejected')}>{notificationActionBusy === `${item.id}:rejected` ? t.sending : `↺ ${t.requestChanges}`}</button>
                              {hasAttachment ? <button type="button" onClick={() => openNotificationAttachment(item)}>▣ {t.viewAttachment}</button> : null}
                            </> : null}

                            {item.kind === 'department-request' && isAdmin ? <>
                              <button type="button" className="is-danger" disabled={itemBusy} onClick={() => closeDepartmentRequestNotification(item)}>{notificationActionBusy === `${item.id}:close` ? t.sending : `■ ${t.closeRequest}`}</button>
                              {hasAttachment ? <button type="button" onClick={() => openNotificationAttachment(item)}>▣ {t.viewAttachment}</button> : null}
                              <button type="button" onClick={() => openNotificationPage(item)}>↗ {t.openRelated}</button>
                            </> : null}

                            {item.kind === 'department-request' && !isAdmin ? <>
                              <button type="button" className="is-primary" onClick={() => setExpandedNotificationId(item.id)}>＋ {t.submitNow}</button>
                              {hasAttachment ? <button type="button" onClick={() => openNotificationAttachment(item)}>▣ {t.viewAttachment}</button> : null}
                              <button type="button" onClick={() => openNotificationPage(item)}>↗ {t.openRelated}</button>
                            </> : null}

                            {item.kind === 'work-hub' ? <>
                              <button type="button" className="is-primary" onClick={() => openNotificationPage(item)}>↗ {language === 'vi' ? 'Mở công việc' : 'Open task'}</button>
                              <button type="button" onClick={() => markNotificationRead(item)}>✓ {t.markRead}</button>
                            </> : null}

                            {item.kind === 'department-schedule' ? <>
                              <button type="button" className="is-primary" onClick={() => openNotificationPage(item)}>📅 {language === 'vi' ? 'Xem lịch' : 'View schedule'}</button>
                              <button type="button" onClick={() => markNotificationRead(item)}>✓ {t.markRead}</button>
                            </> : null}
                          </div>

                          {expanded ? (
                            <div className="global-notice-inline-panel">
                              {item.kind === 'permission-admin' ? (
                                <div className="global-notice-detail-grid">
                                  <span><small>{language === 'vi' ? 'Giáo viên' : 'Teacher'}</small><strong>{item.requesterName || item.requesterEmail || 'Teacher'}</strong></span>
                                  <span><small>{language === 'vi' ? 'Quyền yêu cầu' : 'Requested access'}</small><strong>{item.itemTitle}</strong></span>
                                  {item.requesterEmail ? <span className="wide"><small>Email</small><strong>{item.requesterEmail}</strong></span> : null}
                                  {item.message ? <span className="wide"><small>{language === 'vi' ? 'Lời nhắn' : 'Message'}</small><strong>{item.message}</strong></span> : null}
                                </div>
                              ) : null}

                              {item.kind === 'permission-user' ? (
                                <p className="global-notice-inline-copy">{item.message || (item.requestStatus === 'approved'
                                  ? (language === 'vi' ? 'Quyền đã được cập nhật. Bạn có thể mở chức năng ngay.' : 'Your access has been updated. You can open the feature now.')
                                  : (language === 'vi' ? 'Bạn có thể gửi lại yêu cầu ngay trong bảng thông báo.' : 'You can resend the request directly from this panel.'))}</p>
                              ) : null}

                              {item.kind === 'department-submission' ? <>
                                <div className="global-notice-detail-grid">
                                  <span><small>{language === 'vi' ? 'Người nộp' : 'Submitted by'}</small><strong>{item.submitterName || item.submitterEmail || 'Teacher'}</strong></span>
                                  <span><small>{language === 'vi' ? 'Loại hồ sơ' : 'Category'}</small><strong>{item.category || '—'}</strong></span>
                                  {item.requestTitle ? <span className="wide"><small>{language === 'vi' ? 'Theo thông báo' : 'Request'}</small><strong>{item.requestTitle}</strong></span> : null}
                                  {item.note ? <span className="wide"><small>{language === 'vi' ? 'Ghi chú giáo viên' : 'Teacher note'}</small><strong>{item.note}</strong></span> : null}
                                  {item.fileName ? <span className="wide"><small>{t.attachment}</small><strong>{item.fileName}</strong></span> : null}
                                </div>
                                <label className="global-notice-inline-field">
                                  <span>{language === 'vi' ? 'Ghi chú phản hồi' : 'Review note'}</span>
                                  <textarea value={draft.reviewNote || ''} onChange={(event) => updateNotificationDraft(item.id, { reviewNote: event.target.value })} placeholder={t.reviewNote} />
                                </label>
                              </> : null}

                              {item.kind === 'department-request' ? <>
                                <div className="global-notice-detail-grid">
                                  <span><small>{language === 'vi' ? 'Danh mục' : 'Category'}</small><strong>{item.category || '—'}</strong></span>
                                  <span><small>{t.due}</small><strong>{item.dueDate ? formatDate(item.dueDate, language) : (language === 'vi' ? 'Không giới hạn' : 'No deadline')}</strong></span>
                                  {item.description ? <span className="wide"><small>{language === 'vi' ? 'Yêu cầu' : 'Instructions'}</small><strong>{item.description}</strong></span> : null}
                                  {item.fileName ? <span className="wide"><small>{t.attachment}</small><strong>{item.fileName}</strong></span> : null}
                                </div>
                                {!isAdmin ? (
                                  <div className="global-notice-submit-form">
                                    <label className="global-notice-inline-field">
                                      <span>{t.submissionTitle}</span>
                                      <input value={draft.title ?? item.requestTitle ?? ''} onChange={(event) => updateNotificationDraft(item.id, { title: event.target.value })} />
                                    </label>
                                    <label className="global-notice-inline-field">
                                      <span>{t.submissionNote}</span>
                                      <textarea value={draft.note || ''} onChange={(event) => updateNotificationDraft(item.id, { note: event.target.value })} placeholder={t.submissionNote} />
                                    </label>
                                    <label className="global-notice-inline-field file-field">
                                      <span>{t.attachment}</span>
                                      <input type="file" onChange={(event) => updateNotificationDraft(item.id, { file: event.target.files?.[0] || null })} />
                                      {draft.file ? <small>{draft.file.name}</small> : null}
                                    </label>
                                    <button type="button" className="global-notice-submit-button" disabled={itemBusy} onClick={() => submitDepartmentRequestNotification(item)}>{notificationActionBusy === `${item.id}:submit` ? t.sending : `✓ ${t.submitNow}`}</button>
                                  </div>
                                ) : null}
                              </> : null}

                              {item.kind === 'work-hub' ? (
                                <div className="global-notice-detail-grid">
                                  <span><small>{language === 'vi' ? 'Nguồn' : 'Source'}</small><strong>{item.sourceLabel}</strong></span>
                                  <span><small>{language === 'vi' ? 'Loại cập nhật' : 'Update type'}</small><strong>{item.notificationType || 'work_item'}</strong></span>
                                  <span className="wide"><small>{language === 'vi' ? 'Nội dung' : 'Details'}</small><strong>{item.body || '—'}</strong></span>
                                </div>
                              ) : null}

                              {item.kind === 'department-schedule' ? (
                                <div className="global-notice-detail-grid">
                                  <span><small>{language === 'vi' ? 'Thời gian' : 'Time'}</small><strong>{item.meta || '—'}</strong></span>
                                  <span><small>{language === 'vi' ? 'Trạng thái' : 'Status'}</small><strong>{item.scheduleItem?.status || (language === 'vi' ? 'Sắp diễn ra' : 'Upcoming')}</strong></span>
                                  {item.scheduleItem?.location ? <span className="wide"><small>{language === 'vi' ? 'Địa điểm' : 'Location'}</small><strong>{item.scheduleItem.location}</strong></span> : null}
                                  {item.scheduleItem?.description ? <span className="wide"><small>{language === 'vi' ? 'Nội dung' : 'Details'}</small><strong>{item.scheduleItem.description}</strong></span> : null}
                                </div>
                              ) : null}

                              <div className="global-notice-inline-footer">
                                <button type="button" onClick={() => openNotificationPage(item)}>↗ {t.openRelated}</button>
                                <button type="button" onClick={() => markNotificationRead(item)}>✓ {t.markRead}</button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <footer className="global-notice-panel-footer">
              <button type="button" className="secondary" onClick={clearAllNotifications} disabled={!visibleNotifications.length}>
                {language === 'vi' ? 'Đánh dấu tất cả đã đọc' : 'Mark all as read'}
              </button>
              <button type="button" className="primary" onClick={() => navTo(isAdmin ? 'admin' : 'department')}>
                {language === 'vi' ? 'Xem tất cả thông báo' : 'View all notifications'}
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {youtubeVideoId && youtubePlaybackMode === 'audio' ? (
        <div className="global-youtube-audio-engine" aria-hidden="true">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0&playsinline=1`}
            title="YouTube background audio engine"
            allow="autoplay; encrypted-media"
            tabIndex="-1"
          />
        </div>
      ) : null}
    </div>
  );
}
