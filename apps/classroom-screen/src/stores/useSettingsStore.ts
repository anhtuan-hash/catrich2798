import { useState, useEffect } from 'react';
import { AppSettings, Language, ThemeMode } from '../types';
import { loadStoredSettings, saveStoredSettings } from '../services/db';

export function useSettingsStore() {
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());

  useEffect(() => {
    saveStoredSettings(settings);
    // Apply theme mode to document element
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast', 'cosmic');
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'cosmic') {
      root.classList.add('dark', 'cosmic');
    } else if (settings.theme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else if (settings.theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const toggleLanguage = () => {
    setSettings((prev) => ({ ...prev, language: prev.language === 'vi' ? 'en' : 'vi' }));
  };

  return {
    settings,
    updateSettings,
    toggleLanguage,
  };
}
