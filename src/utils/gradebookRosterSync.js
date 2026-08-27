import { subscribeTable } from '../services/runtime/core.js';
import { isSupabaseConfigured, supabase } from './supabase.js';
import {
  makeGradebookRosterIdentity,
  mergeSharedRosterIntoWorkspace,
  projectSharedRosterStudents,
  saveSharedGradebookRoster,
} from './gradebookRosterStore.js';

const ROSTER_TABLE = 'bes_class_rosters';
const LOCAL_PREFIX = 'bes-class-roster-v1';
const ROSTER_FIELDS = [
  'code',
  'fullName',
  'birthDate',
  'gender',
  'active',
  'archivedAt',
  'archivedReason',
];

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function lower(value) {
  return text(value).toLocaleLowerCase('vi');
}

function normalizeName(value) {
  return lower(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function personKey(student = {}) {
  const code = lower(student.code);
  if (code) return `code:${code}`;
  return `person:${normalizeName(student.fullName)}|${text(student.birthDate)}|${lower(student.gender)}`;
}

function studentKey(student = {}) {
  return text(student.rosterStudentId || student.rosterPersonKey, personKey(student));
}

function localRosterKey(identity) {
  return `${LOCAL_PREFIX}:${identity.rosterKey}`;
}

function readCachedRoster(identity) {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(localRosterKey(identity)) || 'null');
  } catch {
    return null;
  }
}

function writeCachedRoster(identity, row = {}) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(localRosterKey(identity), JSON.stringify({
      ...identity,
      students: projectSharedRosterStudents(row.students || []),
      createdBy: row.created_by || row.createdBy || '',
      updatedBy: row.updated_by || row.updatedBy || '',
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      source: row.source || 'roster-cloud',
    }));
  } catch {
    // Roster cache is optional; cloud remains authoritative.
  }
}

function comparable(value) {
  if (typeof value === 'boolean') return value;
  return text(value);
}

function sameValue(a, b) {
  return comparable(a) === comparable(b);
}

function mapStudents(students = []) {
  const map = new Map();
  projectSharedRosterStudents(students).forEach((student) => {
    map.set(studentKey(student), student);
  });
  return map;
}

function mergeStudent(base, local, remote, key) {
  const fallback = remote || local || base || {};
  const merged = {
    ...fallback,
    rosterStudentId: text(
      remote?.rosterStudentId || local?.rosterStudentId || base?.rosterStudentId,
      key,
    ),
  };
  const conflicts = [];

  ROSTER_FIELDS.forEach((field) => {
    const baseValue = base?.[field];
    const localValue = local?.[field];
    const remoteValue = remote?.[field];
    const localChanged = local ? !sameValue(localValue, baseValue) : false;
    const remoteChanged = remote ? !sameValue(remoteValue, baseValue) : false;

    if (localChanged && remoteChanged && !sameValue(localValue, remoteValue)) {
      // Cloud wins only for the exact field edited differently by two teachers.
      // This prevents a stale tab from silently overwriting another teacher's edit.
      merged[field] = remoteValue;
      conflicts.push({ studentKey: key, field, localValue, remoteValue });
      return;
    }
    if (localChanged) {
      merged[field] = localValue;
      return;
    }
    if (remote) merged[field] = remoteValue;
    else if (local) merged[field] = localValue;
  });

  return { student: merged, conflicts };
}

function dedupeStudents(students = []) {
  const ids = new Set();
  const people = new Set();
  const result = [];
  students.forEach((student) => {
    const id = text(student.rosterStudentId);
    const person = personKey(student);
    if ((id && ids.has(id)) || (person && people.has(person))) return;
    if (id) ids.add(id);
    if (person) people.add(person);
    result.push(student);
  });
  return result;
}

export function mergeSharedRosterThreeWay(baseStudents = [], localStudents = [], remoteStudents = []) {
  const baseMap = mapStudents(baseStudents);
  const localMap = mapStudents(localStudents);
  const remoteMap = mapStudents(remoteStudents);
  const orderedKeys = [];
  const seen = new Set();

  [remoteMap, localMap, baseMap].forEach((map) => {
    map.forEach((_, key) => {
      if (seen.has(key)) return;
      seen.add(key);
      orderedKeys.push(key);
    });
  });

  const conflicts = [];
  const students = [];
  orderedKeys.forEach((key) => {
    const base = baseMap.get(key) || null;
    let local = localMap.get(key) || null;
    let remote = remoteMap.get(key) || null;

    // Brian never hard-deletes a roster student. Missing entries from a stale client
    // are interpreted as unchanged instead of as deletion, preventing accidental loss.
    if (base && !local) local = base;
    if (base && !remote) remote = base;

    if (!base) {
      students.push(remote || local);
      return;
    }

    const merged = mergeStudent(base, local, remote, key);
    students.push(merged.student);
    conflicts.push(...merged.conflicts);
  });

  return {
    students: dedupeStudents(students.filter(Boolean)),
    conflicts,
    conflictCount: conflicts.length,
  };
}

function rowToRoster(identity, row) {
  if (!row) return null;
  return {
    ...identity,
    students: projectSharedRosterStudents(row.students || []),
    createdBy: row.created_by || '',
    updatedBy: row.updated_by || '',
    updatedAt: row.updated_at || '',
    source: 'roster-cloud',
  };
}

async function fetchRemoteRoster(identity) {
  const { data, error } = await supabase
    .from(ROSTER_TABLE)
    .select('roster_key,department_id,class_name,school_year,grade,students,created_by,updated_by,updated_at')
    .eq('roster_key', identity.rosterKey)
    .maybeSingle();
  return { data, error };
}

function cloudError(error, fallback = 'Không thể đồng bộ danh sách lớp dùng chung.') {
  return {
    ok: false,
    source: 'roster-cloud-error',
    message: error?.message || fallback,
    error,
    optional: true,
  };
}

export async function saveSharedGradebookRosterSafely(user, workspace) {
  if (!workspace) return { ok: false, source: 'no-workspace', message: 'Không có lớp để lưu danh sách.' };
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return saveSharedGradebookRoster(user, workspace);
  }

  const identity = makeGradebookRosterIdentity(user, workspace);
  const baseSnapshot = readCachedRoster(identity);
  let remoteResult = await fetchRemoteRoster(identity);
  if (remoteResult.error) return cloudError(remoteResult.error);
  if (!remoteResult.data) return saveSharedGradebookRoster(user, workspace);

  let remoteRow = remoteResult.data;
  let baseStudents = Array.isArray(baseSnapshot?.students)
    ? baseSnapshot.students
    : remoteRow.students || [];
  let desiredStudents = projectSharedRosterStudents(workspace.students || []);
  let conflictDetails = [];

  // Two CAS attempts are enough to absorb the normal case where another teacher
  // saves during this request. A third concurrent write returns a safe retry state.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const merged = mergeSharedRosterThreeWay(baseStudents, desiredStudents, remoteRow.students || []);
    conflictDetails = [...conflictDetails, ...merged.conflicts];

    const mergedWorkspace = mergeSharedRosterIntoWorkspace(workspace, merged.students);
    desiredStudents = projectSharedRosterStudents(mergedWorkspace.students || []);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from(ROSTER_TABLE)
      .update({
        department_id: identity.departmentId,
        class_name: identity.className,
        school_year: identity.schoolYear,
        grade: identity.grade,
        students: desiredStudents,
        updated_by: user.id,
        updated_at: now,
      })
      .eq('roster_key', identity.rosterKey)
      .eq('updated_at', remoteRow.updated_at)
      .select('roster_key,department_id,class_name,school_year,grade,students,created_by,updated_by,updated_at')
      .maybeSingle();

    if (error) return cloudError(error);
    if (data) {
      writeCachedRoster(identity, data);
      const roster = rowToRoster(identity, data);
      return {
        ok: true,
        roster,
        workspace: mergeSharedRosterIntoWorkspace(workspace, roster.students),
        source: conflictDetails.length ? 'roster-conflict-resolved' : 'roster-cloud',
        conflictResolved: conflictDetails.length > 0,
        conflicts: conflictDetails,
      };
    }

    // CAS miss: cloud changed after our read. Rebase the desired result onto the
    // newly fetched version and try once more instead of overwriting it.
    const latest = await fetchRemoteRoster(identity);
    if (latest.error) return cloudError(latest.error);
    if (!latest.data) return saveSharedGradebookRoster(user, workspace);
    baseStudents = remoteRow.students || [];
    remoteRow = latest.data;
  }

  const roster = rowToRoster(identity, remoteRow);
  writeCachedRoster(identity, remoteRow);
  return {
    ok: false,
    source: 'roster-concurrent-retry',
    conflict: true,
    roster,
    workspace: mergeSharedRosterIntoWorkspace(workspace, roster.students),
    message: 'Danh sách vừa được giáo viên khác cập nhật liên tiếp. Brian đã giữ bản cloud mới nhất; vui lòng kiểm tra lại thay đổi trước khi lưu tiếp.',
    optional: true,
  };
}

function subscriptionKey(user, identity) {
  const userPart = text(user?.id || user?.authId || user?.email, 'guest')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 36);
  const rosterPart = identity.rosterKey
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 72);
  return `gradebook-roster-${userPart}-${rosterPart}`;
}

export function subscribeSharedGradebookRoster(user, workspace, onChange) {
  if (!isSupabaseConfigured || !supabase || !user?.id || !workspace) return () => {};
  const identity = makeGradebookRosterIdentity(user, workspace);

  return subscribeTable({
    key: subscriptionKey(user, identity),
    table: ROSTER_TABLE,
    filter: `roster_key=eq.${identity.rosterKey}`,
    onChange: (payload) => {
      const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
      if (!row || row.roster_key !== identity.rosterKey) return;
      writeCachedRoster(identity, row);
      const roster = rowToRoster(identity, row);
      onChange?.({
        roster,
        source: 'roster-realtime',
        updatedBy: row.updated_by || '',
        updatedAt: row.updated_at || '',
        eventType: payload?.eventType || 'UPDATE',
      });
    },
  });
}
