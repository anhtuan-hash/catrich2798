import { isAdminRole } from './roles.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const TABLE = 'hero_theme_studio_settings';
const WORKSPACE_KEY = 'english-hub';
const STORAGE_BUCKET = 'hero-theme-studio';
const CACHE_KEY = 'bes-hero-theme-studio-v1';
const EVENT_NAME = 'bes:hero-theme-studio-settings-updated';
const MAX_SOURCE_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_RASTER_DIMENSION = 1920;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const HERO_THEME_STUDIO_LIMITS = Object.freeze({
  maxSourceImageSize: MAX_SOURCE_IMAGE_SIZE,
  maxRasterDimension: MAX_RASTER_DIMENSION,
  acceptedImageTypes: Object.freeze([...ACCEPTED_IMAGE_TYPES]),
});

export const DEFAULT_HERO_THEME = Object.freeze({
  enabled: false,
  imageUrl: '',
  imageName: '',
  targetMode: 'all',
  heroKeys: Object.freeze([]),
  overlay: 0.34,
  position: 'center center',
  blur: 0,
  parallax: 0,
});

export const DEFAULT_HERO_THEME_STUDIO_SETTINGS = Object.freeze({
  version: 1,
  draft: DEFAULT_HERO_THEME,
  published: DEFAULT_HERO_THEME,
  history: Object.freeze([]),
  updatedAt: '',
  updatedByEmail: '',
  cloudAvailable: isSupabaseConfigured,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function uniqueKeys(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean))].slice(0, 80);
}

export function normalizeHeroTheme(theme = {}) {
  const targetMode = theme.targetMode === 'selected' ? 'selected' : 'all';
  return {
    enabled: theme.enabled === true,
    imageUrl: String(theme.imageUrl || '').trim(),
    imageName: String(theme.imageName || '').trim().slice(0, 180),
    targetMode,
    heroKeys: uniqueKeys(theme.heroKeys),
    overlay: clamp(theme.overlay, 0, 0.85, DEFAULT_HERO_THEME.overlay),
    position: String(theme.position || DEFAULT_HERO_THEME.position).trim().slice(0, 80),
    blur: clamp(theme.blur, 0, 16, DEFAULT_HERO_THEME.blur),
    parallax: clamp(theme.parallax, 0, 24, DEFAULT_HERO_THEME.parallax),
  };
}

function normalizeHistory(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => ({
      theme: normalizeHeroTheme(entry?.theme || entry),
      publishedAt: String(entry?.publishedAt || entry?.published_at || ''),
      publishedBy: String(entry?.publishedBy || entry?.published_by || ''),
    }))
    .slice(0, 12);
}

function normalizeSnapshot(row = {}) {
  return {
    version: 1,
    draft: normalizeHeroTheme(row.draft || row.draft_theme || DEFAULT_HERO_THEME),
    published: normalizeHeroTheme(row.published || row.published_theme || DEFAULT_HERO_THEME),
    history: normalizeHistory(row.history),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
    updatedByEmail: String(row.updated_by_email || row.updatedByEmail || ''),
    cloudAvailable: row.cloudAvailable !== false && isSupabaseConfigured,
  };
}

function emit(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
    } catch {
      // Cache is best-effort only.
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }
  return normalized;
}

export function readHeroThemeStudioLocal() {
  if (typeof window === 'undefined') return normalizeSnapshot(DEFAULT_HERO_THEME_STUDIO_SETTINGS);
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? normalizeSnapshot(JSON.parse(raw)) : normalizeSnapshot(DEFAULT_HERO_THEME_STUDIO_SETTINGS);
  } catch {
    return normalizeSnapshot(DEFAULT_HERO_THEME_STUDIO_SETTINGS);
  }
}

function setupError(error) {
  const message = String(error?.message || error || '');
  if (/does not exist|relation .*hero_theme_studio_settings|42P01|bucket.*not found/i.test(message)) {
    return new Error('Hero Theme Studio chưa được khởi tạo trên Supabase. Chạy supabase/hero_theme_studio.sql một lần trong Production Supabase SQL Editor.');
  }
  return error instanceof Error ? error : new Error(message || 'Hero Theme Studio cloud request failed.');
}

function requireCloud() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase chưa được cấu hình; preview cục bộ vẫn hoạt động nhưng chưa thể đồng bộ toàn hệ thống.');
  }
}

export function canManageHeroThemeStudio(user) {
  return isAdminRole(user?.role);
}

export async function loadHeroThemeStudioSettings() {
  if (!isSupabaseConfigured || !supabase) return readHeroThemeStudioLocal();
  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_key,draft,published,history,updated_at,updated_by_email')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle();
  if (error) {
    const local = readHeroThemeStudioLocal();
    return emit({ ...local, cloudAvailable: false });
  }
  if (!data) return emit(DEFAULT_HERO_THEME_STUDIO_SETTINGS);
  return emit({ ...data, cloudAvailable: true });
}

async function upsertSnapshot(snapshot, user) {
  requireCloud();
  if (!canManageHeroThemeStudio(user)) throw new Error('Chỉ Admin được phép thay đổi Hero Theme Studio.');
  const payload = {
    workspace_key: WORKSPACE_KEY,
    draft: normalizeHeroTheme(snapshot.draft),
    published: normalizeHeroTheme(snapshot.published),
    history: normalizeHistory(snapshot.history),
    updated_by: user?.id || null,
    updated_by_email: String(user?.email || ''),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'workspace_key' })
    .select('workspace_key,draft,published,history,updated_at,updated_by_email')
    .single();
  if (error) throw setupError(error);
  return emit({ ...data, cloudAvailable: true });
}

export async function saveHeroThemeStudioDraft(theme, user) {
  const current = await loadHeroThemeStudioSettings();
  return upsertSnapshot({ ...current, draft: normalizeHeroTheme(theme) }, user);
}

export async function publishHeroThemeStudioTheme(theme, user) {
  const current = await loadHeroThemeStudioSettings();
  const next = normalizeHeroTheme(theme || current.draft);
  const previous = normalizeHeroTheme(current.published);
  const history = previous.enabled || previous.imageUrl
    ? [{ theme: previous, publishedAt: new Date().toISOString(), publishedBy: String(user?.email || '') }, ...current.history].slice(0, 12)
    : current.history;
  return upsertSnapshot({ ...current, draft: next, published: next, history }, user);
}

export async function rollbackHeroThemeStudioTheme(user) {
  const current = await loadHeroThemeStudioSettings();
  const [latest, ...rest] = current.history;
  if (!latest) throw new Error('Chưa có phiên bản Hero trước đó để hoàn tác.');
  const currentPublished = normalizeHeroTheme(current.published);
  const history = [{
    theme: currentPublished,
    publishedAt: new Date().toISOString(),
    publishedBy: String(user?.email || ''),
  }, ...rest].slice(0, 12);
  return upsertSnapshot({ ...current, draft: latest.theme, published: latest.theme, history }, user);
}

export async function resetHeroThemeStudioToOriginal(user) {
  return publishHeroThemeStudioTheme(DEFAULT_HERO_THEME, user);
}

async function optimizeRaster(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return { blob: file, width: 0, height: 0, contentType: file.type };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_RASTER_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Không thể tối ưu ảnh Hero.')), 'image/webp', 0.86);
  });
  return { blob, width, height, contentType: 'image/webp' };
}

function safeFileStem(name) {
  return String(name || 'hero')
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'hero';
}

export async function uploadHeroThemeStudioImage(file, user) {
  requireCloud();
  if (!canManageHeroThemeStudio(user)) throw new Error('Chỉ Admin được phép tải ảnh Hero lên.');
  if (!file || !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Hero Theme Studio chỉ nhận ảnh image/jpeg, image/png hoặc image/webp.');
  }
  if (file.size > MAX_SOURCE_IMAGE_SIZE) throw new Error('Ảnh Hero tối đa 6 MB trước khi tối ưu.');
  const optimized = await optimizeRaster(file);
  const path = `hero-themes/${Date.now()}-${safeFileStem(file.name)}.webp`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, optimized.blob, {
    cacheControl: '31536000',
    contentType: optimized.contentType,
    upsert: false,
  });
  if (error) throw setupError(error);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return {
    url: String(data?.publicUrl || ''),
    path,
    name: String(file.name || ''),
    width: optimized.width,
    height: optimized.height,
    size: optimized.blob.size,
  };
}

export function subscribeToHeroThemeStudioSettings(callback) {
  if (typeof callback !== 'function') return () => {};
  const onLocal = (event) => callback(normalizeSnapshot(event.detail));
  if (typeof window !== 'undefined') window.addEventListener(EVENT_NAME, onLocal);
  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel(`hero-theme-studio-${WORKSPACE_KEY}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `workspace_key=eq.${WORKSPACE_KEY}`,
      }, () => {
        loadHeroThemeStudioSettings().then(callback).catch(() => null);
      })
      .subscribe();
  }
  return () => {
    if (typeof window !== 'undefined') window.removeEventListener(EVENT_NAME, onLocal);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export { TABLE as HERO_THEME_STUDIO_TABLE, WORKSPACE_KEY as HERO_THEME_STUDIO_WORKSPACE_KEY, STORAGE_BUCKET as HERO_THEME_STUDIO_BUCKET };
