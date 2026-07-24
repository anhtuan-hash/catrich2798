import { useEffect } from 'react';

function normalizeBrandButton(button) {
  const directSpans = Array.from(button.children).filter((node) => node.tagName === 'SPAN');
  const primaryLabel = directSpans[0];

  if (primaryLabel && primaryLabel.textContent !== 'English Hub') {
    primaryLabel.textContent = 'English Hub';
  }

  directSpans.slice(1).forEach((node) => node.remove());

  Array.from(button.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
  });

  button.setAttribute('aria-label', 'English Hub');
}

function applyEnglishHubBrand() {
  document.querySelectorAll('.brian-nav__brand').forEach(normalizeBrandButton);

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
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
