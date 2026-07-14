export const SYSTEM_ROLES = Object.freeze({
  ADMIN: 'admin',
  DEPARTMENT_HEAD: 'department_head',
  TEACHER: 'teacher',
  STUDENT: 'student',
  GUEST: 'guest',
});

const ROLE_ALIASES = new Map([
  ['admin', SYSTEM_ROLES.ADMIN],
  ['administrator', SYSTEM_ROLES.ADMIN],
  ['ttcm', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['leader', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['head', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['manager', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['department_head', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['department-head', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['department leader', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['department_leader', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['subject_leader', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['subject leader', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['to_truong', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['tổ trưởng', SYSTEM_ROLES.DEPARTMENT_HEAD],
  ['teacher', SYSTEM_ROLES.TEACHER],
  ['editor', SYSTEM_ROLES.TEACHER],
  ['student', SYSTEM_ROLES.STUDENT],
  ['learner', SYSTEM_ROLES.STUDENT],
  ['guest', SYSTEM_ROLES.GUEST],
]);

export function normalizeSystemRole(value, fallback = SYSTEM_ROLES.TEACHER) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ROLE_ALIASES.get(raw) || fallback;
}

export function isAdminRole(value) {
  return normalizeSystemRole(value, SYSTEM_ROLES.GUEST) === SYSTEM_ROLES.ADMIN;
}

export function isDepartmentLeaderRole(value) {
  const role = normalizeSystemRole(value, SYSTEM_ROLES.GUEST);
  return role === SYSTEM_ROLES.ADMIN || role === SYSTEM_ROLES.DEPARTMENT_HEAD;
}

export function resolveSystemRole({ assignedRole, profileRole, metadataRole, hasUser = false } = {}) {
  const candidates = [assignedRole, profileRole, metadataRole].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeSystemRole(candidate, '');
    if (normalized) return normalized;
  }
  return hasUser ? SYSTEM_ROLES.TEACHER : SYSTEM_ROLES.GUEST;
}
