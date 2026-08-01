export const HOMEROOM_CLASS_TYPE = 'homeroom';
export const SUBJECT_CLASS_TYPE = 'subject';

export const HOMEROOM_CLASS_TYPE_OPTIONS = Object.freeze([
  { value: HOMEROOM_CLASS_TYPE, labelVi: 'Lớp chủ nhiệm', label: 'Homeroom class' },
  { value: SUBJECT_CLASS_TYPE, labelVi: 'Lớp bộ môn', label: 'Subject class' },
]);

export const SUBJECT_CLASS_TAB_KEYS = Object.freeze(['classes', 'students', 'learning']);

export function isValidHomeroomClassType(value) {
  return value === HOMEROOM_CLASS_TYPE || value === SUBJECT_CLASS_TYPE;
}

export function normalizeHomeroomClassType(value, fallback = HOMEROOM_CLASS_TYPE) {
  return isValidHomeroomClassType(value) ? value : fallback;
}

export function getWorkspaceClassType(workspace) {
  return normalizeHomeroomClassType(workspace?.classProfile?.classType);
}

export function isSubjectClass(workspace) {
  return getWorkspaceClassType(workspace) === SUBJECT_CLASS_TYPE;
}

export function getClassTypeLabel(value, language = 'vi') {
  const normalized = normalizeHomeroomClassType(value);
  const option = HOMEROOM_CLASS_TYPE_OPTIONS.find((item) => item.value === normalized);
  return language === 'vi' ? option.labelVi : option.label;
}

export function isClassTabAllowed(tabKey, workspace, isAdmin = false) {
  if (!isSubjectClass(workspace)) return true;
  return SUBJECT_CLASS_TAB_KEYS.includes(tabKey) || (isAdmin && tabKey === 'schoolStats');
}

export function getDefaultClassTab(workspace) {
  return isSubjectClass(workspace) ? 'learning' : 'overview';
}

export function applyCatalogClassType(workspace, catalog = []) {
  const item = catalog.find((entry) => entry.id === workspace?.id);
  if (!item || !isValidHomeroomClassType(item.classType)) return workspace;
  const currentType = getWorkspaceClassType(workspace);
  if (currentType === item.classType) return workspace;
  return {
    ...workspace,
    classProfile: { ...workspace.classProfile, classType: item.classType },
  };
}

export function reconcileHomeroomClassCatalog(items = [], preferredId = '') {
  const normalized = items.map((item) => ({
    ...item,
    classType: normalizeHomeroomClassType(item.classType, SUBJECT_CLASS_TYPE),
    classTypeExplicit: item.classTypeExplicit === true,
    classTypeResolved: item.classTypeResolved === true,
  }));
  const active = normalized.filter((item) => item.status !== 'archived');
  const activeHomerooms = active.filter((item) => item.classType === HOMEROOM_CLASS_TYPE);

  let selectedId = '';
  if (activeHomerooms.length) {
    const trustedHomerooms = activeHomerooms.filter((item) => item.classTypeExplicit || item.classTypeResolved);
    const candidates = trustedHomerooms.length ? trustedHomerooms : activeHomerooms;
    selectedId = candidates.find((item) => item.id === preferredId)?.id || candidates[0].id;
  } else {
    const legacy = active.filter((item) => !item.classTypeExplicit && !item.classTypeResolved);
    selectedId = legacy.find((item) => item.id === preferredId)?.id || legacy[0]?.id || '';
  }

  return normalized.map((item) => {
    if (item.status === 'archived') return { ...item, classTypeResolved: true };
    return {
      ...item,
      classType: item.id === selectedId ? HOMEROOM_CLASS_TYPE : SUBJECT_CLASS_TYPE,
      classTypeResolved: true,
    };
  });
}
