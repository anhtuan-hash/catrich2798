import { getRuntimeClient } from '../services/runtime/core.js';
import {
  DEPARTMENT_SNAPSHOT_EVENT,
  DEPARTMENT_SUBMISSIONS_EVENT,
  DEPARTMENT_SUBMISSION_REQUESTS_EVENT,
  loadDepartmentSnapshot,
  listDepartmentSubmissions,
  listDepartmentSubmissionRequests,
} from './departmentStore.js';
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

// V1.2 compatibility: recent-app tabs were intentionally removed from some
// V11.6.7 installations. Dashboard continues with drafts and recent app usage.
const WORKSPACE_EVENT = 'bes-workspace-updated';

function loadWorkspace() {
  if (typeof window === 'undefined') return { tabs: [] };

  const candidateKeys = [
    'bes-workspace-v1',
    'bes-workspace',
    'bes-workspace-tabs',
    'bes-open-tabs',
  ];

  for (const key of candidateKeys) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
      const tabs = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.tabs) ? parsed.tabs : []);
      if (tabs.length) return { tabs };
    } catch {
      // Ignore stale or malformed legacy workspace data.
    }
  }

  return { tabs: [] };
}

export const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';
export const DASHBOARD_SOURCE_EVENTS = [
  DEPARTMENT_SNAPSHOT_EVENT,
  DEPARTMENT_SUBMISSIONS_EVENT,
  DEPARTMENT_SUBMISSION_REQUESTS_EVENT,
  HOMEROOM_STORE_EVENT,
  APP_USAGE_EVENT,
  AUTOSAVE_EVENT,
  RESOURCE_EVENT,
  WORKSPACE_EVENT,
  WORK_HUB_DELIVERY_EVENT,
  DASHBOARD_REFRESH_EVENT,
];

const DAY = 86400000;
const DONE_WORK = new Set(['completed', 'approved', 'archived', 'cancelled']);
const DONE_DEPARTMENT = new Set(['Hoàn thành', 'Đã duyệt', 'Đã hoàn thành', 'completed', 'approved', 'archived']);
const DEPARTMENT_LOCAL_PREFIX = 'bes-department-workspace-v1';
const WORK_HUB_LOCAL_PREFIX = 'bes-work-hub-v1093-local';
const DRAFT_PREFIX = 'bes-global-draft-v1084';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function userScope(user) {
  return clean(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function startOfDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(value) {
  const date = dateValue(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

function daysFromNow(value, now = new Date()) {
  const target = startOfDay(value);
  const base = startOfDay(now);
  if (!target || !base) return null;
  return Math.round((target.getTime() - base.getTime()) / DAY);
}

function isDoneStatus(status, source = 'work') {
  return source === 'department'
    ? DONE_DEPARTMENT.has(clean(status))
    : DONE_WORK.has(clean(status).toLowerCase());
}

function dueState(date, done = false, now = new Date()) {
  if (!date || done) return 'normal';
  const days = daysFromNow(date, now);
  if (days === null) return 'normal';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'normal';
}

function safeLocalJson(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readLocalDepartment(user) {
  if (typeof window === 'undefined') return null;
  const candidates = [
    `${DEPARTMENT_LOCAL_PREFIX}:shared:2026-2027`,
    `${DEPARTMENT_LOCAL_PREFIX}:shared`,
    `${DEPARTMENT_LOCAL_PREFIX}:${user?.id || 'guest'}`,
    `${DEPARTMENT_LOCAL_PREFIX}:${user?.email || 'guest'}`,
  ];
  for (const key of candidates) {
    const parsed = safeLocalJson(key);
    if (parsed && typeof parsed === 'object') return parsed;
  }
  return null;
}

function readLocalWorkHub(user) {
  return asArray(safeLocalJson(`${WORK_HUB_LOCAL_PREFIX}:${user?.id || user?.email || 'guest'}`, []));
}

function normalizeDepartment(data = {}) {
  return {
    schoolYear: clean(data.schoolYear, '2026-2027'),
    semester: clean(data.semester, 'Học kỳ I'),
    plans: asArray(data.plans),
    meetings: asArray(data.meetings),
    tasks: asArray(data.tasks),
    documents: asArray(data.documents),
    lessonStudies: asArray(data.lessonStudies),
    observations: asArray(data.observations),
    assessments: asArray(data.assessments),
    teacherDevelopment: asArray(data.teacherDevelopment),
    studentActivities: asArray(data.studentActivities),
    workSchedules: asArray(data.workSchedules),
    reports: asArray(data.reports),
    teachers: asArray(data.teachers),
    cloudSavedAt: clean(data.cloudSavedAt),
    lastUpdated: clean(data.lastUpdated),
  };
}

function getDepartmentDate(item) {
  return item?.date || item?.due || item?.deadline || item?.scheduleDate || item?.created_at || item?.createdAt || '';
}

function departmentEntity(collection, item, index) {
  const definitions = {
    plans: ['Kế hoạch', 'plan', 'plans'],
    meetings: ['Sinh hoạt tổ', 'meeting', 'meetings'],
    tasks: ['Nhiệm vụ tổ', 'task', 'tasks'],
    lessonStudies: ['Nghiên cứu bài học', 'study', 'lessonStudy'],
    observations: ['Dự giờ & góp ý', 'observation', 'observations'],
    assessments: ['Kiểm tra đánh giá', 'assessment', 'assessment'],
    teacherDevelopment: ['Bồi dưỡng giáo viên', 'development', 'teacherDev'],
    studentActivities: ['HSG / CLB / Ngoại khóa', 'student', 'studentActivities'],
    workSchedules: ['Lịch làm việc', 'schedule', 'workSchedule'],
  };
  const [sourceLabel, tone, departmentTab] = definitions[collection] || ['Tổ chuyên môn', 'department', 'dashboard'];
  const title = clean(item?.title || item?.name || item?.activity || item?.type, sourceLabel);
  const date = getDepartmentDate(item);
  return {
    id: `department:${collection}:${item?.id || index}`,
    source: 'department',
    sourceLabel,
    tone,
    title,
    description: clean(item?.description || item?.note || item?.content || item?.conclusion || item?.objective),
    date,
    owner: clean(item?.owner || item?.chair || item?.teacher || item?.responsible),
    status: clean(item?.status),
    done: isDoneStatus(item?.status, 'department'),
    route: 'department',
    departmentTab,
    entityId: item?.id || '',
  };
}

function buildDepartmentEntities(department) {
  const collections = [
    'plans', 'meetings', 'tasks', 'lessonStudies', 'observations',
    'assessments', 'teacherDevelopment', 'studentActivities', 'workSchedules',
  ];
  return collections.flatMap((collection) => department[collection].map((item, index) => departmentEntity(collection, item, index)));
}

function normalizeWorkItem(item, currentUser) {
  const assignees = asArray(item?.assignee_ids).map(String);
  const mine = assignees.includes(String(currentUser?.id || '')) || item?.created_by === currentUser?.id;
  const due = item?.due_at || '';
  return {
    id: `work:${item?.id}`,
    source: 'work',
    sourceLabel: 'Trung tâm công việc',
    tone: item?.priority === 'urgent' ? 'danger' : item?.priority === 'high' ? 'warning' : 'work',
    title: clean(item?.title, 'Công việc chưa đặt tên'),
    description: clean(item?.description),
    date: due,
    owner: mine ? 'Của tôi' : clean(item?.owner_name || item?.created_by_email),
    status: clean(item?.status, 'assigned'),
    priority: clean(item?.priority, 'normal'),
    done: isDoneStatus(item?.status),
    route: 'work-hub',
    entityId: item?.id || '',
    mine,
    raw: item,
  };
}

function requestTargetsUser(request, user) {
  if (request?.target_mode !== 'selected') return true;
  const email = clean(user?.email).toLowerCase();
  return asArray(request?.target_emails).map((item) => clean(item).toLowerCase()).includes(email);
}

function makeSubmissionEntity(item, mode = 'submission') {
  const request = mode === 'request';
  return {
    id: `${request ? 'request' : 'submission'}:${item?.id}`,
    source: 'department',
    sourceLabel: request ? 'Yêu cầu nộp hồ sơ' : 'Hồ sơ giáo viên',
    tone: request ? 'notice' : 'approval',
    title: clean(request ? item?.title : item?.request_title || item?.title, request ? 'Yêu cầu hồ sơ' : 'Hồ sơ chờ duyệt'),
    description: clean(request ? item?.description : item?.submitter_name || item?.submitter_email || item?.note),
    date: request ? item?.due_date : item?.updated_at || item?.created_at,
    owner: request ? clean(item?.created_by_email) : clean(item?.submitter_name || item?.submitter_email),
    status: clean(item?.status),
    done: request ? item?.status !== 'open' : ['approved', 'rejected', 'cancelled'].includes(item?.status),
    route: 'department',
    departmentTab: 'submissions',
    entityId: item?.id || '',
  };
}

function normalizeResource(item) {
  return {
    id: `resource:${item?.cloudId || item?.id}`,
    source: 'resource',
    sourceLabel: 'Kho học liệu',
    tone: item?.status === 'pending' ? 'approval' : 'resource',
    title: clean(item?.title || item?.fileName, 'Học liệu chưa đặt tên'),
    description: clean(item?.description || item?.aiSummary || item?.category),
    date: item?.updatedAt || item?.createdAt || item?.created_at || '',
    owner: clean(item?.uploaderName || item?.uploader_name),
    status: clean(item?.status, 'pending'),
    done: item?.status === 'approved',
    route: 'resource-library',
    entityId: item?.cloudId || item?.id || '',
    raw: item,
  };
}

function collectDrafts(user) {
  if (typeof window === 'undefined') return [];
  const token = clean(user?.id || user?.email, 'guest').replace(/[^a-zA-Z0-9._/-]+/g, '-').slice(0, 180);
  const prefix = `${DRAFT_PREFIX}:${token}:`;
  const drafts = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const parsed = safeLocalJson(key);
    if (!parsed || typeof parsed !== 'object') continue;
    const routeKey = key.slice(prefix.length);
    drafts.push({
      id: `draft:${routeKey}`,
      target: routeKey.startsWith('tool/') ? `#/${routeKey}` : `#/${routeKey}`,
      title: clean(parsed.title || parsed.formTitle || routeKey),
      titleVi: clean(parsed.titleVi || parsed.title || routeKey),
      icon: 'DR',
      accent: '#d86f38',
      savedAt: parsed.savedAt || parsed.updatedAt || 0,
      kind: 'draft',
      routeKey,
    });
  }
  return drafts.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)).slice(0, 5);
}

function attendanceToday(workspace, todayIso) {
  const daily = workspace?.attendance?.[todayIso];
  if (Array.isArray(daily)) return daily;
  if (daily && typeof daily === 'object') return Object.values(daily);
  const sessionRows = Object.entries(workspace?.attendanceSessions || {})
    .filter(([key]) => key.startsWith(todayIso))
    .flatMap(([, value]) => asArray(value?.rows || value));
  return sessionRows;
}

function absenceCount(workspace, todayIso) {
  return attendanceToday(workspace, todayIso).filter((row) => {
    const status = clean(row?.status || row?.attendance).toLowerCase();
    return ['absent', 'vắng', 'unexcused', 'excused', 'late'].includes(status);
  }).length;
}

function buildHomeroomSummary(workspace, now = new Date()) {
  if (!workspace) return null;
  const todayIso = now.toISOString().slice(0, 10);
  const activeStudents = asArray(workspace.students).filter((item) => item?.active !== false);
  const reminders = asArray(workspace.reminders).filter((item) => !item?.done && item?.status !== 'done');
  const alerts = asArray(workspace.alerts).filter((item) => !item?.resolved && item?.status !== 'resolved');
  const upcoming = asArray(workspace.schedule)
    .filter((item) => {
      const days = daysFromNow(item?.date || item?.startAt, now);
      return days !== null && days >= 0 && days <= 14;
    })
    .sort((a, b) => new Date(a?.date || a?.startAt || 0) - new Date(b?.date || b?.startAt || 0));
  return {
    className: clean(workspace.classProfile?.className, 'Lớp chủ nhiệm'),
    studentCount: activeStudents.length,
    absentToday: absenceCount(workspace, todayIso),
    reminders: reminders.length,
    alerts: alerts.length,
    upcoming,
    route: 'homeroom',
  };
}

function dashboardStats({ workItems, attention, timeline, submissions, resources, notifications }, now = new Date()) {
  const today = attention.filter((item) => dueState(item.date, item.done, now) === 'today').length;
  const overdue = attention.filter((item) => dueState(item.date, item.done, now) === 'overdue').length;
  const dueSoon = attention.filter((item) => dueState(item.date, item.done, now) === 'soon').length;
  const pendingApproval = submissions.filter((item) => item.status === 'pending').length
    + resources.filter((item) => item.status === 'pending').length
    + workItems.filter((item) => item.status === 'submitted').length;
  return {
    today,
    overdue,
    dueSoon,
    pendingApproval,
    upcoming: timeline.length,
    notifications: notifications.length,
  };
}

function computeDepartmentHealth(department, submissions, entities, now = new Date()) {
  const core = entities.filter((item) => item.source === 'department');
  const open = core.filter((item) => !item.done);
  const overdue = open.filter((item) => dueState(item.date, item.done, now) === 'overdue').length;
  const pending = submissions.filter((item) => item.status === 'pending').length;
  const completed = core.filter((item) => item.done).length;
  const progress = core.length ? Math.round((completed / core.length) * 100) : 0;
  const riskScore = Math.min(100, overdue * 18 + pending * 8 + Math.max(0, open.length - 8) * 4);
  const level = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'watch' : 'good';
  return {
    progress,
    open: open.length,
    overdue,
    pending,
    plans: department.plans.length,
    meetings: department.meetings.length,
    activities: department.lessonStudies.length + department.observations.length
      + department.assessments.length + department.teacherDevelopment.length + department.studentActivities.length,
    riskScore,
    level,
  };
}

async function loadWorkHub(user) {
  const client = getRuntimeClient();
  let items = [];
  let source = 'local';
  if (client && user?.id) {
    try {
      const { data, error } = await client.from('work_hub_items').select('*').order('updated_at', { ascending: false }).limit(300);
      if (!error) {
        items = data || [];
        source = 'cloud';
      }
    } catch {
      // Use account-scoped local cache.
    }
  }
  if (!items.length) items = readLocalWorkHub(user);
  return { items, source };
}

async function loadResources() {
  const local = loadResourceLibrary();
  const client = getRuntimeClient();
  let items = asArray(local?.items).map(normalizeResource);
  let source = items.length ? 'local' : 'empty';
  if (client) {
    try {
      const { data, error } = await client
        .from('resource_items')
        .select('id,title,description,category,status,uploader_name,file_name,file_size,updated_at,created_at,ai_summary')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (!error) {
        items = asArray(data).map((row) => normalizeResource({
          ...row,
          cloudId: row.id,
          fileName: row.file_name,
          uploaderName: row.uploader_name,
          updatedAt: row.updated_at,
          createdAt: row.created_at,
          aiSummary: row.ai_summary,
        }));
        source = 'cloud';
      }
    } catch {
      // Local library remains available.
    }
  }
  return { items, source };
}

async function loadDepartment(user) {
  const local = normalizeDepartment(readLocalDepartment(user) || {});
  const schoolYear = local.schoolYear || '2026-2027';
  let department = local;
  let source = local.lastUpdated || local.cloudSavedAt ? 'local' : 'empty';
  try {
    const result = await loadDepartmentSnapshot(schoolYear);
    if (result?.ok && result?.snapshot?.payload) {
      department = normalizeDepartment(result.snapshot.payload);
      source = 'cloud';
    }
  } catch {
    // Local shared snapshot remains available.
  }

  let submissions = [];
  let requests = [];
  try {
    const [submissionResult, requestResult] = await Promise.all([
      listDepartmentSubmissions(department.schoolYear),
      listDepartmentSubmissionRequests(department.schoolYear),
    ]);
    submissions = asArray(submissionResult?.submissions);
    requests = asArray(requestResult?.requests);
  } catch {
    // Submission cards are optional.
  }
  return { department, submissions, requests, source };
}

async function loadHomeroom(user) {
  try {
    const workspaceId = getCurrentHomeroomWorkspaceId(user);
    const result = await loadHomeroomWorkspace(user, workspaceId);
    return {
      workspace: result?.workspace || null,
      source: result?.source || (result?.offline ? 'local' : result?.workspace ? 'cloud-or-local' : 'empty'),
    };
  } catch {
    return { workspace: null, source: 'empty' };
  }
}

function sortAttention(items, now = new Date()) {
  const rank = { overdue: 0, today: 1, soon: 2, normal: 3 };
  return [...items].sort((a, b) => {
    const aState = dueState(a.date, a.done, now);
    const bState = dueState(b.date, b.done, now);
    const stateDelta = rank[aState] - rank[bState];
    if (stateDelta) return stateDelta;
    const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDelta = (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2);
    if (priorityDelta) return priorityDelta;
    return (dateValue(a.date)?.getTime() || Infinity) - (dateValue(b.date)?.getTime() || Infinity);
  });
}

function timelineWithin(items, days = 14, now = new Date()) {
  return items.filter((item) => {
    const distance = daysFromNow(item.date, now);
    return distance !== null && distance >= 0 && distance <= days;
  }).sort((a, b) => dateValue(a.date) - dateValue(b.date));
}

export async function loadDashboardSnapshot(currentUser, now = new Date()) {
  const leader = isDepartmentLeaderRole(currentUser?.role);
  const admin = isAdminRole(currentUser?.role);
  const [workResult, departmentResult, resourceResult, homeroomResult, notifications] = await Promise.all([
    loadWorkHub(currentUser),
    loadDepartment(currentUser),
    loadResources(),
    loadHomeroom(currentUser),
    listWorkHubNotifications(currentUser?.id, 30).catch(() => []),
  ]);

  const departmentEntities = buildDepartmentEntities(departmentResult.department);
  const workItems = workResult.items.map((item) => normalizeWorkItem(item, currentUser));
  const relevantWork = leader ? workItems : workItems.filter((item) => item.mine);
  const requestEntities = departmentResult.requests
    .filter((item) => item.status === 'open' && (leader || requestTargetsUser(item, currentUser)))
    .map((item) => makeSubmissionEntity(item, 'request'));
  const submissionEntities = departmentResult.submissions.map((item) => makeSubmissionEntity(item, 'submission'));
  const resourceItems = resourceResult.items;
  const homeroom = buildHomeroomSummary(homeroomResult.workspace, now);

  const homeroomTimeline = homeroom?.upcoming.map((item, index) => ({
    id: `homeroom:schedule:${item?.id || index}`,
    source: 'homeroom',
    sourceLabel: homeroom.className,
    tone: 'homeroom',
    title: clean(item?.title || item?.name, 'Lịch lớp'),
    description: clean(item?.description || item?.note),
    date: item?.date || item?.startAt || '',
    owner: '',
    status: clean(item?.status),
    done: item?.status === 'completed',
    route: 'homeroom',
    entityId: item?.id || '',
  })) || [];

  const allTimelineCandidates = [
    ...relevantWork.filter((item) => !item.done),
    ...departmentEntities.filter((item) => !item.done),
    ...requestEntities.filter((item) => !item.done),
    ...homeroomTimeline.filter((item) => !item.done),
  ];

  const timeline = timelineWithin(allTimelineCandidates, 14, now).slice(0, 18);
  const attention = sortAttention([
    ...relevantWork.filter((item) => !item.done),
    ...departmentEntities.filter((item) => !item.done),
    ...requestEntities.filter((item) => !item.done),
    ...(leader ? submissionEntities.filter((item) => item.status === 'pending') : []),
    ...(leader ? resourceItems.filter((item) => item.status === 'pending') : []),
  ], now).slice(0, 18);

  const professional = departmentEntities.filter((item) => [
    'meeting', 'study', 'observation', 'assessment', 'development', 'student', 'schedule',
  ].includes(item.tone)).sort((a, b) => {
    const aTime = dateValue(a.date)?.getTime() || 0;
    const bTime = dateValue(b.date)?.getTime() || 0;
    return bTime - aTime;
  }).slice(0, 10);

  const approvals = leader ? sortAttention([
    ...submissionEntities.filter((item) => item.status === 'pending'),
    ...resourceItems.filter((item) => item.status === 'pending'),
    ...workItems.filter((item) => item.status === 'submitted'),
  ], now).slice(0, 8) : [];

  const workspace = loadWorkspace(currentUser);
  const usage = getRecentAppUsage(currentUser, 8);
  const drafts = collectDrafts(currentUser);
  const continuationMap = new Map();
  [...drafts, ...asArray(workspace?.tabs).filter((tab) => tab?.id !== 'route:dashboard'), ...usage].forEach((item) => {
    const target = item.target || '#/apps';
    if (continuationMap.has(target)) return;
    continuationMap.set(target, {
      id: item.id || target,
      target,
      title: clean(item.titleVi || item.title, 'Tiếp tục công việc'),
      icon: clean(item.icon, 'GO'),
      accent: item.accent || item.color || '#315fc4',
      updatedAt: item.savedAt || item.lastActiveAt || item.lastUsedAt || item.openedAt || 0,
      kind: item.kind || 'workspace',
    });
  });
  const continueItems = [...continuationMap.values()]
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 6);

  const recentResources = [...resourceItems]
    .sort((a, b) => (dateValue(b.date)?.getTime() || 0) - (dateValue(a.date)?.getTime() || 0))
    .slice(0, 6);

  const stats = dashboardStats({
    workItems: relevantWork,
    attention,
    timeline,
    submissions: departmentResult.submissions,
    resources: resourceItems,
    notifications,
  }, now);

  return {
    generatedAt: new Date().toISOString(),
    role: leader ? 'leader' : 'teacher',
    leader,
    admin,
    stats,
    timeline,
    attention,
    professional,
    approvals,
    continueItems,
    recentResources,
    homeroom,
    department: departmentResult.department,
    departmentHealth: computeDepartmentHealth(departmentResult.department, departmentResult.submissions, departmentEntities, now),
    requests: departmentResult.requests,
    submissions: departmentResult.submissions,
    notifications,
    sources: {
      workHub: workResult.source,
      department: departmentResult.source,
      resources: resourceResult.source,
      homeroom: homeroomResult.source,
    },
  };
}

export function openDashboardTarget(item) {
  if (!item) return;
  if (item.route === 'work-hub' && item.entityId) rememberWorkHubItem(item.entityId);
  if (item.route === 'department' && item.departmentTab) {
    try {
      window.sessionStorage.setItem('bes-dashboard-department-tab', item.departmentTab);
      if (item.entityId) window.sessionStorage.setItem('bes-dashboard-department-entity', String(item.entityId));
    } catch {
      // Optional deep-link hint.
    }
  }
  const target = item.target || (item.route ? `#/${item.route}` : '#/dashboard');
  if (window.location.hash === target) {
    window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
  } else {
    window.location.hash = target;
  }
}

export function formatDashboardDate(value, language = 'vi', { time = false } = {}) {
  const date = dateValue(value);
  if (!date) return language === 'vi' ? 'Chưa đặt hạn' : 'No date';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', time
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function dashboardDueLabel(value, done = false, language = 'vi', now = new Date()) {
  const state = dueState(value, done, now);
  const days = daysFromNow(value, now);
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

export function getDashboardDueState(value, done = false, now = new Date()) {
  return dueState(value, done, now);
}
