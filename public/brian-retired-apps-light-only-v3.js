(() => {
  'use strict';

  const RETIRED_LABELS = [
    'Brian TextLab Activities','Thư viện','Xưởng học liệu','Gói bài dạy liên thông',
    'Hệ sinh thái nội dung dạy học','PWA','Bảo mật & tiếp cận','Vận hành nền 24/7',
    'Trung tâm tự động hóa','Không gian cộng tác','Quản trị dữ liệu & tuân thủ'
  ];

  const RETIRED_ROUTES = [
    'brian-textlab-activities','textlab-activities','resource-library','personal-library','thu-vien',
    'material-workshop','resource-workshop','xuong-hoc-lieu','lesson-pack','integrated-lesson-pack',
    'goi-bai-day-lien-thong','teaching-content-ecosystem','content-ecosystem',
    'he-sinh-thai-noi-dung-day-hoc','pwa-center','pwa-hub','pwa-settings',
    'security-accessibility','security-and-accessibility','bao-mat-tiep-can',
    'background-operations','operations-24-7','always-on-operations','van-hanh-nen-24-7',
    'automation-center','automation-hub','trung-tam-tu-dong-hoa',
    'collaboration-space','collaboration-workspace','khong-gian-cong-tac',
    'data-governance-compliance','data-compliance','quan-tri-du-lieu-tuan-thu'
  ];

  const DARK_LABELS = ['chế độ tối','giao diện tối','dark mode','dark theme','use dark'];
  const THEME_KEYS = ['theme','appearance','color-scheme','colorscheme','mode','darkmode','dark-mode'];

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const labels = RETIRED_LABELS.map(normalize);
  const routes = RETIRED_ROUTES.map(normalize);
  const darkLabels = DARK_LABELS.map(normalize);

  function sanitizeThemeObject(value) {
    if (Array.isArray(value)) return value.map(sanitizeThemeObject);
    if (!value || typeof value !== 'object') return value;
    const copy = { ...value };
    Object.keys(copy).forEach(key => {
      const folded = normalize(key).replace(/\s+/g, '');
      if (THEME_KEYS.includes(folded)) copy[key] = 'light';
      else if (folded === 'isdark' || folded === 'darkenabled') copy[key] = false;
      else copy[key] = sanitizeThemeObject(copy[key]);
    });
    return copy;
  }

  function sanitizeThemeValue(key, value) {
    const foldedKey = normalize(key).replace(/\s+/g, '');
    const isThemeKey = THEME_KEYS.some(item => foldedKey.includes(item)) || foldedKey.includes('ui_preferences');
    if (!isThemeKey) return value;
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(sanitizeThemeObject(parsed));
    } catch {
      return 'light';
    }
  }

  try {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      return originalSetItem.call(this, key, sanitizeThemeValue(key, value));
    };
  } catch {}

  function forceSavedLight() {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key) continue;
        const current = localStorage.getItem(key);
        const sanitized = sanitizeThemeValue(key, current);
        if (sanitized !== current) localStorage.setItem(key, sanitized);
      }
      ['theme','brian-theme','color-scheme','appearance','app-theme'].forEach(key => localStorage.setItem(key, 'light'));
    } catch {}
  }

  function forceLight() {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'light');
    html.setAttribute('data-color-scheme', 'light');
    html.setAttribute('data-appearance', 'light');
    html.style.colorScheme = 'light';
    html.classList.remove('dark','theme-dark','dark-mode','night','night-mode');
    document.body?.classList.remove('dark','theme-dark','dark-mode','night','night-mode');
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', 'light');
    forceSavedLight();
  }

  function nodeAttributes(node) {
    if (!(node instanceof Element)) return '';
    return normalize([
      node.getAttribute('href'), node.getAttribute('to'), node.getAttribute('data-route'),
      node.getAttribute('data-app-id'), node.getAttribute('data-app'), node.getAttribute('data-id'),
      node.getAttribute('aria-label'), node.getAttribute('title'), node.id, node.className
    ].join(' '));
  }

  function exactRetiredLabel(node) {
    const text = normalize(node.textContent);
    if (labels.includes(text)) return true;
    const headings = node.querySelectorAll?.('h1,h2,h3,h4,h5,h6,strong,b,[data-title],[data-app-name]') || [];
    return [...headings].some(child => labels.includes(normalize(child.textContent)));
  }

  function closestRemovable(node) {
    const selector = [
      '[data-app-id]','[data-app]','[data-route]','[data-tool-id]',
      '.app-card','.application-card','.tool-card','.launcher-card','.dashboard-card',
      '.menu-item','.nav-item','[role="menuitem"]','article','li'
    ].join(',');
    return node.closest?.(selector) || node;
  }

  function removeRetiredUi(root = document) {
    const selector = [
      'a','button','[role="button"]','[role="menuitem"]','[data-app-id]','[data-app]',
      '[data-route]','[data-tool-id]','.app-card','.application-card','.tool-card',
      '.launcher-card','.dashboard-card','.menu-item','.nav-item','article','li'
    ].join(',');

    const nodes = root.querySelectorAll?.(selector) || [];
    nodes.forEach(node => {
      if (!(node instanceof Element) || !node.isConnected) return;
      const attrs = nodeAttributes(node);
      const retiredRoute = routes.some(route => attrs.includes(route));
      const retiredLabel = exactRetiredLabel(node);
      const darkControl = darkLabels.some(label => normalize(node.textContent).includes(label) || attrs.includes(label));
      const explicitThemeControl = node.matches('[data-theme-toggle],[data-appearance-toggle],[aria-label*="dark" i],[title*="dark" i]');

      if (retiredRoute || retiredLabel || darkControl || explicitThemeControl) {
        closestRemovable(node).remove();
      }
    });
  }

  function protectRoute() {
    const current = normalize(`${location.pathname} ${location.hash}`);
    if (!routes.some(route => current.includes(route))) return;
    if (location.hash.startsWith('#/')) location.replace('#/apps');
    else location.replace('/#/apps');
  }

  let scheduled = false;
  function scheduleRun() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      forceLight();
      removeRetiredUi();
      protectRoute();
    });
  }

  forceLight();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRun, { once: true });
  else scheduleRun();

  new MutationObserver(scheduleRun).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class','data-theme','data-color-scheme','data-appearance','href','data-route','data-app-id']
  });

  addEventListener('hashchange', protectRoute);
  addEventListener('popstate', protectRoute);
})();
