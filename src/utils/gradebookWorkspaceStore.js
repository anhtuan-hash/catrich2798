import {
  listHomeroomWorkspaces,
  listLocalHomeroomWorkspaces,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
  makeDefaultHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './homeroomClassWorkspaceStore.js';
import { SUBJECT_CLASS_TYPE } from './homeroomClassTypes.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const GRADEBOOK_TABLE = 'bes_gradebook_workspaces';
const LOCAL_INDEX_PREFIX = 'bes-gradebook-index-v1';
const LOCAL_WORKSPACE_PREFIX = 'bes-gradebook-workspace-v1';
const STORAGE_VERSION = 1;

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function userKey(user) {
  return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function indexKey(user) {
  return `${LOCAL_INDEX_PREFIX}:${userKey(user)}`;
}

function workspaceKey(user, classId) {
  return `${LOCAL_WORKSPACE_PREFIX}:${userKey(user)}:${text(classId, 'default')}`;
}

function readJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function projectGradebookWorkspace(raw, user) {
  const normalized = normalizeHomeroomWorkspace(raw || makeDefaultHomeroomWorkspace(user), user);
  const now = new Date().toISOString();
  return {
    id: text(normalized.id, 'default'),
    status: text(normalized.status, 'active'),
    archivedAt: normalized.archivedAt || '',
    semester: text(normalized.semester, 'Học kỳ I'),
    classProfile: {
      ...(normalized.classProfile || {}),
      classType: text(normalized.classProfile?.classType, SUBJECT_CLASS_TYPE),
      className: text(normalized.classProfile?.className, 'Lớp bộ môn'),
      schoolYear: text(normalized.classProfile?.schoolYear),
      grade: text(normalized.classProfile?.grade),
      room: text(normalized.classProfile?.room),
      adviserName: text(normalized.classProfile?.adviserName),
      adviserEmail: text(normalized.classProfile?.adviserEmail),
    },
    students: Array.isArray(normalized.students) ? normalized.students : [],
    learningGradebook: normalized.learningGradebook && typeof normalized.learningGradebook === 'object'
      ? normalized.learningGradebook
      : {},
    learningRecords: Array.isArray(normalized.learningRecords) ? normalized.learningRecords : [],
    gradeSettings: normalized.gradeSettings && typeof normalized.gradeSettings === 'object'
      ? normalized.gradeSettings
      : {},
    academicTerms: normalized.academicTerms ?? [],
    createdAt: normalized.createdAt || now,
    updatedAt: normalized.updatedAt || now,
    gradebookStorageVersion: STORAGE_VERSION,
  };
}

function normalizeGradebookWorkspace(raw, user) {
  const projected = projectGradebookWorkspace(raw, user);
  const normalized = normalizeHomeroomWorkspace(projected, user);
  return {
    ...normalized,
    id: projected.id,
    status: projected.status,
    archivedAt: projected.archivedAt,
    semester: projected.semester,
    classProfile: { ...normalized.classProfile, ...projected.classProfile },
    students: projected.students,
    learningGradebook: projected.learningGradebook,
    learningRecords: projected.learningRecords,
    gradeSettings: projected.gradeSettings,
    academicTerms: projected.academicTerms,
    createdAt: projected.createdAt,
    updatedAt: projected.updatedAt,
    gradebookStorageVersion: STORAGE_VERSION,
  };
}

function metadataFromWorkspace(raw, user) {
  const workspace = projectGradebookWorkspace(raw, user);
  return {
    id: workspace.id,
    className: workspace.classProfile.className,
    schoolYear: workspace.classProfile.schoolYear,
    grade: workspace.classProfile.grade,
    semester: workspace.semester,
    classType: workspace.classProfile.classType,
    status: workspace.status,
    archivedAt: workspace.archivedAt,
    studentCount: workspace.students.filter((student) => student?.active !== false).length,
    updatedAt: workspace.updatedAt,
    source: 'gradebook-local',
  };
}

function metadataFromRow(row) {
  return {
    id: row.workspace_id,
    className: row.class_name || 'Lớp bộ môn',
    schoolYear: row.school_year || '',
    grade: row.grade || '',
    semester: row.semester || 'Học kỳ I',
    classType: row.class_type || SUBJECT_CLASS_TYPE,
    status: row.status || 'active',
    archivedAt: row.archived_at || '',
    studentCount: Number(row.student_count) || 0,
    updatedAt: row.updated_at || '',
    migratedFromHomeroom: row.migrated_from_homeroom === true,
    source: 'gradebook-cloud',
  };
}

function sortCatalog(items) {
  return [...items].sort((a, b) => (
    (a.status === 'archived') - (b.status === 'archived')
    || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    || String(a.className || '').localeCompare(String(b.className || ''), 'vi')
  ));
}

function mergeCatalog(preferred = [], fallback = []) {
  const merged = new Map();
  fallback.forEach((item) => { if (item?.id) merged.set(item.id, item); });
  preferred.forEach((item) => { if (item?.id) merged.set(item.id, item); });
  return sortCatalog([...merged.values()]);
}

function readLocalIndex(user) {
  const rows = readJson(indexKey(user), []);
  return Array.isArray(rows) ? rows.filter((item) => item?.id) : [];
}

function writeLocalIndex(user, item) {
  const current = readLocalIndex(user).filter((entry) => entry.id !== item.id);
  writeJson(indexKey(user), sortCatalog([item, ...current]));
}

function isMissingGradebookTable(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || (message.includes(GRADEBOOK_TABLE)
      && (message.includes('does not exist')
        || message.includes('schema cache')
        || message.includes('could not find')));
}

async function upsertGradebookCloud(workspace, user, { migratedFromHomeroom = false } = {}) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, workspace: normalizeGradebookWorkspace(workspace, user) };
  }
  const payload = projectGradebookWorkspace(workspace, user);
  const row = {
    owner_id: user.id,
    owner_email: text(user.email),
    workspace_id: payload.id,
    class_name: payload.classProfile.className,
    school_year: payload.classProfile.schoolYear,
    grade: payload.classProfile.grade,
    semester: payload.semester,
    class_type: payload.classProfile.classType || SUBJECT_CLASS_TYPE,
    status: payload.status,
    archived_at: payload.archivedAt || null,
    student_count: payload.students.filter((student) => student?.active !== false).length,
    payload,
    migrated_from_homeroom: migratedFromHomeroom,
    updated_at: payload.updatedAt || new Date().toISOString(),
  };
  const { error } = await supabase
    .from(GRADEBOOK_TABLE)
    .upsert(row, { onConflict: 'owner_id,workspace_id' });
  if (error) return { ok: false, error, missingTable: isMissingGradebookTable(error) };
  return { ok: true, workspace: normalizeGradebookWorkspace(payload, user), source: 'gradebook-cloud' };
}

async function saveLegacyCompatibility(workspace, user) {
  const projected = projectGradebookWorkspace(workspace, user);
  let base = null;
  try {
    const loaded = await loadHomeroomWorkspace(user, projected.id);
    base = loaded?.workspace || null;
  } catch {
    base = null;
  }
  if (!base || base.id !== projected.id) {
    base = { ...makeDefaultHomeroomWorkspace(user), id: projected.id };
  }
  const merged = {
    ...base,
    id: projected.id,
    status: projected.status,
    archivedAt: projected.archivedAt,
    semester: projected.semester,
    classProfile: { ...(base.classProfile || {}), ...projected.classProfile },
    students: projected.students,
    learningGradebook: projected.learningGradebook,
    learningRecords: projected.learningRecords,
    gradeSettings: projected.gradeSettings,
    academicTerms: projected.academicTerms,
    createdAt: base.createdAt || projected.createdAt,
    updatedAt: projected.updatedAt,
  };
  return saveHomeroomWorkspace(merged, user);
}

export function listLocalGradebookClasses(user) {
  const dedicated = readLocalIndex(user);
  const legacy = listLocalHomeroomWorkspaces(user);
  return mergeCatalog(dedicated, legacy);
}

export async function listGradebookClasses(user) {
  const local = listLocalGradebookClasses(user);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: local, source: 'gradebook-local' };
  }

  const { data, error } = await supabase
    .from(GRADEBOOK_TABLE)
    .select('workspace_id,class_name,school_year,grade,semester,class_type,status,archived_at,student_count,migrated_from_homeroom,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error && isMissingGradebookTable(error)) {
    const legacy = await listHomeroomWorkspaces(user);
    return { ...legacy, items: mergeCatalog(local, legacy.items || []), source: 'legacy-cloud-compat' };
  }

  if (error) {
    try {
      const legacy = await listHomeroomWorkspaces(user);
      return { ok: false, offline: true, message: error.message, items: mergeCatalog(local, legacy.items || []) };
    } catch {
      return { ok: false, offline: true, message: error.message, items: local };
    }
  }

  let legacyItems = [];
  try {
    const legacy = await listHomeroomWorkspaces(user);
    legacyItems = legacy.items || [];
  } catch {
    legacyItems = [];
  }
  const cloud = (data || []).map(metadataFromRow);
  return { ok: true, items: mergeCatalog(cloud, mergeCatalog(local, legacyItems)), source: 'gradebook-cloud' };
}

export function loadLocalGradebookClass(user, classId) {
  const dedicated = readJson(workspaceKey(user, classId), null);
  if (dedicated) return normalizeGradebookWorkspace(dedicated, user);
  const legacy = loadLocalHomeroomWorkspace(user, classId);
  if (!legacy) return null;
  return saveLocalGradebookClass(legacy, user);
}

export async function loadGradebookClass(user, classId) {
  const local = loadLocalGradebookClass(user, classId);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, workspace: local, source: 'gradebook-local' };
  }

  const { data, error } = await supabase
    .from(GRADEBOOK_TABLE)
    .select('payload,migrated_from_homeroom,updated_at')
    .eq('owner_id', user.id)
    .eq('workspace_id', classId)
    .maybeSingle();

  if (!error && data?.payload) {
    const workspace = saveLocalGradebookClass(data.payload, user);
    return { ok: true, workspace, source: 'gradebook-cloud' };
  }

  const tableMissing = Boolean(error && isMissingGradebookTable(error));
  try {
    const legacy = await loadHomeroomWorkspace(user, classId);
    if (legacy?.workspace) {
      const workspace = saveLocalGradebookClass(legacy.workspace, user);
      if (!tableMissing) {
        const migrationResult = await upsertGradebookCloud(workspace, user, { migratedFromHomeroom: true });
        if (migrationResult.ok) return { ok: true, workspace, source: 'gradebook-cloud-migrated' };
      }
      return { ...legacy, workspace, source: tableMissing ? 'legacy-cloud-compat' : 'legacy-migrated-local' };
    }
  } catch {
    // Dedicated local state remains the final fallback below.
  }

  if (local) {
    return { ok: !error, offline: true, message: error?.message || '', workspace: local, source: 'gradebook-local' };
  }
  return { ok: false, offline: true, message: error?.message || 'Không tìm thấy lớp.', workspace: null };
}

export function saveLocalGradebookClass(workspace, user) {
  const projected = projectGradebookWorkspace(workspace, user);
  writeJson(workspaceKey(user, projected.id), projected);
  writeLocalIndex(user, metadataFromWorkspace(projected, user));
  return normalizeGradebookWorkspace(projected, user);
}

export async function saveGradebookClass(workspace, user) {
  const local = saveLocalGradebookClass({
    ...workspace,
    updatedAt: new Date().toISOString(),
  }, user);
  const cloud = await upsertGradebookCloud(local, user);
  if (cloud.ok) return { ...cloud, workspace: local };

  if (cloud.missingTable) {
    const legacy = await saveLegacyCompatibility(local, user);
    return {
      ...legacy,
      workspace: local,
      source: legacy.ok ? 'legacy-cloud-compat' : 'gradebook-local',
      gradebookTablePending: true,
    };
  }

  return {
    ok: false,
    offline: true,
    message: cloud.error?.message || 'Không thể đồng bộ Sổ điểm.',
    workspace: local,
    source: 'gradebook-local',
  };
}

export async function createGradebookClass(user, input = {}) {
  const now = new Date().toISOString();
  const id = text(input.id, `gradebook-${Date.now()}`);
  const base = makeDefaultHomeroomWorkspace(user);
  const workspace = normalizeGradebookWorkspace({
    ...base,
    id,
    status: 'active',
    archivedAt: '',
    semester: text(input.semester, 'Học kỳ I'),
    classProfile: {
      ...(base.classProfile || {}),
      ...(input.classProfile || {}),
      classType: SUBJECT_CLASS_TYPE,
      className: text(input.classProfile?.className, 'Lớp bộ môn'),
      schoolYear: text(input.classProfile?.schoolYear),
    },
    students: [],
    learningGradebook: {},
    learningRecords: [],
    gradeSettings: {},
    academicTerms: [],
    createdAt: now,
    updatedAt: now,
  }, user);
  const local = saveLocalGradebookClass(workspace, user);
  const result = await saveGradebookClass(local, user);
  return { ...result, workspace: result.workspace || local };
}
