import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, AUTH_EVENT } from '../../../utils/auth.js';
import { listAssignedSchoolClasses } from '../../../assignedSchoolClassBootstrap.js';
import {
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
} from '../../../utils/homeroomClassWorkspaceStore.js';
import { getCurrentHomeroomWorkspaceId, HOMEROOM_STORE_EVENT } from '../../../utils/homeroomStore.js';
import { loadDashboardSnapshot, DASHBOARD_SOURCE_EVENTS } from '../../../utils/dashboardAggregator.js';
import { loadResourceLibrary, RESOURCE_EVENT, syncResourcesFromCloud } from '../../../utils/resourceLibrary.js';

const BrianV2DataContext = createContext(null);

const EMPTY = Object.freeze({
  user: null,
  classes: [],
  students: [],
  homeroom: null,
  resources: { items: [], categories: [], collections: [], drive: {}, source: 'empty' },
  dashboard: null,
  reports: [],
  sources: {
    auth: 'loading',
    classes: 'loading',
    students: 'loading',
    homeroom: 'loading',
    resources: 'loading',
    dashboard: 'loading',
    reports: 'loading',
  },
  errors: [],
  generatedAt: '',
});

function text(value, fallback = '') {
  const clean = String(value ?? '').trim();
  return clean || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function initials(name = '') {
  const words = text(name).split(/\s+/).filter(Boolean);
  if (!words.length) return 'HS';
  return `${words[0]?.[0] || ''}${words[words.length - 1]?.[0] || ''}`.toUpperCase();
}

function activeStudent(student) {
  return student?.active !== false && student?.lifecycleStatus !== 'deleted' && !student?.deletedAt;
}

function studentKey(student, className = '') {
  const id = text(student?.id || student?.studentId || student?.code);
  if (id) return `${className}:${id}`;
  return `${className}:${fold(student?.fullName || student?.name)}:${text(student?.birthDate)}`;
}

function humanClassType(value) {
  const raw = text(value).toLowerCase();
  if (raw === 'homeroom' || raw === 'homeroom-class') return 'Chủ nhiệm';
  if (raw === 'managed') return 'Quản lý';
  return 'Bộ môn';
}

function mergeClassCatalog(assigned = [], catalog = []) {
  const byName = new Map();
  safeArray(catalog).forEach((item) => {
    const name = text(item?.className);
    if (!name) return;
    byName.set(name, {
      id: item.id || name,
      name,
      type: humanClassType(item.classType),
      classType: item.classType || 'subject',
      students: Number(item.studentCount || 0),
      subject: 'Tiếng Anh',
      progress: null,
      status: item.status || 'active',
      schoolYear: item.schoolYear || '',
      grade: item.grade || name.split('.')[0] || '',
      updatedAt: item.updatedAt || '',
      roster: [],
      source: item.source || 'workspace',
    });
  });

  safeArray(assigned).forEach((item) => {
    const name = text(item?.className);
    if (!name) return;
    const existing = byName.get(name) || {};
    const roster = safeArray(item.students).filter(activeStudent);
    byName.set(name, {
      ...existing,
      id: existing.id || name,
      name,
      type: humanClassType(item.assignmentType),
      classType: item.assignmentType || existing.classType || 'subject',
      students: Number(item.activeStudentCount ?? roster.length ?? existing.students ?? 0),
      subject: existing.subject || 'Tiếng Anh',
      progress: null,
      status: existing.status || 'active',
      schoolYear: item.schoolYear || existing.schoolYear || '',
      grade: item.grade || existing.grade || name.split('.')[0] || '',
      updatedAt: item.registryUpdatedAt || existing.updatedAt || '',
      roster,
      expectedCount: Number(item.expectedCount || 0),
      source: item.registryOwnerId ? 'assigned-cloud' : (existing.source || 'assigned'),
    });
  });

  return [...byName.values()].sort((a, b) => (
    (a.status === 'archived') - (b.status === 'archived')
    || a.name.localeCompare(b.name, 'vi', { numeric: true })
  ));
}

function attendanceRows(workspace, isoDate) {
  if (!workspace) return [];
  const daily = workspace?.attendance?.[isoDate];
  if (Array.isArray(daily)) return daily;
  if (daily && typeof daily === 'object') {
    return Object.entries(daily).map(([key, value]) => (
      value && typeof value === 'object' ? { studentId: key, ...value } : { studentId: key, status: value }
    ));
  }
  return Object.entries(workspace?.attendanceSessions || {})
    .filter(([key]) => key.startsWith(isoDate))
    .flatMap(([, value]) => safeArray(value?.rows || value));
}

function attendanceLabel(raw) {
  const status = fold(raw);
  if (!status) return '—';
  if (['present', 'co mat', 'du', 'attended'].includes(status)) return 'Đủ';
  if (['late', 'tre', 'muon'].includes(status)) return 'Trễ';
  if (['excused', 'vang phep', 'absent excused'].includes(status)) return 'Vắng phép';
  if (['absent', 'vang', 'unexcused', 'vang khong phep'].includes(status)) return 'Vắng';
  return text(raw, '—');
}

function findStudentAttendance(workspace, student, isoDate) {
  const rows = attendanceRows(workspace, isoDate);
  const ids = new Set([
    text(student?.id),
    text(student?.studentId),
    text(student?.code),
  ].filter(Boolean));
  const name = fold(student?.fullName || student?.name);
  const row = rows.find((item) => {
    const rowIds = [item?.studentId, item?.id, item?.student_id, item?.code].map(text).filter(Boolean);
    if (rowIds.some((id) => ids.has(id))) return true;
    return name && fold(item?.studentName || item?.fullName || item?.name) === name;
  });
  return attendanceLabel(row?.status || row?.attendance || row?.value);
}

function attentionKeys(workspace) {
  const set = new Set();
  const buckets = [workspace?.alerts, workspace?.supportPlans, workspace?.incidents, workspace?.records];
  buckets.flatMap(safeArray).forEach((item) => {
    if (item?.resolved === true || item?.status === 'resolved' || item?.status === 'closed') return;
    [item?.studentId, item?.student_id, item?.studentCode, item?.code].map(text).filter(Boolean).forEach((id) => set.add(`id:${id}`));
    const name = fold(item?.studentName || item?.fullName || item?.name);
    if (name) set.add(`name:${name}`);
  });
  return set;
}

function studentNeedsAttention(student, attention) {
  const ids = [student?.id, student?.studentId, student?.code].map(text).filter(Boolean);
  if (ids.some((id) => attention.has(`id:${id}`))) return true;
  const name = fold(student?.fullName || student?.name);
  return Boolean(name && attention.has(`name:${name}`));
}

function numericProgress(student, workspace) {
  const direct = [student?.progress, student?.progressPercent, student?.completion, student?.averagePercent]
    .map(Number)
    .find((value) => Number.isFinite(value));
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct));

  const id = text(student?.id || student?.studentId || student?.code);
  const name = fold(student?.fullName || student?.name);
  const matches = safeArray(workspace?.learningRecords).filter((record) => {
    if (id && [record?.studentId, record?.student_id, record?.code].map(text).includes(id)) return true;
    return name && fold(record?.studentName || record?.fullName || record?.name) === name;
  });
  const latest = matches.sort((a, b) => String(b?.updatedAt || b?.date || '').localeCompare(String(a?.updatedAt || a?.date || '')))[0];
  const value = [latest?.progress, latest?.progressPercent, latest?.percent, latest?.average, latest?.score]
    .map(Number)
    .find((number) => Number.isFinite(number));
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value <= 10 ? value * 10 : value));
}

function conductLabel(student) {
  return text(student?.conduct || student?.conductLevel || student?.behavior || student?.conductRating, '—');
}

function buildStudents(classes, homeroomWorkspace) {
  const today = new Date().toISOString().slice(0, 10);
  const homeroomName = text(homeroomWorkspace?.classProfile?.className);
  const attention = attentionKeys(homeroomWorkspace);
  const map = new Map();

  safeArray(classes).forEach((classItem) => {
    safeArray(classItem.roster).filter(activeStudent).forEach((student) => {
      const key = studentKey(student, classItem.name);
      const isHomeroom = classItem.name === homeroomName;
      const needsAttention = isHomeroom && studentNeedsAttention(student, attention);
      const attendance = isHomeroom ? findStudentAttendance(homeroomWorkspace, student, today) : '—';
      const status = needsAttention ? 'attention' : attendance.startsWith('Vắng') ? 'absence' : 'active';
      map.set(key, {
        id: key,
        sourceId: student.id || student.code || '',
        name: text(student.fullName || student.name, 'Học sinh'),
        className: classItem.name,
        initials: initials(student.fullName || student.name),
        conduct: conductLabel(student),
        attendance,
        progress: isHomeroom ? numericProgress(student, homeroomWorkspace) : null,
        note: needsAttention ? 'Cần chú ý' : 'Ổn định',
        status,
        raw: student,
      });
    });
  });

  if (homeroomWorkspace && homeroomName) {
    safeArray(homeroomWorkspace.students).filter(activeStudent).forEach((student) => {
      const key = studentKey(student, homeroomName);
      if (map.has(key)) return;
      const needsAttention = studentNeedsAttention(student, attention);
      const attendance = findStudentAttendance(homeroomWorkspace, student, today);
      map.set(key, {
        id: key,
        sourceId: student.id || student.code || '',
        name: text(student.fullName || student.name, 'Học sinh'),
        className: homeroomName,
        initials: initials(student.fullName || student.name),
        conduct: conductLabel(student),
        attendance,
        progress: numericProgress(student, homeroomWorkspace),
        note: needsAttention ? 'Cần chú ý' : 'Ổn định',
        status: needsAttention ? 'attention' : attendance.startsWith('Vắng') ? 'absence' : 'active',
        raw: student,
      });
    });
  }

  return [...map.values()].sort((a, b) => a.className.localeCompare(b.className, 'vi', { numeric: true }) || a.name.localeCompare(b.name, 'vi'));
}

function buildHomeroomModel(workspace, classMeta, students) {
  if (!workspace && !classMeta) return null;
  const className = text(workspace?.classProfile?.className || classMeta?.name, 'Lớp chủ nhiệm');
  const classStudents = safeArray(students).filter((item) => item.className === className);
  const present = classStudents.filter((item) => item.attendance === 'Đủ').length;
  const absence = classStudents.filter((item) => item.attendance.startsWith('Vắng')).length;
  const attention = classStudents.filter((item) => item.status === 'attention').length;
  const reminders = safeArray(workspace?.reminders).filter((item) => !item?.done && item?.status !== 'done').length;
  const unresolvedAlerts = safeArray(workspace?.alerts).filter((item) => !item?.resolved && item?.status !== 'resolved').length;
  return {
    className,
    workspace,
    students: classStudents,
    stats: {
      students: classStudents.length || Number(classMeta?.students || 0),
      present,
      absence,
      attendanceRecorded: classStudents.some((item) => item.attendance !== '—'),
      attention,
      openWork: reminders + unresolvedAlerts,
      reminders,
      alerts: unresolvedAlerts,
    },
  };
}

function resourceType(item) {
  const mime = text(item?.mimeType || item?.mime_type).toLowerCase();
  const file = text(item?.fileName || item?.file_name).toLowerCase();
  const category = fold(item?.category);
  if (/presentation|powerpoint/.test(mime) || /\.(ppt|pptx)$/.test(file)) return 'Bài trình chiếu';
  if (/text\/html/.test(mime) || /\.html?$/.test(file) || category.includes('interactive')) return 'Hoạt động';
  if (/spreadsheet|excel/.test(mime) || /\.(xls|xlsx|csv)$/.test(file) || /assessment|exam|test/.test(category)) return 'Đề kiểm tra';
  return 'Tài liệu';
}

function resourceTone(type) {
  if (type === 'Bài trình chiếu') return 'violet';
  if (type === 'Hoạt động') return 'green';
  if (type === 'Đề kiểm tra') return 'cyan';
  return 'blue';
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function buildResources(store, source = 'local') {
  const items = safeArray(store?.items)
    .filter((item) => !item?.deletedAt && !item?.deleted_at)
    .map((item) => {
      const type = resourceType(item);
      const fileName = text(item.fileName || item.file_name);
      const date = item.updatedAt || item.updated_at || item.createdAt || item.created_at;
      const tags = safeArray(item.tags);
      return {
        id: item.cloudId || item.id,
        type,
        title: text(item.title || fileName, 'Học liệu chưa đặt tên'),
        description: text(item.description || item.aiSummary),
        meta: [fileName, formatBytes(item.size || item.fileSize), formatDate(date)].filter(Boolean).join(' · '),
        tag: text(item.grade || item.cefr || tags[0] || item.category, 'Học liệu'),
        category: text(item.category, 'other'),
        tone: resourceTone(type),
        status: text(item.status, 'local'),
        updatedAt: date || '',
        driveWebViewLink: item.driveWebViewLink || '',
        driveDownloadLink: item.driveDownloadLink || '',
        allowDownload: item.allowDownload !== false,
        raw: item,
      };
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return {
    items,
    categories: safeArray(store?.categories),
    collections: safeArray(store?.collections),
    drive: store?.drive || {},
    source,
  };
}

function safeOwnerToken(value) {
  return String(value || 'guest').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || 'guest';
}

function readHistoryOnly(user) {
  if (typeof window === 'undefined') return [];
  const owner = safeOwnerToken(user?.id || user?.email || 'guest');
  const scopedKey = `bet-v4-history::${owner}`;
  try {
    const scoped = JSON.parse(localStorage.getItem(scopedKey) || 'null');
    if (Array.isArray(scoped)) return scoped;
    const legacy = JSON.parse(localStorage.getItem('bet-v4-history') || '[]');
    return Array.isArray(legacy) ? legacy : [];
  } catch {
    return [];
  }
}

function reportLike(item) {
  const haystack = fold([
    item?.kind,
    item?.toolSlug,
    item?.toolTitle,
    item?.sourceApp,
    item?.sourceAppTitle,
    item?.title,
    ...safeArray(item?.tags),
  ].join(' '));
  return /(report|bao cao|grade|attendance|chuyen can|conduct|ne nep|export|xlsx|pdf|docx|score|diem)/.test(haystack);
}

function inferReportFormat(item) {
  const haystack = text(item?.fileName || item?.filename || item?.format || item?.mimeType || item?.title).toUpperCase();
  if (haystack.includes('XLSX') || haystack.includes('EXCEL')) return 'XLSX';
  if (haystack.includes('DOCX') || haystack.includes('WORD')) return 'DOCX';
  if (haystack.includes('HTML')) return 'HTML';
  return 'PDF/VIEW';
}

function buildReports(history) {
  return safeArray(history)
    .filter(reportLike)
    .map((item, index) => ({
      id: item.id || `history-${index}`,
      name: text(item.title, 'Báo cáo / dữ liệu đã xuất'),
      area: text(item.level || item.className || item.toolTitle || item.sourceAppTitle, 'Brian'),
      created: item.updatedAt || item.createdAt || '',
      format: inferReportFormat(item),
      status: 'ready',
      raw: item,
    }))
    .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))
    .slice(0, 80);
}

function assignedSource(result, catalog) {
  if (result?.ok && safeArray(result.items).length) return result.offline ? 'local-assignment' : 'cloud-assignment';
  if (safeArray(catalog?.items).length) return catalog.source || (catalog.offline ? 'local-workspace' : 'workspace');
  return 'empty';
}

async function loadCurrentHomeroom(user, assignedResult, catalogResult) {
  const assignedHomeroom = safeArray(assignedResult?.items).find((item) => item.assignmentType === 'homeroom');
  const catalogHomeroom = safeArray(catalogResult?.items).find((item) => item.classType === 'homeroom');
  const matchedCatalog = assignedHomeroom
    ? safeArray(catalogResult?.items).find((item) => item.className === assignedHomeroom.className)
    : null;
  const workspaceId = matchedCatalog?.id || catalogHomeroom?.id || getCurrentHomeroomWorkspaceId(user);
  let workspace = workspaceId ? loadLocalHomeroomWorkspace(user, workspaceId) : null;
  let source = workspace ? 'local-workspace' : 'empty';
  if (!workspace && workspaceId) {
    try {
      const loaded = await loadHomeroomWorkspace(user, workspaceId);
      workspace = loaded?.workspace || null;
      source = workspace ? (loaded?.source || (loaded?.offline ? 'local-workspace' : 'cloud-workspace')) : 'empty';
    } catch {
      workspace = null;
    }
  }
  if (!workspace && assignedHomeroom) {
    workspace = {
      id: workspaceId || `assigned-${assignedHomeroom.className}`,
      classProfile: {
        className: assignedHomeroom.className,
        grade: assignedHomeroom.grade,
        schoolYear: assignedHomeroom.schoolYear,
      },
      students: safeArray(assignedHomeroom.students),
      attendance: {}, attendanceSessions: {}, alerts: [], supportPlans: [], incidents: [], records: [], reminders: [], learningRecords: [],
    };
    source = 'assigned-summary';
  }
  return { workspace, source, className: text(workspace?.classProfile?.className || assignedHomeroom?.className || catalogHomeroom?.className) };
}

export function dataSourceLabel(source) {
  const value = text(source, 'empty');
  if (/cloud|supabase|rpc/.test(value)) return 'LIVE CLOUD';
  if (/local|cache|workspace|history/.test(value)) return 'LOCAL DATA';
  if (/assigned-summary/.test(value)) return 'ASSIGNED DATA';
  if (/empty|loading/.test(value)) return value === 'loading' ? 'LOADING' : 'NO DATA';
  return value.toUpperCase().replace(/-/g, ' ');
}

export function dataSourceTone(source) {
  const value = text(source);
  if (/cloud|supabase|rpc/.test(value)) return 'green';
  if (/local|cache|workspace|history|assigned/.test(value)) return 'blue';
  if (/error/.test(value)) return 'red';
  return 'neutral';
}

export function BrianV2DataProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const generationRef = useRef(0);
  const timerRef = useRef(0);

  const refresh = useCallback(async ({ syncCloudResources = false, silent = false } = {}) => {
    const generation = ++generationRef.current;
    if (silent) setRefreshing(true); else setLoading(true);
    const errors = [];
    try {
      const user = await getCurrentUser();
      if (generation !== generationRef.current) return;

      const localResourceStore = loadResourceLibrary();
      const history = readHistoryOnly(user);
      const [assignedSettled, catalogSettled, dashboardSettled] = await Promise.allSettled([
        user ? listAssignedSchoolClasses(user) : Promise.resolve({ ok: true, offline: true, items: [] }),
        user ? listHomeroomWorkspaces(user) : Promise.resolve({ ok: true, offline: true, items: [] }),
        user ? loadDashboardSnapshot(user) : Promise.resolve(null),
      ]);

      const readSettled = (settled, fallback, source) => {
        if (settled.status === 'fulfilled') return settled.value;
        errors.push({ source, message: settled.reason?.message || String(settled.reason || source) });
        return fallback;
      };
      const assignedResult = readSettled(assignedSettled, { ok: false, offline: true, items: [] }, 'classes');
      const catalogResult = readSettled(catalogSettled, { ok: false, offline: true, items: [] }, 'workspaces');
      const dashboard = readSettled(dashboardSettled, null, 'dashboard');
      const homeroomResult = user
        ? await loadCurrentHomeroom(user, assignedResult, catalogResult)
        : { workspace: null, source: 'empty', className: '' };

      let resourceSource = safeArray(localResourceStore?.items).length ? 'local-resource-cache' : 'empty';
      if (syncCloudResources && user) {
        try {
          const synced = await syncResourcesFromCloud();
          if (synced?.ok) resourceSource = synced.cached ? 'cloud-resource-cache' : 'cloud-resource-sync';
          else if (synced?.reason && !/chưa đăng nhập/i.test(synced.reason)) errors.push({ source: 'resources', message: synced.reason });
        } catch (error) {
          errors.push({ source: 'resources', message: error?.message || String(error) });
        }
      }
      const resourceStore = loadResourceLibrary();
      const resources = buildResources(resourceStore, resourceSource);
      const classes = mergeClassCatalog(assignedResult?.items, catalogResult?.items);
      const students = buildStudents(classes, homeroomResult.workspace);
      const homeroomClass = classes.find((item) => item.name === homeroomResult.className || item.type === 'Chủ nhiệm') || null;
      const homeroom = buildHomeroomModel(homeroomResult.workspace, homeroomClass, students);
      const reports = buildReports(history);

      if (generation !== generationRef.current) return;
      setState({
        user,
        classes,
        students,
        homeroom,
        resources,
        dashboard,
        reports,
        sources: {
          auth: user ? (user.provider === 'supabase' ? 'cloud-auth' : text(user.provider, 'local-auth')) : 'guest',
          classes: assignedSource(assignedResult, catalogResult),
          students: students.length ? assignedSource(assignedResult, catalogResult) : 'empty',
          homeroom: homeroomResult.source,
          resources: resources.source,
          dashboard: dashboard?.sources?.workHub || (dashboard ? 'dashboard-live' : 'empty'),
          reports: reports.length ? 'local-history' : 'empty',
        },
        errors: [...errors, ...safeArray(dashboard?.sourceErrors)],
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (generation === generationRef.current) {
        setState((current) => ({ ...current, errors: [...current.errors, { source: 'bridge', message: error?.message || String(error) }] }));
      }
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh({ syncCloudResources: true });
  }, [refresh]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => refresh({ silent: true }), 280);
    };
    const events = new Set([AUTH_EVENT, HOMEROOM_STORE_EVENT, RESOURCE_EVENT, ...DASHBOARD_SOURCE_EVENTS]);
    events.forEach((eventName) => window.addEventListener(eventName, schedule));
    return () => {
      window.clearTimeout(timerRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, schedule));
    };
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    loading,
    refreshing,
    refresh: (options = {}) => refresh({ syncCloudResources: true, silent: true, ...options }),
  }), [state, loading, refreshing, refresh]);

  return <BrianV2DataContext.Provider value={value}>{children}</BrianV2DataContext.Provider>;
}

export function useBrianV2Data() {
  const value = useContext(BrianV2DataContext);
  if (!value) throw new Error('useBrianV2Data must be used inside BrianV2DataProvider.');
  return value;
}
