import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';

const STORAGE_KEY = 'bes-design-language-v1';
const CHANNEL_NAME = 'bes-design-language-v1';
const ACCOUNT_METADATA_KEY = 'brian_design_language_v1';

export const DESIGN_LANGUAGES = Object.freeze({
  BRIAN: 'brian-unified',
  MATERIAL: 'material-3',
  APPLE: 'apple',
});

export const DESIGN_LANGUAGE_OPTIONS = Object.freeze([
  {
    id: DESIGN_LANGUAGES.BRIAN,
    label: 'Brian Unified',
    labelVi: 'Brian Unified',
    status: 'stable',
    description: 'Warm editorial teaching OS with Brian identity.',
    descriptionVi: 'Hệ điều hành dạy học ấm, rõ ràng và giữ bản sắc Brian.',
  },
  {
    id: DESIGN_LANGUAGES.MATERIAL,
    label: 'Android / Material 3',
    labelVi: 'Android / Material 3',
    status: 'preview',
    description: 'Tonal surfaces, expressive shapes, and Material motion.',
    descriptionVi: 'Bề mặt tonal, hình khối biểu cảm và chuyển động Material.',
  },
  {
    id: DESIGN_LANGUAGES.APPLE,
    label: 'Apple / iOS–iPadOS',
    labelVi: 'Apple / iOS–iPadOS',
    status: 'preview',
    description: 'Grouped surfaces, restrained chrome, and fluid hierarchy.',
    descriptionVi: 'Bề mặt grouped, thanh điều khiển nhẹ và phân cấp mềm mại.',
  },
]);

export function normalizeDesignLanguage(value) {
  return Object.values(DESIGN_LANGUAGES).includes(value) ? value : DESIGN_LANGUAGES.BRIAN;
}

export function readStoredDesignLanguage() {
  if (typeof window === 'undefined') return DESIGN_LANGUAGES.BRIAN;
  try {
    return normalizeDesignLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DESIGN_LANGUAGES.BRIAN;
  }
}

export function applyDesignLanguage(value, { broadcast = true } = {}) {
  if (typeof document === 'undefined') return DESIGN_LANGUAGES.BRIAN;
  const normalized = normalizeDesignLanguage(value);
  const root = document.documentElement;
  root.dataset.uiCore = 'v12';
  root.dataset.designLanguage = normalized;
  root.style.colorScheme = root.dataset.theme === 'dark' ? 'dark' : 'light';
  try { window.localStorage.setItem(STORAGE_KEY, normalized); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent('brian:design-language-change', {
    detail: { language: normalized, uiCore: 'v12' },
  }));
  if (broadcast) {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'change', language: normalized });
      channel.close();
    } catch { /* optional */ }
  }
  return normalized;
}

export async function readAccountDesignLanguage() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    const remote = data.user.user_metadata?.[ACCOUNT_METADATA_KEY];
    return Object.values(DESIGN_LANGUAGES).includes(remote) ? remote : null;
  } catch {
    return null;
  }
}

export async function saveAccountDesignLanguage(value) {
  const normalized = normalizeDesignLanguage(value);
  if (!isSupabaseConfigured || !supabase) return { ok: true, storage: 'browser' };
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data?.user) return { ok: true, storage: 'browser' };
    const metadata = data.user.user_metadata || {};
    const { error } = await supabase.auth.updateUser({
      data: { ...metadata, [ACCOUNT_METADATA_KEY]: normalized },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, storage: 'account' };
  } catch (error) {
    return { ok: false, message: error?.message || 'Could not sync design language.' };
  }
}

export async function hydrateDesignLanguageFromAccount() {
  const remote = await readAccountDesignLanguage();
  if (!remote) return null;
  applyDesignLanguage(remote);
  return remote;
}

export function subscribeDesignLanguage(listener) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    listener(normalizeDesignLanguage(event.newValue));
  };
  const onCustom = (event) => listener(normalizeDesignLanguage(event.detail?.language));
  window.addEventListener('storage', onStorage);
  window.addEventListener('brian:design-language-request', onCustom);

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === 'change') listener(normalizeDesignLanguage(event.data.language));
    };
  } catch { channel = null; }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('brian:design-language-request', onCustom);
    channel?.close?.();
  };
}

export function getDesignLanguageStorageKey() {
  return STORAGE_KEY;
}
