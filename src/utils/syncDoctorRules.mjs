// Sync Doctor deterministic rules. No AI, no writes, no guesses from names alone.
export const SYNC_DOCTOR_RULESET = '1.0.0';
const str = (value) => String(value ?? '').trim();
const fold = (value) => str(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const classKey = (year, name) => fold(year) + '||' + fold(name);
const list = (value) => Array.isArray(value) ? value : [];
export const isActiveSyncStudent = (student = {}) => student.active !== false &&
  !['deleted','archived','transferred'].includes(str(student.lifecycleStatus)) && !student.deletedAt && !student.archivedAt;
export function studentIdentity(student = {}) {
  return { id: str(student.rosterStudentId), code: fold(student.code),
    name: fold(student.fullName), birth: str(student.birthDate), gender: fold(student.gender) };
}
function issue(code, severity, year, cls, description, detail = '', evidence = {}) {
  return { id: [code, year, cls, evidence.ref || ''].join(':'), code, severity, year, className: cls,
    description, detail, evidence, action: 'review', status: 'open' };
}
function indexDuplicates(students, year, cls) {
  const issues = [], ids = new Set(), codes = new Set();
  for (const student of students) {
    const value = studentIdentity(student);
    if (!value.id) issues.push(issue('IDENTITY_MISSING', 'high',year,cls,'Học sinh thiếu mã nội bộ ổn định','Không thể tự ghép hồ sơ theo tên.',{ref:value.code || value.name}));
    else if (ids.has(value.id)) issues.push(issue('IDENTITY_DUPLICATE', 'critical',year,cls,'Mã định danh nội bộ bị trùng','Cần kiểm tra bản ghi gốc.',{ref:value.id}));
    if (value.code && codes.has(value.code)) issues.push(issue('STUDENT_CODE_DUPLICATE', 'high',year,cls,'Mã học sinh trùng trong lớp','Tạm dừng đề xuất ghép.',{ref:value.code}));
    if (value.id) ids.add(value.id);
    if (value.code) codes.add(value.code);
  }
  return issues;
}
function matches(reference, local, codeCounts) {
  const a = studentIdentity(reference), b = studentIdentity(local);
  if (a.id && b.id && a.id === b.id) return 'exact';
  if (a.code && b.code && a.code === b.code && codeCounts.get(a.code) === 1) return 'code';
  if (a.name && a.name === b.name && a.birth && b.birth &&
      a.birth === b.birth && a.gender && a.gender === b.gender) return 'review';
  return '';
}
function members(workspace) {
  return list(workspace?.payload?.students || workspace?.students);
}
function sourceStatus(snapshot, key) {
  const source = snapshot?.sources?.[key];
  return source && ['ok','limited'].includes(source.status);
}
export function compareSyncDoctorSnapshots(snapshot = {}) {
  const { schoolYear = '', className = '', canonical = [], homeroom = [], gradebooks = [], assessmentClasses = [] } = snapshot;
  const issues = [], year = str(schoolYear), cls = str(className);
  const rows = list(canonical).filter(r => (!year || r.school_year === year) && (!cls || fold(r.class_name) === fold(cls)));
  const gradeRows = list(gradebooks).filter(r => (!year || r.school_year === year) && (!cls || fold(r.class_name) === fold(cls)));
  const homeroomRows = list(homeroom).filter(r => (!year || r.school_year === year) && (!cls || fold(r.class_name) === fold(cls)));
  const assessments = list(assessmentClasses).filter(r => (!cls || fold(r.className || r.class_name) === fold(cls)) &&
    (!year || !r.schoolYear || r.schoolYear === year));
  const canonicalByClass = new Map(rows.filter(r=>str(r.roster_key).startsWith('class:'))
    .map(r=>[classKey(r.school_year,r.class_name),r]));
  const viewed = [...new Set([...rows,...gradeRows,...homeroomRows].map(r=>classKey(r.school_year,r.class_name)))];
  for (const scope of viewed) {
    const ref = canonicalByClass.get(scope);
    const locals = [...gradeRows.filter(r=>classKey(r.school_year,r.class_name)===scope).map(r=>({...r,_kind:'gradebook'})),
      ...homeroomRows.filter(r=>classKey(r.school_year,r.class_name)===scope).map(r=>({...r,_kind:'homeroom'}))];
    const sample = ref || locals[0];
    const scopeYear = sample?.school_year || year, scopeClass = sample?.class_name || cls;
    if (!ref) {
      if (sourceStatus(snapshot,'canonical')) issues.push(issue('CANONICAL_NOT_VISIBLE','high',scopeYear,scopeClass,
        'Chưa thấy danh sách chuẩn tương ứng','Có thể chưa tạo hoặc tài khoản không có quyền đọc. Không tự tạo mới.'));
      continue;
    }
    const students = list(ref.students), active = students.filter(isActiveSyncStudent);
    issues.push(...indexDuplicates(students,scopeYear,scopeClass));
    const codeCounts = new Map();
    for(const s of students){const code=studentIdentity(s).code;if(code)codeCounts.set(code,(codeCounts.get(code)||0)+1);}
    for (const local of locals) {
      const localStudents = members(local);
      const type = local._kind, applicable = type==='gradebook' ? sourceStatus(snapshot,'gradebook') : sourceStatus(snapshot,'homeroom');
      if (!applicable) continue;
      for(const official of active) {
        const match = localStudents.map(s=>matches(official,s,codeCounts));
        const confident = match.filter(m=>m==='exact'||m==='code').length;
        if (confident > 1) issues.push(issue('MULTIPLE_LOCAL_MATCHES','high',scopeYear,scopeClass,
          'Nhiều học sinh cùng khớp một định danh','Không tự gộp hoặc xóa học sinh.',
          {ref:studentIdentity(official).id,source:type}));
        if (confident) continue;
        if (match.includes('review')) issues.push(issue('AMBIGUOUS_IDENTITY','high',scopeYear,scopeClass,
          'Hồ sơ tương tự nhưng không có khóa định danh chắc chắn','Cần giáo viên đối chiếu bằng chứng; tên không đủ để tự ghép.',
          {ref:studentIdentity(official).id,source:type}));
        else issues.push(issue('STUDENT_NOT_LINKED','medium',scopeYear,scopeClass,
          'Học sinh danh sách chuẩn chưa liên kết ' + (type==='gradebook'?'Sổ điểm':'GVCN'),
          'Chỉ đề xuất kiểm tra; không thêm tự động.',{ref:studentIdentity(official).id,source:type}));
      }
    }
    if (sourceStatus(snapshot,'assessment')) for (const a of assessments.filter(a=>
      classKey(a.schoolYear || scopeYear,a.className || a.class_name)===scope)) {
      const assessmentStudents = list(a.students), refs = new Set(assessmentStudents.map(s=>str(s.rosterStudentId || s.id || s.ref)));
      for (const s of active) {
        const key = studentIdentity(s).id;
        if (key && refs.has(key)) continue;
        const code = studentIdentity(s).code;
        if (code && assessmentStudents.some(x=>studentIdentity(x).code===code)) continue;
        // The assessment adapter may represent only assigned students or historical aliases.
        issues.push(issue('ASSESSMENT_LINK_REVIEW','low',scopeYear,scopeClass,
          'Chưa xác minh liên kết học sinh trong Kiểm tra',
          'Có thể sử dụng mã cũ; không thay đổi kết quả.',{ref:key,source:'assessment'}));
      }
    }
  }
  // A failed read is never interpreted as an empty class.
  for(const [key, source] of Object.entries(snapshot.sources || {})) {
    if (['error','unavailable','unauthorized'].includes(source?.status)) {
      issues.push(issue('SOURCE_UNVERIFIED','high',year,cls,
        'Không thể xác minh nguồn ' + (source.label || key),
        'Không kết luận rằng dữ liệu nguồn rỗng hoặc đã đồng bộ.',{ref:key,source:key}));
    }
    if(source?.status==='limited')issues.push(issue('SOURCE_COVERAGE_PARTIAL','low',year,cls,
      'Nguồn ' + (source.label || key) + ' chỉ có dữ liệu một phần',
      'Không xác nhận toàn bộ hệ thống đã nhất quán.',{ref:key,source:key}));
  }
  if (snapshot.localQueue?.pending > 0) issues.push(issue('LOCAL_QUEUE_PENDING','medium',year,cls,
    'Có thay đổi chưa gửi từ thiết bị này','Chỉ có thể xem hàng đợi của trình duyệt hiện tại.',
    {ref:'browser',count:snapshot.localQueue.pending}));
  return {issues:issues.filter((item,index,array)=>array.findIndex(x=>x.id===item.id)===index),
    classesChecked:viewed.length,
    completeness:Object.values(snapshot.sources||{}).every(s=>s.status==='ok')?'complete':'partial'};
}
