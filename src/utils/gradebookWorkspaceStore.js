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
    migrationState: 'migrated',
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
    migrationState: 'migrated',
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

function markMigrationState(items = [], migrationState = 'pending', source = 'homeroom-legacy') {
  return (items || []).map((item) => ({
    ...item,
    migrationState,
    source: item?.source && String(item.source).startsWith('gradebook-') ? item.source : source,
  }));
}

export function summarizeGradebookMigration(items = []) {
  const summary = { total: 0, migrated: 0, pending: 0, compatibility: 0, complete: false };
  (items || []).forEach((item) => {
    if (!item?.id) return;
    summary.total += 1;
    const state = item.migrationState === 'compatibility'
      ? 'compatibility'
      : item.migrationState === 'migrated'
        ? 'migrated'
        : 'pending';
    summary[state] += 1;
  });
  summary.complete = summary.pending === 0 && summary.compatibility === 0;
  return summary;
}

function catalogResult(items, extra = {}) {
  return { ...extra, items, migration: summarizeGradebookMigration(items) };
}

function readLocalIndex(user) {
  const rows = readJson(indexKey(user), []);
  return Array.isArray(rows) ? rows.filter((item) => item?.id) : [];
}

function writeLocalIndex(user, item) {
  const current = readLocalIndex(user).filter((entry) => entry.id !== item.id);
  writeJson(indexKey(user), sortCatalog([item, ...current]));
}

function readDedicatedLocalGradebookClass(user, classId) {
  const dedicated = readJson(workspaceKey(user, classId), null);
  return dedicated ? normalizeGradebookWorkspace(dedicated, user) : null;
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
  const dedicated = markMigrationState(readLocalIndex(user), 'migrated', 'gradebook-local');
  const legacy = markMigrationState(listLocalHomeroomWorkspaces(user), 'pending');
  return mergeCatalog(dedicated, legacy);
}

export async function listGradebookClasses(user) {
  const local = listLocalGradebookClasses(user);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return catalogResult(local, { ok: true, offline: true, source: 'gradebook-local' });
  }

  const { data, error } = await supabase
    .from(GRADEBOOK_TABLE)
    .select('workspace_id,class_name,school_year,grade,semester,class_type,status,archived_at,student_count,migrated_from_homeroom,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error && isMissingGradebookTable(error)) {
    const legacy = await listHomeroomWorkspaces(user);
    const compatibility = markMigrationState(legacy.items || [], 'compatibility', 'legacy-cloud-compat');
    return catalogResult(mergeCatalog(local, compatibility), {
      ...legacy,
      source: 'legacy-cloud-compat',
      gradebookTablePending: true,
    });
  }

  if (error) {
    try {
      const legacy = await listHomeroomWorkspaces(user);
      const pending = markMigrationState(legacy.items || [], 'pending');
      return catalogResult(mergeCatalog(local, pending), {
        ok: false,
        offline: true,
        message: error.message,
        source: 'gradebook-local',
      });
    } catch {
      return catalogResult(local, {
        ok: false,
        offline: true,
        message: error.message,
        source: 'gradebook-local',
      });
    }
  }

  let legacyItems = [];
  try {
    const legacy = await listHomeroomWorkspaces(user);
    legacyItems = markMigrationState(legacy.items || [], 'pending');
  } catch {
    legacyItems = [];
  }
  const cloud = markMigrationState((data || []).map(metadataFromRow), 'migrated', 'gradebook-cloud');
  const items = mergeCatalog(cloud, mergeCatalog(local, legacyItems));
  return catalogResult(items, { ok: true, source: 'gradebook-cloud' });
}

export function loadLocalGradebookClass(user, classId) {
  const dedicated = readDedicatedLocalGradebookClass(user, classId);
  if (dedicated) return dedicated;
  const legacy = loadLocalHomeroomWorkspace(user, classId);
  if (!legacy) return null;
  return saveLocalGradebookClass(legacy, user);
}

export async function loadGradebookClass(user, classId) {
  const local = readDedicatedLocalGradebookClass(user, classId);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    if (local) {
      return { ok: true, offline: true, workspace: local, source: 'gradebook-local', migrationState: 'migrated' };
    }
    const legacyLocal = loadLocalHomeroomWorkspace(user, classId);
    if (!legacyLocal) return { ok: false, offline: true, message: 'Không tìm thấy lớp.', workspace: null };
    const workspace = saveLocalGradebookClass(legacyLocal, user);
    return { ok: true, offline: true, workspace, source: 'gradebook-local-migrated', migrationState: 'pending' };
  }

  const { data, error } = await supabase
    .from(GRADEBOOK_TABLE)
    .select('payload,migrated_from_homeroom,updated_at')
    .eq('owner_id', user.id)
    .eq('workspace_id', classId)
    .maybeSingle();

  if (!error && data?.payload) {
    const workspace = saveLocalGradebookClass(data.payload, user);
    return { ok: true, workspace, source: 'gradebook-cloud', migrationState: 'migrated' };
  }

  const tableMissing = Boolean(error && isMissingGradebookTable(error));
  if (local) {
    if (tableMissing) {
      return {
        ok: true,
        offline: true,
        workspace: local,
        source: 'gradebook-local',
        migrationState: 'compatibility',
        gradebookTablePending: true,
      };
    }
    if (error) {
      return {
        ok: false,
        offline: true,
        message: error.message || '',
        workspace: local,
        source: 'gradebook-local',
        migrationState: 'migrated',
      };
    }
    const restored = await upsertGradebookCloud(local, user);
    return restored.ok
      ? { ok: true, workspace: local, source: 'gradebook-cloud-restored', migrationState: 'migrated' }
      : {
          ok: false,
          offline: true,
          message: restored.error?.message || 'Không thể đồng bộ Sổ điểm.',
          workspace: local,
          source: 'gradebook-local',
          migrationState: 'migrated',
        };
  }

  try {
    const legacy = await loadHomeroomWorkspace(user, classId);
    if (legacy?.workspace) {
      const workspace = saveLocalGradebookClass(legacy.workspace, user);
      if (!tableMissing) {
        const migrationResult = await upsertGradebookCloud(workspace, user, { migratedFromHomeroom: true });
        if (migrationResult.ok) {
          return { ok: true, workspace, source: 'gradebook-cloud-migrated', migrationState: 'migrated' };
        }
      }
      return {
        ...legacy,
        workspace,
        source: tableMissing ? 'legacy-cloud-compat' : 'legacy-migrated-local',
        migrationState: tableMissing ? 'compatibility' : 'pending',
      };
    }
  } catch {
    // No dedicated state exists; legacy remains the final migration source.
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
  if (cloud.ok) return { ...cloud, workspace: local, migrationState: 'migrated' };

  if (cloud.missingTable) {
    const legacy = await saveLegacyCompatibility(local, user);
    return {
      ...legacy,
      workspace: local,
      source: legacy.ok ? 'legacy-cloud-compat' : 'gradebook-local',
      migrationState: 'compatibility',
      gradebookTablePending: true,
    };
  }

  return {
    ok: false,
    offline: true,
    message: cloud.error?.message || 'Không thể đồng bộ Sổ điểm.',
    workspace: local,
    source: 'gradebook-local',
    migrationState: 'migrated',
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
