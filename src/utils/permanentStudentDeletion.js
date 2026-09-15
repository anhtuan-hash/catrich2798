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
