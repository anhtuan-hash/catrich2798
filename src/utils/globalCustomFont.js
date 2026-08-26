import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const SETTINGS_TABLE = 'brian_global_font_settings';
const BUCKET = 'brian-global-fonts';
const LOCAL_KEY = 'bes-global-custom-font-v1';
const STYLE_ID = 'bes-global-custom-font-face';
const FAMILY_NAME = 'BrianGlobalCustom';
const MAX_BYTES = 8 * 1024 * 1024;
const EXTENSIONS = new Set(['woff2', 'woff', 'ttf', 'otf']);

let installed = false;
let realtimeUnsubscribe = null;
let retryTimers = [];
let previewObjectUrl = '';

function extOf(name = '') {
  const value = String(name || '').trim().toLowerCase();
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1) : '';
}

function formatForExtension(ext) {
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'ttf') return 'truetype';
  if (ext === 'otf') return 'opentype';
  return '';
}

function mimeForExtension(ext) {
  if (ext === 'woff2') return 'font/woff2';
  if (ext === 'woff') return 'font/woff';
  if (ext === 'ttf') return 'font/ttf';
  if (ext === 'otf') return 'font/otf';
  return 'application/octet-stream';
}

function safeName(value = 'font') {
  return String(value || 'font')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'font';
}

function normalizeConfig(row = {}) {
  const url = String(row.custom_font_url || row.url || '').trim();
  return {
    name: String(row.custom_font_name || row.name || 'Font tùy chỉnh').trim() || 'Font tùy chỉnh',
    url,
    path: String(row.custom_font_path || row.path || '').trim(),
    format: String(row.custom_font_format || row.format || '').trim().toLowerCase(),
    size: Number(row.custom_font_size || row.size || 0),
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function readStoredConfig() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || 'null');
    return parsed?.url ? normalizeConfig(parsed) : null;
  } catch {
    return null;
  }
}

function writeStoredConfig(config) {
  if (typeof window === 'undefined' || !config?.url || String(config.url).startsWith('blob:')) return;
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeConfig(config))); }
  catch { /* local cache is optional */ }
}

function cssUrl(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, '');
}

function injectFontFace(config) {
  if (typeof document === 'undefined' || !config?.url) return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const format = formatForExtension(config.format) || config.format || 'woff2';
  style.textContent = `@font-face{font-family:'${FAMILY_NAME}';src:url("${cssUrl(config.url)}") format("${cssUrl(format)}");font-style:normal;font-weight:100 900;font-display:swap;}`;
}

export function applyGlobalCustomFont(config, { persist = true, source = 'custom' } = {}) {
  const normalized = normalizeConfig(config);
  if (!normalized.url || typeof document === 'undefined') return { ok: false, config: normalized };
  injectFontFace(normalized);
  const root = document.documentElement;
  root.dataset.globalFont = 'custom';
  root.dataset.globalFontSource = source;
  root.style.setProperty('--bes-global-font-family', `'${FAMILY_NAME}', Arial, sans-serif`);
  root.style.setProperty('--bes-global-custom-font-name', JSON.stringify(normalized.name));
  if (persist) writeStoredConfig(normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-global-font-updated', {
      detail: { preset: 'custom', customFont: normalized, source, at: Date.now() },
    }));
  }
  return { ok: true, preset: 'custom', config: normalized };
}

export function clearGlobalCustomFontPreview() {
  if (previewObjectUrl && typeof URL !== 'undefined') URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = '';
}

export function validateGlobalCustomFont(file) {
  if (!file) return { ok: false, message: 'Vui lòng chọn tệp font.' };
  const ext = extOf(file.name);
  if (!EXTENSIONS.has(ext)) return { ok: false, message: 'Chỉ hỗ trợ .woff2, .woff, .ttf hoặc .otf.' };
  if (!Number(file.size || 0)) return { ok: false, message: 'Tệp font không có dữ liệu.' };
  if (Number(file.size || 0) > MAX_BYTES) return { ok: false, message: 'Tệp font vượt quá giới hạn 8 MB.' };
  return { ok: true, ext };
}

export function previewGlobalCustomFont(file, displayName = '') {
  const validation = validateGlobalCustomFont(file);
  if (!validation.ok) return validation;
  clearGlobalCustomFontPreview();
  previewObjectUrl = URL.createObjectURL(file);
  const config = {
    name: String(displayName || file.name.replace(/\.[^.]+$/, '') || 'Font tùy chỉnh').trim(),
    url: previewObjectUrl,
    path: '',
    format: validation.ext,
    size: Number(file.size || 0),
  };
  applyGlobalCustomFont(config, { persist: false, source: 'admin-custom-preview' });
  return { ok: true, preset: 'custom', config };
}

function isMissingSchema(error) {
  const message = String(error?.message || error || '');
  return error?.code === '42P01' || error?.code === '42703' || /brian_global_font_settings|custom_font_|schema cache|does not exist/i.test(message);
}

export async function loadGlobalCustomFontSettings({ silent = true, apply = true } = {}) {
  const client = getRuntimeClient();
  if (!client) {
    const cached = readStoredConfig();
    if (cached && apply) applyGlobalCustomFont(cached, { source: 'custom-cache' });
    return { ok: false, unavailable: true, config: cached };
  }

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('font_preset,custom_font_name,custom_font_url,custom_font_path,custom_font_format,custom_font_size,updated_at')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      if (!silent && !isMissingSchema(error)) console.warn('[CustomFont] load failed', error);
      return { ok: false, unavailable: isMissingSchema(error), error, config: readStoredConfig() };
    }
    const config = normalizeConfig(data || {});
    if (data?.font_preset === 'custom' && config.url && apply) applyGlobalCustomFont(config, { source: 'custom-server' });
    return { ok: true, preset: data?.font_preset || '', config: config.url ? config : null };
  } catch (error) {
    if (!silent) console.warn('[CustomFont] load failed', error);
    return { ok: false, error, config: readStoredConfig() };
  }
}

async function saveConfig(config, currentUser) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, localOnly: true, message: 'Chưa có kết nối Supabase để đồng bộ font tùy chỉnh.' };
  const normalized = normalizeConfig(config);
  const payload = {
    id: true,
    font_preset: 'custom',
    custom_font_name: normalized.name,
    custom_font_url: normalized.url,
    custom_font_path: normalized.path || null,
    custom_font_format: normalized.format || null,
    custom_font_size: normalized.size || null,
    updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from(SETTINGS_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('font_preset,custom_font_name,custom_font_url,custom_font_path,custom_font_format,custom_font_size,updated_at')
    .single();
  if (error) {
    return {
      ok: false,
      unavailable: isMissingSchema(error),
      error,
      message: isMissingSchema(error)
        ? 'Cần chạy bản SQL Global Font mới trong Supabase để bật font tùy chỉnh và đồng bộ đến giáo viên.'
        : (error.message || 'Không thể lưu font tùy chỉnh.'),
    };
  }
  const saved = normalizeConfig(data || payload);
  applyGlobalCustomFont(saved, { source: 'admin-custom-server' });
  return { ok: true, preset: 'custom', config: saved, updatedAt: data?.updated_at || payload.updated_at };
}

export async function saveExistingGlobalCustomFont(config, currentUser) {
  if (!config?.url) return { ok: false, message: 'Chưa có font tùy chỉnh đã tải lên.' };
  return saveConfig(config, currentUser);
}

export async function saveGlobalCustomFont(file, displayName = '', currentUser = null, previousConfig = null) {
  const validation = validateGlobalCustomFont(file);
  if (!validation.ok) return validation;
  const client = getRuntimeClient();
  if (!client) return { ok: false, localOnly: true, message: 'Chưa có kết nối Supabase để tải font dùng chung.' };

  const extension = validation.ext;
  const timestamp = Date.now();
  const path = `global/${timestamp}-${safeName(displayName || file.name)}.${extension}`;
  const contentType = file.type || mimeForExtension(extension);
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  });
  if (uploadError) {
    return {
      ok: false,
      unavailable: /bucket|not found|row-level|policy/i.test(String(uploadError.message || '')),
      message: /bucket|not found/i.test(String(uploadError.message || ''))
        ? 'Cần chạy bản SQL Global Font mới trong Supabase để tạo kho font dùng chung.'
        : (uploadError.message || 'Không thể tải font lên Supabase.'),
    };
  }

  const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(path);
  const url = publicData?.publicUrl || '';
  if (!url) {
    await client.storage.from(BUCKET).remove([path]).catch(() => {});
    return { ok: false, message: 'Không thể tạo đường dẫn font dùng chung.' };
  }

  const config = {
    name: String(displayName || file.name.replace(/\.[^.]+$/, '') || 'Font tùy chỉnh').trim(),
    url,
    path,
    format: extension,
    size: Number(file.size || 0),
  };
  const result = await saveConfig(config, currentUser);
  if (!result.ok) {
    await client.storage.from(BUCKET).remove([path]).catch(() => {});
    return result;
  }

  const previousPath = String(previousConfig?.path || '');
  if (previousPath && previousPath !== path) {
    client.storage.from(BUCKET).remove([previousPath]).catch(() => {});
  }
  clearGlobalCustomFontPreview();
  return result;
}

function installRealtime() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-custom-font-settings',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row?.font_preset === 'custom' && row?.custom_font_url) {
          applyGlobalCustomFont(normalizeConfig(row), { source: 'custom-realtime' });
        }
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

export function installGlobalCustomFontRuntime() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  const cached = readStoredConfig();
  if (document.documentElement?.dataset?.globalFont === 'custom' && cached) {
    applyGlobalCustomFont(cached, { source: 'custom-bootstrap' });
  }
  const run = async () => {
    const result = await loadGlobalCustomFontSettings({ silent: true, apply: true });
    if (result.ok) installRealtime();
  };
  [0, 900, 2800, 8000].forEach((delay) => retryTimers.push(window.setTimeout(run, delay)));
}

export { BUCKET as GLOBAL_CUSTOM_FONT_BUCKET, FAMILY_NAME as GLOBAL_CUSTOM_FONT_FAMILY };
