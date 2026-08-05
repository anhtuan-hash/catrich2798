import { isSupabaseConfigured, supabase } from './supabase.js';

const STATUS_PREFIX = 'bes-homeroom-drive-backup-status-v1';
const BACKUP_EVENT = 'bes-homeroom-drive-backup-updated';
const DEFAULT_DELAY_MS = 12_000;
const pendingBackups = new Map();

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function userKey(user) {
  return safeText(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function statusKey(user, workspaceId) {
  return `${STATUS_PREFIX}:${userKey(user)}:${safeText(workspaceId, 'default')}`;
}

function emitStatus(status) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BACKUP_EVENT, { detail: status }));
}

function saveStatus(user, workspaceId, patch = {}) {
  const status = {
    workspaceId,
    updatedAt: new Date().toISOString(),
    ...loadHomeroomDriveBackupStatus(user, workspaceId),
    ...patch,
  };
  try { localStorage.setItem(statusKey(user, workspaceId), JSON.stringify(status)); } catch { /* optional cache */ }
  emitStatus(status);
  return status;
}

export function loadHomeroomDriveBackupStatus(user, workspaceId = 'default') {
  try {
    const parsed = JSON.parse(localStorage.getItem(statusKey(user, workspaceId)) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : { workspaceId, state: 'idle' };
  } catch {
    return { workspaceId, state: 'idle' };
  }
}

function compactWorkspace(workspace) {
  const source = workspace && typeof workspace === 'object' ? workspace : {};
  const clone = typeof structuredClone === 'function'
    ? structuredClone(source)
    : JSON.parse(JSON.stringify(source));

  clone.backups = Array.isArray(clone.backups)
    ? clone.backups.map(({ snapshot, ...metadata }) => ({ ...metadata, snapshotStoredInSupabase: Boolean(snapshot) }))
    : [];

  clone.announcements = Array.isArray(clone.announcements)
    ? clone.announcements.map((item) => {
      if (!item?.attachmentData) return item;
      const { attachmentData, ...rest } = item;
      return { ...rest, attachmentDataOmittedFromDriveBackup: true };
    })
    : [];

  clone.attachments = Array.isArray(clone.attachments)
    ? clone.attachments.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const { data, base64, content, ...metadata } = item;
      return {
        ...metadata,
        binaryOmittedFromDriveBackup: Boolean(data || base64 || content),
      };
    })
    : [];

  return clone;
}

async function sha256Text(text) {
  if (!globalThis.crypto?.subtle) return '';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function accessToken() {
  if (!isSupabaseConfigured || !supabase) return '';
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

export async function backupHomeroomWorkspaceToDrive(workspace, user, options = {}) {
  const workspaceId = safeText(workspace?.id);
  if (!workspaceId || !user?.id || !isSupabaseConfigured || !supabase) {
    return { ok: false, skipped: true, reason: 'cloud-unavailable' };
  }

  const compact = compactWorkspace(workspace);
  const serialized = JSON.stringify(compact);
  const clientHash = await sha256Text(serialized);
  const previous = loadHomeroomDriveBackupStatus(user, workspaceId);
  if (!options.force && clientHash && previous.contentHash === clientHash && previous.state === 'success') {
    return { ok: true, skipped: true, unchanged: true, status: previous };
  }

  const token = await accessToken();
  if (!token) {
    const status = saveStatus(user, workspaceId, { state: 'error', error: 'Phiên đăng nhập đã hết hạn.' });
    return { ok: false, reason: status.error, status };
  }

  saveStatus(user, workspaceId, { state: 'uploading', error: '', contentHash: clientHash });
  try {
    const response = await fetch('/api/google-drive-homeroom-backup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace: compact,
        clientHash,
        schemaVersion: 1,
        reason: safeText(options.reason, 'automatic-after-supabase-sync'),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không thể sao lưu dữ liệu GVCN lên Google Drive.');
    const status = saveStatus(user, workspaceId, {
      state: 'success',
      error: '',
      contentHash: data.contentHash || clientHash,
      backedUpAt: data.backedUpAt || new Date().toISOString(),
      encrypted: data.encrypted !== false,
      folderId: data.folderId || '',
      currentFile: data.currentFile || null,
      dailyFile: data.dailyFile || null,
    });
    return { ok: true, data, status };
  } catch (error) {
    const status = saveStatus(user, workspaceId, {
      state: 'error',
      error: error?.message || 'Không thể sao lưu lên Google Drive.',
    });
    return { ok: false, reason: status.error, status };
  }
}

export function scheduleHomeroomDriveBackup(workspace, user, options = {}) {
  const workspaceId = safeText(workspace?.id);
  if (!workspaceId || !user?.id || !isSupabaseConfigured || !supabase) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'cloud-unavailable' });
  }

  const key = `${userKey(user)}:${workspaceId}`;
  const existing = pendingBackups.get(key);
  if (existing?.timer) window.clearTimeout(existing.timer);

  return new Promise((resolve) => {
    const timer = window.setTimeout(async () => {
      const latest = pendingBackups.get(key);
      pendingBackups.delete(key);
      const result = await backupHomeroomWorkspaceToDrive(latest?.workspace || workspace, user, {
        ...options,
        reason: safeText(latest?.reason || options.reason, 'automatic-after-supabase-sync'),
      });
      (latest?.resolvers || [resolve]).forEach((done) => done(result));
    }, Math.max(1000, Number(options.delayMs || DEFAULT_DELAY_MS)));

    pendingBackups.set(key, {
      timer,
      workspace,
      reason: options.reason,
      resolvers: [...(existing?.resolvers || []), resolve],
    });
    saveStatus(user, workspaceId, { state: 'scheduled', error: '' });
  });
}

export { BACKUP_EVENT as HOMEROOM_DRIVE_BACKUP_EVENT };
