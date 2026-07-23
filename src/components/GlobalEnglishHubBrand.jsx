import { useEffect } from 'react';

function applyEnglishHubBrand() {
  document.querySelectorAll('.brian-nav__brand > span').forEach((node) => {
    if (node.textContent !== 'English Hub') node.textContent = 'English Hub';
  });

  document.querySelectorAll('.brian-overlap-home .boh-copy-panel > h1').forEach((node) => {
    if (node.textContent !== 'English Hub') node.textContent = 'English Hub';
  });

  document.querySelectorAll('.brian-overlap-home .boh-eyebrow').forEach((node) => {
    if (node.textContent !== 'ENGLISH HUB') node.textContent = 'ENGLISH HUB';
  });

  document.querySelectorAll('.brian-overlap-home').forEach((node) => {
    node.setAttribute('aria-label', 'English Hub homepage');
  });

  if (document.title.includes('Brian English')) {
    document.title = document.title.replace('Brian English', 'English Hub');
  }
}

export default function GlobalEnglishHubBrand() {
  useEffect(() => {
    applyEnglishHubBrand();
    const observer = new MutationObserver(applyEnglishHubBrand);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
