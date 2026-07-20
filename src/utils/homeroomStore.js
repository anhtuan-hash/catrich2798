import { isSupabaseConfigured, supabase } from './supabase.js';
import { PETRUS_KY_ACADEMIC_PLAN_2026_2027 } from '../data/homeroomAcademicPlan.js';

const TABLE = 'bes_homeroom_workspaces';
const STORE_PREFIX = 'bes-homeroom-workspace-v1';
const INDEX_PREFIX = 'bes-homeroom-workspace-index-v3';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3';
export const HOMEROOM_STORE_EVENT = 'bes-homeroom-store-updated';

function nowIso() {
  return new Date().toISOString();
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function userKey(user) {
  return safeText(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function workspaceKey(user, workspaceId = 'default') {
  return `${STORE_PREFIX}:${userKey(user)}:${safeText(workspaceId, 'default')}`;
}

function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makePin() {
  if (globalThis.crypto?.getRandomValues) {
    const value = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
    return String(100000 + value);
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function identityText(value) {
  return safeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sameIdentityValue(left, right) {
  return Boolean(safeText(left) && safeText(right) && identityText(left) === identityText(right));
}

function findStudentDuplicateIndex(students, student) {
  if (student.code) {
    const codeIndex = students.findIndex((item) => item.code && identityText(item.code) === identityText(student.code));
    if (codeIndex >= 0) return codeIndex;
  }

  const sameName = students
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => identityText(item.fullName) === identityText(student.fullName));
  if (!sameName.length) return -1;

  const eligible = sameName.filter(({ item }) => !(student.code && item.code));
  if (!eligible.length) return -1;

  const corroborated = eligible.filter(({ item }) => (
    sameIdentityValue(item.birthDate, student.birthDate)
    || sameIdentityValue(item.parentPhone, student.parentPhone)
    || sameIdentityValue(item.parentEmail, student.parentEmail)
  ));
  if (corroborated.length === 1) return corroborated[0].index;

  if (!student.code && eligible.length === 1 && !eligible[0].item.code) return eligible[0].index;
  return -1;
}

export function makeDefaultHomeroomWorkspace(user = null) {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  return {
    id: 'default',
    status: 'active',
    archivedAt: '',
    semester: 'Học kỳ I',
    classProfile: {
      className: '',
      schoolYear: `${year}-${year + 1}`,
      grade: '12',
      room: '',
      adviserName: safeText(user?.name || user?.email),
      adviserEmail: safeText(user?.email),
      classMonitor: '',
      studentCountTarget: 0,
      notes: '',
      schoolName: '',
    },
    students: [],
    attendance: {},
    schedule: [],
    meetings: [],
    parentContacts: [],
    records: [],
    alerts: [],
    learningRecords: [],
    subjectFeedback: [],
    teams: [],
    competitionEvents: [],
    announcements: [],
    incidents: [],
    supportPlans: [],
    attendanceSessions: {},
    attendanceLocks: {},
    correctionRequests: [],
    messageTemplates: [],
    scheduledMessages: [],
    reminders: [],
    attachments: [],
    auditLogs: [],
    backups: [],
    conductRecords: [],
    conductCustomRules: [],
    conductWeekSummaries: [],
    conductSettings: {
      weeklyBaseScore: 100,
      thresholds: { good: 90, fair: 75, pass: 60 },
      academicPlanId: PETRUS_KY_ACADEMIC_PLAN_2026_2027.id,
      academicCalendarMode: 'school-plan',
      academicCalendar: { ...PETRUS_KY_ACADEMIC_PLAN_2026_2027.calendar },
      periodRanges: {},
      autoLockWeeks: true,
      lockDay: 0,
      lockTime: '23:59',
      requireLockPassword: true,
      lockPasswordHash: '',
      lockPasswordUsesDefault: true,
      lockPasswordChangedAt: '',
      lockPasswordChangedBy: '',
      carryBonusCap: 100,
    },
    gradeSettings: { warningThreshold: 6.5, highRiskThreshold: 5, subjectWeights: {}, assessmentWeights: {}, lockedPeriods: [] },
    academicTerms: [],
    portalConfig: {
      enabled: false,
      parentCode: '',
      studentCode: '',
      subjectCode: '',
      publishedAt: '',
      exposeSchedule: true,
      exposeLearning: true,
      exposeAttendance: true,
      exposeFeedback: true,
      sessionMinutes: 30,
      maxFailedAttempts: 5,
      lockMinutes: 15,
      requireStrongPin: true,
      revokedAt: '',
    },
    settings: {
      weekStartsOn: 1,
      attendanceDefault: 'present',
      notifyParentAfterUnexcused: true,
      attendanceMode: 'session',
      autoBackup: true,
      privacyMode: 'balanced',
      inactivityLogoutMinutes: 30,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastOpenedAt: today,
  };
}

export function normalizeHomeroomWorkspace(raw, user = null) {
  const base = makeDefaultHomeroomWorkspace(user);
  const value = raw && typeof raw === 'object' ? raw : {};
  return {
    ...base,
    ...value,
    id: safeText(value.id, 'default'),
    status: safeText(value.status, 'active'),
    archivedAt: safeText(value.archivedAt),
    semester: safeText(value.semester, 'Học kỳ I'),
    classProfile: { ...base.classProfile, ...(value.classProfile || {}) },
    students: Array.isArray(value.students) ? value.students.map((student) => ({
      ...student,
      portalPin: safeText(student?.portalPin, makePin()),
      pinUpdatedAt: safeText(student?.pinUpdatedAt, nowIso()),
      teamId: safeText(student?.teamId),
      active: student?.active !== false,
      lifecycleStatus: safeText(student?.lifecycleStatus, student?.active === false ? 'archived' : 'active'),
      inactiveReason: safeText(student?.inactiveReason),
      inactiveAt: safeText(student?.inactiveAt),
      transferClass: safeText(student?.transferClass),
    })) : [],
    attendance: value.attendance && typeof value.attendance === 'object' ? value.attendance : {},
    schedule: Array.isArray(value.schedule) ? value.schedule : [],
    meetings: Array.isArray(value.meetings) ? value.meetings : [],
    parentContacts: Array.isArray(value.parentContacts) ? value.parentContacts : [],
    records: Array.isArray(value.records) ? value.records : [],
    alerts: Array.isArray(value.alerts) ? value.alerts : [],
    learningRecords: Array.isArray(value.learningRecords) ? value.learningRecords : [],
    subjectFeedback: Array.isArray(value.subjectFeedback) ? value.subjectFeedback : [],
    teams: Array.isArray(value.teams) ? value.teams : [],
    competitionEvents: Array.isArray(value.competitionEvents) ? value.competitionEvents : [],
    announcements: Array.isArray(value.announcements) ? value.announcements : [],
    incidents: Array.isArray(value.incidents) ? value.incidents : [],
    supportPlans: Array.isArray(value.supportPlans) ? value.supportPlans : [],
    attendanceSessions: value.attendanceSessions && typeof value.attendanceSessions === 'object' ? value.attendanceSessions : {},
    attendanceLocks: value.attendanceLocks && typeof value.attendanceLocks === 'object' ? value.attendanceLocks : {},
    correctionRequests: Array.isArray(value.correctionRequests) ? value.correctionRequests : [],
    messageTemplates: Array.isArray(value.messageTemplates) ? value.messageTemplates : [],
    scheduledMessages: Array.isArray(value.scheduledMessages) ? value.scheduledMessages : [],
    reminders: Array.isArray(value.reminders) ? value.reminders : [],
    attachments: Array.isArray(value.attachments) ? value.attachments : [],
    auditLogs: Array.isArray(value.auditLogs) ? value.auditLogs : [],
    backups: Array.isArray(value.backups) ? value.backups : [],
    conductRecords: Array.isArray(value.conductRecords) ? value.conductRecords : [],
    conductCustomRules: Array.isArray(value.conductCustomRules) ? value.conductCustomRules : [],
    conductWeekSummaries: Array.isArray(value.conductWeekSummaries) ? value.conductWeekSummaries : [],
    conductSettings: {
      ...base.conductSettings,
      ...(value.conductSettings || {}),
      thresholds: { ...base.conductSettings.thresholds, ...((value.conductSettings || {}).thresholds || {}) },
      academicCalendar: { ...base.conductSettings.academicCalendar, ...((value.conductSettings || {}).academicCalendar || {}) },
      periodRanges: { ...base.conductSettings.periodRanges, ...((value.conductSettings || {}).periodRanges || {}) },
    },
    gradeSettings: { ...base.gradeSettings, ...(value.gradeSettings || {}) },
    academicTerms: Array.isArray(value.academicTerms) ? value.academicTerms : [],
    portalConfig: { ...base.portalConfig, ...(value.portalConfig || {}) },
    settings: { ...base.settings, ...(value.settings || {}) },
  };
}

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOMEROOM_STORE_EVENT));
}


function indexKey(user) {
  return `${INDEX_PREFIX}:${userKey(user)}`;
}

function currentKey(user) {
  return `${CURRENT_PREFIX}:${userKey(user)}`;
}

function workspaceMeta(workspace) {
  const normalized = normalizeHomeroomWorkspace(workspace);
  return {
    id: normalized.id,
    className: safeText(normalized.classProfile?.className, 'Chưa đặt tên'),
    schoolYear: safeText(normalized.classProfile?.schoolYear),
    semester: safeText(normalized.semester, 'Học kỳ I'),
    grade: safeText(normalized.classProfile?.grade),
    status: safeText(normalized.status, 'active'),
    archivedAt: safeText(normalized.archivedAt),
    studentCount: normalized.students.filter((item) => item.active !== false).length,
    updatedAt: normalized.updatedAt || nowIso(),
  };
}

function readLocalIndex(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(indexKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocalIndex(user, items) {
  try { localStorage.setItem(indexKey(user), JSON.stringify(items)); } catch { /* ignore */ }
}

export function getCurrentHomeroomWorkspaceId(user) {
  try { return safeText(localStorage.getItem(currentKey(user)), 'default'); } catch { return 'default'; }
}

export function setCurrentHomeroomWorkspaceId(user, workspaceId) {
  try { localStorage.setItem(currentKey(user), safeText(workspaceId, 'default')); } catch { /* ignore */ }
  return safeText(workspaceId, 'default');
}

export function listLocalHomeroomWorkspaces(user) {
  const indexed = readLocalIndex(user);
  const discovered = [];
  try {
    const prefix = `${STORE_PREFIX}:${userKey(user)}:`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      const workspace = loadLocalHomeroomWorkspace(user, id);
      if (workspace) discovered.push(workspaceMeta(workspace));
    }
  } catch { /* ignore */ }
  const merged = new Map();
  [...indexed, ...discovered].forEach((item) => merged.set(item.id, { ...(merged.get(item.id) || {}), ...item }));
  return [...merged.values()].sort((a, b) => (a.status === 'archived') - (b.status === 'archived') || String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function loadLocalHomeroomWorkspace(user, workspaceId = 'default') {
  try {
    const raw = localStorage.getItem(workspaceKey(user, workspaceId));
    if (!raw) return null;
    return normalizeHomeroomWorkspace(JSON.parse(raw), user);
  } catch {
    return null;
  }
}

export function saveLocalHomeroomWorkspace(workspace, user, options = {}) {
  const touchUpdatedAt = options.touchUpdatedAt !== false;
  const updatedAt = touchUpdatedAt ? nowIso() : safeText(workspace?.updatedAt, nowIso());
  const normalized = normalizeHomeroomWorkspace({ ...workspace, updatedAt }, user);
  try {
    localStorage.setItem(workspaceKey(user, normalized.id), JSON.stringify(normalized));
    const items = readLocalIndex(user).filter((item) => item.id !== normalized.id);
    writeLocalIndex(user, [workspaceMeta(normalized), ...items].slice(0, 100));
    setCurrentHomeroomWorkspaceId(user, normalized.id);
    emit();
  } catch (error) {
    console.warn('Could not save homeroom workspace locally:', error?.message || error);
  }
  return normalized;
}

export function canUseCloudHomeroomStore() {
  return Boolean(isSupabaseConfigured && supabase);
}


export async function listHomeroomWorkspaces(user) {
  const localItems = listLocalHomeroomWorkspaces(user);
  if (!canUseCloudHomeroomStore() || !user?.id) return { ok: true, offline: true, items: localItems };
  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_id,class_name,school_year,status,semester,archived_at,payload,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return { ok: false, offline: true, message: error.message, items: localItems };
  const merged = new Map(localItems.map((item) => [item.id, item]));
  (data || []).forEach((row) => {
    const payload = normalizeHomeroomWorkspace(row.payload || { id: row.workspace_id }, user);
    merged.set(row.workspace_id, {
      ...workspaceMeta(payload),
      id: row.workspace_id,
      className: safeText(row.class_name, payload.classProfile.className),
      schoolYear: safeText(row.school_year, payload.classProfile.schoolYear),
      status: safeText(row.status, payload.status),
      semester: safeText(row.semester, payload.semester),
      archivedAt: row.archived_at || payload.archivedAt,
      updatedAt: row.updated_at || payload.updatedAt,
      source: 'cloud',
    });
  });
  const items = [...merged.values()].sort((a, b) => (a.status === 'archived') - (b.status === 'archived') || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  writeLocalIndex(user, items);
  return { ok: true, items, source: 'cloud' };
}

export async function createHomeroomWorkspace(user, input = {}) {
  const workspace = makeDefaultHomeroomWorkspace(user);
  workspace.id = safeText(input.id, `class-${Date.now().toString(36)}`);
  workspace.classProfile = { ...workspace.classProfile, ...(input.classProfile || {}) };
  workspace.semester = safeText(input.semester, 'Học kỳ I');
  workspace.status = 'active';
  workspace.createdAt = nowIso();
  workspace.updatedAt = nowIso();
  return saveHomeroomWorkspace(workspace, user);
}

export async function duplicateHomeroomWorkspace(source, user, input = {}) {
  const current = normalizeHomeroomWorkspace(source, user);
  const copy = normalizeHomeroomWorkspace({
    ...current,
    id: safeText(input.id, `class-${Date.now().toString(36)}`),
    status: 'active', archivedAt: '',
    semester: safeText(input.semester, current.semester),
    classProfile: {
      ...current.classProfile,
      className: safeText(input.className, `${current.classProfile.className || 'Lớp'} · Bản sao`),
      schoolYear: safeText(input.schoolYear, current.classProfile.schoolYear),
    },
    attendance: input.keepHistory ? current.attendance : {},
    attendanceSessions: input.keepHistory ? current.attendanceSessions : {},
    learningRecords: input.keepHistory ? current.learningRecords : [],
    incidents: input.keepHistory ? current.incidents : [],
    supportPlans: input.keepHistory ? current.supportPlans : [],
    parentContacts: input.keepHistory ? current.parentContacts : [],
    conductRecords: input.keepHistory ? current.conductRecords : [],
    conductCustomRules: current.conductCustomRules,
    conductWeekSummaries: input.keepHistory ? current.conductWeekSummaries : [],
    conductSettings: current.conductSettings,
    announcements: [], records: [], auditLogs: [], backups: [],
    createdAt: nowIso(), updatedAt: nowIso(),
  }, user);
  return saveHomeroomWorkspace(copy, user);
}

export async function setHomeroomWorkspaceStatus(workspace, user, status = 'archived') {
  const current = normalizeHomeroomWorkspace(workspace, user);
  return saveHomeroomWorkspace({ ...current, status, archivedAt: status === 'archived' ? nowIso() : '', updatedAt: nowIso() }, user);
}

export async function loadHomeroomWorkspace(user, workspaceId = 'default') {
  const local = loadLocalHomeroomWorkspace(user, workspaceId);
  if (!canUseCloudHomeroomStore() || !user?.id) {
    return { ok: true, offline: true, workspace: local || makeDefaultHomeroomWorkspace(user) };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_id,class_name,school_year,status,semester,archived_at,payload,updated_at')
    .eq('owner_id', user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    return { ok: false, offline: true, message: error.message, workspace: local || makeDefaultHomeroomWorkspace(user) };
  }
  if (!data?.payload) {
    return { ok: true, empty: true, workspace: local || makeDefaultHomeroomWorkspace(user) };
  }

  const cloud = normalizeHomeroomWorkspace(data.payload, user);
  const cloudUpdated = Date.parse(data.updated_at || cloud.updatedAt || 0) || 0;
  const localUpdated = Date.parse(local?.updatedAt || 0) || 0;
  const selected = local && localUpdated > cloudUpdated ? local : cloud;
  saveLocalHomeroomWorkspace(selected, user, { touchUpdatedAt: false });
  return { ok: true, workspace: selected, source: selected === local ? 'local' : 'cloud' };
}

export async function saveHomeroomWorkspace(workspace, user) {
  const normalized = saveLocalHomeroomWorkspace(workspace, user);
  if (!canUseCloudHomeroomStore() || !user?.id) {
    return { ok: true, offline: true, workspace: normalized };
  }

  const payload = { ...normalized, updatedAt: nowIso() };
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      owner_id: user.id,
      owner_email: safeText(user.email),
      workspace_id: payload.id,
      class_name: safeText(payload.classProfile?.className, 'Lớp chủ nhiệm'),
      school_year: safeText(payload.classProfile?.schoolYear),
      status: safeText(payload.status, 'active'),
      semester: safeText(payload.semester, 'Học kỳ I'),
      archived_at: payload.archivedAt || null,
      payload,
      updated_at: nowIso(),
    }, { onConflict: 'owner_id,workspace_id' })
    .select('workspace_id,payload,updated_at')
    .maybeSingle();

  if (error) return { ok: false, offline: true, message: error.message, workspace: normalized };
  const saved = normalizeHomeroomWorkspace(data?.payload || payload, user);
  saveLocalHomeroomWorkspace(saved, user, { touchUpdatedAt: false });
  return { ok: true, workspace: saved, source: 'cloud' };
}

export function addStudent(workspace, input = {}) {
  const student = {
    id: safeText(input.id, uid('student')),
    code: safeText(input.code),
    fullName: safeText(input.fullName || input.name),
    birthDate: safeText(input.birthDate),
    gender: safeText(input.gender),
    phone: safeText(input.phone),
    parentName: safeText(input.parentName),
    parentPhone: safeText(input.parentPhone),
    parentEmail: safeText(input.parentEmail),
    address: safeText(input.address),
    notes: safeText(input.notes),
    supportLevel: safeText(input.supportLevel, 'normal'),
    teamId: safeText(input.teamId),
    portalPin: safeText(input.portalPin, makePin()),
    pinUpdatedAt: safeText(input.pinUpdatedAt, nowIso()),
    active: input.active !== false,
    lifecycleStatus: safeText(input.lifecycleStatus, input.active === false ? 'archived' : 'active'),
    inactiveReason: safeText(input.inactiveReason),
    inactiveAt: safeText(input.inactiveAt),
    transferClass: safeText(input.transferClass),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!student.fullName) throw new Error('Student name is required.');
  const current = normalizeHomeroomWorkspace(workspace);
  const duplicateIndex = findStudentDuplicateIndex(current.students, student);
  const students = [...current.students];
  if (duplicateIndex >= 0) {
    const previous = students[duplicateIndex];
    const patch = { ...student };
    ['code', 'fullName', 'birthDate', 'gender', 'phone', 'parentName', 'parentPhone', 'parentEmail', 'address', 'notes', 'teamId', 'inactiveReason', 'inactiveAt', 'transferClass'].forEach((key) => {
      if (!safeText(input[key] ?? input[key === 'fullName' ? 'name' : key])) delete patch[key];
    });
    if (input.supportLevel === undefined || input.supportLevel === null || input.supportLevel === '') delete patch.supportLevel;
    if (input.active === undefined) delete patch.active;
    if (input.lifecycleStatus === undefined) delete patch.lifecycleStatus;
    delete patch.id;
    delete patch.createdAt;
    if (!input.portalPin) { delete patch.portalPin; delete patch.pinUpdatedAt; }
    students[duplicateIndex] = { ...previous, ...patch, id: previous.id, createdAt: previous.createdAt || student.createdAt, updatedAt: nowIso() };
  } else students.push(student);
  return { ...current, students, updatedAt: nowIso() };
}

export function upsertStudents(workspace, rows = []) {
  return rows.reduce((current, row) => {
    try { return addStudent(current, row); } catch { return current; }
  }, normalizeHomeroomWorkspace(workspace));
}

export function archiveStudent(workspace, studentId, reason = 'Ngừng theo dõi', transferClass = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    students: current.students.map((item) => item.id === studentId ? {
      ...item,
      active: false,
      lifecycleStatus: transferClass ? 'transferred' : 'archived',
      inactiveReason: safeText(reason, 'Ngừng theo dõi'),
      inactiveAt: nowIso(),
      transferClass: safeText(transferClass),
      updatedAt: nowIso(),
    } : item),
    updatedAt: nowIso(),
  };
}

export function restoreStudent(workspace, studentId) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    students: current.students.map((item) => item.id === studentId ? {
      ...item,
      active: true,
      lifecycleStatus: 'active',
      inactiveReason: '',
      inactiveAt: '',
      transferClass: '',
      updatedAt: nowIso(),
    } : item),
    updatedAt: nowIso(),
  };
}

export function transferStudent(workspace, studentId, targetClass, reason = 'Chuyển lớp') {
  return archiveStudent(workspace, studentId, reason, targetClass);
}

// Backward-compatible alias: records are archived instead of permanently deleted.
export function deleteStudent(workspace, studentId) {
  return archiveStudent(workspace, studentId, 'Ẩn hồ sơ theo yêu cầu người dùng');
}

export function setAttendanceForDate(workspace, date, rows) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    attendance: { ...current.attendance, [date]: rows },
    updatedAt: nowIso(),
  };
}


export function setAttendanceSession(workspace, sessionKey, rows, meta = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const now = nowIso();
  return {
    ...current,
    attendance: { ...current.attendance, [sessionKey]: rows },
    attendanceSessions: {
      ...current.attendanceSessions,
      [sessionKey]: {
        ...(current.attendanceSessions?.[sessionKey] || {}),
        date: safeText(meta.date),
        session: safeText(meta.session, 'day'),
        period: safeText(meta.period),
        note: safeText(meta.note),
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
}

export function setAttendanceLock(workspace, sessionKey, locked, actor = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const locks = { ...current.attendanceLocks };
  if (locked) locks[sessionKey] = { locked: true, lockedAt: nowIso(), lockedBy: safeText(actor) };
  else delete locks[sessionKey];
  return { ...current, attendanceLocks: locks, updatedAt: nowIso() };
}

export function regenerateStudentPortalPin(workspace, studentId) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    students: current.students.map((student) => student.id === studentId ? { ...student, portalPin: makePin(), pinUpdatedAt: nowIso(), updatedAt: nowIso() } : student),
    updatedAt: nowIso(),
  };
}

export function revokeAllPortalAccess(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    portalConfig: { ...current.portalConfig, enabled: false, parentCode: '', studentCode: '', subjectCode: '', publishedAt: '', revokedAt: nowIso() },
    students: current.students.map((student) => ({ ...student, portalPin: makePin(), pinUpdatedAt: nowIso(), updatedAt: nowIso() })),
    updatedAt: nowIso(),
  };
}

export function addReminder(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('reminder')),
    title: safeText(input.title),
    dueDate: safeText(input.dueDate),
    dueTime: safeText(input.dueTime),
    category: safeText(input.category, 'Chủ nhiệm'),
    linkedTab: safeText(input.linkedTab),
    done: Boolean(input.done),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.title) throw new Error('Reminder title is required.');
  return { ...current, reminders: [item, ...current.reminders.filter((entry) => entry.id !== item.id)], updatedAt: nowIso() };
}

export function toggleReminder(workspace, reminderId) {
  const current = normalizeHomeroomWorkspace(workspace);
  return { ...current, reminders: current.reminders.map((item) => item.id === reminderId ? { ...item, done: !item.done, updatedAt: nowIso() } : item), updatedAt: nowIso() };
}

export function addMessageTemplate(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = { id: safeText(input.id, uid('template')), name: safeText(input.name), channel: safeText(input.channel, 'Zalo'), subject: safeText(input.subject), content: safeText(input.content), createdAt: input.createdAt || nowIso(), updatedAt: nowIso() };
  if (!item.name || !item.content) throw new Error('Template name and content are required.');
  return { ...current, messageTemplates: [item, ...current.messageTemplates.filter((entry) => entry.id !== item.id)], updatedAt: nowIso() };
}

export function scheduleParentMessage(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = { id: safeText(input.id, uid('scheduled')), studentId: safeText(input.studentId), subject: safeText(input.subject), message: safeText(input.message), channel: safeText(input.channel, 'Zalo'), sendAt: safeText(input.sendAt), status: safeText(input.status, 'scheduled'), createdAt: input.createdAt || nowIso(), updatedAt: nowIso() };
  if (!item.message || !item.sendAt) throw new Error('Scheduled message and time are required.');
  return { ...current, scheduledMessages: [item, ...current.scheduledMessages.filter((entry) => entry.id !== item.id)], updatedAt: nowIso() };
}

export function updateGradeSettings(workspace, patch = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  return { ...current, gradeSettings: { ...current.gradeSettings, ...patch }, updatedAt: nowIso() };
}

export function addScheduleItem(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const now = nowIso();
  const item = {
    id: safeText(input.id, uid('schedule')),
    title: safeText(input.title),
    date: safeText(input.date),
    startTime: safeText(input.startTime),
    endTime: safeText(input.endTime),
    location: safeText(input.location),
    category: safeText(input.category, 'Khác'),
    audience: safeText(input.audience, 'Toàn lớp'),
    note: safeText(input.note),
    status: safeText(input.status, 'Sắp tới'),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  if (!item.title) throw new Error('Schedule title is required.');
  const duplicate = input.id
    ? current.schedule.findIndex((entry) => entry.id === input.id)
    : current.schedule.findIndex((entry) => (
      identityText(entry.title) === identityText(item.title)
      && entry.date === item.date
      && entry.startTime === item.startTime
    ));
  const schedule = [...current.schedule];
  if (duplicate >= 0) schedule[duplicate] = { ...schedule[duplicate], ...item, id: schedule[duplicate].id, createdAt: schedule[duplicate].createdAt || item.createdAt };
  else schedule.push(item);
  schedule.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  return { ...current, schedule, updatedAt: now };
}

export function addMeeting(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('meeting')),
    date: safeText(input.date),
    theme: safeText(input.theme),
    objectives: safeText(input.objectives),
    attendanceSummary: safeText(input.attendanceSummary),
    learningSummary: safeText(input.learningSummary),
    commendations: safeText(input.commendations),
    reminders: safeText(input.reminders),
    nextWeek: safeText(input.nextWeek),
    content: safeText(input.content),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.theme) throw new Error('Meeting theme is required.');
  const meetings = [item, ...current.meetings.filter((entry) => entry.id !== item.id)];
  return { ...current, meetings, updatedAt: nowIso() };
}

export function addParentContact(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const now = nowIso();
  const item = {
    id: safeText(input.id, uid('contact')),
    studentId: safeText(input.studentId),
    date: safeText(input.date),
    channel: safeText(input.channel, 'Zalo'),
    direction: safeText(input.direction, 'GVCN liên hệ'),
    subject: safeText(input.subject),
    message: safeText(input.message),
    outcome: safeText(input.outcome),
    followUpDate: safeText(input.followUpDate),
    attachmentName: safeText(input.attachmentName),
    responseStatus: safeText(input.responseStatus, 'pending'),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  if (!item.subject && !item.message) throw new Error('Contact content is required.');
  const existing = current.parentContacts.find((entry) => entry.id === item.id);
  const merged = existing ? { ...existing, ...item, createdAt: existing.createdAt || item.createdAt } : item;
  return { ...current, parentContacts: [merged, ...current.parentContacts.filter((entry) => entry.id !== item.id)], updatedAt: now };
}

export function addRecord(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('record')),
    type: safeText(input.type, 'Báo cáo tuần'),
    title: safeText(input.title),
    period: safeText(input.period),
    content: safeText(input.content),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.title) throw new Error('Record title is required.');
  return { ...current, records: [item, ...current.records], updatedAt: nowIso() };
}

export function exportWorkspaceJson(workspace) {
  return JSON.stringify(normalizeHomeroomWorkspace(workspace), null, 2);
}


export function addLearningRecord(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const rawScore = Number(String(input.score ?? '').trim().replace(',', '.'));
  const rawMaxScore = input.maxScore === '' || input.maxScore === null || input.maxScore === undefined
    ? 10
    : Number(String(input.maxScore).trim().replace(',', '.'));
  if (!Number.isFinite(rawScore)) throw new Error('Điểm phải là một số hợp lệ.');
  if (!Number.isFinite(rawMaxScore) || rawMaxScore <= 0) throw new Error('Thang điểm phải là một số lớn hơn 0.');
  if (rawScore < 0 || rawScore > rawMaxScore) throw new Error(`Điểm phải nằm trong khoảng 0–${rawMaxScore}.`);
  const now = nowIso();
  const item = {
    id: safeText(input.id, uid('learning')),
    studentId: safeText(input.studentId),
    subject: safeText(input.subject),
    period: safeText(input.period),
    assessment: safeText(input.assessment, 'Điểm đánh giá'),
    score: Math.round(rawScore * 100) / 100,
    maxScore: Math.round(rawMaxScore * 100) / 100,
    teacherName: safeText(input.teacherName),
    note: safeText(input.note),
    recordedAt: safeText(input.recordedAt, new Date().toISOString().slice(0, 10)),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  if (!item.studentId || !item.subject) throw new Error('Student and subject are required.');
  const duplicateIndex = current.learningRecords.findIndex((entry) => (
    (input.id && entry.id === input.id)
    || (!input.id && entry.studentId === item.studentId && identityText(entry.subject) === identityText(item.subject)
      && entry.period === item.period && entry.assessment === item.assessment && entry.recordedAt === item.recordedAt)
  ));
  const learningRecords = [...current.learningRecords];
  if (duplicateIndex >= 0) learningRecords[duplicateIndex] = { ...learningRecords[duplicateIndex], ...item, id: learningRecords[duplicateIndex].id, createdAt: learningRecords[duplicateIndex].createdAt || item.createdAt };
  else learningRecords.unshift(item);
  return { ...current, learningRecords, updatedAt: now };
}

export function addSubjectFeedback(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('feedback')),
    inboxId: safeText(input.inboxId),
    studentId: safeText(input.studentId),
    studentCode: safeText(input.studentCode),
    subject: safeText(input.subject),
    teacherName: safeText(input.teacherName),
    teacherEmail: safeText(input.teacherEmail),
    period: safeText(input.period),
    level: safeText(input.level, 'Bình thường'),
    comment: safeText(input.comment),
    action: safeText(input.action),
    status: safeText(input.status, 'Đã tiếp nhận'),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.studentId && !item.studentCode) throw new Error('Student is required.');
  if (!item.subject || !item.comment) throw new Error('Subject and comment are required.');
  const subjectFeedback = [item, ...current.subjectFeedback.filter((entry) => entry.id !== item.id && (!item.inboxId || entry.inboxId !== item.inboxId))];
  return { ...current, subjectFeedback, updatedAt: nowIso() };
}

export function upsertTeam(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('team')),
    name: safeText(input.name),
    symbol: safeText(input.symbol, '◆'),
    note: safeText(input.note),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.name) throw new Error('Team name is required.');
  const index = current.teams.findIndex((entry) => entry.id === item.id || entry.name.toLowerCase() === item.name.toLowerCase());
  const teams = [...current.teams];
  if (index >= 0) teams[index] = { ...teams[index], ...item, id: teams[index].id };
  else teams.push(item);
  return { ...current, teams, updatedAt: nowIso() };
}

export function assignStudentTeam(workspace, studentId, teamId = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    students: current.students.map((student) => student.id === studentId ? { ...student, teamId, updatedAt: nowIso() } : student),
    updatedAt: nowIso(),
  };
}

export function addCompetitionEvent(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const points = Number(input.points);
  const item = {
    id: safeText(input.id, uid('competition')),
    teamId: safeText(input.teamId),
    studentId: safeText(input.studentId),
    points: Number.isFinite(points) ? points : 0,
    reason: safeText(input.reason),
    date: safeText(input.date, new Date().toISOString().slice(0, 10)),
    createdAt: input.createdAt || nowIso(),
  };
  if (!item.teamId || !item.reason) throw new Error('Team and reason are required.');
  return { ...current, competitionEvents: [item, ...current.competitionEvents], updatedAt: nowIso() };
}

export function addAnnouncement(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('notice')),
    title: safeText(input.title),
    message: safeText(input.message),
    audience: safeText(input.audience, 'all'),
    targetStudentIds: Array.isArray(input.targetStudentIds) ? input.targetStudentIds : [],
    requiresAck: input.requiresAck !== false,
    dueDate: safeText(input.dueDate),
    scheduledAt: safeText(input.scheduledAt),
    attachmentName: safeText(input.attachmentName),
    attachmentType: safeText(input.attachmentType),
    attachmentData: safeText(input.attachmentData),
    status: safeText(input.status, input.scheduledAt ? 'scheduled' : 'published'),
    publishedAt: input.publishedAt || nowIso(),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.title || !item.message) throw new Error('Announcement title and message are required.');
  const announcements = [item, ...current.announcements.filter((entry) => entry.id !== item.id)];
  return { ...current, announcements, updatedAt: nowIso() };
}

export function setPortalConfig(workspace, config = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    portalConfig: { ...current.portalConfig, ...config },
    updatedAt: nowIso(),
  };
}

export function calculateStudentAnalytics(workspace, studentId) {
  const current = normalizeHomeroomWorkspace(workspace);
  const records = current.learningRecords.filter((entry) => entry.studentId === studentId);
  const weightedScores = records.map((entry) => {
    const normalizedScore = entry.maxScore > 0 ? (Number(entry.score) / Number(entry.maxScore)) * 10 : 0;
    const subjectWeight = Number(current.gradeSettings?.subjectWeights?.[entry.subject] || 1) || 1;
    const assessmentWeight = Number(current.gradeSettings?.assessmentWeights?.[entry.assessment] || 1) || 1;
    return { score: normalizedScore, weight: Math.max(0.1, subjectWeight * assessmentWeight) };
  });
  const normalizedScores = weightedScores.map((item) => item.score);
  const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0);
  const average = totalWeight ? weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight : null;
  const recent = normalizedScores.slice(0, 3);
  const older = normalizedScores.slice(3, 6);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : average;
  const olderAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
  const trend = recentAvg == null || olderAvg == null ? 'stable' : recentAvg > olderAvg + 0.35 ? 'up' : recentAvg < olderAvg - 0.35 ? 'down' : 'stable';
  const attendanceRows = Object.values(current.attendance).map((rows) => rows?.[studentId]).filter(Boolean);
  const absenceCount = attendanceRows.filter((entry) => ['excused', 'unexcused'].includes(entry.status)).length;
  const lateCount = attendanceRows.filter((entry) => entry.status === 'late').length;
  const feedback = current.subjectFeedback.filter((entry) => entry.studentId === studentId);
  const alertFeedback = feedback.filter((entry) => ['Cần hỗ trợ', 'Khẩn', 'Nguy cơ'].includes(entry.level)).length;
  let risk = 'low';
  const highRiskThreshold = Number(current.gradeSettings?.highRiskThreshold ?? 5);
  const warningThreshold = Number(current.gradeSettings?.warningThreshold ?? 6.5);
  if ((average != null && average < highRiskThreshold) || absenceCount >= 4 || alertFeedback >= 2) risk = 'high';
  else if ((average != null && average < warningThreshold) || absenceCount >= 2 || lateCount >= 3 || alertFeedback >= 1 || trend === 'down') risk = 'medium';
  return { average, trend, absenceCount, lateCount, alertFeedback, recordCount: records.length, risk };
}
