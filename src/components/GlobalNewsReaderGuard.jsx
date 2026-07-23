import { useEffect } from 'react';

export default function GlobalNewsReaderGuard() {
  useEffect(() => {
    const handleClickCapture = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const newsPage = target.closest('.newsroom-v823-page, .newsroom-v824-reader-screen');
      if (!newsPage) return;

      // Article cards are React buttons. Prevent any inherited/default navigation
      // while allowing their React onClick handlers to open the in-app reader.
      if (target.closest([
        '.newsroom-v823-story-open',
        '.newsroom-v823-hero-story',
        '.newsroom-v823-featured-card > button',
        '.newsroom-v823-saved-list button',
        '.newsroom-v824-reader-related button',
      ].join(','))) {
        event.preventDefault();
        return;
      }

      // The reading experience is intentionally in-app. Block every external
      // source link inside the news page so Safari/Chrome cannot spawn a tab.
      const externalLink = target.closest('a[target="_blank"], a[href^="http://"], a[href^="https://"]');
      if (externalLink) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', handleClickCapture, true);
    return () => document.removeEventListener('click', handleClickCapture, true);
  }, []);

  return null;
}
