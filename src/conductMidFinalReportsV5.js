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

async function replayWithLatestWorkspace(button, panel) {
  const user = await getCurrentUser();
  if (!user?.id && !user?.authId && !user?.email) {
    throw new Error('Không xác định được tài khoản đang đăng nhập để tải dữ liệu rèn luyện mới nhất.');
  }

  const workspaceId = text(
    getCurrentHomeroomWorkspaceId(user)
      || panel?.dataset?.workspaceId,
    'default',
  );
  const result = await loadHomeroomWorkspace(user, workspaceId);
  const workspace = result?.workspace;
  if (!workspace) throw new Error(result?.message || 'Không tải được dữ liệu lớp mới nhất.');

  const key = userKey(user);
  const payloadKey = `${WORKSPACE_PREFIX}${key}:${workspaceId}`;
  const currentKey = `${CURRENT_PREFIX}${key}`;
  const previousPayload = localStorage.getItem(payloadKey);
  const previousCurrent = localStorage.getItem(currentKey);
  const previousPanelWorkspaceId = panel.dataset.workspaceId;

  try {
    // Exporter V2 reads localStorage synchronously. Supply the exact workspace
    // returned by the official store only for the synchronous replay click.
    localStorage.setItem(payloadKey, JSON.stringify(workspace));
    localStorage.setItem(currentKey, workspaceId);
    panel.dataset.workspaceId = workspaceId;
    window.__besConductExportBridgeReplay = true;
    button.click();
  } finally {
    window.__besConductExportBridgeReplay = false;
    if (previousPayload === null) localStorage.removeItem(payloadKey);
    else localStorage.setItem(payloadKey, previousPayload);
    if (previousCurrent === null) localStorage.removeItem(currentKey);
    else localStorage.setItem(currentKey, previousCurrent);
    panel.dataset.workspaceId = previousPanelWorkspaceId || workspaceId;
  }
}

function install() {
  if (window.__besConductExportLiveWorkspaceBridgeInstalled) return;
  window.__besConductExportLiveWorkspaceBridgeInstalled = true;

  document.addEventListener('click', async (event) => {
    if (window.__besConductExportBridgeReplay) return;
    const button = event.target?.closest?.(`#${PANEL_ID} [data-mf-export]`);
    if (!button) return;
    const panel = button.closest(`#${PANEL_ID}`);
    if (!panel) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    clearError(panel);

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Đang đồng bộ dữ liệu mới nhất…';
    try {
      await replayWithLatestWorkspace(button, panel);
    } catch (error) {
      showError(panel, error?.message || 'Không thể tải dữ liệu mới nhất để xuất báo cáo.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);
}

install();
if (typeof window !== 'undefined') window.__besConductExportSourceVersion = 'v7-live-workspace-bridge';
