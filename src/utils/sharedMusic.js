import { getAccessToken } from './resourceLibrary.js';
import { isAdminRole } from './roles.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const TABLE = 'shared_music_settings';
const LEGACY_BUCKET = 'shared-music';
const WORKSPACE_KEY = 'english-hub';
const EVENT_NAME = 'bes-shared-music-updated';
const CACHE_PREFIX = 'bes-shared-music-v2';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12;
const SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const signedUrlCache = new Map();
const signedUrlRequests = new Map();
let subscriptionSerial = 0;

function userKey(user) {
  return String(user?.id || user?.email || 'guest').replace(/[^a-z0-9._-]/gi, '-').slice(0, 96) || 'guest';
}

function cacheKey(user) {
  return `${CACHE_PREFIX}:${userKey(user)}`;
}

function cleanText(value) {
  return String(value || '').trim();
}

function safeFileName(value) {
  const original = cleanText(value) || 'background-music.mp3';
  const dot = original.lastIndexOf('.');
  const extension = dot >= 0 ? original.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '.mp3';
  const base = (dot >= 0 ? original.slice(0, dot) : original)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'background-music';
  return `${base}${extension.slice(0, 8)}`;
}

function displayTitleFromFile(file) {
  const name = cleanText(file?.name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return name || 'Background music';
}

function isAudioFile(file) {
  if (!file) return false;
  const mime = cleanText(file.type).toLowerCase();
  const extension = cleanText(file.name).toLowerCase().split('.').pop();
  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'].includes(extension)
    && (!mime || mime.startsWith('audio/') || mime === 'application/octet-stream');
}

function isDriveFileId(value) {
  const raw = cleanText(value);
  return raw.length >= 10 && !raw.includes('/') && /^[A-Za-z0-9_-]+$/.test(raw);
}

function emptySnapshot(extra = {}) {
  return {
    track: null,
    shared: false,
    updatedAt: '',
    updatedBy: '',
    source: 'empty',
    status: 'idle',
    error: '',
    setupRequired: false,
    ...extra,
  };
}

function normalizeTrack(value = {}) {
  const path = cleanText(value.path || value.track_path);
  if (!path) return null;
  return {
    path,
    provider: isDriveFileId(path) ? 'google-drive' : 'supabase-storage-legacy',
    title: cleanText(value.title || value.track_title || value.name || value.track_name) || 'Background music',
    fileName: cleanText(value.fileName || value.track_name),
    mimeType: cleanText(value.mimeType || value.track_mime),
    size: Math.max(0, Number(value.size || value.track_size) || 0),
    signedUrl: cleanText(value.signedUrl || value.signed_url),
    signedUntil: cleanText(value.signedUntil || value.signed_until),
  };
}

function normalizeSnapshot(value = {}) {
  const track = normalizeTrack(value.track || value);
  return emptySnapshot({
    track,
    shared: value.shared === true,
    updatedAt: cleanText(value.updatedAt || value.updated_at),
    updatedBy: cleanText(value.updatedBy || value.updated_by_email || value.updated_by),
    source: cleanText(value.source) || 'local',
    status: cleanText(value.status) || 'idle',
    error: cleanText(value.error),
    setupRequired: Boolean(value.setupRequired),
  });
}

export function canManageSharedMusic(user) {
  return isAdminRole(user?.role);
}

export function readSharedMusicLocal(user) {
  if (typeof window === 'undefined') return emptySnapshot();
  try {
    return normalizeSnapshot(JSON.parse(window.localStorage.getItem(cacheKey(user)) || '{}'));
  } catch {
    return emptySnapshot();
  }
}

function writeSharedMusicLocal(user, snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(cacheKey(user), JSON.stringify(normalized)); } catch { /* optional cache */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }
  return normalized;
}

function isMissingSetup(error) {
  const code = cleanText(error?.code).toUpperCase();
  const message = cleanText(error?.message || error).toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || code === '404'
    || message.includes(TABLE) && (message.includes('does not exist') || message.includes('could not find') || message.includes('schema cache'));
}

function explainCloudError(error, action = 'sync') {
  if (isMissingSetup(error)) return 'Supabase chưa có bảng cấu hình nhạc dùng chung. Admin cần chạy tệp supabase/shared_music.sql một lần.';
  if (String(error?.code || '') === '42501' || /row-level security|permission denied|not authorized/i.test(cleanText(error?.message))) {
    return action === 'read'
      ? 'Tài khoản chưa được cấp quyền đọc cấu hình nhạc dùng chung.'
      : 'Supabase từ chối quyền ghi. Chỉ tài khoản Admin đã được duyệt mới được quản lý nhạc.';
  }
  return cleanText(error?.message || error) || 'Không thể đồng bộ nhạc dùng chung.';
}

function isReusableTrackUrl(value, path) {
  const track = normalizeTrack(value?.track || value);
  if (!track || track.path !== path || !track.signedUrl) return false;
  const signedUntil = Date.parse(track.signedUntil || '');
  return Number.isFinite(signedUntil) && signedUntil - Date.now() > SIGNED_URL_REFRESH_BUFFER_MS;
}

function reusableTrackUrl(value, path) {
  if (!isReusableTrackUrl(value, path)) return null;
  const track = normalizeTrack(value?.track || value);
  return {
    signedUrl: track.signedUrl,
    signedUntil: track.signedUntil,
  };
}

function rememberTrackUrl(path, url) {
  const entry = { path, ...url };
  if (path && isReusableTrackUrl(entry, path)) signedUrlCache.set(path, entry);
  return {
    signedUrl: cleanText(entry.signedUrl),
    signedUntil: cleanText(entry.signedUntil),
  };
}

function forgetTrackUrl(path) {
  if (!path) return;
  signedUrlCache.delete(path);
  signedUrlRequests.delete(path);
}

async function authenticatedJson(url, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && !(options.body instanceof Blob) && !(options.body instanceof File) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep fallback */ }
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối dịch vụ Google Drive.');
  return data;
}

async function createTrackUrl(path, cachedSnapshot = null) {
  if (!path) return { signedUrl: '', signedUntil: '' };

  const reusable = reusableTrackUrl(cachedSnapshot, path)
    || reusableTrackUrl(signedUrlCache.get(path), path);
  if (reusable) return rememberTrackUrl(path, reusable);

  const pending = signedUrlRequests.get(path);
  if (pending) return pending;

  const request = (async () => {
    const data = await authenticatedJson('/api/shared-music-access', {
      method: 'POST',
      body: JSON.stringify({ workspaceKey: WORKSPACE_KEY }),
    });
    return rememberTrackUrl(path, {
      signedUrl: cleanText(data.signedUrl),
      signedUntil: cleanText(data.signedUntil) || new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    });
  })();

  signedUrlRequests.set(path, request);
  try {
    return await request;
  } finally {
    if (signedUrlRequests.get(path) === request) signedUrlRequests.delete(path);
  }
}

function rowToSnapshot(row, url = {}) {
  if (!row) return emptySnapshot({ source: 'supabase-empty', status: 'synced' });
  return normalizeSnapshot({
    track: {
      path: row.track_path,
      title: row.track_title,
      fileName: row.track_name,
      mimeType: row.track_mime,
      size: row.track_size,
      ...url,
    },
    shared: row.shared === true,
    updatedAt: row.updated_at || row.created_at,
    updatedBy: row.updated_by_email || row.updated_by || '',
    source: isDriveFileId(row.track_path) ? 'google-drive' : 'supabase-legacy',
    status: 'synced',
  });
}

async function readCloudRow() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_key,track_path,track_title,track_name,track_mime,track_size,shared,updated_by,updated_by_email,created_at,updated_at')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function snapshotForUser(user, snapshot) {
  if (snapshot.shared || canManageSharedMusic(user)) return snapshot;
  return { ...snapshot, track: null };
}

async function runDriveAction(action, payload = {}) {
  return authenticatedJson('/api/shared-music-drive-action', {
    method: 'POST',
    body: JSON.stringify({ action, workspaceKey: WORKSPACE_KEY, ...payload }),
  });
}

async function migrateLegacyTrack(row) {
  if (!row?.track_path || isDriveFileId(row.track_path)) return row;
  const result = await runDriveAction('migrate');
  return result.item || row;
}

export async function loadSharedMusic(user) {
  const local = readSharedMusicLocal(user);
  if (!user || !isSupabaseConfigured || !supabase) {
    return writeSharedMusicLocal(user, {
      ...snapshotForUser(user, local),
      status: isSupabaseConfigured ? 'local' : 'error',
      source: 'local-fallback',
      error: isSupabaseConfigured ? '' : 'Supabase chưa được cấu hình.',
    });
  }
  try {
    let row = await readCloudRow();
    if (row?.track_path && canManageSharedMusic(user) && !isDriveFileId(row.track_path)) {
      try { row = await migrateLegacyTrack(row); } catch (migrationError) { console.warn('[Shared music] legacy migration deferred', migrationError); }
    }
    let url = {};
    if (row?.track_path && (row.shared || canManageSharedMusic(user))) url = await createTrackUrl(row.track_path, local);
    return writeSharedMusicLocal(user, snapshotForUser(user, rowToSnapshot(row, url)));
  } catch (error) {
    console.warn('[Shared music] load failed; using cached settings', error);
    return writeSharedMusicLocal(user, {
      ...snapshotForUser(user, local),
      status: 'error',
      source: 'local-fallback',
      setupRequired: isMissingSetup(error),
      error: explainCloudError(error, 'read'),
    });
  }
}

function assertAdmin(user) {
  if (!canManageSharedMusic(user)) throw new Error('Chỉ Admin được tải lên và chia sẻ nhạc nền.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình nên chưa thể đồng bộ nhạc.');
}

async function uploadDriveTrack(file, title) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tải file lên Google Drive.');
  const response = await fetch('/api/shared-music-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': cleanText(file.type) || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(safeFileName(file.name)),
      'X-Track-Title': encodeURIComponent(cleanText(title) || displayTitleFromFile(file)),
    },
    body: file,
  });
  let data = {};
  try { data = await response.json(); } catch { /* keep fallback */ }
  if (!response.ok) throw new Error(data.error || 'Không thể tải nhạc lên Google Drive.');
  if (!data.fileId) throw new Error('Google Drive không trả về mã file nhạc.');
  return data;
}

async function cleanupPreviousTrack(previous) {
  const path = cleanText(previous?.track_path);
  if (!path) return;
  forgetTrackUrl(path);
  if (isDriveFileId(path)) {
    await runDriveAction('archive', { fileId: path }).catch((error) => console.warn('[Shared music] Drive archive failed', error));
    return;
  }
  await supabase.storage.from(LEGACY_BUCKET).remove([path]).catch((error) => console.warn('[Shared music] legacy file cleanup failed', error));
}

export async function uploadAndShareMusic(user, file, title = '') {
  assertAdmin(user);
  if (!isAudioFile(file)) throw new Error('Chỉ chấp nhận MP3, WAV, OGG, M4A, AAC hoặc WebM.');
  if (Number(file.size) > MAX_FILE_SIZE) throw new Error('Tệp nhạc vượt quá giới hạn 20 MB. Hãy nén âm thanh trước khi tải lên.');

  const previous = await readCloudRow();
  const uploaded = await uploadDriveTrack(file, title);
  const now = new Date().toISOString();
  const row = {
    workspace_key: WORKSPACE_KEY,
    track_path: uploaded.fileId,
    track_title: cleanText(title) || displayTitleFromFile(file),
    track_name: cleanText(file.name),
    track_mime: cleanText(file.type) || uploaded.mimeType || 'audio/mpeg',
    track_size: Number(file.size) || 0,
    shared: true,
    updated_by: user?.id || null,
    updated_by_email: user?.email || null,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'workspace_key' })
      .select('workspace_key,track_path,track_title,track_name,track_mime,track_size,shared,updated_by,updated_by_email,created_at,updated_at')
      .single();
    if (error) throw error;
    const url = await createTrackUrl(uploaded.fileId);
    const snapshot = writeSharedMusicLocal(user, rowToSnapshot(data || row, url));
    if (previous?.track_path && previous.track_path !== uploaded.fileId) await cleanupPreviousTrack(previous);
    return snapshot;
  } catch (error) {
    forgetTrackUrl(uploaded.fileId);
    await runDriveAction('archive', { fileId: uploaded.fileId }).catch(() => null);
    throw new Error(explainCloudError(error, 'upload'));
  }
}

export async function setSharedMusicVisibility(user, shared) {
  assertAdmin(user);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ shared: Boolean(shared), updated_by: user?.id || null, updated_by_email: user?.email || null, updated_at: new Date().toISOString() })
    .eq('workspace_key', WORKSPACE_KEY)
    .select('workspace_key,track_path,track_title,track_name,track_mime,track_size,shared,updated_by,updated_by_email,created_at,updated_at')
    .maybeSingle();
  if (error) throw new Error(explainCloudError(error, 'share'));
  const url = data?.track_path ? await createTrackUrl(data.track_path, readSharedMusicLocal(user)) : {};
  return writeSharedMusicLocal(user, rowToSnapshot(data, url));
}

export async function removeSharedMusic(user) {
  assertAdmin(user);
  const previous = await readCloudRow();
  if (previous?.track_path && isDriveFileId(previous.track_path)) {
    await runDriveAction('archive', { fileId: previous.track_path }).catch((error) => console.warn('[Shared music] Drive archive failed', error));
  }
  const { error } = await supabase.from(TABLE).delete().eq('workspace_key', WORKSPACE_KEY);
  if (error) throw new Error(explainCloudError(error, 'delete'));
  if (previous?.track_path && !isDriveFileId(previous.track_path)) {
    const { error: storageError } = await supabase.storage.from(LEGACY_BUCKET).remove([previous.track_path]);
    if (storageError) console.warn('[Shared music] legacy file deletion failed after metadata removal', storageError);
  }
  forgetTrackUrl(previous?.track_path);
  return writeSharedMusicLocal(user, emptySnapshot({ source: 'google-drive', status: 'synced' }));
}

function realtimeTopic(user) {
  subscriptionSerial += 1;
  return `bes-shared-music-${userKey(user)}-${Date.now().toString(36)}-${subscriptionSerial.toString(36)}`;
}

export function subscribeSharedMusic(user, listener) {
  if (typeof window === 'undefined') return () => {};
  const safeListener = typeof listener === 'function' ? listener : () => {};
  const localHandler = (event) => safeListener(snapshotForUser(user, normalizeSnapshot(event?.detail || readSharedMusicLocal(user))));
  const storageHandler = (event) => {
    if (event.key === cacheKey(user)) safeListener(snapshotForUser(user, readSharedMusicLocal(user)));
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (user && isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(realtimeTopic(user))
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `workspace_key=eq.${WORKSPACE_KEY}` }, (payload) => {
          const row = payload?.eventType === 'DELETE' ? null : payload?.new;
          if (!row || !row.track_path) {
            const next = writeSharedMusicLocal(user, emptySnapshot({ source: 'realtime', status: 'synced' }));
            safeListener(next);
            return;
          }
          if (!row.shared && !canManageSharedMusic(user)) {
            forgetTrackUrl(row.track_path);
            const next = writeSharedMusicLocal(user, snapshotForUser(user, rowToSnapshot(row)));
            safeListener(next);
            return;
          }
          const local = readSharedMusicLocal(user);
          createTrackUrl(row.track_path, local)
            .then((url) => writeSharedMusicLocal(user, snapshotForUser(user, rowToSnapshot(row, url))))
            .then(safeListener)
            .catch((error) => console.warn('[Shared music] realtime access refresh failed', error));
        });
      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn(`[Shared music] realtime unavailable (${status})`);
      });
    } catch (error) {
      console.warn('[Shared music] realtime subscription skipped', error);
    }
  }

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) {
      try { supabase.removeChannel(channel)?.catch?.(() => null); } catch { /* optional cleanup */ }
    }
  };
}
