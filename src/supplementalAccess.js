import './styles/SupplementalClasses.css';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';

export const SUPPLEMENTAL_MANAGER_PROFILE_ID = '4c89bfa1-9e3f-4965-a082-99f6e974f5ba';

export function canManageSupplementalLearning(runtime = {}) {
  const profile = runtime?.profile || null;
  const userId = String(profile?.id || runtime?.user?.id || '').toLowerCase();
  const approved = profile?.approved === true;
  if (!approved || !userId) return false;

  // Backend authorization is based on the approved profile role, so the
  // visibility guard must not accidentally hide an Admin because runtime.role
  // was inferred from a different active assignment.
  const profileRole = String(profile?.role || '').trim().toLowerCase();
  const runtimeRole = normalizeSystemRole(runtime?.role, SYSTEM_ROLES.GUEST);
  const isAdmin = profileRole === 'admin'
    || profileRole === 'administrator'
    || runtimeRole === SYSTEM_ROLES.ADMIN;

  return isAdmin || userId === SUPPLEMENTAL_MANAGER_PROFILE_ID;
}

export function supplementalAccessSnapshot(runtime = {}) {
  return {
    allowed: canManageSupplementalLearning(runtime),
    approved: runtime?.profile?.approved === true,
    profileId: runtime?.profile?.id || runtime?.user?.id || '',
  };
}
