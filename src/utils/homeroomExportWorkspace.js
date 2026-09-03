const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';

function text(value) {
  return String(value ?? '').trim();
}

export function resolveHomeroomExportWorkspaceId({
  renderedWorkspaceId = '',
  assignedWorkspaceId = '',
  panelWorkspaceId = '',
  currentWorkspaceId = '',
} = {}) {
  return text(renderedWorkspaceId)
    || text(assignedWorkspaceId)
    || text(panelWorkspaceId)
    || text(currentWorkspaceId)
    || 'default';
}

export function isAllowedHomeroomExportStorageRead(key, { payloadKey = '', currentKey = '' } = {}) {
  const normalizedKey = text(key);
  if (!normalizedKey) return true;
  if (normalizedKey.startsWith(WORKSPACE_PREFIX)) return normalizedKey === text(payloadKey);
  if (normalizedKey.startsWith(CURRENT_PREFIX)) return normalizedKey === text(currentKey);
  return true;
}

export function activeHomeroomRosterSignature(workspace) {
  const students = (Array.isArray(workspace?.students) ? workspace.students : [])
    .filter((student) => student?.active !== false)
    .map((student) => [
      text(student?.id),
      text(student?.code),
      text(student?.fullName),
      text(student?.birthDate).slice(0, 10),
    ].join('|'))
    .sort();
  return `${text(workspace?.id)}::${students.join('||')}`;
}

export function resolveRenderedHomeroomWorkspace(candidates = [], {
  renderedWorkspaceId = '',
  panelWorkspaceId = '',
} = {}) {
  const items = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const renderedId = text(renderedWorkspaceId);
  if (renderedId) {
    const exact = items.find((item) => text(item?.id) === renderedId);
    if (exact) return exact;
  }

  const panelId = text(panelWorkspaceId);
  if (panelId) {
    const exact = items.find((item) => text(item?.id) === panelId);
    if (exact) return exact;
  }

  return [...items].sort((left, right) => {
    const at = Date.parse(left?.updatedAt || left?.lastOpenedAt || 0) || 0;
    const bt = Date.parse(right?.updatedAt || right?.lastOpenedAt || 0) || 0;
    return bt - at;
  })[0] || null;
}
