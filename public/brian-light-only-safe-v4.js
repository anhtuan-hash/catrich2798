(() => {
  'use strict';

  const RETIRED_ROUTES = ["brian-textlab-activities", "textlab-activities", "resource-library", "personal-library", "thu-vien", "material-workshop", "resource-workshop", "xuong-hoc-lieu", "lesson-pack", "integrated-lesson-pack", "goi-bai-day-lien-thong", "teaching-content-ecosystem", "content-ecosystem", "he-sinh-thai-noi-dung-day-hoc", "pwa-center", "pwa-hub", "pwa-settings", "security-accessibility", "security-and-accessibility", "bao-mat-tiep-can", "background-operations", "operations-24-7", "always-on-operations", "van-hanh-nen-24-7", "automation-center", "automation-hub", "trung-tam-tu-dong-hoa", "collaboration-space", "collaboration-workspace", "khong-gian-cong-tac", "data-governance-compliance", "data-compliance", "quan-tri-du-lieu-tuan-thu"];
  const THEME_KEYS = ['theme', 'brian-theme', 'color-scheme', 'appearance', 'app-theme'];

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

  const forceLight = () => {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') !== 'light') html.setAttribute('data-theme', 'light');
    if (html.getAttribute('data-color-scheme') !== 'light') html.setAttribute('data-color-scheme', 'light');
    if (html.getAttribute('data-appearance') !== 'light') html.setAttribute('data-appearance', 'light');
    if (html.style.colorScheme !== 'light') html.style.colorScheme = 'light';

    ['dark', 'theme-dark', 'dark-mode', 'night', 'night-mode'].forEach((name) => {
      if (html.classList.contains(name)) html.classList.remove(name);
      if (document.body?.classList.contains(name)) document.body.classList.remove(name);
    });

    try {
      THEME_KEYS.forEach((key) => {
        if (localStorage.getItem(key) !== 'light') localStorage.setItem(key, 'light');
      });
    } catch {}
  };

  const protectRoute = () => {
    const current = normalize(`${location.pathname} ${location.hash}`);
    if (!RETIRED_ROUTES.some((route) => current.includes(route))) return;
    const target = '#/apps';
    if (location.hash !== target) location.replace(target);
  };

  forceLight();
  protectRoute();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceLight, { once: true });
  }

  // Observe only theme attributes. This never scans, removes, or rewrites React DOM.
  const themeObserver = new MutationObserver(() => forceLight());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-appearance'],
  });

  addEventListener('hashchange', protectRoute);
  addEventListener('popstate', protectRoute);
  addEventListener('storage', (event) => {
    if (event.key && THEME_KEYS.includes(event.key)) forceLight();
  });
})();
