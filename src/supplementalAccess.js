import './styles/SupplementalClasses.css';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';

function allowedPermissionSet(profile = null) {
  const raw = profile?.permissions?.allowed;
  if (Array.isArray(raw)) {
    return new Set(raw.map((value) => String(value || '').trim()).filter(Boolean));
  }
  if (raw && typeof raw === 'object') {
    return new Set(Object.entries(raw)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => String(key || '').trim())
      .filter(Boolean));
  }
  return new Set();
}

export function canManageSupplementalLearning(runtime = {}) {
  const profile = runtime?.profile || null;
  const userId = String(profile?.id || runtime?.user?.id || '').toLowerCase();
  const approved = profile?.approved === true;
  if (!approved || !userId) return false;

  const profileRole = String(profile?.role || '').trim().toLowerCase();
  const runtimeRole = normalizeSystemRole(runtime?.role, SYSTEM_ROLES.GUEST);
  const isAdmin = profileRole === 'admin'
    || profileRole === 'administrator'
    || runtimeRole === SYSTEM_ROLES.ADMIN;

  // Keep the client visibility rule aligned with backend authorization:
  // approved Admins or users explicitly granted attendance:manage.
  return isAdmin || allowedPermissionSet(profile).has('attendance:manage');
}

export function supplementalAccessSnapshot(runtime = {}) {
  return {
    allowed: canManageSupplementalLearning(runtime),
    approved: runtime?.profile?.approved === true,
    profileId: runtime?.profile?.id || runtime?.user?.id || '',
  };
}
