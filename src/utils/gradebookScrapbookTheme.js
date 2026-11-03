import { useEffect } from 'react';
import { createScrapbookTheme } from './createScrapbookTheme.js';

export const {
  get: getGradebookScrapbookTheme,
  load: loadGradebookScrapbookTheme,
  save: saveGradebookScrapbookTheme,
  useTheme: useGradebookScrapbookTheme,
} = createScrapbookTheme('gradebook', 'Gradebook');

/** The global shell owns the attribute so navigation and footer share the skin. */
export function useGradebookScrapbookScope(route, toolSlug) {
  const theme = useGradebookScrapbookTheme();
  useEffect(() => {
    const root = document.documentElement;
    const shell = document.querySelector('.app-shell');
    const active = theme.enabled && route === 'tool' && toolSlug === 'gradebook-studio';
    root.dataset.gradebookScrapbook = active ? 'on' : 'off';
    if (shell) shell.dataset.gradebookScrapbook = active ? 'on' : 'off';
    return () => {
      delete root.dataset.gradebookScrapbook;
      if (shell) delete shell.dataset.gradebookScrapbook;
    };
  }, [theme.enabled, route, toolSlug]);
  return theme;
}
