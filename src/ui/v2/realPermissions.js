import { hasRouteAccess, hasToolAccess, summarizePermissions } from '../../utils/permissions.js';
import { isAdminRole, isDepartmentLeaderRole, normalizeSystemRole } from '../../utils/roles.js';
import { canPreviewTarget, getPreviewRoleMeta, normalizePreviewRole } from './previewPermissions.js';

const V2_TO_V1_ROUTE = Object.freeze({
  home: 'home',
  apps: 'apps',
  'teaching-tools': 'tools',
  games: 'games',
  resources: 'resource-library',
  'knowledge-hub': 'knowledge-hub',
  news: 'news',
  homeroom: 'homeroom',
  classes: 'homeroom',
  students: 'homeroom',
  dashboard: 'dashboard',
  reports: 'homeroom',
  'work-hub': 'work-hub',
  assessment: 'assessment-core',
  collaboration: 'collaboration-hub',
  settings: 'settings',
  admin: 'admin',
  cloud: 'cloud-operations',
});

export function getRealRoleMeta(user, previewRole = 'teacher') {
  if (!user?.id) return { ...getPreviewRoleMeta(previewRole), mode: 'preview', summary: 'Shadow role simulator' };
  const role = normalizeSystemRole(user.role);
  if (isAdminRole(role)) return { id: 'admin', label: 'Quản trị viên', shortLabel: 'ADMIN', description: 'Quyền thực từ phiên Brian hiện tại.', mode: 'real', summary: summarizePermissions(user, 'vi') };
  if (isDepartmentLeaderRole(role)) return { id: 'leader', label: 'TTCM', shortLabel: 'TTCM', description: 'Quyền TTCM thực từ phiên Brian hiện tại.', mode: 'real', summary: summarizePermissions(user, 'vi') };
  return { id: 'teacher', label: 'Giáo viên', shortLabel: 'GV', description: 'Quyền giáo viên thực từ phiên Brian hiện tại.', mode: 'real', summary: summarizePermissions(user, 'vi') };
}

export function canUseV2Target(user, previewRole, target) {
  const id = String(target || '').replace(/^#?\/?/, '');
  if (!id) return true;
  if (!user?.id) return canPreviewTarget(normalizePreviewRole(previewRole), id);
  if (id === 'ui-lab') return isAdminRole(user.role);
  if (id.startsWith('tool/')) return hasToolAccess(user, id.slice(5));
  const v1Route = V2_TO_V1_ROUTE[id];
  if (!v1Route) return false;
  return hasRouteAccess(user, v1Route);
}

export function getV2PermissionMode(user) {
  return user?.id ? 'real' : 'preview';
}

export function getMappedV1Route(target) {
  return V2_TO_V1_ROUTE[String(target || '').replace(/^#?\/?/, '')] || '';
}
