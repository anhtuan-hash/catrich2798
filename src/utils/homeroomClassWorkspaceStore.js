import {
  getCurrentHomeroomWorkspaceId,
  listLocalHomeroomWorkspaces as listBaseLocalWorkspaces,
  loadLocalHomeroomWorkspace as loadBaseLocalWorkspace,
  makeDefaultHomeroomWorkspace as makeBaseDefaultWorkspace,
  normalizeHomeroomWorkspace as normalizeBaseWorkspace,
  saveLocalHomeroomWorkspace as saveBaseLocalWorkspace,
  setCurrentHomeroomWorkspaceId,
} from './homeroomStore.js';
import { isSupabaseConfigured, supabase } from './supabase.js';
import { scheduleHomeroomDriveBackup } from './homeroomDriveBackup.js';
import { getAttendanceLockViolation, stripRetiredRestoreFields } from './homeroomProductionSafety.js';
import {
  HOMEROOM_CLASS_TYPE,
  SUBJECT_CLASS_TYPE,
  isValidHomeroomClassType,
  normalizeHomeroomClassType,
  reconcileHomeroomClassCatalog,
} from './homeroomClassTypes.js';

const CLASS_TYPE_STORE_PREFIX = 'bes-homeroom-class-types-v1';
const WORKSPACE_TABLE = 'bes_homeroom_workspaces';
const WORKSPACE_STORE_PREFIX = 'bes-homeroom-workspace-v1';
const WORKSPACE_INDEX_PREFIX = 'bes-homeroom-workspace-index-v3';
const PRIVACY_MODES = new Set(['balanced', 'cloud-only', 'device-only']);
const PERSISTENCE_BASELINES = new Map();
const SUBJECT_STUDENT_FIELDS = [
  'id', 'code', 'fullName', 'birthDate', 'gender', 'notes',
  'active', 'lifecycleStatus', 'inactiveReason', 'inactiveAt', 'transferClass',
  'createdAt', 'updatedAt',
];

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function nowIso() { return new Date().toISOString(); }
function userKey(user) { return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase(); }
function classTypeStoreKey(user) { return `${CLASS_TYPE_STORE_PREFIX}:${userKey(user)}`; }
function workspaceStoreKey(user, workspaceId) { return `${WORKSPACE_STORE_PREFIX}:${userKey(user)}:${text(workspaceId, 'default')}`; }
function workspaceIndexKey(user) { return `${WORKSPACE_INDEX_PREFIX}:${userKey(user)}`; }
function baselineKey(user, workspaceId) { return `${userKey(user)}:${text(workspaceId, 'default')}`; }

function sameRevision(left, right) {
  const a = text(left);
  const b = text(right);
  if (!a || !b) return a === b;
  if (a === b) return true;
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  return Number.isFinite(aTime) && Number.isFinite(bTime) && aTime === bTime;
}

function attendanceBaseline(workspace) {
  if (!workspace) return null;
  return {
    attendance: workspace.attendance || {},
    attendanceSessions: workspace.attendanceSessions || {},
    attendanceLocks: workspace.attendanceLocks || {},
    correctionRequests: workspace.correctionRequests || [],
  };
}

function rememberPersistenceBaseline(workspace, user) {
  if (!workspace?.id) return;
  PERSISTENCE_BASELINES.set(baselineKey(user, workspace.id), attendanceBaseline(workspace));
  if (PERSISTENCE_BASELINES.size > 100) {
    const oldest = PERSISTENCE_BASELINES.keys().next().value;
    if (oldest) PERSISTENCE_BASELINES.delete(oldest);
  }
}

function getPersistenceBaseline(user, workspaceId) {
  return PERSISTENCE_BASELINES.get(baselineKey(user, workspaceId)) || null;
}

function readClassTypes(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(classTypeStoreKey(user)) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function writeClassTypes(user, classTypes) {
  try { localStorage.setItem(classTypeStoreKey(user), JSON.stringify(classTypes)); } catch { /* optional metadata */ }
}

function readLocalIndex(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(workspaceIndexKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocalIndex(user, items) {
  try { localStorage.setItem(workspaceIndexKey(user), JSON.stringify(items)); } catch { /* optional metadata */ }
}

function inferGrade(className, fallback = '') {
  const match = text(className).match(/^(10|11|12)(?:\.|$)/);
  return match?.[1] || fallback;
}

function privacyMode(workspace) {
  const mode = text(workspace?.settings?.privacyMode, 'balanced');
  return PRIVACY_MODES.has(mode) ? mode : 'balanced';
}

function workspaceMeta(workspace) {
  return {
    id: workspace.id,
    className: text(workspace.classProfile?.className, 'Chưa đặt tên'),
    schoolYear: text(workspace.classProfile?.schoolYear),
    semester: text(workspace.semester, 'Học kỳ I'),
    grade: text(workspace.classProfile?.grade),
    status: text(workspace.status, 'active'),
    archivedAt: text(workspace.archivedAt),
    studentCount: (workspace.students || []).filter((item) => item.active !== false).length,
    updatedAt: workspace.updatedAt || nowIso(),
  };
}

export function sanitizeSubjectClassStudent(student = {}) {
  const clean = {};
  SUBJECT_STUDENT_FIELDS.forEach((key) => {
    if (student[key] !== undefined) clean[key] = student[key];
  });
  clean.id = text(clean.id);
  clean.code = text(clean.code);
  clean.fullName = text(clean.fullName);
  clean.birthDate = text(clean.birthDate);
  clean.gender = text(clean.gender);
  clean.notes = text(clean.notes);
  clean.active = clean.active !== false;
  clean.lifecycleStatus = text(clean.lifecycleStatus, clean.active ? 'active' : 'archived');
  return clean;
}

function sanitizeSubjectWorkspace(workspace) {
  if (workspace?.classProfile?.classType !== SUBJECT_CLASS_TYPE) return workspace;
  return {
    ...workspace,
    students: Array.isArray(workspace.students) ? workspace.students.map(sanitizeSubjectClassStudent) : [],
  };
}

function hasSubjectStudentPii(workspace) {
  if (workspace?.classProfile?.classType !== SUBJECT_CLASS_TYPE) return false;
  return (workspace.students || []).some((student) => [
    'phone', 'parentName', 'parentPhone', 'parentEmail', 'address',
    'portalPin', 'pinUpdatedAt', 'supportLevel', 'teamId',
  ].some((key) => student?.[key] !== undefined));
}

function fallbackClassType(workspaceId) {
  return workspaceId === 'default' ? HOMEROOM_CLASS_TYPE : SUBJECT_CLASS_TYPE;
}

function explicitClassType(workspace) {
  const value = workspace?.classProfile?.classType;
  return isValidHomeroomClassType(value) ? value : '';
}

function decorateWorkspace(workspace, user, preferExplicit = false) {
  const normalized = normalizeBaseWorkspace(stripRetiredRestoreFields(workspace), user);
  const stored = readClassTypes(user)[normalized.id];
  const explicit = explicitClassType(normalized);
  const classType = normalizeHomeroomClassType(
    preferExplicit ? (explicit || stored) : (stored || explicit),
    fallbackClassType(normalized.id),
  );
  return sanitizeSubjectWorkspace({
    ...normalized,
    classProfile: { ...normalized.classProfile, classType },
  });
}

function persistSubjectWorkspaceLocally(workspace, user) {
  const sanitized = sanitizeSubjectWorkspace(workspace);
  try {
    localStorage.setItem(workspaceStoreKey(user, sanitized.id), JSON.stringify(sanitized));
    const items = readLocalIndex(user).filter((item) => item.id !== sanitized.id);
    writeLocalIndex(user, [workspaceMeta(sanitized), ...items].slice(0, 100));
    setCurrentHomeroomWorkspaceId(user, sanitized.id);
  } catch (error) {
    console.warn('Could not save minimized subject workspace locally:', error?.message || error);
  }
  return sanitized;
}

function removeLocalWorkspacePayload(user, workspaceId) {
  try { localStorage.removeItem(workspaceStoreKey(user, workspaceId)); } catch { /* cloud-only payload must not remain */ }
}

function persistByPrivacyMode(workspace, user) {
  const normalized = decorateWorkspace({ ...workspace, updatedAt: workspace.updatedAt || nowIso() }, user, true);
  if (privacyMode(normalized) === 'cloud-only') {
    removeLocalWorkspacePayload(user, normalized.id);
    setCurrentHomeroomWorkspaceId(user, normalized.id);
    return normalized;
  }
  if (normalized.classProfile.classType === SUBJECT_CLASS_TYPE) return persistSubjectWorkspaceLocally(normalized, user);
  return decorateWorkspace(saveBaseLocalWorkspace(normalized, user), user);
}

function resolveCatalog(items, user, workspaceById = new Map()) {
  const stored = readClassTypes(user);
  const enriched = items.map((item) => {
    const workspace = workspaceById.get(item.id);
    const explicit = explicitClassType(workspace);
    const resolved = isValidHomeroomClassType(stored[item.id]);
    return {
      ...item,
      classType: explicit || stored[item.id] || fallbackClassType(item.id),
      classTypeExplicit: Boolean(explicit),
      classTypeResolved: !explicit && resolved,
    };
  });
  const catalog = reconcileHomeroomClassCatalog(enriched, getCurrentHomeroomWorkspaceId(user));
  writeClassTypes(user, { ...stored, ...Object.fromEntries(catalog.map((item) => [item.id, item.classType])) });
  return catalog;
}

function activeLocalWorkspace(user) {
  const local = loadBaseLocalWorkspace(user, getCurrentHomeroomWorkspaceId(user));
  return local ? decorateWorkspace(local, user) : null;
}

async function listWorkspaceMetadata(user) {
  const localItems = listBaseLocalWorkspaces(user);
  const active = activeLocalWorkspace(user);
  const deviceOnlyWorkspaceId = active && privacyMode(active) === 'device-only' ? active.id : '';
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: localItems };

  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select('workspace_id,class_name,school_year,status,semester,archived_at,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return { ok: false, offline: true, message: error.message, items: localItems };
  const merged = new Map(localItems.map((item) => [item.id, item]));
  (data || []).forEach((row) => {
    if (deviceOnlyWorkspaceId && row.workspace_id === deviceOnlyWorkspaceId) return;
    const local = merged.get(row.workspace_id) || {};
    const className = text(row.class_name, local.className || 'Chưa đặt tên');
    merged.set(row.workspace_id, {
      ...local,
      id: row.workspace_id,
      className,
      schoolYear: text(row.school_year, local.schoolYear),
      semester: text(row.semester, local.semester || 'Học kỳ I'),
      grade: text(local.grade, inferGrade(className)),
      status: text(row.status, local.status || 'active'),
      archivedAt: row.archived_at || local.archivedAt || '',
      updatedAt: row.updated_at || local.updatedAt || '',
      source: 'cloud-meta',
    });
  });
  return {
    ok: true,
    items: [...merged.values()].sort((a, b) => (
      (a.status === 'archived') - (b.status === 'archived')
      || String(b.updatedAt).localeCompare(String(a.updatedAt))
    )),
    source: deviceOnlyWorkspaceId ? 'mixed-device-and-cloud-meta' : 'cloud-meta',
  };
}

async function activeHomeroomConflict(user, targetId = '') {
  const result = await listHomeroomWorkspaces(user);
  return (result.items || []).find((item) => item.status !== 'archived' && item.id !== targetId && item.classType === HOMEROOM_CLASS_TYPE);
}

export function makeDefaultHomeroomWorkspace(user = null) { return decorateWorkspace(makeBaseDefaultWorkspace(user), user, true); }
export function normalizeHomeroomWorkspace(raw, user = null) { return decorateWorkspace(raw, user, true); }

export function listLocalHomeroomWorkspaces(user) {
  const items = listBaseLocalWorkspaces(user);
  const workspaces = new Map(items.map((item) => [item.id, loadBaseLocalWorkspace(user, item.id)]));
  return resolveCatalog(items, user, workspaces);
}

export async function listHomeroomWorkspaces(user) {
  const result = await listWorkspaceMetadata(user);
  const items = result.items || [];
  const stored = readClassTypes(user);
  const originalCurrentId = getCurrentHomeroomWorkspaceId(user);
  const workspaces = new Map();

  items.forEach((item) => {
    const local = loadBaseLocalWorkspace(user, item.id);
    if (local) workspaces.set(item.id, decorateWorkspace(local, user));
  });

  // A catalog view must not download every workspace payload: load at most the currently selected class.
  if (!workspaces.has(originalCurrentId) && !isValidHomeroomClassType(stored[originalCurrentId])) {
    const currentItem = items.find((item) => item.id === originalCurrentId);
    if (currentItem) {
      const loaded = await loadHomeroomWorkspace(user, originalCurrentId);
      if (loaded.workspace) workspaces.set(originalCurrentId, loaded.workspace);
    }
  }

  setCurrentHomeroomWorkspaceId(user, originalCurrentId);
  return { ...result, items: resolveCatalog(items, user, workspaces) };
}

export function loadLocalHomeroomWorkspace(user, workspaceId = 'default') {
  const raw = loadBaseLocalWorkspace(user, workspaceId);
  if (!raw) return null;
  const decorated = decorateWorkspace(raw, user);
  if (hasSubjectStudentPii({ ...raw, classProfile: decorated.classProfile })) persistByPrivacyMode(decorated, user);
  rememberPersistenceBaseline(decorated, user);
  return decorated;
}

async function migrateCloudSubjectPiiIfNeeded(rawPayload, decorated, user, workspaceId, expectedUpdatedAt) {
  if (!hasSubjectStudentPii({ ...rawPayload, classProfile: decorated.classProfile })) {
    return { workspace: decorated, updatedAt: expectedUpdatedAt };
  }
  const timestamp = nowIso();
  const payload = decorateWorkspace({
    ...decorated,
    updatedAt: timestamp,
    syncMeta: { ...(decorated.syncMeta || {}), cloudUpdatedAt: timestamp },
  }, user, true);
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .update({ payload, updated_at: timestamp })
    .eq('owner_id', user.id)
    .eq('workspace_id', workspaceId)
    .eq('updated_at', expectedUpdatedAt)
    .select('updated_at')
    .maybeSingle();
  if (error || !data) return { workspace: decorated, updatedAt: expectedUpdatedAt };
  const revision = data.updated_at || timestamp;
  return {
    workspace: decorateWorkspace({
      ...payload,
      syncMeta: { ...(payload.syncMeta || {}), cloudUpdatedAt: revision },
    }, user, true),
    updatedAt: revision,
  };
}

export async function loadHomeroomWorkspace(user, workspaceId = 'default') {
  const local = loadLocalHomeroomWorkspace(user, workspaceId);
  if (local && privacyMode(local) === 'device-only') {
    return { ok: true, offline: true, workspace: local, source: 'device-only' };
  }
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    const offlineWorkspace = local || makeDefaultHomeroomWorkspace(user);
    rememberPersistenceBaseline(offlineWorkspace, user);
    return { ok: true, offline: true, workspace: offlineWorkspace };
  }

  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select('workspace_id,payload,updated_at')
    .eq('owner_id', user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) return { ok: false, offline: true, message: error.message, workspace: local || makeDefaultHomeroomWorkspace(user) };
  if (!data?.payload) {
    const emptyWorkspace = local || makeDefaultHomeroomWorkspace(user);
    rememberPersistenceBaseline(emptyWorkspace, user);
    return { ok: true, empty: true, workspace: emptyWorkspace };
  }

  let cloud = decorateWorkspace({
    ...data.payload,
    syncMeta: { ...(data.payload.syncMeta || {}), cloudUpdatedAt: data.updated_at || '' },
  }, user, true);
  let cloudUpdatedAt = data.updated_at || '';
  const migration = await migrateCloudSubjectPiiIfNeeded(data.payload, cloud, user, workspaceId, cloudUpdatedAt);
  cloud = { ...migration.workspace, syncMeta: { ...(migration.workspace.syncMeta || {}), cloudUpdatedAt: migration.updatedAt || cloudUpdatedAt } };
  cloudUpdatedAt = migration.updatedAt || cloudUpdatedAt;

  if (privacyMode(cloud) === 'cloud-only') {
    removeLocalWorkspacePayload(user, cloud.id);
    rememberPersistenceBaseline(cloud, user);
    return { ok: true, workspace: cloud, source: 'cloud' };
  }

  const cloudUpdated = Date.parse(cloudUpdatedAt || cloud.updatedAt || 0) || 0;
  const localUpdated = Date.parse(local?.updatedAt || 0) || 0;
  if (local && localUpdated > cloudUpdated) {
    const expected = text(local.syncMeta?.cloudUpdatedAt);
    const conflict = Boolean(expected && !sameRevision(expected, cloudUpdatedAt));
    const selected = conflict ? local : { ...local, syncMeta: { ...(local.syncMeta || {}), cloudUpdatedAt: cloudUpdatedAt || expected } };
    persistByPrivacyMode(selected, user);
    rememberPersistenceBaseline(selected, user);
    return { ok: true, workspace: selected, source: conflict ? 'local-conflict' : 'local', conflict };
  }

  persistByPrivacyMode(cloud, user);
  rememberPersistenceBaseline(cloud, user);
  return { ok: true, workspace: cloud, source: 'cloud' };
}

function persistenceViolation(previous, next, user) {
  const baseline = previous || getPersistenceBaseline(user, next?.id);
  if (!baseline) return null;
  return getAttendanceLockViolation(baseline, next);
}

export function saveLocalHomeroomWorkspace(workspace, user) {
  const prepared = decorateWorkspace({ ...workspace, updatedAt: nowIso() }, user, true);
  const previous = loadBaseLocalWorkspace(user, prepared.id);
  const violation = persistenceViolation(previous, prepared, user);
  if (violation) {
    console.warn(`Blocked homeroom persistence: ${violation.code} (${violation.sessionKey})`);
    return previous ? decorateWorkspace(previous, user, true) : prepared;
  }
  const classTypes = readClassTypes(user);
  writeClassTypes(user, { ...classTypes, [prepared.id]: prepared.classProfile.classType });
  const persisted = persistByPrivacyMode(prepared, user);
  if (privacyMode(prepared) !== 'cloud-only') rememberPersistenceBaseline(persisted, user);
  return persisted;
}

function cloudRow(payload, user, timestamp) {
  return {
    owner_id: user.id,
    owner_email: text(user.email),
    workspace_id: payload.id,
    class_name: text(payload.classProfile?.className, 'Lớp chủ nhiệm'),
    school_year: text(payload.classProfile?.schoolYear),
    status: text(payload.status, 'active'),
    semester: text(payload.semester, 'Học kỳ I'),
    archived_at: payload.archivedAt || null,
    payload,
    updated_at: timestamp,
  };
}

function conflictResult(workspace, message = 'Dữ liệu cloud đã thay đổi trên thiết bị khác. Hãy tải lại lớp trước khi ghi đè.') {
  return { ok: false, code: 'workspace-conflict', conflict: true, message, workspace };
}

export async function saveHomeroomWorkspace(workspace, user) {
  const prepared = decorateWorkspace({ ...workspace, updatedAt: nowIso() }, user, true);
  const previousLocal = loadBaseLocalWorkspace(user, prepared.id);
  const localViolation = persistenceViolation(previousLocal, prepared, user);
  if (localViolation) return { ok: false, ...localViolation, workspace: previousLocal ? decorateWorkspace(previousLocal, user, true) : prepared };

  const classTypes = readClassTypes(user);
  writeClassTypes(user, { ...classTypes, [prepared.id]: prepared.classProfile.classType });
  const mode = privacyMode(prepared);
  const local = persistByPrivacyMode(prepared, user);

  if (mode === 'device-only') {
    rememberPersistenceBaseline(local, user);
    return { ok: true, offline: true, workspace: local, source: 'device-only' };
  }
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    if (mode === 'cloud-only') {
      return { ok: false, offline: true, code: 'cloud-unavailable', message: 'Chế độ cloud-only cần kết nối cloud để lưu dữ liệu.', workspace: prepared };
    }
    rememberPersistenceBaseline(local, user);
    return { ok: true, offline: true, workspace: local };
  }

  const expectedRevision = text(prepared.syncMeta?.cloudUpdatedAt);
  const { data: existing, error: readError } = await supabase
    .from(WORKSPACE_TABLE)
    .select('updated_at')
    .eq('owner_id', user.id)
    .eq('workspace_id', prepared.id)
    .maybeSingle();
  if (readError) return { ok: false, offline: mode !== 'cloud-only', message: readError.message, workspace: local };

  if (existing) {
    if (!expectedRevision || !sameRevision(existing.updated_at, expectedRevision)) return conflictResult(local);
  } else if (expectedRevision) {
    return conflictResult(local, 'Bản ghi cloud đã bị xóa hoặc thay đổi. Hãy tải lại lớp trước khi lưu.');
  }

  const timestamp = nowIso();
  const payload = decorateWorkspace({
    ...prepared,
    updatedAt: timestamp,
    syncMeta: { ...(prepared.syncMeta || {}), cloudUpdatedAt: timestamp },
  }, user, true);
  const row = cloudRow(payload, user, timestamp);

  let data;
  let error;
  if (existing) {
    ({ data, error } = await supabase
      .from(WORKSPACE_TABLE)
      .update(row)
      .eq('owner_id', user.id)
      .eq('workspace_id', payload.id)
      .eq('updated_at', expectedRevision)
      .select('updated_at')
      .maybeSingle());
    if (!error && !data) return conflictResult(local);
  } else {
    ({ data, error } = await supabase
      .from(WORKSPACE_TABLE)
      .insert(row)
      .select('updated_at')
      .maybeSingle());
    if (error?.code === '23505') return conflictResult(local);
  }

  if (error) return { ok: false, offline: mode !== 'cloud-only', message: error.message, workspace: local };

  const canonicalRevision = data?.updated_at || timestamp;
  const saved = decorateWorkspace({
    ...payload,
    syncMeta: { ...(payload.syncMeta || {}), cloudUpdatedAt: canonicalRevision },
  }, user, true);
  const persisted = persistByPrivacyMode(saved, user);
  rememberPersistenceBaseline(saved, user);
  void scheduleHomeroomDriveBackup(saved, user, { reason: 'automatic-after-supabase-sync' })
    .catch(() => { /* recovery backup must not block save */ });
  return { ok: true, workspace: persisted, source: 'cloud-minimal-return' };
}

export async function createHomeroomWorkspace(user, input = {}) {
  const classType = normalizeHomeroomClassType(input.classProfile?.classType, SUBJECT_CLASS_TYPE);
  if (classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, input.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  const base = makeBaseDefaultWorkspace(user);
  const workspace = decorateWorkspace({
    ...base,
    id: text(input.id, `class-${Date.now().toString(36)}`),
    status: 'active', archivedAt: '',
    semester: text(input.semester, 'Học kỳ I'),
    classProfile: { ...base.classProfile, ...(input.classProfile || {}), classType },
    createdAt: nowIso(), updatedAt: nowIso(), syncMeta: {},
  }, user, true);
  return saveHomeroomWorkspace(workspace, user);
}

export async function duplicateHomeroomWorkspace(source, user, input = {}) {
  const classType = normalizeHomeroomClassType(input.classType, SUBJECT_CLASS_TYPE);
  if (classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, input.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  const current = decorateWorkspace(source, user, true);
  const copy = decorateWorkspace({
    ...current,
    id: text(input.id, `class-${Date.now().toString(36)}`),
    status: 'active', archivedAt: '', semester: text(input.semester, current.semester),
    classProfile: {
      ...current.classProfile,
      classType,
      className: text(input.className, `${current.classProfile.className || 'Lớp'} · Bản sao`),
      schoolYear: text(input.schoolYear, current.classProfile.schoolYear),
    },
    attendance: input.keepHistory ? current.attendance : {},
    attendanceSessions: input.keepHistory ? current.attendanceSessions : {},
    learningRecords: input.keepHistory ? current.learningRecords : [],
    incidents: input.keepHistory ? current.incidents : [],
    supportPlans: input.keepHistory ? current.supportPlans : [],
    parentContacts: input.keepHistory ? current.parentContacts : [],
    conductRecords: input.keepHistory ? current.conductRecords : [],
    conductWeekSummaries: input.keepHistory ? current.conductWeekSummaries : [],
    announcements: [], records: [], auditLogs: [], backups: [], syncMeta: {},
    createdAt: nowIso(), updatedAt: nowIso(),
  }, user, true);
  return saveHomeroomWorkspace(copy, user);
}

export async function setHomeroomWorkspaceStatus(workspace, user, status = 'archived') {
  const normalized = decorateWorkspace(workspace, user);
  if (status === 'active' && normalized.classProfile.classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, normalized.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  return saveHomeroomWorkspace({
    ...normalized,
    status,
    archivedAt: status === 'archived' ? nowIso() : '',
    updatedAt: nowIso(),
  }, user);
}

export { getCurrentHomeroomWorkspaceId, setCurrentHomeroomWorkspaceId };
