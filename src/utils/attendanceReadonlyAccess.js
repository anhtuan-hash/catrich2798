export const ATTENDANCE_READ_ONLY_PERMISSION_IDS = Object.freeze([
  'attendance:calendar',
  'attendance:history',
]);

/**
 * Returns an Attendance-scoped user view that always exposes the two read-only
 * surfaces to authenticated users while preserving every explicit permission
 * the account already has.
 *
 * This does not mutate the source profile and deliberately does not add any
 * write-capable Attendance permission (quick/manage/report).
 */
export function withAttendanceReadOnlyAccess(user) {
  if (!user?.id) return user;

  const sourcePermissions = user.permissions && typeof user.permissions === 'object'
    ? user.permissions
    : { mode: 'all', allowed: [] };
  const sourceAllowed = Array.isArray(sourcePermissions.allowed)
    ? sourcePermissions.allowed.filter((permissionId) => typeof permissionId === 'string' && permissionId.trim())
    : [];
  const allowed = Array.from(new Set([
    ...sourceAllowed,
    ...ATTENDANCE_READ_ONLY_PERMISSION_IDS,
  ]));

  return {
    ...user,
    permissions: {
      ...sourcePermissions,
      allowed,
    },
  };
}
