export const V2_PREVIEW_ROLES = {
  teacher: {
    id: 'teacher',
    label: 'Giáo viên',
    shortLabel: 'GV',
    description: 'Tác vụ dạy học, lớp, học sinh, báo cáo cá nhân và cài đặt.',
  },
  leader: {
    id: 'leader',
    label: 'TTCM',
    shortLabel: 'TTCM',
    description: 'Quyền giáo viên cộng các trạng thái duyệt/chia sẻ cấp tổ khi module hỗ trợ.',
  },
  admin: {
    id: 'admin',
    label: 'Quản trị viên',
    shortLabel: 'ADMIN',
    description: 'Toàn bộ vùng preview, bao gồm Quản trị, Cloud Operations và UI Lab.',
  },
};

const COMMON_ROUTES = new Set([
  'home', 'apps', 'teaching-tools', 'games', 'resources', 'knowledge-hub', 'news',
  'homeroom', 'classes', 'students', 'dashboard', 'work-hub', 'assessment',
  'collaboration', 'reports', 'settings',
]);

export function normalizePreviewRole(value) {
  return V2_PREVIEW_ROLES[value] ? value : 'teacher';
}

export function canPreviewTarget(roleValue, target) {
  const role = normalizePreviewRole(roleValue);
  const id = String(target || '').replace(/^#?\/?/, '');
  if (!id) return true;
  if (id.startsWith('tool/')) return true;
  if (COMMON_ROUTES.has(id)) return true;
  if (id === 'admin' || id === 'cloud' || id === 'ui-lab') return role === 'admin';
  return false;
}

export function getPreviewRoleMeta(roleValue) {
  return V2_PREVIEW_ROLES[normalizePreviewRole(roleValue)];
}

export function readStoredPreviewRole() {
  if (typeof window === 'undefined') return 'teacher';
  try {
    return normalizePreviewRole(window.localStorage.getItem('brian-v2-preview-role'));
  } catch {
    return 'teacher';
  }
}

export function storePreviewRole(roleValue) {
  const role = normalizePreviewRole(roleValue);
  try { window.localStorage.setItem('brian-v2-preview-role', role); } catch { /* preview persistence is optional */ }
  return role;
}
