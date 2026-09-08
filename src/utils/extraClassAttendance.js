const text = (value) => String(value ?? '').trim();

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
  return fold(value).replace(/\s+/g, '-').replace(/^-|-$/g, '');
}

function normalizedStudentCode(value) {
  const raw = text(value);
  if (!raw) return '';
  if (/^\d+(?:\.0+)?$/.test(raw)) return raw.replace(/\.0+$/, '');
  return raw;
}

export const ABSENCE_REASON_OPTIONS = [
  { value: 'excused', label: 'Có phép' },
  { value: 'unexcused', label: 'Không phép' },
  { value: 'sick', label: 'Ốm' },
  { value: 'family', label: 'Việc gia đình' },
  { value: 'other', label: 'Khác' },
];

export const ATTENDANCE_SUBJECT_HUB = [
  { key: 'all', label: 'Tất cả' },
  { key: 'math', label: 'Toán' },
  { key: 'casio', label: 'Toán/Casio' },
  { key: 'literature', label: 'Ngữ văn' },
  { key: 'english', label: 'Tiếng Anh' },
  { key: 'physics', label: 'Vật lí' },
  { key: 'chemistry', label: 'Hóa học' },
  { key: 'biology', label: 'Sinh học' },
  { key: 'history', label: 'Lịch sử' },
  { key: 'geography', label: 'Địa lí' },
];

export function attendanceSubjectKey(value) {
  const normalized = fold(value);
  if (!normalized) return 'other';
  if (normalized.includes('casio')) return 'casio';
  if (normalized === 'toan' || normalized.includes('toan hoc')) return 'math';
  if (normalized.includes('ngu van') || normalized === 'van') return 'literature';
  if (normalized.includes('tieng anh') || normalized === 'anh' || normalized.includes('english')) return 'english';
  if (normalized.includes('vat li') || normalized.includes('vat ly') || normalized === 'ly') return 'physics';
  if (normalized.includes('hoa hoc') || normalized === 'hoa') return 'chemistry';
  if (normalized.includes('sinh hoc') || normalized === 'sinh') return 'biology';
  if (normalized.includes('lich su') || normalized === 'su') return 'history';
  if (normalized.includes('dia li') || normalized.includes('dia ly') || normalized === 'dia') return 'geography';
  return 'other';
}

export function normalizeExtraClassType(value) {
  const normalized = fold(value);
  if (!normalized) return '';
  if (
    normalized === 'remedial'
    || normalized.includes('phu dao')
    || normalized.includes('bo sung kien thuc')
    || normalized.includes('cung co')
  ) return 'remedial';
  if (
    normalized === 'gifted'
    || normalized.includes('boi duong hsg')
    || normalized.includes('boi duong hoc sinh gioi')
    || normalized.includes('hoc sinh gioi')
    || normalized.includes('hsg')
  ) return 'gifted';
  return '';
}

export function extraClassTypeLabel(value) {
  return normalizeExtraClassType(value) === 'gifted' ? 'Bồi dưỡng HSG' : 'Phụ đạo';
}

export function memberKey(student = {}) {
  const code = normalizedStudentCode(student.student_code ?? student.code);
  if (code) return `code:${code.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
  const fullName = text(student.student_full_name ?? student.full_name ?? student.fullName);
  const schoolClass = text(student.school_class_name ?? student.class_name ?? student.className);
  const fallback = slug(`${fullName}-${schoolClass}`);
  return fallback ? `identity:${fallback}` : '';
}

function headerIndex(headers, aliases) {
  const normalized = (headers || []).map(fold);
  return normalized.findIndex((value) => aliases.includes(value));
}

function cleanSchoolClassName(value) {
  return text(value)
    .replace(/^lớp\s*/i, '')
    .replace(/^lop\s*/i, '')
    .replace(/\s+/g, '');
}

export function parseExtraClassRosterRows(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('Tệp Excel chưa có dữ liệu lớp phụ đạo/bồi dưỡng.');
  }

  const headers = rows[0] || [];
  const columns = {
    classType: headerIndex(headers, ['loai lop', 'loai', 'class type', 'type']),
    extraClassName: headerIndex(headers, ['ten lop', 'lop phu dao boi duong', 'ten lop phu dao boi duong', 'extra class', 'extra class name']),
    subject: headerIndex(headers, ['mon', 'mon hoc', 'subject']),
    teacher: headerIndex(headers, ['giao vien', 'giao vien dung lop', 'gv', 'teacher', 'teacher name']),
    teacherEmail: headerIndex(headers, ['email giao vien', 'teacher email', 'email gv']),
    studentCode: headerIndex(headers, ['ma hs', 'ma hoc sinh', 'student id', 'student code']),
    fullName: headerIndex(headers, ['ho va ten', 'ho ten', 'ten hoc sinh', 'student name', 'full name']),
    schoolClass: headerIndex(headers, ['lop chinh khoa', 'lop hien tai', 'lop', 'regular class', 'school class']),
  };

  const missing = [];
  if (columns.classType < 0) missing.push('Loại lớp');
  if (columns.extraClassName < 0) missing.push('Tên lớp');
  if (columns.teacher < 0 && columns.teacherEmail < 0) missing.push('Giáo viên');
  if (columns.fullName < 0) missing.push('Họ và tên');
  if (columns.schoolClass < 0) missing.push('Lớp chính khóa');
  if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(', ')}.`);

  const entries = [];
  const warnings = [];
  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const fullName = text(row?.[columns.fullName]);
    const extraClassName = text(row?.[columns.extraClassName]);
    if (!fullName && !extraClassName) return;

    const classType = normalizeExtraClassType(row?.[columns.classType]);
    const teacherName = columns.teacher >= 0 ? text(row?.[columns.teacher]) : '';
    const teacherEmail = columns.teacherEmail >= 0 ? text(row?.[columns.teacherEmail]).toLowerCase() : '';
    const schoolClassName = cleanSchoolClassName(row?.[columns.schoolClass]);
    const studentCode = columns.studentCode >= 0 ? normalizedStudentCode(row?.[columns.studentCode]) : '';

    if (!classType) {
      warnings.push(`Dòng ${rowNumber}: “${text(row?.[columns.classType]) || 'trống'}” chưa xác định được là Phụ đạo hay Bồi dưỡng HSG.`);
      return;
    }
    if (!extraClassName) {
      warnings.push(`Dòng ${rowNumber}: thiếu tên lớp phụ đạo/bồi dưỡng.`);
      return;
    }
    if (!teacherName && !teacherEmail) {
      warnings.push(`Dòng ${rowNumber}: thiếu giáo viên đứng lớp.`);
      return;
    }
    if (!fullName) {
      warnings.push(`Dòng ${rowNumber}: thiếu họ tên học sinh.`);
      return;
    }
    if (!schoolClassName) {
      warnings.push(`Dòng ${rowNumber}: thiếu lớp chính khóa của ${fullName}.`);
      return;
    }

    const entry = {
      class_type: classType,
      class_name: extraClassName,
      subject: columns.subject >= 0 ? text(row?.[columns.subject]) : '',
      teacher_name: teacherName,
      teacher_email: teacherEmail,
      student_code: studentCode,
      student_full_name: fullName,
      school_class_name: schoolClassName,
    };
    entry.member_key = memberKey(entry);
    if (!entry.member_key) {
      warnings.push(`Dòng ${rowNumber}: không tạo được mã thành viên cho ${fullName}.`);
      return;
    }
    entries.push(entry);
  });

  if (!entries.length) {
    throw new Error(warnings[0] || 'Không tìm thấy học sinh hợp lệ trong tệp Excel.');
  }

  const groups = new Map();
  entries.forEach((entry) => {
    const key = [
      entry.class_type,
      fold(entry.class_name),
      fold(entry.subject),
      entry.teacher_email || fold(entry.teacher_name),
    ].join('|');
    const current = groups.get(key) || {
      key,
      class_type: entry.class_type,
      class_name: entry.class_name,
      subject: entry.subject,
      teacher_name: entry.teacher_name,
      teacher_email: entry.teacher_email,
      members: [],
    };
    current.members.push(entry);
    groups.set(key, current);
  });

  return {
    entries,
    groups: [...groups.values()],
    totalStudents: entries.length,
    totalClasses: groups.size,
    warnings,
  };
}

export function buildAttendanceDraft(members = []) {
  return (Array.isArray(members) ? members : [])
    .filter((member) => member?.active !== false)
    .map((member) => ({ ...member, present: true, absence_reason_code: '', absence_note: '' }));
}

export function attendanceSummary(draft = []) {
  const items = Array.isArray(draft) ? draft : [];
  const total = items.length;
  const present = items.reduce((count, item) => count + (item?.present === false ? 0 : 1), 0);
  return { total, present, absent: total - present };
}

export function sortMembersByName(members = []) {
  return [...(Array.isArray(members) ? members : [])].sort((left, right) => (
    text(left?.student_full_name ?? left?.full_name).localeCompare(
      text(right?.student_full_name ?? right?.full_name),
      'vi',
      { sensitivity: 'base' },
    )
  ));
}
