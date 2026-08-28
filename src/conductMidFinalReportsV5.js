import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';

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

async function loadLatestWorkspace(panel) {
  const user = await getCurrentUser();
  if (!user?.id && !user?.authId && !user?.email) {
    throw new Error('Không xác định được tài khoản đang đăng nhập để tải dữ liệu rèn luyện mới nhất.');
  }

  const workspaceId = text(
    panel?.dataset?.workspaceId
      || getCurrentHomeroomWorkspaceId(user),
    'default',
  );
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

function replayExportWithMemoryWorkspace(button, panel, popup, source) {
  const { user, workspaceId, workspace } = source;
  const payloadKey = `${WORKSPACE_PREFIX}${userKey(user)}:${workspaceId}`;
  const currentKey = `${CURRENT_PREFIX}${userKey(user)}`;
  const serializedWorkspace = JSON.stringify(workspace);

  const originalGetItem = Storage.prototype.getItem;
  const originalWindowOpen = window.open;

  try {
    // Export runtimes still read through localStorage synchronously. Intercept only
    // the two reads they need and return the freshly loaded workspace from memory.
    // Nothing is written to Storage, so large classes cannot hit browser quota.
    Storage.prototype.getItem = function patchedGetItem(key) {
      if (this === window.localStorage) {
        if (key === payloadKey) return serializedWorkspace;
        if (key === currentKey) return workspaceId;
      }
      return originalGetItem.call(this, key);
    };

    // Reserve the popup during the real user gesture, then let the synchronous
    // exporter reuse it after the cloud read completes. This avoids popup blockers.
    window.open = () => popup;
    window.__besConductExportBridgeReplay = true;
    button.click();
  } finally {
    window.__besConductExportBridgeReplay = false;
    Storage.prototype.getItem = originalGetItem;
    window.open = originalWindowOpen;
  }
}

function install() {
  if (window.__besConductExportLiveWorkspaceBridgeInstalled) return;
  window.__besConductExportLiveWorkspaceBridgeInstalled = true;

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
    popup.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Đang chuẩn bị báo cáo…</title></head><body style="font-family:Arial,sans-serif;padding:32px">Đang tải dữ liệu rèn luyện mới nhất…</body></html>');
    popup.document.close();

    button.dataset.exportBusy = 'true';
    const originalText = button.textContent;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Đang đồng bộ dữ liệu mới nhất…';

    try {
      const source = await loadLatestWorkspace(panel);
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
  window.__besConductExportSourceVersion = 'v8-memory-workspace-no-quota';
}
