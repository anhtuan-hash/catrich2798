import { isSupabaseConfigured, supabase } from './supabase.js';

const ROSTER_TABLE = 'bes_class_rosters';
const LOCAL_PREFIX = 'bes-class-roster-v1';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function lower(value) {
  return text(value).toLocaleLowerCase('vi');
}

function userId(user) {
  return text(user?.id || user?.authId || user?.email, 'guest');
}

function rosterLocalKey(rosterKey) {
  return `${LOCAL_PREFIX}:${rosterKey}`;
}

function readJson(key, fallback = null) {
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

function personKey(student = {}) {
  const code = lower(student.code);
  if (code) return `code:${code}`;
  const name = lower(student.fullName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const birthDate = text(student.birthDate);
  const gender = lower(student.gender);
  return `person:${name}|${birthDate}|${gender}`;
}

export function makeGradebookRosterIdentity(user, workspace) {
  const profile = workspace?.classProfile || {};
  const departmentId = text(profile.assignmentDepartmentId);
  const className = text(profile.className, 'Lớp bộ môn');
  const schoolYear = text(profile.schoolYear, 'unknown-year');
  const grade = text(profile.grade);
  const scope = departmentId
    ? `department:${lower(departmentId)}`
    : `owner:${lower(userId(user))}`;
  return {
    rosterKey: `${scope}||${lower(schoolYear)}||${lower(className)}`,
    departmentId,
    className,
    schoolYear,
    grade,
    scope: departmentId ? 'department' : 'owner',
  };
}

export function projectSharedRosterStudents(students = []) {
  const seen = new Set();
  return (Array.isArray(students) ? students : []).map((student) => {
    const key = personKey(student);
    const suffix = seen.has(key) ? `:${text(student.id, String(seen.size + 1))}` : '';
    seen.add(key);
    return {
      rosterStudentId: text(student.rosterStudentId || student.id, `${key}${suffix}`),
      rosterPersonKey: `${key}${suffix}`,
      code: text(student.code),
      fullName: text(student.fullName),
      birthDate: text(student.birthDate),
      gender: text(student.gender),
      active: student.active !== false,
      archivedAt: student.archivedAt || '',
      archivedReason: text(student.archivedReason),
    };
  }).filter((student) => student.fullName || student.code);
}

function findLocalStudent(shared, localStudents, usedIds) {
  const sharedCode = lower(shared.code);
  if (sharedCode) {
    const byCode = localStudents.find((item) => !usedIds.has(item.id) && lower(item.code) === sharedCode);
    if (byCode) return byCode;
  }
  const sharedPerson = personKey(shared);
  return localStudents.find((item) => !usedIds.has(item.id) && personKey(item) === sharedPerson) || null;
}

export function mergeSharedRosterIntoWorkspace(workspace, rosterStudents = []) {
  if (!workspace || !Array.isArray(rosterStudents) || !rosterStudents.length) return workspace;
  const localStudents = Array.isArray(workspace.students) ? workspace.students : [];
  const usedIds = new Set();
  const merged = rosterStudents.map((shared) => {
    const local = findLocalStudent(shared, localStudents, usedIds);
    if (local?.id) usedIds.add(local.id);
    return {
      ...(local || {}),
      id: local?.id || text(shared.rosterStudentId, shared.rosterPersonKey),
      rosterStudentId: text(shared.rosterStudentId),
      rosterPersonKey: text(shared.rosterPersonKey, personKey(shared)),
      code: text(shared.code),
      fullName: text(shared.fullName),
      birthDate: text(shared.birthDate),
      gender: text(shared.gender),
      active: shared.active !== false,
      archivedAt: shared.archivedAt || '',
      archivedReason: text(shared.archivedReason),
      // Subject-specific notes intentionally remain local to each teacher's gradebook.
      notes: text(local?.notes),
    };
  });

  // Never discard an unmatched legacy student: their local id may still own grade data.
  // They are retained and will join the shared roster on the next roster save.
  localStudents.forEach((local) => {
    if (!local?.id || usedIds.has(local.id)) return;
    merged.push(local);
  });

  return { ...workspace, students: merged };
}

function saveLocalRoster(user, workspace, students, metadata = {}) {
  const identity = makeGradebookRosterIdentity(user, workspace);
  const row = {
    ...identity,
    students: projectSharedRosterStudents(students),
    updatedAt: new Date().toISOString(),
    ...metadata,
  };
  writeJson(rosterLocalKey(identity.rosterKey), row);
  return row;
}

function loadLocalRoster(user, workspace) {
  const identity = makeGradebookRosterIdentity(user, workspace);
  return readJson(rosterLocalKey(identity.rosterKey), null);
}

function isMissingRosterTable(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || (message.includes(ROSTER_TABLE) && (
      message.includes('does not exist')
      || message.includes('schema cache')
      || message.includes('could not find')
    ));
}

export async function loadSharedGradebookRoster(user, workspace) {
  if (!workspace) return { ok: true, roster: null, source: 'no-workspace' };
  const identity = makeGradebookRosterIdentity(user, workspace);
  const local = loadLocalRoster(user, workspace);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, roster: local, source: local ? 'roster-local' : 'no-cloud' };
  }

  const { data, error } = await supabase
    .from(ROSTER_TABLE)
    .select('roster_key,department_id,class_name,school_year,grade,students,created_by,updated_by,updated_at')
    .eq('roster_key', identity.rosterKey)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      roster: local,
      source: isMissingRosterTable(error) ? 'roster-table-pending' : 'roster-cloud-error',
      message: error.message || 'Không thể tải danh sách lớp dùng chung.',
      missingTable: isMissingRosterTable(error),
      optional: true,
    };
  }

  if (!data) return { ok: true, roster: local, source: local ? 'roster-local' : 'roster-cloud-empty' };
  const roster = saveLocalRoster(user, workspace, data.students || [], {
    createdBy: data.created_by || '',
    updatedBy: data.updated_by || '',
    updatedAt: data.updated_at || new Date().toISOString(),
    source: 'roster-cloud',
  });
  return { ok: true, roster, source: 'roster-cloud' };
}

export async function saveSharedGradebookRoster(user, workspace) {
  if (!workspace) return { ok: false, message: 'Không có lớp để lưu danh sách.' };
  const identity = makeGradebookRosterIdentity(user, workspace);
  const local = saveLocalRoster(user, workspace, workspace.students || []);
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, roster: local, source: 'roster-local' };
  }

  const selectResult = await supabase
    .from(ROSTER_TABLE)
    .select('roster_key,created_by')
    .eq('roster_key', identity.rosterKey)
    .maybeSingle();

  if (selectResult.error) {
    const missingTable = isMissingRosterTable(selectResult.error);
    return {
      ok: false,
      roster: local,
      source: missingTable ? 'roster-table-pending' : 'roster-cloud-error',
      message: selectResult.error.message || 'Không thể kiểm tra danh sách lớp dùng chung.',
      missingTable,
      optional: true,
    };
  }

  const now = new Date().toISOString();
  let error = null;
  if (selectResult.data) {
    ({ error } = await supabase
      .from(ROSTER_TABLE)
      .update({
        department_id: identity.departmentId,
        class_name: identity.className,
        school_year: identity.schoolYear,
        grade: identity.grade,
        students: local.students,
        updated_by: user.id,
        updated_at: now,
      })
      .eq('roster_key', identity.rosterKey));
  } else {
    ({ error } = await supabase
      .from(ROSTER_TABLE)
      .insert({
        roster_key: identity.rosterKey,
        department_id: identity.departmentId,
        class_name: identity.className,
        school_year: identity.schoolYear,
        grade: identity.grade,
        students: local.students,
        created_by: user.id,
        updated_by: user.id,
        created_at: now,
        updated_at: now,
      }));
  }

  if (error) {
    return {
      ok: false,
      roster: local,
      source: isMissingRosterTable(error) ? 'roster-table-pending' : 'roster-cloud-error',
      message: error.message || 'Không thể đồng bộ danh sách lớp dùng chung.',
      missingTable: isMissingRosterTable(error),
      optional: true,
    };
  }

  return { ok: true, roster: { ...local, updatedAt: now }, source: 'roster-cloud' };
}

export async function hydrateGradebookWithSharedRoster(user, workspace) {
  if (!workspace) return { workspace, source: 'no-workspace', roster: null };
  const result = await loadSharedGradebookRoster(user, workspace);
  if (result.roster?.students?.length) {
    return {
      ...result,
      workspace: mergeSharedRosterIntoWorkspace(workspace, result.roster.students),
    };
  }

  if ((workspace.students || []).length) {
    const seed = await saveSharedGradebookRoster(user, workspace);
    return { ...seed, workspace, seeded: seed.ok };
  }

  return { ...result, workspace };
}
