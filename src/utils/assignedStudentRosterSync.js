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
  if (text(student.code) && lower(student.code) === lower(candidate.code)) return 2;
  return fold(student.fullName) && personKey(student) === personKey(candidate) ? 1 : 0;
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
export function applyStudentChangesToCanonicalRoster(remote = [], previous = [], next = []) {
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
  return { students, changed, issues };
}
export async function syncAssignedStudentRosterDelta(user, before, after) {
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
  const preliminary = applyStudentChangesToCanonicalRoster(oldStudents, oldStudents, nextStudents);
  if (preliminary.issues.length) return { ok: false, message: preliminary.issues.join(' ') };
  if (!preliminary.changed) return { ok: true, changed: 0 };
  const rosterKey = `class:${lower(schoolYear)}||${lower(className)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: readError } = await supabase.from('bes_class_rosters')
      .select('roster_key,students,updated_at').eq('roster_key', rosterKey).maybeSingle();
    if (readError || !row) {
      return { ok: false, message: readError?.message || 'Danh sách chung chưa được tạo.' };
    }
    const applied = applyStudentChangesToCanonicalRoster(row.students || [], oldStudents, nextStudents);
    if (applied.issues.length) return { ok: false, message: applied.issues.join(' ') };
    const { data, error } = await supabase.from('bes_class_rosters')
      .update({
        students: applied.students,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('roster_key', rosterKey).eq('updated_at', row.updated_at)
      .select('roster_key').maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bes-class-roster-updated', {
          detail: { className, schoolYear },
        }));
      }
      return { ok: true, changed: applied.changed };
    }
  }
  return { ok: false, message: 'Danh sách vừa thay đổi trên thiết bị khác. Hãy lưu lại để đồng bộ.' };
}
