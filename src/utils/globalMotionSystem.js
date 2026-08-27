const STORAGE_KEY = 'bes-global-motion-preset-v1';
const SETTINGS_TABLE = 'brian_global_motion_settings';
const GLOBAL_EVENT = 'bes-global-motion-updated';

export const GLOBAL_MOTION_PRESETS = Object.freeze([
  {
    id: 'off',
    labelVi: 'Tắt',
    label: 'Off',
    descriptionVi: 'Hệ thống chuyển động toàn cục cũ đã được gỡ. Hiệu ứng, nếu có, do từng giao diện hiện hành tự quản lý.',
    description: 'The retired global motion system is disabled. Active interfaces own any local motion they still need.',
    speedVi: '0 ms',
    tone: 'off',
    recommended: true,
  },
]);

let installed = false;

function removeLegacyMotionArtifacts({ clearStorage = true } = {}) {
  if (typeof window !== 'undefined' && clearStorage) {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional storage */ }
  }

  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (root) {
    delete root.dataset.motionMode;
    delete root.dataset.motionEnabled;
    delete root.dataset.motionSource;
    delete root.dataset.windows8Loading;
  }

  document.getElementById('bes-windows8-route-loader')?.remove();

  document
    .querySelectorAll('[data-global-tab-enter], [data-global-motion-enter], [data-global-page-enter]')
    .forEach((node) => {
      node.removeAttribute('data-global-tab-enter');
      node.removeAttribute('data-global-motion-enter');
      node.removeAttribute('data-global-page-enter');
      node.style?.removeProperty('animation');
    });
}

export function getGlobalMotionPreset() {
  return 'off';
}

export function getGlobalMotionPresetDefinition() {
  return GLOBAL_MOTION_PRESETS[0];
}

export function applyGlobalMotionPreset(_preset, options = {}) {
  const { persist = true, source = 'retired', broadcast = true } = options;
  removeLegacyMotionArtifacts({ clearStorage: persist });

  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, {
      detail: { preset: 'off', source, retired: true, at: Date.now() },
    }));
  }
  return 'off';
}

export async function loadGlobalMotionPresetFromServer() {
  removeLegacyMotionArtifacts();
  return { ok: true, retired: true, preset: 'off' };
}

export async function saveGlobalMotionPreset() {
  removeLegacyMotionArtifacts();
  return {
    ok: true,
    retired: true,
    preset: 'off',
    message: 'Hệ thống chuyển động toàn cục cũ đã được gỡ khỏi Brian.',
  };
}

export function installGlobalMotionSystem() {
  if (installed) return () => {};
  installed = true;
  removeLegacyMotionArtifacts();
  return () => removeLegacyMotionArtifacts({ clearStorage: false });
}

export { GLOBAL_EVENT as GLOBAL_MOTION_EVENT, SETTINGS_TABLE as GLOBAL_MOTION_SETTINGS_TABLE };
