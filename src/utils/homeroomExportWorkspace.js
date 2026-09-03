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
