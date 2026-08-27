const STORAGE_KEY = 'bes-global-font-preset-v1';
const STORAGE_SOURCE_KEY = 'bes-global-font-preset-source-v2';
const SETTINGS_TABLE = 'brian_global_font_settings';
const GLOBAL_EVENT = 'bes-global-font-updated';
const FONT_LINK_ID = 'bes-global-font-runtime-link';
const SYSTEM_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const GLOBAL_FONT_PRESETS = Object.freeze([
  {
    id: 'system',
    label: 'System UI',
    descriptionVi: 'Brian dùng font giao diện gốc của hệ điều hành. Cơ chế ép font toàn cục cũ đã được gỡ.',
    description: 'Brian uses the operating system interface font. The retired global font override has been removed.',
    family: SYSTEM_FAMILY,
    sample: 'Aa  Native UI · 123',
    recommended: true,
  },
]);

let installed = false;

function removeLegacyFontArtifacts({ clearStorage = true } = {}) {
  if (typeof window !== 'undefined' && clearStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_SOURCE_KEY);
    } catch { /* optional storage */ }
  }

  if (typeof document === 'undefined') return;

  document.getElementById(FONT_LINK_ID)?.remove();
  const root = document.documentElement;
  if (!root) return;
  delete root.dataset.globalFont;
  delete root.dataset.globalFontSource;
  root.style.removeProperty('--bes-global-font-family');
}

export function getGlobalFontPreset() {
  return 'system';
}

export function getGlobalFontPresetDefinition() {
  return GLOBAL_FONT_PRESETS[0];
}

export function applyGlobalFontPreset(_preset, options = {}) {
  const { persist = true, source = 'retired', broadcast = true } = options;
  removeLegacyFontArtifacts({ clearStorage: persist });

  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, {
      detail: { preset: 'system', source, retired: true, at: Date.now() },
    }));
  }
  return 'system';
}

export async function loadGlobalFontPresetFromServer() {
  removeLegacyFontArtifacts();
  return { ok: true, retired: true, preset: 'system' };
}

export async function saveGlobalFontPreset() {
  removeLegacyFontArtifacts();
  return {
    ok: true,
    retired: true,
    preset: 'system',
    message: 'Brian đã trở về System UI; cơ chế font toàn cục cũ đã được gỡ.',
  };
}

export function installGlobalFontSystem() {
  if (installed) return () => {};
  installed = true;
  removeLegacyFontArtifacts();
  return () => removeLegacyFontArtifacts({ clearStorage: false });
}

export { GLOBAL_EVENT as GLOBAL_FONT_EVENT, SETTINGS_TABLE as GLOBAL_FONT_SETTINGS_TABLE };
