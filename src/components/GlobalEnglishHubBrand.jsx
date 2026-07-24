import { useEffect } from 'react';

function prepareBrandButton(button) {
  button.setAttribute('aria-label', 'English Hub');
  button.setAttribute('title', 'English Hub');
  button.dataset.brianBrandReady = 'true';
}

function hideRedundantHomeTab() {
  const homeLabels = new Set(['Trang chủ', 'Home']);

  document.querySelectorAll('.brian-nav__primary > button').forEach((button) => {
    if (!homeLabels.has(String(button.textContent || '').trim())) return;
    button.dataset.brianHomeTabHidden = 'true';
    button.setAttribute('aria-hidden', 'true');
    button.tabIndex = -1;
  });
}

function applyEnglishHubBrand() {
  document.querySelectorAll('.brian-nav__brand').forEach(prepareBrandButton);
  hideRedundantHomeTab();

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
    let frame = 0;
    const scheduleApply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyEnglishHubBrand);
    };

    applyEnglishHubBrand();
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
