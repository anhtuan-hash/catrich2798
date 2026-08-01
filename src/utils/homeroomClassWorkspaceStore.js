import {
  createHomeroomWorkspace as createBaseWorkspace,
  duplicateHomeroomWorkspace as duplicateBaseWorkspace,
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces as listBaseWorkspaces,
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
import {
  HOMEROOM_CLASS_TYPE,
  SUBJECT_CLASS_TYPE,
  isValidHomeroomClassType,
  normalizeHomeroomClassType,
  reconcileHomeroomClassCatalog,
} from './homeroomClassTypes.js';

const CLASS_TYPE_STORE_PREFIX = 'bes-homeroom-class-types-v1';

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
  const result = await listBaseWorkspaces(user);
  const items = result.items || [];
  const stored = readClassTypes(user);
  const originalCurrentId = getCurrentHomeroomWorkspaceId(user);
  const workspaces = new Map();

  await Promise.all(items.map(async (item) => {
    const local = loadBaseLocalWorkspace(user, item.id);
    if (local && (explicitClassType(local) || isValidHomeroomClassType(stored[item.id]))) {
      workspaces.set(item.id, local);
      return;
    }
    const loaded = await loadBaseWorkspace(user, item.id);
    if (loaded.workspace) workspaces.set(item.id, loaded.workspace);
  }));
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
