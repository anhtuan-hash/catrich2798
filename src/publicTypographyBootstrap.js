import { getRuntimeClient } from './services/runtime/core.js';
import {
  applyGlobalFontPreset,
  getGlobalFontPreset,
  getGlobalFontPresetDefinition,
} from './utils/globalFontSystem.js';
import { applyGlobalCustomFont } from './utils/globalCustomFont.js';
import { applyRegionalFontSettings } from './utils/globalRegionalFontSystem.js';

const SETTINGS_TABLE = 'brian_global_font_settings';
const BOOT_STYLE_ID = 'bes-public-typography-boot-style';
const FONT_LINK_ID = 'bes-global-font-runtime-link';
const MAX_SETTINGS_WAIT_MS = 1800;
const MAX_FONT_WAIT_MS = 1600;

let bootPromise = null;

function installFirstPaintGate() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.typographyBoot = 'pending';
  if (document.getElementById(BOOT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BOOT_STYLE_ID;
  style.textContent = `
    html[data-typography-boot='pending'] #root { visibility: hidden !important; }
    html[data-typography-boot='ready'] #root { visibility: visible !important; }
  `;
  document.head.appendChild(style);
}

function releaseFirstPaintGate(source = 'ready') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.typographyBoot = 'ready';
  root.dataset.typographyBootSource = source;
}

function timeout(ms, value = null) {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), ms));
}

function waitForStylesheet(link, maxMs = MAX_FONT_WAIT_MS) {
  if (!link || link.sheet) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => {
      const finish = () => resolve();
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', finish, { once: true });
    }),
    timeout(maxMs),
  ]);
}

async function waitForAppliedFont(preset) {
  if (typeof document === 'undefined') return;
  const normalized = String(preset || 'system').toLowerCase();
  if (normalized === 'system' || normalized === 'arial') return;

  if (normalized !== 'custom') {
    const link = document.getElementById(FONT_LINK_ID);
    await waitForStylesheet(link);
  }

  if (!document.fonts?.load) return;
  const definition = getGlobalFontPresetDefinition(normalized);
  const family = normalized === 'custom'
    ? 'BrianGlobalCustom'
    : String(definition?.family || '').split(',')[0].replace(/["']/g, '').trim();
  if (!family) return;
  await Promise.race([
    document.fonts.load(`400 16px "${family}"`).catch(() => []),
    timeout(MAX_FONT_WAIT_MS),
  ]);
}

function customConfigFromRow(row = {}) {
  return {
    name: row.custom_font_name || 'Font tùy chỉnh',
    url: row.custom_font_url || '',
    path: row.custom_font_path || '',
    format: row.custom_font_format || 'woff2',
    size: Number(row.custom_font_size || 0),
    updatedAt: row.updated_at || null,
  };
}

async function fetchPublicTypographyRow() {
  const client = getRuntimeClient();
  if (!client) return null;
  const request = client
    .from(SETTINGS_TABLE)
    .select('font_preset,region_fonts,custom_font_name,custom_font_url,custom_font_path,custom_font_format,custom_font_size,updated_at')
    .eq('id', true)
    .maybeSingle();

  const result = await Promise.race([request, timeout(MAX_SETTINGS_WAIT_MS, { data: null, error: new Error('Typography bootstrap timeout') })]);
  if (result?.error || !result?.data) return null;
  return result.data;
}

function applyRow(row) {
  const preset = String(row?.font_preset || 'system').trim().toLowerCase();
  if (preset === 'custom' && row?.custom_font_url) {
    applyGlobalCustomFont(customConfigFromRow(row), { persist: true, source: 'public-bootstrap' });
  } else {
    applyGlobalFontPreset(preset, { source: 'public-bootstrap', persist: true, broadcast: false });
  }

  if (row?.region_fonts && typeof row.region_fonts === 'object') {
    applyRegionalFontSettings(row.region_fonts, {
      source: 'public-bootstrap',
      persist: true,
      broadcast: false,
    });
  }
  return preset;
}

export function bootstrapPublicTypographyBeforeApp() {
  if (bootPromise || typeof window === 'undefined' || typeof document === 'undefined') return bootPromise || Promise.resolve();

  installFirstPaintGate();
  bootPromise = (async () => {
    let source = 'cache';
    let preset = getGlobalFontPreset();
    try {
      // Apply a previously cached Admin choice immediately while the public row is fetched.
      applyGlobalFontPreset(preset, { source: 'public-cache', persist: false, broadcast: false });

      const row = await fetchPublicTypographyRow();
      if (row) {
        preset = applyRow(row);
        source = 'server';
      }
      await waitForAppliedFont(preset);
    } catch (error) {
      console.warn('[PublicTypographyBootstrap] Using cached/system fallback.', error);
    } finally {
      releaseFirstPaintGate(source);
    }
  })();

  // Never allow typography networking to block the application indefinitely.
  window.setTimeout(() => releaseFirstPaintGate('safety-timeout'), MAX_SETTINGS_WAIT_MS + MAX_FONT_WAIT_MS + 500);
  return bootPromise;
}
