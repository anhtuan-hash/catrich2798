// Pure, conflict-safe merge for concurrent school-class student edits.
// Never overwrite unrelated reports, grades, attendance or another teacher's
// changes. Staff must resolve ambiguous identities and conflicting fields.
const STRIPPED = new Set(['students', 'auditLogs', 'backups', 'updatedAt', 'syncMeta']);
const META_FIELDS = new Set(['id','updatedAt','createdAt','rosterStudentId','rosterPersonKey']);
function text(v) { return String(v ?? '').trim(); }
function lower(v) { return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function signature(workspace) {
  return JSON.stringify(Object.fromEntries(
    Object.entries(workspace || {}).filter(([key]) => !STRIPPED.has(key)),
  ));
}
function samePerson(a, b) {
  if (!a || !b) return false;
  if (text(a.id) && text(a.id) === text(b.id)) return true;
  if (text(a.rosterStudentId) && text(a.rosterStudentId) === text(b.rosterStudentId)) return true;
  if (text(a.code) && text(b.code)) return lower(a.code) === lower(b.code);
  return lower(a.fullName) && lower(a.fullName) === lower(b.fullName)
    && text(a.birthDate) && text(a.birthDate) === text(b.birthDate)
    && lower(a.gender) && lower(a.gender) === lower(b.gender);
}
function locate(student, list = []) {
  const matches = list.map((entry, index) => samePerson(student,entry) ? index : -1)
    .filter((index) => index >= 0);
  return matches.length > 1 ? -2 : (matches[0] ?? -1);
}
export function isHomeroomStudentListOnlyChange(before, after) {
  return signature(before) === signature(after)
    && JSON.stringify(before?.students || []) !== JSON.stringify(after?.students || []);
}
export function mergeHomeroomStudentListAfterConflict(before, after, latest) {
  if (!isHomeroomStudentListOnlyChange(before, after))
    return {ok:false,message:'Thao tác không chỉ thay đổi danh sách học sinh.'};
  const previous = before?.students || [];
  const requested = after?.students || [];
  const current = [...(latest?.students || [])];
  const issues = [];
  let changed = 0;
  for (const original of previous) {
    if (locate(original,requested) === -1) {
      issues.push('Không tự hòa giải thao tác xóa hồ sơ học sinh.');
      break;
    }
  }
  if (issues.length) return {ok:false,message:issues.join(' ')};
  for (const student of requested) {
    const priorIndex=locate(student,previous);
    if (priorIndex===-2) { issues.push('Học sinh trùng định danh trong hồ sơ gốc.'); continue; }
    const prior=priorIndex<0?null:previous[priorIndex];
    const changedKeys=prior
      ? Object.keys(student).filter((key) =>
          !META_FIELDS.has(key) && JSON.stringify(student[key])!==JSON.stringify(prior[key]))
      : Object.keys(student).filter((key)=>!META_FIELDS.has(key));
    if (!changedKeys.length) continue;
    let cloudIndex=locate(student,current);
    if (cloudIndex<0 && prior) cloudIndex=locate(prior,current);
    if (cloudIndex===-2) { issues.push('Học sinh trùng định danh trong hồ sơ cloud.'); continue; }
    if (cloudIndex<0) {
      if (current.some((other) => lower(other.fullName)
        && lower(other.fullName)===lower(student.fullName)
        && (!text(other.code)||!text(student.code))
        && (!text(other.birthDate)||!text(student.birthDate)
          || !text(other.gender)||!text(student.gender)))) {
        issues.push('Tên học sinh trùng với hồ sơ thiếu thông tin; cần kiểm tra trước khi thêm.');
        continue;
      }
      current.push(student);
    } else {
      const existing=current[cloudIndex];
      if (!prior && text(existing.id)!==text(student.id)) {
        issues.push('Học sinh đã được thêm bởi người khác; cần kiểm tra trùng hồ sơ.');
        continue;
      }
      if (prior && changedKeys.some((key) =>
          JSON.stringify(existing[key])!==JSON.stringify(prior[key])
          && JSON.stringify(existing[key])!==JSON.stringify(student[key]))) {
        issues.push('Cùng một trường thông tin học sinh đang được người khác sửa.');
        continue;
      }
      current[cloudIndex]={
        ...existing,...Object.fromEntries(changedKeys.map((key)=>[key,student[key]])),
        updatedAt:student.updatedAt||existing.updatedAt,
      };
    }
    changed++;
  }
  if (issues.length) return {ok:false,message:issues.join(' ')};
  return {ok:true,changed,workspace:{...latest,students:current}};
}
