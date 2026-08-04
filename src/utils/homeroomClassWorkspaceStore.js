import {
  createHomeroomWorkspace as createBaseWorkspace,
  duplicateHomeroomWorkspace as duplicateBaseWorkspace,
  getCurrentHomeroomWorkspaceId,
  listLocalHomeroomWorkspaces as listBaseLocalWorkspaces,
  loadHomeroomWorkspace as loadBaseWorkspace,
  loadLocalHomeroomWorkspace as loadBaseLocalWorkspace,
  makeDefaultHomeroomWorkspace as makeBaseDefaultWorkspace,
  normalizeHomeroomWorkspace as normalizeBaseWorkspace,
  saveHomeroomWorkspace as saveBaseWorkspace,
  saveLocalHomeroomWorkspace as saveBaseLocalWorkspace,
  setCurrentHomeroomWorkspaceId,
  setHomeroomWorkspaceStatus as setBaseWorkspaceStatus,
} from './homeroomStore.js';
import { isSupabaseConfigured, supabase } from './supabase.js';
import {
  HOMEROOM_CLASS_TYPE,
  SUBJECT_CLASS_TYPE,
  isValidHomeroomClassType,
  normalizeHomeroomClassType,
  reconcileHomeroomClassCatalog,
} from './homeroomClassTypes.js';

const CLASS_TYPE_STORE_PREFIX = 'bes-homeroom-class-types-v1';
const WORKSPACE_TABLE = 'bes_homeroom_workspaces';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function userKey(user) {
  return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function classTypeStoreKey(user) {
  return `${CLASS_TYPE_STORE_PREFIX}:${userKey(user)}`;
}

function readClassTypes(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(classTypeStoreKey(user)) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeClassTypes(user, classTypes) {
  try { localStorage.setItem(classTypeStoreKey(user), JSON.stringify(classTypes)); } catch { /* local cache is optional */ }
}


function inferGrade(className, fallback = '') {
  const match = text(className).match(/^(10|11|12)(?:\.|$)/);
  return match?.[1] || fallback;
}

async function listWorkspaceMetadata(user) {
  const localItems = listBaseLocalWorkspaces(user);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: localItems };
  }

  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select('workspace_id,class_name,school_year,status,semester,archived_at,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return { ok: false, offline: true, message: error.message, items: localItems };
  const merged = new Map(localItems.map((item) => [item.id, item]));
  (data || []).forEach((row) => {
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
  const items = [...merged.values()].sort((a, b) => (
    (a.status === 'archived') - (b.status === 'archived')
    || String(b.updatedAt).localeCompare(String(a.updatedAt))
  ));
  return { ok: true, items, source: 'cloud-meta' };
}

function fallbackClassType(workspaceId) {
  return workspaceId === 'default' ? HOMEROOM_CLASS_TYPE : SUBJECT_CLASS_TYPE;
}

function explicitClassType(workspace) {
  const value = workspace?.classProfile?.classType;
  return isValidHomeroomClassType(value) ? value : '';
}

function decorateWorkspace(workspace, user, preferExplicit = false) {
  const normalized = normalizeBaseWorkspace(workspace, user);
  const stored = readClassTypes(user)[normalized.id];
  const explicit = explicitClassType(normalized);
  const classType = normalizeHomeroomClassType(preferExplicit ? (explicit || stored) : (stored || explicit), fallbackClassType(normalized.id));
  return { ...normalized, classProfile: { ...normalized.classProfile, classType } };
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
  writeClassTypes(user, {
    ...stored,
    ...Object.fromEntries(catalog.map((item) => [item.id, item.classType])),
  });
  return catalog;
}

async function activeHomeroomConflict(user, targetId = '') {
  const result = await listHomeroomWorkspaces(user);
  return (result.items || []).find((item) => item.status !== 'archived' && item.id !== targetId && item.classType === HOMEROOM_CLASS_TYPE);
}

export function makeDefaultHomeroomWorkspace(user = null) {
  return decorateWorkspace(makeBaseDefaultWorkspace(user), user, true);
}

export function normalizeHomeroomWorkspace(raw, user = null) {
  return decorateWorkspace(raw, user, true);
}

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
    if (local) workspaces.set(item.id, local);
  });

  // A catalog view must not download every workspace payload. On a fresh device,
  // load at most the currently selected class so its explicit class type is known.
  if (!workspaces.has(originalCurrentId) && !isValidHomeroomClassType(stored[originalCurrentId])) {
    const currentItem = items.find((item) => item.id === originalCurrentId);
    if (currentItem) {
      const loaded = await loadBaseWorkspace(user, originalCurrentId);
      if (loaded.workspace) workspaces.set(originalCurrentId, loaded.workspace);
    }
  }
  setCurrentHomeroomWorkspaceId(user, originalCurrentId);

  return { ...result, items: resolveCatalog(items, user, workspaces) };
}

export function loadLocalHomeroomWorkspace(user, workspaceId = 'default') {
  const workspace = loadBaseLocalWorkspace(user, workspaceId);
  return workspace ? decorateWorkspace(workspace, user) : null;
}

export async function loadHomeroomWorkspace(user, workspaceId = 'default') {
  const result = await loadBaseWorkspace(user, workspaceId);
  return { ...result, workspace: decorateWorkspace(result.workspace, user) };
}

export function saveLocalHomeroomWorkspace(workspace, user) {
  const normalized = decorateWorkspace(workspace, user, true);
  const classTypes = readClassTypes(user);
  writeClassTypes(user, { ...classTypes, [normalized.id]: normalized.classProfile.classType });
  return decorateWorkspace(saveBaseLocalWorkspace(normalized, user), user);
}

export async function saveHomeroomWorkspace(workspace, user) {
  const normalized = decorateWorkspace(workspace, user, true);
  const classTypes = readClassTypes(user);
  writeClassTypes(user, { ...classTypes, [normalized.id]: normalized.classProfile.classType });
  const result = await saveBaseWorkspace(normalized, user);
  return { ...result, workspace: decorateWorkspace(result.workspace || normalized, user) };
}

export async function createHomeroomWorkspace(user, input = {}) {
  const classType = normalizeHomeroomClassType(input.classProfile?.classType, SUBJECT_CLASS_TYPE);
  if (classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, input.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  const result = await createBaseWorkspace(user, {
    ...input,
    classProfile: { ...(input.classProfile || {}), classType },
  });
  if (result.workspace) {
    const classTypes = readClassTypes(user);
    writeClassTypes(user, { ...classTypes, [result.workspace.id]: classType });
    result.workspace = decorateWorkspace(result.workspace, user);
  }
  return result;
}

export async function duplicateHomeroomWorkspace(source, user, input = {}) {
  const classType = normalizeHomeroomClassType(input.classType, SUBJECT_CLASS_TYPE);
  if (classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, input.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  const sourceForCopy = { ...source, classProfile: { ...source.classProfile, classType } };
  const result = await duplicateBaseWorkspace(sourceForCopy, user, input);
  if (result.workspace) {
    const classTypes = readClassTypes(user);
    writeClassTypes(user, { ...classTypes, [result.workspace.id]: classType });
    result.workspace = decorateWorkspace(result.workspace, user);
  }
  return result;
}

export async function setHomeroomWorkspaceStatus(workspace, user, status = 'archived') {
  const normalized = decorateWorkspace(workspace, user);
  if (status === 'active' && normalized.classProfile.classType === HOMEROOM_CLASS_TYPE) {
    const conflict = await activeHomeroomConflict(user, normalized.id);
    if (conflict) return { ok: false, code: 'active-homeroom-exists', message: `Đang có lớp chủ nhiệm ${conflict.className}.` };
  }
  const result = await setBaseWorkspaceStatus(normalized, user, status);
  return { ...result, workspace: decorateWorkspace(result.workspace || normalized, user) };
}

export { getCurrentHomeroomWorkspaceId, setCurrentHomeroomWorkspaceId };
