function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
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

export function normalizePermanentStudentCode(value) {
  return fold(value).replace(/\s+/g, '').replace(/^cp0*(\d+)$/, 'cp$1');
}

export function permanentStudentIdentity(student) {
  return `${fold(student?.fullName)}|${text(student?.birthDate)}`;
}

export function createPermanentStudentTombstone(student, deletedAt = new Date().toISOString()) {
  return {
    id: text(student?.id),
    code: normalizePermanentStudentCode(student?.code),
    identity: permanentStudentIdentity(student),
    fullName: text(student?.fullName),
    birthDate: text(student?.birthDate),
    deletedAt: text(deletedAt),
  };
}

function tombstoneKey(item) {
  return text(item?.id || item?.code || item?.identity);
}

export function mergePermanentStudentTombstones(existing = [], students = [], deletedAt = new Date().toISOString()) {
  const byIdentity = new Map();
  (Array.isArray(existing) ? existing : []).forEach((item) => {
    const normalized = {
      ...item,
      id: text(item?.id),
      code: normalizePermanentStudentCode(item?.code),
      identity: text(item?.identity) || permanentStudentIdentity(item),
      fullName: text(item?.fullName),
      birthDate: text(item?.birthDate),
      deletedAt: text(item?.deletedAt),
    };
    const key = tombstoneKey(normalized);
    if (key) byIdentity.set(key, normalized);
  });
  (Array.isArray(students) ? students : []).forEach((student) => {
    const tombstone = createPermanentStudentTombstone(student, deletedAt);
    const key = tombstoneKey(tombstone);
    if (key) byIdentity.set(key, tombstone);
  });
  return [...byIdentity.values()];
}

export function studentMatchesPermanentDeletion(student, tombstones = []) {
  if (!student) return false;
  const id = text(student?.id);
  const code = normalizePermanentStudentCode(student?.code);
  const identity = permanentStudentIdentity(student);
  return (Array.isArray(tombstones) ? tombstones : []).some((item) => {
    const tombstoneId = text(item?.id);
    const tombstoneCode = normalizePermanentStudentCode(item?.code);
    const tombstoneIdentity = text(item?.identity) || permanentStudentIdentity(item);
    if (id && tombstoneId && id === tombstoneId) return true;
    if (code && tombstoneCode && code === tombstoneCode) return true;
    return identity !== '|' && tombstoneIdentity !== '|' && identity === tombstoneIdentity;
  });
}

export function filterPermanentlyDeletedStudents(students = [], tombstones = []) {
  return (Array.isArray(students) ? students : []).filter((student) => (
    !studentMatchesPermanentDeletion(student, tombstones)
  ));
}


/**
 * Remove archived records from the class payload, including linked attendance,
 * conduct, student records and historical backup snapshots. This does not
 * touch active students. Durable tombstones prevent assignment imports from
 * silently resurrecting records on the next login.
 */
export function permanentlyRemoveArchivedStudents(workspace, requestedIds, actor = null) {
  const ids = new Set((Array.isArray(requestedIds) ? requestedIds : []).map((id) => String(id)));
  if (!ids.size) throw new Error('Chưa chọn học sinh đã lưu trữ để xóa.');
  const roster = Array.isArray(workspace?.students) ? workspace.students : [];
  const toDelete = roster.filter((item) => ids.has(String(item.id)) && item.active === false);
  if (toDelete.length !== ids.size) {
    throw new Error('Danh sách đã thay đổi. Chỉ học sinh đã lưu trữ mới được xóa vĩnh viễn.');
  }

  // Remove references keyed by student ID or containing a student ID. Keep
  // unrelated class-wide data and other students' records unchanged.
  const purge = (value, collectionKey = '') => {
    if (Array.isArray(value)) {
      return value.filter((item) => {
        if (typeof item === 'string') return !ids.has(item);
        if (!item || typeof item !== 'object') return true;
        if (ids.has(String(item.studentId ?? '')) || ids.has(String(item.student_id ?? ''))) return false;
        // Backup snapshots store full student rows, not studentId references.
        // Never allow a restored backup to resurrect an erased student.
        return !ids.has(String(item.id ?? '')) || (
          collectionKey !== 'students' && item.fullName == null && item.code == null
        );
      }).map((item) => purge(item));
    }
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key, item]) => !ids.has(key)
        && !(item && typeof item === 'object'
          && (ids.has(String(item.studentId ?? '')) || ids.has(String(item.student_id ?? '')))))
      .map(([key, item]) => [key, purge(item, key)]));
  };

  const timestamp = new Date().toISOString();
  const cleaned = purge(workspace);
  return {
    ...cleaned,
    students: roster.filter((item) => !ids.has(String(item.id))),
    studentPermanentDeletionTombstones: mergePermanentStudentTombstones(
      workspace.studentPermanentDeletionTombstones || [], toDelete, timestamp,
    ),
    studentPermanentDeletionAudit: [
      ...(cleaned.studentPermanentDeletionAudit || []),
      {
        id: `archived-student-delete-${Date.now()}`,
        count: toDelete.length,
        deletedAt: timestamp,
        deletedBy: text(actor?.email || actor?.name || actor?.id),
      },
    ],
    updatedAt: timestamp,
  };
}
