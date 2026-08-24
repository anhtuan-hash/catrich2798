import { useEffect } from 'react';

export default function GlobalGamesNavigationTab({ route = '' }) {
  useEffect(() => {
    if (route === 'games' && typeof window !== 'undefined' && window.location.hash !== '#/apps') {
      window.location.hash = '#/apps';
    }
  }, [route]);

  return null;
}
