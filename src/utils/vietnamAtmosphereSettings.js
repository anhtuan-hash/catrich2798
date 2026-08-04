export * from './vietnamAtmosphereSettingsBase.js';

import { isSupabaseConfigured, supabase } from './supabase.js';
import * as base from './vietnamAtmosphereSettingsBase.js';

const TABLE = 'vietnam_atmosphere_settings';
const WORKSPACE_KEY = 'english-hub';
const EVENT_NAME = 'bes-vietnam-atmosphere-settings-updated';
const CACHE_KEY = 'bes-vietnam-atmosphere-settings-v2';
const CLOUD_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedSnapshot = null;
let cachedAt = 0;
let loadPromise = null;
let subscriptionSerial = 0;

function remember(snapshot) {
  cachedSnapshot = base.normalizeVietnamAtmosphereSettings(snapshot);
  cachedAt = Date.now();
  return cachedSnapshot;
}

const STORAGE_BUCKET = 'vietnam-atmosphere';
const MAX_SOURCE_IMAGE_SIZE = 3 * 1024 * 1024;
const MAX_DELIVERED_IMAGE_SIZE = 900 * 1024;
const MAX_RASTER_DIMENSION = 768;
const RASTER_WEBP_QUALITY = 0.8;

function cleanText(value) {
  return String(value || '').trim();
}

function isSupportedImage(file) {
  const mime = cleanText(file?.type).toLowerCase();
  const extension = cleanText(file?.name).toLowerCase().split('.').pop();
  return ['image/png', 'image/webp', 'image/svg+xml'].includes(mime)
    || ['png', 'webp', 'svg'].includes(extension);
}

function safeFileName(value) {
  const original = cleanText(value) || 'vietnam-symbol';
  const dot = original.lastIndexOf('.');
  const extension = dot >= 0 ? original.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const filename = (dot >= 0 ? original.slice(0, dot) : original)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'vietnam-symbol';
  return `${filename}${extension.slice(0, 8)}`;
}

function optimizedRasterName(name) {
  return `${safeFileName(name).replace(/\.[^.]+$/, '') || 'vietnam-symbol'}.webp`;
}

function contentTypeFor(file) {
  const mime = cleanText(file?.type).toLowerCase();
  if (['image/png', 'image/webp', 'image/svg+xml'].includes(mime)) return mime;
  const extension = cleanText(file?.name).toLowerCase().split('.').pop();
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeAtmosphereUpload(file) {
  const mime = cleanText(file?.type).toLowerCase();
  if (!['image/png', 'image/webp'].includes(mime)) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_RASTER_DIMENSION / bitmap.width, MAX_RASTER_DIMENSION / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/webp', RASTER_WEBP_QUALITY);
    if (!blob || blob.size >= file.size * 0.94) return file;
    return new File([blob], optimizedRasterName(file.name), { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

function atmosphereImageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `vn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readFreshCache() {
  if (!cachedSnapshot || Date.now() - cachedAt >= CLOUD_CACHE_TTL) return null;
  return cachedSnapshot;
}

function writeLocal(snapshot) {
  const normalized = remember(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* optional cache */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }
  return normalized;
}

function snapshotFromRealtimeRow(row = {}) {
  return base.normalizeVietnamAtmosphereSettings({
    enabled: row.enabled,
    showBuiltIns: row.show_built_ins,
    opacity: row.opacity,
    speed: row.speed,
    density: row.density,
    images: row.images,
    updatedAt: row.updated_at || row.created_at,
    updatedBy: row.updated_by_email || row.updated_by || '',
    source: 'supabase-realtime',
    status: 'synced',
    error: '',
    setupRequired: false,
  });
}

export async function loadVietnamAtmosphereSettings({ force = false } = {}) {
  const cached = force ? null : readFreshCache();
  if (cached) return cached;
  if (!force && loadPromise) return loadPromise;

  let task;
  task = base.loadVietnamAtmosphereSettings()
    .then(remember)
    .finally(() => {
      if (loadPromise === task) loadPromise = null;
    });
  loadPromise = task;
  return task;
}

function realtimeTopic() {
  subscriptionSerial += 1;
  return `bes-vietnam-atmosphere-optimized-${Date.now().toString(36)}-${subscriptionSerial.toString(36)}`;
}

export async function uploadVietnamAtmosphereImage(user, file) {
  if (!base.canManageVietnamAtmosphere(user)) throw new Error('Chỉ Admin được quản lý lớp phủ Việt Nam.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình nên chưa thể tải ảnh.');
  if (!isSupportedImage(file)) throw new Error('Chỉ chấp nhận ảnh SVG, PNG hoặc WebP.');
  if (Number(file.size) > MAX_SOURCE_IMAGE_SIZE) throw new Error('Ảnh nguồn phải nhỏ hơn 3 MB.');

  const uploadFile = await optimizeAtmosphereUpload(file);
  if (Number(uploadFile.size) > MAX_DELIVERED_IMAGE_SIZE) {
    throw new Error('Ảnh sau tối ưu vẫn vượt 900 KB. Hãy giảm kích thước hoặc xuất WebP trước khi tải lên.');
  }

  const current = await loadVietnamAtmosphereSettings({ force: true });
  const maxImages = Number(base.VIETNAM_ATMOSPHERE_LIMITS?.maxImages) || 12;
  if ((current.images || []).length >= maxImages) throw new Error(`Chỉ được dùng tối đa ${maxImages} ảnh tùy chỉnh.`);

  const id = atmosphereImageId();
  const path = `${WORKSPACE_KEY}/${Date.now()}-${safeFileName(uploadFile.name)}`;
  const mimeType = contentTypeFor(uploadFile);
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, uploadFile, {
    cacheControl: '31536000',
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const image = {
    id,
    path,
    name: cleanText(uploadFile.name) || 'Vietnam symbol',
    mimeType,
    size: Number(uploadFile.size) || 0,
    enabled: true,
    url: cleanText(data?.publicUrl),
  };

  try {
    return await base.saveVietnamAtmosphereSettings(user, { images: [...(current.images || []), image] });
  } catch (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]).catch(() => null);
    throw error;
  }
}

export function subscribeVietnamAtmosphereSettings(listener) {
  if (typeof window === 'undefined') return () => {};
  const safeListener = typeof listener === 'function' ? listener : () => {};

  const localHandler = (event) => {
    const snapshot = remember(event?.detail || base.readVietnamAtmosphereLocal());
    safeListener(snapshot);
  };
  const storageHandler = (event) => {
    if (event.key !== CACHE_KEY) return;
    const snapshot = remember(base.readVietnamAtmosphereLocal());
    safeListener(snapshot);
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(realtimeTopic())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `workspace_key=eq.${WORKSPACE_KEY}`,
        }, (payload) => {
          const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
          if (row?.workspace_key === WORKSPACE_KEY) {
            const snapshot = writeLocal(snapshotFromRealtimeRow(row));
            safeListener(snapshot);
            return;
          }
          if (payload?.eventType === 'DELETE') {
            const snapshot = writeLocal({
              ...base.DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS,
              source: 'supabase-empty',
              status: 'synced',
            });
            safeListener(snapshot);
            return;
          }
          cachedSnapshot = null;
          cachedAt = 0;
          loadVietnamAtmosphereSettings({ force: true }).then(safeListener).catch(() => null);
        })
        .subscribe();
    } catch (error) {
      console.warn('[Vietnam atmosphere] optimized realtime subscription failed', error);
    }
  }

  loadVietnamAtmosphereSettings().then(safeListener).catch(() => null);

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => null);
  };
}
