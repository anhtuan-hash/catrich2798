import { isAdminRole } from './roles.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const TABLE = 'vietnam_atmosphere_settings';
const BUCKET = 'vietnam-atmosphere';
const WORKSPACE_KEY = 'english-hub';
const EVENT_NAME = 'bes-vietnam-atmosphere-settings-updated';
const CACHE_KEY = 'bes-vietnam-atmosphere-settings-v2';
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const MAX_IMAGES = 12;
let subscriptionSerial = 0;

export const DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS = Object.freeze({
  enabled: true,
  showBuiltIns: true,
  opacity: 0.11,
  speed: 1,
  density: 10,
  images: [],
  updatedAt: '',
  updatedBy: '',
  source: 'default',
  status: 'idle',
  error: '',
  setupRequired: false,
});

function cleanText(value) {
  return String(value || '').trim();
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function safeFileName(value) {
  const original = cleanText(value) || 'vietnam-symbol';
  const dot = original.lastIndexOf('.');
  const extension = dot >= 0 ? original.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const base = (dot >= 0 ? original.slice(0, dot) : original)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'vietnam-symbol';
  return `${base}${extension.slice(0, 8)}`;
}

function imageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `vn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSupportedImage(file) {
  if (!file) return false;
  const mime = cleanText(file.type).toLowerCase();
  const extension = cleanText(file.name).toLowerCase().split('.').pop();
  return ['image/png', 'image/webp', 'image/svg+xml'].includes(mime) || ['png', 'webp', 'svg'].includes(extension);
}

function contentTypeFor(file) {
  const mime = cleanText(file?.type).toLowerCase();
  if (['image/png', 'image/webp', 'image/svg+xml'].includes(mime)) return mime;
  const extension = cleanText(file?.name).toLowerCase().split('.').pop();
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function publicUrlFor(path) {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return cleanText(data?.publicUrl);
}

function normalizeImage(value = {}) {
  const path = cleanText(value.path || value.storage_path);
  if (!path) return null;
  return {
    id: cleanText(value.id) || path,
    path,
    name: cleanText(value.name || value.fileName || value.file_name) || 'Vietnam symbol',
    mimeType: cleanText(value.mimeType || value.mime_type),
    size: Math.max(0, Number(value.size) || 0),
    enabled: value.enabled !== false,
    url: cleanText(value.url) || publicUrlFor(path),
  };
}

function normalizeImages(value) {
  const list = Array.isArray(value) ? value : [];
  return list.map(normalizeImage).filter(Boolean).slice(0, MAX_IMAGES);
}

export function normalizeVietnamAtmosphereSettings(value = {}) {
  return {
    enabled: value.enabled !== false,
    showBuiltIns: value.showBuiltIns !== false && value.show_built_ins !== false,
    opacity: clamp(value.opacity, 0.03, 0.28, DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.opacity),
    speed: clamp(value.speed, 0.4, 2.5, DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.speed),
    density: Math.round(clamp(value.density, 3, 18, DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.density)),
    images: normalizeImages(value.images),
    updatedAt: cleanText(value.updatedAt || value.updated_at),
    updatedBy: cleanText(value.updatedBy || value.updated_by_email || value.updated_by),
    source: cleanText(value.source) || 'local',
    status: cleanText(value.status) || 'idle',
    error: cleanText(value.error),
    setupRequired: Boolean(value.setupRequired),
  };
}

export function canManageVietnamAtmosphere(user) {
  return isAdminRole(user?.role);
}

export function readVietnamAtmosphereLocal() {
  if (typeof window === 'undefined') return { ...DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
    return normalizeVietnamAtmosphereSettings({ ...DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS, ...parsed });
  } catch {
    return { ...DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS };
  }
}

function writeVietnamAtmosphereLocal(snapshot) {
  const normalized = normalizeVietnamAtmosphereSettings(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* optional cache */ }
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
    || (message.includes(TABLE) && (message.includes('does not exist') || message.includes('could not find') || message.includes('schema cache')))
    || (message.includes(BUCKET) && (message.includes('not found') || message.includes('does not exist')));
}

function explainCloudError(error, action = 'sync') {
  if (isMissingSetup(error)) return 'Supabase chưa có bảng và kho ảnh hiệu ứng Việt Nam. Admin cần chạy tệp supabase/vietnam_atmosphere.sql một lần.';
  if (String(error?.code || '') === '42501' || /row-level security|permission denied|not authorized/i.test(cleanText(error?.message))) {
    return action === 'read'
      ? 'Không thể đọc cấu hình hiệu ứng Việt Nam.'
      : 'Supabase từ chối quyền ghi. Chỉ tài khoản Admin đã được duyệt mới được thay đổi hiệu ứng.';
  }
  return cleanText(error?.message || error) || 'Không thể đồng bộ hiệu ứng Việt Nam.';
}

function rowToSnapshot(row, extra = {}) {
  if (!row) return normalizeVietnamAtmosphereSettings({ ...DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS, source: 'supabase-empty', status: 'synced', ...extra });
  return normalizeVietnamAtmosphereSettings({
    enabled: row.enabled,
    showBuiltIns: row.show_built_ins,
    opacity: row.opacity,
    speed: row.speed,
    density: row.density,
    images: row.images,
    updatedAt: row.updated_at || row.created_at,
    updatedBy: row.updated_by_email || row.updated_by || '',
    source: 'supabase',
    status: 'synced',
    ...extra,
  });
}

async function readCloudRow() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_key,enabled,show_built_ins,opacity,speed,density,images,updated_by,updated_by_email,created_at,updated_at')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function loadVietnamAtmosphereSettings() {
  const local = readVietnamAtmosphereLocal();
  if (!isSupabaseConfigured || !supabase) {
    return writeVietnamAtmosphereLocal({
      ...local,
      source: 'local-fallback',
      status: 'local',
      error: '',
      setupRequired: false,
    });
  }
  try {
    const row = await readCloudRow();
    return writeVietnamAtmosphereLocal(rowToSnapshot(row));
  } catch (error) {
    console.warn('[Vietnam atmosphere] load failed; using cached settings', error);
    return writeVietnamAtmosphereLocal({
      ...local,
      source: 'local-fallback',
      status: 'error',
      setupRequired: isMissingSetup(error),
      error: explainCloudError(error, 'read'),
    });
  }
}

function assertAdmin(user) {
  if (!canManageVietnamAtmosphere(user)) throw new Error('Chỉ Admin được quản lý lớp phủ Việt Nam.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình nên chưa thể đồng bộ lớp phủ.');
}

function rowPayload(user, settings) {
  const normalized = normalizeVietnamAtmosphereSettings(settings);
  return {
    workspace_key: WORKSPACE_KEY,
    enabled: normalized.enabled,
    show_built_ins: normalized.showBuiltIns,
    opacity: normalized.opacity,
    speed: normalized.speed,
    density: normalized.density,
    images: normalized.images.map(({ id, path, name, mimeType, size, enabled }) => ({ id, path, name, mimeType, size, enabled })),
    updated_by: user?.id || null,
    updated_by_email: user?.email || null,
    updated_at: new Date().toISOString(),
  };
}

async function upsertSettings(user, settings) {
  const payload = rowPayload(user, settings);
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'workspace_key' })
    .select('workspace_key,enabled,show_built_ins,opacity,speed,density,images,updated_by,updated_by_email,created_at,updated_at')
    .single();
  if (error) throw error;
  return writeVietnamAtmosphereLocal(rowToSnapshot(data || payload));
}

export async function saveVietnamAtmosphereSettings(user, patch = {}) {
  assertAdmin(user);
  try {
    const currentRow = await readCloudRow();
    const current = currentRow ? rowToSnapshot(currentRow) : readVietnamAtmosphereLocal();
    return await upsertSettings(user, { ...current, ...patch, images: patch.images ?? current.images });
  } catch (error) {
    throw new Error(explainCloudError(error, 'save'));
  }
}

export async function uploadVietnamAtmosphereImage(user, file) {
  assertAdmin(user);
  if (!isSupportedImage(file)) throw new Error('Chỉ chấp nhận ảnh SVG, PNG hoặc WebP.');
  if (Number(file.size) > MAX_IMAGE_SIZE) throw new Error('Mỗi ảnh phải nhỏ hơn 3 MB.');

  let current;
  try {
    const row = await readCloudRow();
    current = row ? rowToSnapshot(row) : readVietnamAtmosphereLocal();
  } catch (error) {
    throw new Error(explainCloudError(error, 'upload'));
  }
  if (current.images.length >= MAX_IMAGES) throw new Error(`Chỉ được dùng tối đa ${MAX_IMAGES} ảnh tùy chỉnh.`);

  const id = imageId();
  const path = `${WORKSPACE_KEY}/${Date.now()}-${safeFileName(file.name)}`;
  const mimeType = contentTypeFor(file);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '86400',
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw new Error(explainCloudError(uploadError, 'upload'));

  const image = {
    id,
    path,
    name: cleanText(file.name) || 'Vietnam symbol',
    mimeType,
    size: Number(file.size) || 0,
    enabled: true,
    url: publicUrlFor(path),
  };

  try {
    return await upsertSettings(user, { ...current, images: [...current.images, image] });
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => null);
    throw new Error(explainCloudError(error, 'upload'));
  }
}

export async function removeVietnamAtmosphereImage(user, imageIdValue) {
  assertAdmin(user);
  const row = await readCloudRow();
  const current = row ? rowToSnapshot(row) : readVietnamAtmosphereLocal();
  const target = current.images.find((image) => image.id === imageIdValue || image.path === imageIdValue);
  if (!target) return current;
  const next = await upsertSettings(user, {
    ...current,
    images: current.images.filter((image) => image.id !== target.id),
  });
  const { error } = await supabase.storage.from(BUCKET).remove([target.path]);
  if (error) console.warn('[Vietnam atmosphere] image cleanup failed', error);
  return next;
}

export async function setVietnamAtmosphereImageEnabled(user, imageIdValue, enabled) {
  assertAdmin(user);
  const row = await readCloudRow();
  const current = row ? rowToSnapshot(row) : readVietnamAtmosphereLocal();
  return upsertSettings(user, {
    ...current,
    images: current.images.map((image) => image.id === imageIdValue ? { ...image, enabled: Boolean(enabled) } : image),
  });
}

function realtimeTopic() {
  subscriptionSerial += 1;
  return `bes-vietnam-atmosphere-${Date.now().toString(36)}-${subscriptionSerial.toString(36)}`;
}

export function subscribeVietnamAtmosphereSettings(listener) {
  if (typeof window === 'undefined') return () => {};
  const safeListener = typeof listener === 'function' ? listener : () => {};
  const localHandler = (event) => safeListener(normalizeVietnamAtmosphereSettings(event?.detail || readVietnamAtmosphereLocal()));
  const storageHandler = (event) => {
    if (event.key === CACHE_KEY) safeListener(readVietnamAtmosphereLocal());
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(realtimeTopic())
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `workspace_key=eq.${WORKSPACE_KEY}` }, () => {
          loadVietnamAtmosphereSettings().then(safeListener).catch(() => null);
        })
        .subscribe();
    } catch (error) {
      console.warn('[Vietnam atmosphere] realtime subscription failed', error);
    }
  }

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => null);
  };
}

export const VIETNAM_ATMOSPHERE_LIMITS = Object.freeze({
  maxImages: MAX_IMAGES,
  maxImageSize: MAX_IMAGE_SIZE,
});
