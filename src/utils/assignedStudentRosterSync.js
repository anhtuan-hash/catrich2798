import { isSupabaseConfigured, supabase } from './supabase.js';
import { projectSharedRosterStudents } from './gradebookRosterStore.js';

// Only the changed student's fields are merged into the canonical school list.
// Neither a stale classroom snapshot nor an unrelated notes edit can replace
// another teacher's changes to the rest of the class.
function text(value) { return String(value ?? '').trim(); }
function lower(value) { return text(value).toLocaleLowerCase('vi'); }
function fold(value) {
  return lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}
function personKey(s = {}) {
  return `${fold(s.fullName)}|${text(s.birthDate)}|${lower(s.gender)}`;
}
function stableId(s = {}) { return text(s.rosterStudentId || s.id); }
function score(student, candidate) {
  const id = stableId(student);
  if (id && id === stableId(candidate)) return 3;
  const incomingCode = lower(student.code);
  const candidateCode = lower(candidate.code);
  if (incomingCode && candidateCode) return incomingCode === candidateCode ? 2 : 0;
  // Names alone are not unique. Anonymous-code students may be matched only
  // when a non-empty birth date and gender both agree. Otherwise require review.
  const fullName = fold(student.fullName);
  const birthDate = text(student.birthDate);
  const gender = lower(student.gender);
  return fullName && birthDate && gender
    && fullName === fold(candidate.fullName)
    && birthDate === text(candidate.birthDate)
    && gender === lower(candidate.gender) ? 1 : 0;
}
export function selectCanonicalMatch(student, students = []) {
  const matches = students.map((row, index) => ({ index, score: score(student, row) }))
    .filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
  if (!matches.length) return { index: -1, ambiguous: false };
  if (matches.length > 1 && matches[1].score === matches[0].score) {
    return { index: -1, ambiguous: true };
  }
  return { index: matches[0].index, ambiguous: false };
}
function rosterFields(student = {}) {
  const active = student.active !== false &&
    !['archived','transferred','deleted'].includes(student.lifecycleStatus) &&
    !student.deletedAt;
  return {
    code: text(student.code), fullName: text(student.fullName),
    birthDate: text(student.birthDate), gender: text(student.gender),
    active, archivedAt: active ? '' : text(student.inactiveAt || student.archivedAt),
    archivedReason: active ? '' : text(student.inactiveReason || student.archivedReason),
  };
}
const FIELDS = ['code','fullName','birthDate','gender','active','archivedAt','archivedReason'];
export function applyStudentChangesToCanonicalRoster(remote = [], previous = [], next = [], permanentRemovals = []) {
  const students = projectSharedRosterStudents(remote);
  const issues = [];
  let changed = 0;
  (Array.isArray(next) ? next : []).forEach((incoming) => {
    const priorMatch = selectCanonicalMatch(incoming, previous);
    if (priorMatch.ambiguous) {
      issues.push('Không thể phân biệt hồ sơ học sinh trước khi chỉnh sửa.');
      return;
    }
    const before = priorMatch.index < 0 ? null : previous[priorMatch.index];
    const fields = rosterFields(incoming);
    const oldFields = before ? rosterFields(before) : null;
    const delta = before ? FIELDS.filter((field) => fields[field] !== oldFields[field]) : FIELDS;
    if (!delta.length) return;

    let remoteMatch = selectCanonicalMatch(incoming, students);
    if (remoteMatch.index < 0 && !remoteMatch.ambiguous && before) {
      remoteMatch = selectCanonicalMatch(before, students);
    }
    if (remoteMatch.ambiguous) {
      issues.push('Có nhiều học sinh trùng thông tin nhận diện ở danh sách chuẩn.');
      return;
    }
    if (remoteMatch.index < 0 && students.some((existing) => (
      fold(fields.fullName) && fold(fields.fullName) === fold(existing.fullName)
      && (!fields.birthDate || !fields.gender
        || !text(existing.birthDate) || !text(existing.gender))
      && !(fields.code && text(existing.code) && lower(fields.code) !== lower(existing.code))
    ))) {
      // Do not turn an uncertain match into a duplicate while importing legacy
      // name-only student rows. Ask for identifiers rather than guessing.
      issues.push('Trùng họ tên với học sinh chưa đủ ngày sinh/giới tính; hãy kiểm tra mã học sinh.');
      return;
    }

    if (remoteMatch.index >= 0) {
      const found = students[remoteMatch.index];
      students[remoteMatch.index] = {
        ...found,
        ...Object.fromEntries(delta.map((field) => [field, fields[field]])),
        rosterStudentId: found.rosterStudentId,
        rosterPersonKey: fields.code ? `code:${lower(fields.code)}`
          : `person:${personKey(fields)}`,
      };
    } else {
      const id = stableId(incoming) ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID() : `student-${Date.now()}-${students.length}`);
      students.push({
        rosterStudentId: id,
        rosterPersonKey: fields.code ? `code:${lower(fields.code)}`
          : `person:${personKey(fields)}`,
        ...fields,
      });
    }
    changed += 1;
  });
  // A missing row is never treated as a delete by itself. Only an explicit
  // permanent-deletion tombstone for a *previously archived* student may remove
  // the corresponding canonical record. Ambiguous matches block the operation.
  (Array.isArray(permanentRemovals) ? permanentRemovals : []).forEach((archived) => {
    if (archived?.active !== false) return;
    const match = selectCanonicalMatch(archived, students);
    if (match.ambiguous) {
      issues.push('Không thể xác định duy nhất học sinh đã lưu trữ trong danh sách dùng chung.');
    } else if (match.index >= 0) {
      students.splice(match.index, 1);
      changed += 1;
    }
  });
  return { students, changed, issues };
}
const PENDING_PREFIX = 'bes-school-roster-pending-v1';
const MAX_PENDING_OPERATIONS = 100;

function queueKey(user, profile) {
  return `${PENDING_PREFIX}:${text(user?.id)}:${lower(profile?.schoolYear)}:${lower(profile?.className)}`;
}

function readPending(key) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.slice(0, MAX_PENDING_OPERATIONS) : [];
  } catch {
    return [];
  }
}

function writePending(key, operations) {
  if (typeof localStorage === 'undefined') return false;
  try {
    if (operations.length) localStorage.setItem(key, JSON.stringify(operations));
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

export function getPendingAssignedStudentRosterCount(user) {
  if (typeof localStorage === 'undefined' || !user?.id) return 0;
  try {
    const prefix = `${PENDING_PREFIX}:${text(user.id)}:`;
    let count = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) count += readPending(key).length;
    }
    return count;
  } catch { return 0; }
}

function pendingOperations(before, after) {
  const previous = Array.isArray(before?.students) ? before.students : [];
  const current = Array.isArray(after?.students) ? after.students : [];
  const profile = {
    className: text(after?.classProfile?.className),
    schoolYear: text(after?.classProfile?.schoolYear),
  };
  return current.flatMap((student) => {
    const match = selectCanonicalMatch(student, previous);
    if (match.ambiguous) return [];
    const original = match.index < 0 ? null : previous[match.index];
    const changes = original
      ? FIELDS.some((field) => rosterFields(student)[field] !== rosterFields(original)[field])
      : true;
    return changes ? [{
      classProfile: profile,
      before: original ? [original] : [],
      after: [student],
    }] : [];
  });
}

function enqueueFailedSync(user, before, after) {
  const key = queueKey(user, after.classProfile);
  const pending = readPending(key);
  const incoming = pendingOperations(before, after);
  for (const operation of incoming) {
    if (pending.some((existing) => JSON.stringify(existing) === JSON.stringify(operation))) continue;
    if (pending.length >= MAX_PENDING_OPERATIONS) return false;
    pending.push(operation);
  }
  return writePending(key, pending);
}

const activeFlushes = new Set();

// Persisted on this device: transient failures are replayed after reconnect or
// when opening the teacher workspace again. No background server task is assumed.
export async function flushPendingAssignedStudentRosters(user, onlyKey = '') {
  if (typeof localStorage === 'undefined' || !user?.id) return { ok: false, changed: 0 };
  const prefix = `${PENDING_PREFIX}:${text(user.id)}:`;
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix) && (!onlyKey || key === onlyKey)) keys.push(key);
  }
  let changed = 0;
  for (const key of keys) {
    if (activeFlushes.has(key)) return { ok: false, changed, message: 'Đồng bộ đang diễn ra.' };
    activeFlushes.add(key);
    try {
      const pending = readPending(key);
      while (pending.length) {
        const operation = pending[0];
        const oldClass = { classProfile: operation.classProfile, students: operation.before };
        const newClass = { classProfile: operation.classProfile, students: operation.after };
        const result = await syncAssignedStudentRosterDelta(user, oldClass, newClass, { skipQueue: true });
        if (!result.ok) return { ok: false, changed, message: result.message };
        changed += result.changed || 0;
        pending.shift();
        if (!writePending(key, pending))
          return { ok: false, changed, message: 'Không thể cập nhật hàng đợi đồng bộ trên thiết bị.' };
      }
    } finally { activeFlushes.delete(key); }
  }
  return { ok: true, changed };
}

export async function syncAssignedStudentRosterDelta(user, before, after, options = {}) {
  if (!isSupabaseConfigured || !supabase || !user?.id)
    return { ok: false, message: 'Không có kết nối đến danh sách học sinh dùng chung.' };
  const className = text(after?.classProfile?.className);
  const schoolYear = text(after?.classProfile?.schoolYear);
  if (!className || !schoolYear
    || className !== text(before?.classProfile?.className)
    || schoolYear !== text(before?.classProfile?.schoolYear)
    || !/^20\d\d-20\d\d$/.test(schoolYear)) {
    return { ok: false, message: 'Thông tin lớp hoặc năm học đã thay đổi; hãy tải lại lớp.' };
  }
  const oldStudents = Array.isArray(before?.students) ? before.students : [];
  const nextStudents = Array.isArray(after?.students) ? after.students : [];
  const currentIds = new Set(nextStudents.map((item) => text(item?.id)));
  const tombstoneIds = new Set((after?.studentPermanentDeletionTombstones || [])
    .map((item) => text(item?.id)).filter(Boolean));
  const permanentRemovals = oldStudents.filter((item) => (
    item.active === false && text(item.id) && tombstoneIds.has(text(item.id))
    && !currentIds.has(text(item.id))
  ));
  const preliminary = applyStudentChangesToCanonicalRoster(oldStudents, oldStudents, nextStudents, permanentRemovals);
  if (preliminary.issues.length) return { ok: false, message: preliminary.issues.join(' ') };
  const rosterKey = `class:${lower(schoolYear)}||${lower(className)}`;
  if (!options.skipQueue && readPending(queueKey(user, after.classProfile)).length) {
    const queued = await flushPendingAssignedStudentRosters(user, queueKey(user, after.classProfile));
    if (!queued.ok) {
      enqueueFailedSync(user, before, after);
      return { ok: false, message: queued.message || 'Có thay đổi cũ đang chờ đồng bộ.' };
    }
  }
  if (!preliminary.changed) return { ok: true, changed: 0 };
  const fail = (message) => {
    if (options.skipQueue) return { ok: false, message };
    return { ok: false, message: enqueueFailedSync(user, before, after)
      ? `${message} Thay đổi đã được xếp hàng để đồng bộ khi kết nối trở lại.`
      : `${message} Không thể lưu hàng đợi; vui lòng giữ bản sao và thử lại.` };
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: readError } = await supabase.from('bes_class_rosters')
      .select('roster_key,students,updated_at').eq('roster_key', rosterKey).maybeSingle();
    if (readError || !row) {
      return fail(readError?.message || 'Danh sách chung chưa được tạo.');
    }
    const applied = applyStudentChangesToCanonicalRoster(row.students || [], oldStudents, nextStudents, permanentRemovals);
    if (applied.issues.length) return { ok: false, message: applied.issues.join(' ') };
    const { data, error } = await supabase.from('bes_class_rosters')
      .update({
        students: applied.students,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('roster_key', rosterKey).eq('updated_at', row.updated_at)
      .select('roster_key').maybeSingle();
    if (error) return fail(error.message);
    if (data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bes-class-roster-updated', {
          detail: { className, schoolYear },
        }));
      }
      return { ok: true, changed: applied.changed };
    }
  }
  return fail('Danh sách vừa thay đổi trên thiết bị khác. Hãy lưu lại để đồng bộ.');
}
