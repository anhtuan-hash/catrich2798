import { isAdminRole } from './roles.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const TABLE = 'shared_music_settings';
const BUCKET = 'shared-music';
const WORKSPACE_KEY = 'english-hub';
const EVENT_NAME = 'bes-shared-music-updated';
const CACHE_PREFIX = 'bes-shared-music-v1';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12;
const MAX_FILE_SIZE = 40 * 1024 * 1024;
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
  const original = cleanText(value) || 'background-music';
  const dot = original.lastIndexOf('.');
  const extension = dot >= 0 ? original.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
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
  return mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(extension);
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
    || message.includes(TABLE) && (message.includes('does not exist') || message.includes('could not find') || message.includes('schema cache'))
    || message.includes(BUCKET) && (message.includes('not found') || message.includes('does not exist'));
}

function explainCloudError(error, action = 'sync') {
  if (isMissingSetup(error)) return 'Supabase chưa được cài bảng và kho nhạc dùng chung. Admin cần chạy tệp supabase/shared_music.sql một lần.';
  if (String(error?.code || '') === '42501' || /row-level security|permission denied|not authorized/i.test(cleanText(error?.message))) {
    return action === 'read'
      ? 'Tài khoản chưa được cấp quyền đọc nhạc dùng chung.'
      : 'Supabase từ chối quyền ghi. Chỉ tài khoản Admin đã được duyệt mới được quản lý nhạc.';
  }
  return cleanText(error?.message || error) || 'Không thể đồng bộ nhạc dùng chung.';
}

async function createTrackUrl(path) {
  if (!path) return { signedUrl: '', signedUntil: '' };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return {
    signedUrl: cleanText(data?.signedUrl),
    signedUntil: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
  };
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
    source: 'supabase',
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
    const row = await readCloudRow();
    let url = {};
    if (row?.track_path && (row.shared || canManageSharedMusic(user))) url = await createTrackUrl(row.track_path);
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

export async function uploadAndShareMusic(user, file, title = '') {
  assertAdmin(user);
  if (!isAudioFile(file)) throw new Error('Chỉ chấp nhận tệp âm thanh MP3, WAV, OGG, M4A, AAC, FLAC hoặc WebM.');
  if (Number(file.size) > MAX_FILE_SIZE) throw new Error('Tệp nhạc vượt quá giới hạn 40 MB.');

  const previous = await readCloudRow();
  const path = `${WORKSPACE_KEY}/${Date.now()}-${safeFileName(file.name)}`;
  const contentType = cleanText(file.type) || 'audio/mpeg';
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  });
  if (uploadError) throw new Error(explainCloudError(uploadError, 'upload'));

  const now = new Date().toISOString();
  const row = {
    workspace_key: WORKSPACE_KEY,
    track_path: path,
    track_title: cleanText(title) || displayTitleFromFile(file),
    track_name: cleanText(file.name),
    track_mime: contentType,
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
    const url = await createTrackUrl(path);
    const snapshot = writeSharedMusicLocal(user, rowToSnapshot(data || row, url));
    if (previous?.track_path && previous.track_path !== path) {
      supabase.storage.from(BUCKET).remove([previous.track_path]).catch((cleanupError) => console.warn('[Shared music] old file cleanup failed', cleanupError));
    }
    return snapshot;
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => null);
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
  const url = data?.track_path ? await createTrackUrl(data.track_path) : {};
  return writeSharedMusicLocal(user, rowToSnapshot(data, url));
}

export async function removeSharedMusic(user) {
  assertAdmin(user);
  const previous = await readCloudRow();
  const { error } = await supabase.from(TABLE).delete().eq('workspace_key', WORKSPACE_KEY);
  if (error) throw new Error(explainCloudError(error, 'delete'));
  if (previous?.track_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([previous.track_path]);
    if (storageError) console.warn('[Shared music] file deletion failed after metadata removal', storageError);
  }
  return writeSharedMusicLocal(user, emptySnapshot({ source: 'supabase', status: 'synced' }));
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
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `workspace_key=eq.${WORKSPACE_KEY}` }, () => {
          loadSharedMusic(user).then(safeListener).catch((error) => console.warn('[Shared music] realtime refresh failed', error));
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
