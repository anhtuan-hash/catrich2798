import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import {
  activeHomeroomRosterSignature,
  isAllowedHomeroomExportStorageRead,
  resolveHomeroomExportWorkspaceId,
} from './utils/homeroomExportWorkspace.js';

const PANEL_ID = 'bes-conduct-mid-final-reports';
const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
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

function normalizeStudentCode(value) {
  return fold(value).replace(/\s+/g, '').replace(/^cp0*(\d+)$/, 'cp$1');
}

function identityKey(student) {
  const name = fold(student?.fullName);
  const birthDate = text(student?.birthDate).slice(0, 10);
  return name && birthDate ? `${name}|${birthDate}` : '';
}

function sameStudent(left, right) {
  if (!left || !right) return false;
  if (text(left.id) && text(left.id) === text(right.id)) return true;
  const leftCode = normalizeStudentCode(left.code);
  const rightCode = normalizeStudentCode(right.code);
  if (leftCode && rightCode && leftCode === rightCode) return true;
  const leftIdentity = identityKey(left);
  return Boolean(leftIdentity && leftIdentity === identityKey(right));
}

function canonicalizeWorkspace(workspace) {
  const students = Array.isArray(workspace?.students) ? workspace.students : [];
  const active = students.filter((student) => student?.active !== false);
  const idMap = new Map();

  students.forEach((student) => {
    const canonical = active.find((candidate) => sameStudent(candidate, student));
    if (student?.id && canonical?.id) idMap.set(student.id, canonical.id);
  });

  return {
    ...workspace,
    conductRecords: (Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : []).map((record) => {
      const canonicalId = idMap.get(record.studentId);
      return canonicalId && canonicalId !== record.studentId
        ? { ...record, studentId: canonicalId }
        : record;
    }),
  };
}

function userKey(user) {
  return text(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function renderedWorkspaceId() {
  return text(
    document.querySelector('.hr-editorial-hero[data-workspace-id]')?.dataset?.workspaceId,
  );
}

function showError(panel, message) {
  const box = panel?.querySelector('[data-mf-error]');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
}

function clearError(panel) {
  const box = panel?.querySelector('[data-mf-error]');
  if (!box) return;
  box.textContent = '';
  box.classList.remove('show');
}

function syncPanelScopeVisibility(panel) {
  const personalMode = panel?.querySelector('[data-mf-scope]')?.value === 'personal';
  const studentField = panel?.querySelector('[data-mf-student-field]');
  if (studentField) {
    studentField.hidden = !personalMode;
    if (personalMode) studentField.style.removeProperty('display');
    else studentField.style.setProperty('display', 'none', 'important');
  }
  return personalMode;
}

function syncPanelStudentOptions(panel, workspace) {
  const select = panel?.querySelector('[data-mf-student]');
  if (!select) return { selectionChanged: false, changed: false, studentCount: 0 };

  const personalMode = syncPanelScopeVisibility(panel);
  const previousStudentId = text(select.value);
  const students = (Array.isArray(workspace?.students) ? workspace.students : [])
    .filter((student) => student?.active !== false)
    .sort((left, right) => text(left.fullName).localeCompare(text(right.fullName), 'vi'));
  const rosterSignature = activeHomeroomRosterSignature(workspace);
  const rosterChanged = panel.dataset.liveRosterSignature !== rosterSignature;

  if (rosterChanged) {
    select.replaceChildren(...students.map((student) => {
      const option = document.createElement('option');
      option.value = text(student.id);
      option.textContent = text(student.code)
        ? `${text(student.code)} · ${text(student.fullName)}`
        : text(student.fullName);
      return option;
    }));
    panel.dataset.liveRosterSignature = rosterSignature;
  }

  const previousStillExists = Boolean(previousStudentId)
    && students.some((student) => text(student.id) === previousStudentId);
  if (previousStillExists) select.value = previousStudentId;
  else select.value = personalMode ? '' : text(students[0]?.id);

  return {
    selectionChanged: Boolean(previousStudentId) && !previousStillExists,
    changed: rosterChanged,
    studentCount: students.length,
  };
}

async function loadLatestWorkspace(panel) {
  const user = await getCurrentUser();
  if (!user?.id && !user?.authId && !user?.email) {
    throw new Error('Không xác định được tài khoản đang đăng nhập để tải dữ liệu rèn luyện mới nhất.');
  }

  const workspaceId = resolveHomeroomExportWorkspaceId({
    renderedWorkspaceId: renderedWorkspaceId(),
    assignedWorkspaceId: typeof window !== 'undefined' ? window.__besAssignedHomeroomWorkspaceId : '',
    panelWorkspaceId: panel?.dataset?.workspaceId,
    currentWorkspaceId: getCurrentHomeroomWorkspaceId(user),
  });
  const result = await loadHomeroomWorkspace(user, workspaceId);
  if (!result?.workspace) {
    throw new Error(result?.message || 'Không tải được dữ liệu lớp mới nhất.');
  }

  return {
    user,
    workspaceId,
    workspace: canonicalizeWorkspace(result.workspace),
  };
}

let panelRefreshTimer = 0;
let panelRefreshSequence = 0;

function schedulePanelRefresh(delay = 0) {
  if (typeof window === 'undefined') return;
  window.clearTimeout(panelRefreshTimer);
  const sequence = ++panelRefreshSequence;
  panelRefreshTimer = window.setTimeout(async () => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    syncPanelScopeVisibility(panel);
    try {
      const source = await loadLatestWorkspace(panel);
      if (sequence !== panelRefreshSequence || !panel.isConnected) return;
      panel.dataset.workspaceId = source.workspaceId;
      const rosterSync = syncPanelStudentOptions(panel, source.workspace);
      if (syncPanelScopeVisibility(panel) && rosterSync.selectionChanged) {
        showError(panel, 'Danh sách học sinh đã được đồng bộ theo đúng lớp đang mở. Hãy chọn lại học sinh cần xuất báo cáo.');
      }
    } catch (error) {
      console.warn('[ConductReportRoster] Không thể đồng bộ panel báo cáo.', error);
    }
  }, Math.max(0, Number(delay) || 0));
}

function replayExportWithMemoryWorkspace(button, panel, popup, source) {
  const { user, workspaceId, workspace } = source;
  const payloadKey = `${WORKSPACE_PREFIX}${userKey(user)}:${workspaceId}`;
  const currentKey = `${CURRENT_PREFIX}${userKey(user)}`;
  const serializedWorkspace = JSON.stringify(workspace);

  const originalGetItem = Storage.prototype.getItem;
  const originalWindowOpen = window.open;

  try {
    // Legacy exporters enumerate every Homeroom key in localStorage. During this
    // replay, expose only the exact rendered workspace so a same-name class from
    // another year/account can never win by updatedAt.
    Storage.prototype.getItem = function patchedGetItem(key) {
      if (this === window.localStorage) {
        if (!isAllowedHomeroomExportStorageRead(key, { payloadKey, currentKey })) return null;
        if (key === payloadKey) return serializedWorkspace;
        if (key === currentKey) return workspaceId;
      }
      return originalGetItem.call(this, key);
    };

    // Keep the report panel pinned to the class that is actually rendered. Do not
    // restore a stale panel id after export; future exports should stay on this class.
    panel.dataset.workspaceId = workspaceId;

    // Reserve the popup during the real user gesture, then let the synchronous
    // exporter reuse it after the cloud read completes. This avoids popup blockers.
    window.open = () => popup;
    window.__besConductExportBridgeReplay = true;
    button.click();
  } finally {
    window.__besConductExportBridgeReplay = false;
    panel.dataset.workspaceId = workspaceId;
    Storage.prototype.getItem = originalGetItem;
    window.open = originalWindowOpen;
  }
}

function install() {
  if (window.__besConductExportLiveWorkspaceBridgeInstalled) return;
  window.__besConductExportLiveWorkspaceBridgeInstalled = true;

  // Keep the report controls synchronized even before the user clicks Export.
  // The legacy panel only keyed refreshes by workspace id, so roster changes inside
  // the same class could leave a stale student dropdown indefinitely.
  const panelObserver = new MutationObserver((records) => {
    const panelAppeared = records.some((record) => Array.from(record.addedNodes || []).some((node) => (
      node?.nodeType === 1
      && (node.id === PANEL_ID || node.querySelector?.(`#${PANEL_ID}`))
    )));
    if (panelAppeared) schedulePanelRefresh(0);
  });
  panelObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('bes-homeroom-store-updated', () => schedulePanelRefresh(20));
  window.addEventListener('bes-school-class-assignment-synced', () => schedulePanelRefresh(40));
  window.addEventListener('bes-homeroom-command', () => schedulePanelRefresh(120));
  window.addEventListener('hashchange', () => schedulePanelRefresh(120));
  document.addEventListener('change', (event) => {
    const scope = event.target?.closest?.(`#${PANEL_ID} [data-mf-scope]`);
    if (!scope) return;
    const panel = scope.closest(`#${PANEL_ID}`);
    syncPanelScopeVisibility(panel);
    schedulePanelRefresh(0);
  }, true);
  schedulePanelRefresh(0);

  // Capture at window level so this source-of-truth bridge always runs before the
  // older document-level V4/V2 listeners, regardless of dynamic-import order.
  window.addEventListener('click', async (event) => {
    if (window.__besConductExportBridgeReplay) return;
    const button = event.target?.closest?.(`#${PANEL_ID} [data-mf-export]`);
    if (!button) return;
    const panel = button.closest(`#${PANEL_ID}`);
    if (!panel) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (button.dataset.exportBusy === 'true') return;

    clearError(panel);
    const popup = window.open('', '_blank', 'width=1180,height=880,scrollbars=yes');
    if (!popup) {
      showError(panel, 'Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
      return;
    }
    popup.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Đang chuẩn bị báo cáo…</title></head><body style="font-family:Arial,sans-serif;padding:32px">Đang tải đúng dữ liệu lớp đang mở…</body></html>');
    popup.document.close();

    button.dataset.exportBusy = 'true';
    const originalText = button.textContent;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Đang đồng bộ đúng danh sách lớp…';

    try {
      const source = await loadLatestWorkspace(panel);
      panel.dataset.workspaceId = source.workspaceId;
      const rosterSync = syncPanelStudentOptions(panel, source.workspace);
      const personalMode = syncPanelScopeVisibility(panel);
      if (personalMode && rosterSync.selectionChanged) {
        try { popup.close(); } catch { /* optional */ }
        showError(panel, 'Danh sách học sinh vừa được đồng bộ theo đúng lớp đang mở. Hãy chọn lại học sinh rồi xuất báo cáo.');
        return;
      }
      replayExportWithMemoryWorkspace(button, panel, popup, source);
    } catch (error) {
      try { popup.close(); } catch { /* optional */ }
      showError(panel, error?.message || 'Không thể tải dữ liệu mới nhất để xuất báo cáo.');
    } finally {
      delete button.dataset.exportBusy;
      button.removeAttribute('aria-busy');
      button.textContent = originalText;
    }
  }, true);
}

install();
if (typeof window !== 'undefined') {
  window.__besConductExportSourceVersion = 'v11-live-roster-panel-sync';
}
