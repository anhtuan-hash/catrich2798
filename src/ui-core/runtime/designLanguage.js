export const DESIGN_LANGUAGES = Object.freeze({
  BRIAN: 'brian-unified',
  MATERIAL: 'material-3',
  APPLE: 'apple',
});

const STORAGE_KEY = 'bes-design-language-v12';
const ALLOWED = new Set(Object.values(DESIGN_LANGUAGES));

export function normalizeDesignLanguage(value) {
  return ALLOWED.has(value) ? value : DESIGN_LANGUAGES.BRIAN;
}

export function getStoredDesignLanguage() {
  if (typeof window === 'undefined') return DESIGN_LANGUAGES.BRIAN;
  try { return normalizeDesignLanguage(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return DESIGN_LANGUAGES.BRIAN; }
}

export function applyDesignLanguage(value, { persist = true, notify = true } = {}) {
  const language = normalizeDesignLanguage(value);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.designLanguage = language;
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  if (persist && typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, language); } catch { /* optional */ }
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brian:design-language-change', { detail: { language } }));
  }
  return language;
}

export function installDesignLanguageBootstrap() {
  const language = applyDesignLanguage(getStoredDesignLanguage(), { persist: false, notify: false });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) applyDesignLanguage(event.newValue, { persist: false });
    });
  }
  return language;
}
