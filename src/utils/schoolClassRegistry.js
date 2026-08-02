const nowIso = () => new Date().toISOString();

export const SCHOOL_CLASS_REGISTRY_VERSION = 2;
export const SCHOOL_CLASS_REGISTRY_TABLE = 'school_class_registries';
export const SCHOOL_CLASS_REGISTRY_STORAGE_PREFIX = 'bes-school-class-registry-v1';

export const SCHOOL_CLASS_BLUEPRINTS = Object.freeze([
  ['10.1', 28], ['10.2', 27], ['10.3', 25], ['10.4', 27], ['10.5', 29], ['10.6', 28],
  ['10.7', 27], ['10.8', 28], ['10.9', 29], ['10.10', 28], ['10.11', 28], ['10.12', 26],
  ['11.1', 26], ['11.2', 27], ['11.3', 27], ['11.4', 27], ['11.5', 16], ['11.6', 17],
  ['12.1', 24], ['12.2', 30], ['12.3', 31], ['12.4', 26], ['12.5', 30], ['12.6', 28],
  ['12.7', 24], ['12.8', 27], ['12.9', 28],
].map(([className, expectedCount]) => Object.freeze({ className, grade: className.split('.')[0], expectedCount })));

const EXPECTED_CLASS_NAMES = new Set(SCHOOL_CLASS_BLUEPRINTS.map((item) => item.className));

function text(value) {
  return String(value ?? '').trim();
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return fold(value).replace(/\s+/g, '-').replace(/^-|-$/g, '') || 'student';
}

function normalizeStudentCode(value) {
  const raw = text(value);
  if (!raw) return '';
  if (/^\d+(?:\.0+)?$/.test(raw)) return raw.replace(/\.0+$/, '');
  return raw;
}

export function isDeletedSchoolStudent(student) {
  return student?.lifecycleStatus === 'deleted' || Boolean(student?.deletedAt);
}

function activeRosterCount(students = []) {
  return (Array.isArray(students) ? students : []).filter((student) => (
    student?.active !== false && !isDeletedSchoolStudent(student)
  )).length;
}

export function normalizeSchoolClassName(value) {
  const raw = text(value)
    .replace(/^lớp\s*/i, '')
    .replace(/^lop\s*/i, '')
    .replace(/[,/_-]+/g, '.')
    .replace(/\s+/g, '');
  // Hai dòng trong danh sách gốc ghi thiếu số lớp và nằm ngay trước khối 12.1.
  if (raw === '12') return '12.1';
  const match = raw.match(/^(10|11|12)\.(\d{1,2})$/);
  if (!match) return '';
  const normalized = `${match[1]}.${Number(match[2])}`;
  return EXPECTED_CLASS_NAMES.has(normalized) ? normalized : '';
}

export function normalizeBirthDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const vi = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vi) return `${vi[3]}-${String(vi[2]).padStart(2, '0')}-${String(vi[1]).padStart(2, '0')}`;
  return raw;
}

function headerIndex(headers, aliases) {
  const normalized = headers.map(fold);
  return normalized.findIndex((value) => aliases.includes(value));
}

function stableStudentId(student) {
  const code = normalizeStudentCode(student.code);
  if (code) return `student-${code.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
  return `student-${slug(`${student.fullName}-${student.birthDate}`)}`;
}

function normalizeGender(value) {
  const raw = fold(value);
  if (['nam', 'male'].includes(raw)) return 'Nam';
  if (['nu', 'female'].includes(raw)) return 'Nữ';
  return text(value);
}

export function parseSchoolRosterRows(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('Tệp Excel không có dữ liệu học sinh.');
  }
  const headers = rows[0] || [];
  const columns = {
    code: headerIndex(headers, ['ma hoc sinh', 'ma hs', 'student id', 'student code']),
    fullName: headerIndex(headers, ['ho va ten', 'ho ten', 'student name', 'full name']),
    className: headerIndex(headers, ['lop', 'class', 'class name']),
    studyMode: headerIndex(headers, ['hinh thuc hoc', 'study mode', 'loai hinh hoc']),
    birthDate: headerIndex(headers, ['ngay sinh', 'date of birth', 'birth date']),
    gender: headerIndex(headers, ['gioi tinh', 'gender']),
  };
  if (columns.fullName < 0 || columns.className < 0) {
    throw new Error('Không tìm thấy cột “Họ và Tên” hoặc “Lớp”.');
  }

  const rosters = Object.fromEntries(SCHOOL_CLASS_BLUEPRINTS.map((item) => [item.className, []]));
  const warnings = [];
  rows.slice(1).forEach((row, offset) => {
    const fullName = text(row?.[columns.fullName]);
    if (!fullName) return;
    const rawClassName = row?.[columns.className];
    const className = normalizeSchoolClassName(rawClassName);
    if (!className) {
      warnings.push(`Dòng ${offset + 2}: lớp “${text(rawClassName) || 'trống'}” không thuộc danh mục 27 lớp.`);
      return;
    }
    const student = {
      code: columns.code >= 0 ? normalizeStudentCode(row?.[columns.code]) : '',
      fullName,
      className,
      studyMode: columns.studyMode >= 0 ? text(row?.[columns.studyMode]) : '',
      birthDate: columns.birthDate >= 0 ? normalizeBirthDate(row?.[columns.birthDate]) : '',
      gender: columns.gender >= 0 ? normalizeGender(row?.[columns.gender]) : '',
      active: true,
      lifecycleStatus: 'active',
    };
    student.id = stableStudentId(student);
    rosters[className].push(student);
  });

  const totalStudents = Object.values(rosters).reduce((sum, items) => sum + items.length, 0);
  const classCounts = Object.fromEntries(Object.entries(rosters).map(([className, students]) => [className, students.length]));
  const missingClasses = SCHOOL_CLASS_BLUEPRINTS.filter((item) => classCounts[item.className] === 0).map((item) => item.className);
  if (missingClasses.length) warnings.push(`Không có học sinh ở lớp: ${missingClasses.join(', ')}.`);

  return { rosters, totalStudents, classCounts, warnings };
}

function studentIdentity(student) {
  return `${fold(student?.fullName)}|${normalizeBirthDate(student?.birthDate)}`;
}

function studentCodeKey(student) {
  return normalizeStudentCode(student?.code).toLowerCase();
}

function sameStudent(left, right) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  const leftCode = studentCodeKey(left);
  const rightCode = studentCodeKey(right);
  if (leftCode && rightCode && leftCode === rightCode) return true;
  const leftIdentity = studentIdentity(left);
  return leftIdentity !== '|' && leftIdentity === studentIdentity(right);
}

export function mergeRosterStudents(existingStudents = [], importedStudents = [], importedAt = nowIso()) {
  const existing = Array.isArray(existingStudents) ? existingStudents : [];
  const incoming = Array.isArray(importedStudents) ? importedStudents : [];
  const byCode = new Map();
  const byIdentity = new Map();
  existing.forEach((student) => {
    const code = studentCodeKey(student);
    if (code && !byCode.has(code)) byCode.set(code, student);
    const identity = studentIdentity(student);
    if (identity !== '|') {
      const bucket = byIdentity.get(identity) || [];
      bucket.push(student);
      byIdentity.set(identity, bucket);
    }
  });

  const usedIds = new Set();
  const merged = incoming.map((student) => {
    const code = studentCodeKey(student);
    let match = code ? byCode.get(code) : null;
    if (!match) {
      const candidates = byIdentity.get(studentIdentity(student)) || [];
      match = candidates.find((item) => !usedIds.has(item.id)) || null;
    }
    if (match?.id) usedIds.add(match.id);
    const deleted = isDeletedSchoolStudent(student);
    return {
      ...(match || {}),
      ...student,
      id: match?.id || student.id || stableStudentId(student),
      portalPin: match?.portalPin || student.portalPin,
      pinUpdatedAt: match?.pinUpdatedAt || student.pinUpdatedAt,
      teamId: match?.teamId || student.teamId || '',
      active: deleted ? false : true,
      lifecycleStatus: deleted ? 'deleted' : 'active',
      deletedAt: deleted ? (student.deletedAt || importedAt) : '',
      deletedReason: deleted ? (student.deletedReason || 'TTCM xóa khỏi danh sách lớp') : '',
      deletedBy: deleted ? (student.deletedBy || '') : '',
      inactiveReason: deleted ? (student.deletedReason || 'TTCM xóa khỏi danh sách lớp') : '',
      inactiveAt: deleted ? (student.deletedAt || importedAt) : '',
      transferClass: '',
      updatedAt: importedAt,
      createdAt: match?.createdAt || student.createdAt || importedAt,
    };
  });

  existing.forEach((student) => {
    if (student?.id && usedIds.has(student.id)) return;
    merged.push(student?.active === false ? student : {
      ...student,
      active: false,
      lifecycleStatus: 'archived',
      inactiveReason: 'Không còn trong danh sách học sinh chuẩn gần nhất',
      inactiveAt: importedAt,
      updatedAt: importedAt,
    });
  });
  return merged;
}

export function reconcileWorkspaceRoster(workspace, className, importedStudents, importedAt = nowIso()) {
  if (!workspace || typeof workspace !== 'object') return workspace;
  const normalizedClassName = normalizeSchoolClassName(className || workspace.classProfile?.className);
  if (!normalizedClassName) return workspace;
  const students = mergeRosterStudents(workspace.students, importedStudents, importedAt);
  const activeCount = activeRosterCount(importedStudents);
  return {
    ...workspace,
    classProfile: {
      ...(workspace.classProfile || {}),
      className: normalizedClassName,
      grade: normalizedClassName.split('.')[0],
      studentCountTarget: activeCount,
    },
    // Chỉ cập nhật hồ sơ học sinh; learningRecords, conductRecords và các lịch sử khác được giữ nguyên.
    students,
    updatedAt: importedAt,
  };
}

function normalizeAssignment(value = {}) {
  return {
    homeroomTeacherId: text(value.homeroomTeacherId),
    subjectTeacherIds: [...new Set((Array.isArray(value.subjectTeacherIds) ? value.subjectTeacherIds : []).map(text).filter(Boolean))],
  };
}

export function createDefaultSchoolClassRegistry() {
  const createdAt = nowIso();
  return {
    version: SCHOOL_CLASS_REGISTRY_VERSION,
    sourceLabel: 'DanhSachHocSinh_HienTai_DaChuanHoa.xlsx',
    importedAt: '',
    updatedAt: createdAt,
    deletionAudit: [],
    classes: SCHOOL_CLASS_BLUEPRINTS.map((item) => ({
      ...item,
      students: [],
      assignment: normalizeAssignment(),
      importedCount: 0,
    })),
  };
}

export function normalizeSchoolClassRegistry(raw) {
  const base = createDefaultSchoolClassRegistry();
  const source = raw && typeof raw === 'object' ? raw : {};
  const byName = new Map((Array.isArray(source.classes) ? source.classes : []).map((item) => [normalizeSchoolClassName(item.className), item]));
  return {
    ...base,
    version: Math.max(Number(source.version) || 1, SCHOOL_CLASS_REGISTRY_VERSION),
    sourceLabel: text(source.sourceLabel) || base.sourceLabel,
    importedAt: text(source.importedAt),
    updatedAt: text(source.updatedAt) || base.updatedAt,
    deletionAudit: Array.isArray(source.deletionAudit) ? source.deletionAudit : [],
    classes: SCHOOL_CLASS_BLUEPRINTS.map((blueprint) => {
      const existing = byName.get(blueprint.className) || {};
      const students = Array.isArray(existing.students) ? existing.students : [];
      return {
        ...blueprint,
        students,
        importedCount: activeRosterCount(students),
        assignment: normalizeAssignment(existing.assignment),
      };
    }),
  };
}

export function applyRosterImport(registry, parsed, sourceLabel = '') {
  const current = normalizeSchoolClassRegistry(registry);
  const importedAt = nowIso();
  return {
    ...current,
    sourceLabel: text(sourceLabel) || current.sourceLabel,
    importedAt,
    updatedAt: importedAt,
    classes: current.classes.map((item) => {
      const imported = parsed?.rosters?.[item.className] || [];
      const deleted = (item.students || []).filter(isDeletedSchoolStudent);
      const active = imported.filter((student) => !deleted.some((tombstone) => sameStudent(student, tombstone)));
      const students = [...active, ...deleted];
      return { ...item, students, importedCount: active.length };
    }),
  };
}

export function deleteSchoolClassStudents(registry, className, studentIds = [], actor = null) {
  const current = normalizeSchoolClassRegistry(registry);
  const target = normalizeSchoolClassName(className);
  const ids = new Set((studentIds || []).map(text).filter(Boolean));
  if (!target || !ids.size) return current;
  const deletedAt = nowIso();
  const deletedBy = text(actor?.email || actor?.name || actor?.id);
  const selected = [];
  const classes = current.classes.map((item) => {
    if (item.className !== target) return item;
    const students = (item.students || []).map((student) => {
      if (!ids.has(student.id) || isDeletedSchoolStudent(student)) return student;
      selected.push(student);
      return {
        ...student,
        active: false,
        lifecycleStatus: 'deleted',
        deletedAt,
        deletedBy,
        deletedReason: 'TTCM xóa khỏi danh sách lớp',
        inactiveAt: deletedAt,
        inactiveReason: 'TTCM xóa khỏi danh sách lớp',
        updatedAt: deletedAt,
      };
    });
    return { ...item, students, importedCount: activeRosterCount(students) };
  });
  if (!selected.length) return current;
  return {
    ...current,
    updatedAt: deletedAt,
    classes,
    deletionAudit: [
      ...(current.deletionAudit || []),
      ...selected.map((student, index) => ({
        id: `registry-student-delete-${Date.now()}-${index}`,
        action: 'delete',
        className: target,
        studentId: student.id,
        studentCode: student.code || '',
        studentName: student.fullName || '',
        actorId: actor?.id || '',
        actorEmail: actor?.email || '',
        createdAt: deletedAt,
      })),
    ],
  };
}

export function restoreSchoolClassStudents(registry, className, studentIds = [], actor = null) {
  const current = normalizeSchoolClassRegistry(registry);
  const target = normalizeSchoolClassName(className);
  const ids = new Set((studentIds || []).map(text).filter(Boolean));
  if (!target || !ids.size) return current;
  const restoredAt = nowIso();
  const selected = [];
  const classes = current.classes.map((item) => {
    if (item.className !== target) return item;
    const students = (item.students || []).map((student) => {
      if (!ids.has(student.id) || !isDeletedSchoolStudent(student)) return student;
      selected.push(student);
      return {
        ...student,
        active: true,
        lifecycleStatus: 'active',
        deletedAt: '',
        deletedBy: '',
        deletedReason: '',
        inactiveAt: '',
        inactiveReason: '',
        updatedAt: restoredAt,
      };
    });
    return { ...item, students, importedCount: activeRosterCount(students) };
  });
  if (!selected.length) return current;
  return {
    ...current,
    updatedAt: restoredAt,
    classes,
    deletionAudit: [
      ...(current.deletionAudit || []),
      ...selected.map((student, index) => ({
        id: `registry-student-restore-${Date.now()}-${index}`,
        action: 'restore',
        className: target,
        studentId: student.id,
        studentCode: student.code || '',
        studentName: student.fullName || '',
        actorId: actor?.id || '',
        actorEmail: actor?.email || '',
        createdAt: restoredAt,
      })),
    ],
  };
}

export function assignHomeroomTeacher(registry, className, teacherId) {
  const current = normalizeSchoolClassRegistry(registry);
  const target = normalizeSchoolClassName(className);
  const selectedTeacherId = text(teacherId);
  return {
    ...current,
    updatedAt: nowIso(),
    classes: current.classes.map((item) => ({
      ...item,
      assignment: {
        ...item.assignment,
        homeroomTeacherId: item.className === target
          ? selectedTeacherId
          : (selectedTeacherId && item.assignment.homeroomTeacherId === selectedTeacherId ? '' : item.assignment.homeroomTeacherId),
      },
    })),
  };
}

export function toggleSubjectTeacher(registry, className, teacherId, enabled) {
  const current = normalizeSchoolClassRegistry(registry);
  const target = normalizeSchoolClassName(className);
  const selectedTeacherId = text(teacherId);
  return {
    ...current,
    updatedAt: nowIso(),
    classes: current.classes.map((item) => {
      if (item.className !== target || !selectedTeacherId) return item;
      const ids = new Set(item.assignment.subjectTeacherIds);
      if (enabled) ids.add(selectedTeacherId);
      else ids.delete(selectedTeacherId);
      return { ...item, assignment: { ...item.assignment, subjectTeacherIds: [...ids] } };
    }),
  };
}

export function schoolClassRegistryStorageKey(user) {
  const scope = text(user?.id || user?.authId || user?.email || 'guest').toLowerCase();
  return `${SCHOOL_CLASS_REGISTRY_STORAGE_PREFIX}:${scope || 'guest'}`;
}
