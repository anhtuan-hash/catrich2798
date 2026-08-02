import { AUTH_EVENT, getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  makeDefaultHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  saveHomeroomWorkspace,
  setCurrentHomeroomWorkspaceId,
} from './utils/homeroomClassWorkspaceStore.js';
import { HOMEROOM_CLASS_TYPE, SUBJECT_CLASS_TYPE } from './utils/homeroomClassTypes.js';
import {
  normalizeSchoolClassName,
  reconcileWorkspaceRoster,
} from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const ASSIGNED_CLASSES_RPC = 'get_my_assigned_school_classes';
const RPC_TIMEOUT_MS = 3500;
const RETRY_DELAY_MS = 1600;
const syncPromises = new Map();
let installed = false;
let retryTimer = 0;

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function userKey(user) {
  return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function deterministicWorkspaceId(className, schoolYear) {
  const slug = `${className}-${schoolYear}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `school-${slug || 'class'}`;
}

function academicYear() {
  const today = new Date();
  const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function withTimeout(promise, timeoutMs = RPC_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(() => resolve({
      data: null,
      error: { message: 'Timed out while loading assigned school classes.', code: 'BES_TIMEOUT' },
    }), timeoutMs)),
  ]);
}

function isDeletedAssignedStudent(student) {
  return student?.lifecycleStatus === 'deleted' || Boolean(student?.deletedAt);
}

function normalizeAssignedRow(row) {
  const payload = row?.class_payload && typeof row.class_payload === 'object' ? row.class_payload : {};
  const className = normalizeSchoolClassName(row?.class_name || payload.className);
  if (!className) return null;
  const assignmentType = ['homeroom', 'subject', 'managed'].includes(row?.assignment_type)
    ? row.assignment_type
    : 'subject';
  const students = Array.isArray(payload.students) ? payload.students : [];
  const activeStudentCount = students.filter((student) => (
    student?.active !== false && !isDeletedAssignedStudent(student)
  )).length;
  return {
    registryOwnerId: text(row?.registry_owner_id),
    registryUpdatedAt: text(row?.registry_updated_at || payload.updatedAt),
    className,
    grade: text(payload.grade, className.split('.')[0]),
    schoolYear: text(payload.schoolYear, academicYear()),
    semester: text(payload.semester, 'Học kỳ I'),
    room: text(payload.room),
    assignmentType,
    students,
    activeStudentCount,
    expectedCount: Number(payload.expectedCount || 0) || 0,
  };
}

export async function listAssignedSchoolClasses(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: [] };
  }
  const result = await withTimeout(supabase.rpc(ASSIGNED_CLASSES_RPC));
  if (result?.error) {
    return {
      ok: false,
      items: [],
      message: result.error.message || 'Không tải được lớp đã phân công.',
      missingRpc: result.error.code === '42883' || /get_my_assigned_school_classes/i.test(result.error.message || ''),
    };
  }
  const byClass = new Map();
  (result?.data || []).forEach((row) => {
    const item = normalizeAssignedRow(row);
    if (!item) return;
    const current = byClass.get(item.className);
    if (!current || Date.parse(item.registryUpdatedAt || 0) >= Date.parse(current.registryUpdatedAt || 0)) {
      byClass.set(item.className, item);
    }
  });
  return { ok: true, items: [...byClass.values()] };
}

function signature(item) {
  return [
    item.registryOwnerId,
    item.className,
    item.registryUpdatedAt,
    item.assignmentType,
    item.students.length,
    item.activeStudentCount,
  ].join('|');
}

async function loadExistingWorkspace(user, catalog, className) {
  const meta = catalog.find((item) => normalizeSchoolClassName(item.className) === className);
  if (!meta?.id) return { meta: null, workspace: null };
  const loaded = await loadHomeroomWorkspace(user, meta.id);
  return { meta, workspace: loaded.workspace || null };
}

async function demoteOtherHomeroomWorkspace(user, catalog, selectedId) {
  const conflicts = catalog.filter((item) => (
    item.id !== selectedId
    && item.status !== 'archived'
    && item.classType === HOMEROOM_CLASS_TYPE
  ));
  for (const conflict of conflicts) {
    const loaded = await loadHomeroomWorkspace(user, conflict.id);
    if (!loaded.workspace) continue;
    await saveHomeroomWorkspace({
      ...loaded.workspace,
      classProfile: {
        ...(loaded.workspace.classProfile || {}),
        classType: SUBJECT_CLASS_TYPE,
      },
    }, user);
  }
}

async function syncAssignedSchoolClassWorkspacesInternal(user) {
  const assignmentResult = await listAssignedSchoolClasses(user);
  if (!assignmentResult.ok || !assignmentResult.items.length) {
    return { ...assignmentResult, changed: 0, preferredWorkspaceId: '' };
  }

  const catalogResult = await listHomeroomWorkspaces(user);
  const catalog = catalogResult.items || [];
  const sorted = [...assignmentResult.items].sort((a, b) => {
    const rank = (item) => item.assignmentType === 'homeroom' ? 2 : item.assignmentType === 'subject' ? 1 : 0;
    return rank(a) - rank(b) || a.className.localeCompare(b.className, 'vi');
  });
  let changed = 0;
  const synced = [];
  let preferredWorkspaceId = '';

  for (const item of sorted) {
    const existing = await loadExistingWorkspace(user, catalog, item.className);
    const workspaceId = existing.workspace?.id || deterministicWorkspaceId(item.className, item.schoolYear);
    const classType = item.assignmentType === 'homeroom'
      ? HOMEROOM_CLASS_TYPE
      : (item.assignmentType === 'managed' && existing.workspace?.classProfile?.classType
        ? existing.workspace.classProfile.classType
        : SUBJECT_CLASS_TYPE);
    const itemSignature = signature(item);

    if (
      existing.workspace?.schoolAssignment?.signature === itemSignature
      && existing.workspace?.classProfile?.classType === classType
      && existing.workspace?.status !== 'archived'
    ) {
      synced.push(workspaceId);
      if (item.assignmentType === 'homeroom') preferredWorkspaceId = workspaceId;
      continue;
    }

    const base = existing.workspace || normalizeHomeroomWorkspace({
      ...makeDefaultHomeroomWorkspace(user),
      id: workspaceId,
      classProfile: {
        ...makeDefaultHomeroomWorkspace(user).classProfile,
        className: item.className,
        grade: item.grade,
        schoolYear: item.schoolYear,
      },
    }, user);
    const importedAt = item.registryUpdatedAt || new Date().toISOString();
    const reconciled = item.students.length
      ? reconcileWorkspaceRoster(base, item.className, item.students, importedAt)
      : base;
    const next = normalizeHomeroomWorkspace({
      ...reconciled,
      id: workspaceId,
      status: 'active',
      archivedAt: '',
      semester: item.semester,
      classProfile: {
        ...(reconciled.classProfile || {}),
        classType,
        className: item.className,
        grade: item.grade,
        schoolYear: item.schoolYear,
        room: item.room || reconciled.classProfile?.room || '',
        adviserName: text(user?.name || user?.email),
        adviserEmail: text(user?.email),
        studentCountTarget: item.activeStudentCount || item.expectedCount,
      },
      schoolAssignment: {
        source: 'school-class-registry',
        registryOwnerId: item.registryOwnerId,
        assignmentType: item.assignmentType,
        signature: itemSignature,
        syncedAt: new Date().toISOString(),
      },
      updatedAt: importedAt,
    }, user);

    if (item.assignmentType === 'homeroom') {
      await demoteOtherHomeroomWorkspace(user, catalog, workspaceId);
      preferredWorkspaceId = workspaceId;
    }
    const saved = await saveHomeroomWorkspace(next, user);
    if (saved.ok) changed += 1;
    synced.push(workspaceId);
  }

  if (!preferredWorkspaceId) preferredWorkspaceId = synced[0] || '';
  const currentId = getCurrentHomeroomWorkspaceId(user);
  const currentExists = catalog.some((item) => item.id === currentId && item.status !== 'archived');
  if ((!currentExists || currentId === 'default') && preferredWorkspaceId) {
    setCurrentHomeroomWorkspaceId(user, preferredWorkspaceId);
  }

  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-school-class-assignment-synced', {
      detail: { changed, preferredWorkspaceId, classIds: synced },
    }));
    window.dispatchEvent(new CustomEvent('bes-homeroom-store-updated'));
  }
  return { ok: true, changed, preferredWorkspaceId, items: assignmentResult.items };
}

export function syncAssignedSchoolClassWorkspaces(user) {
  const key = userKey(user);
  if (syncPromises.has(key)) return syncPromises.get(key);
  const task = syncAssignedSchoolClassWorkspacesInternal(user)
    .catch((error) => ({ ok: false, changed: 0, items: [], message: error?.message || String(error) }))
    .finally(() => syncPromises.delete(key));
  syncPromises.set(key, task);
  return task;
}

export async function prepareAssignedSchoolClasses() {
  const user = await getCurrentUser();
  if (!user?.id || user.approved === false) return { ok: true, changed: 0, items: [] };
  return syncAssignedSchoolClassWorkspaces(user);
}

function scheduleRetry(delay = RETRY_DELAY_MS) {
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    prepareAssignedSchoolClasses().catch(() => {});
  }, delay);
}

export function installAssignedSchoolClassSync() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener(AUTH_EVENT, () => scheduleRetry(250));
  window.addEventListener('hashchange', () => {
    if (/homeroom|chu-nhiem|gvcn/i.test(window.location.hash)) scheduleRetry(120);
  });
  window.addEventListener('bes-school-class-registry-updated', () => scheduleRetry(120));
  scheduleRetry();
}
