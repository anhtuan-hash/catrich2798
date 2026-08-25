// Global/system font switching has been retired.
// Keep this compatibility surface for legacy/lazy imports without owning typography.

const LEGACY_FONT_STORAGE_KEY = 'bes-system-font-family-v1';
const LEGACY_STYLE_IDS = [
  'bes-system-font-catalog',
  'bes-quicksand-font-stylesheet',
];

export const FONT_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'native',
    label: 'Mặc định giao diện',
    description: 'Sử dụng kiểu chữ do từng thành phần giao diện tự quản lý.',
    stack: 'inherit',
  }),
]);

function cleanupLegacySystemFontState() {
  if (typeof document !== 'undefined') {
    for (const id of LEGACY_STYLE_IDS) {
      document.getElementById(id)?.remove();
    }

    const root = document.documentElement;
    root.style.removeProperty('--font-ui');
    root.style.removeProperty('--metro-font');
    root.style.removeProperty('--english-hub-personal-font');
    delete root.dataset.systemFont;
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LEGACY_FONT_STORAGE_KEY);
    } catch {
      // Legacy preference cleanup is best-effort only.
    }
  }
}

export function getStoredSystemFont() {
  cleanupLegacySystemFontState();
  return 'native';
}

export function applySystemFont() {
  cleanupLegacySystemFontState();
  return 'native';
}

export function installStoredSystemFont() {
  cleanupLegacySystemFontState();
  return 'native';
}
