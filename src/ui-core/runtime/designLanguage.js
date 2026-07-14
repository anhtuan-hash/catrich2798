import {
  DESIGN_LANGUAGES,
  normalizeUiPreferences,
  readLocalUiPreferences,
  applyUiPreferences,
  installUiPreferencesBootstrap,
} from './uiPreferences.js';

export {
  DESIGN_LANGUAGES,
  normalizeUiPreferences,
  readLocalUiPreferences,
  applyUiPreferences,
  installUiPreferencesBootstrap,
};

export function normalizeDesignLanguage(value) {
  return normalizeUiPreferences({ ...readLocalUiPreferences(), designLanguage: value }).designLanguage;
}

export function getStoredDesignLanguage() {
  return readLocalUiPreferences().designLanguage;
}

export function applyDesignLanguage(value, { persist = true, notify = true } = {}) {
  const current = readLocalUiPreferences();
  return applyUiPreferences({ ...current, designLanguage: value }, {
    persist,
    touch: persist,
    notify,
  }).designLanguage;
}

export function installDesignLanguageBootstrap() {
  return installUiPreferencesBootstrap().designLanguage;
}
