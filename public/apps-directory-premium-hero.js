(() => {
  'use strict';

  const HERO_SELECTOR = '.flat-apps-directory .flat-apps-hero';
  const GRID_SELECTOR = '.flat-apps-directory .flat-apps-collage-grid';
  let queued = false;
  let enhancing = false;

  const icon = (symbol, background) => `<span class="apps-launcher-icon" style="--icon-bg:${background}">${symbol}</span>`;

  const visualMarkup = `
    <div class="apps-hero-visual" aria-hidden="true">
      <span class="apps-cloud"></span>
      <span class="apps-paper-plane"></span>
      <span class="apps-floating-icon is-document">▤</span>
      <span class="apps-floating-icon is-network">⌘</span>
      <span class="apps-floating-icon is-chat">▣</span>
      <div class="apps-launcher-window">
        <div class="apps-launcher-window-head"><i></i><span class="apps-launcher-search">⌕&nbsp;&nbsp; Tìm ứng dụng…</span></div>
        <div class="apps-launcher-icons">
          ${icon('✎', '#4e91f2')}
          ${icon('⌘', '#48b690')}
          ${icon('✦', '#8468e8')}
          ${icon('▧', '#f19a66')}
          ${icon('▤', '#d86bab')}
          ${icon('▣', '#4fb8dd')}
          ${icon('▱', '#4d88ee')}
          ${icon('⌁', '#d86099')}
          <span class="apps-launcher-icon is-add">＋</span>
          ${icon('✓', '#7a72df')}
        </div>
      </div>
      <div class="apps-plant"><i class="apps-plant-leaf"></i><i class="apps-plant-leaf"></i><i class="apps-plant-leaf"></i><i class="apps-plant-leaf"></i></div>
    </div>`;

  function isVietnamese(hero) {
    const text = `${hero.querySelector('.flat-kicker')?.textContent || ''} ${hero.querySelector('h1')?.textContent || ''}`;
    return /cửa sổ|ứng dụng|sáng tạo/i.test(text) || document.documentElement.lang?.toLowerCase().startsWith('vi');
  }

  function addBrowseAction(hero) {
    const copy = hero.querySelector('.flat-apps-hero-copy');
    if (!copy || copy.querySelector('.apps-premium-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'apps-premium-actions';

    const browse = document.createElement('button');
    browse.type = 'button';
    browse.className = 'apps-hero-browse-button';
    browse.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>
      <span>${isVietnamese(hero) ? 'Thêm / duyệt ứng dụng' : 'Add / browse apps'}</span>`;
    browse.addEventListener('click', () => {
      document.querySelector(GRID_SELECTOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    actions.appendChild(browse);
    const adminActions = copy.querySelector('.launcher-admin-actions');
    if (adminActions) copy.insertBefore(actions, adminActions);
    else copy.appendChild(actions);
  }

  function decorateAdminActions(hero) {
    const adminActions = hero.querySelector('.launcher-admin-actions');
    if (!adminActions) return;
    adminActions.classList.add('apps-native-launcher-actions');
    const firstButton = adminActions.querySelector('button');
    if (firstButton && !firstButton.querySelector('.apps-hero-customize-icon')) {
      const mark = document.createElement('span');
      mark.className = 'apps-hero-customize-icon';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '⚙';
      firstButton.prepend(mark);
    }
  }

  function decorateStats(hero) {
    const stats = hero.querySelector(':scope > .flat-apps-stats');
    if (!stats) return;
    stats.classList.add('apps-premium-stats');
    const detailsVi = ['Ứng dụng sẵn sàng', 'Đã ghim', 'Vị trí điều hướng'];
    const detailsEn = ['Apps ready', 'Pinned', 'Navigation slots'];
    const details = isVietnamese(hero) ? detailsVi : detailsEn;
    const icons = ['◇', '♟', '⌁'];
    Array.from(stats.children).slice(0, 3).forEach((card, index) => {
      card.dataset.icon = icons[index];
      card.dataset.detail = details[index];
    });
  }

  function addVisual(hero) {
    if (hero.querySelector(':scope > .apps-hero-visual')) return;
    hero.insertAdjacentHTML('beforeend', visualMarkup);
  }

  function hideCategoryRail() {
    const rail = document.querySelector('.flat-apps-directory .flat-apps-group-rail.launcher-group-rail');
    if (!rail) return;
    rail.setAttribute('aria-hidden', 'true');
    rail.dataset.appsCategoryRailRemoved = 'true';
  }

  function enhance() {
    queued = false;
    if (enhancing) return;
    const hero = document.querySelector(HERO_SELECTOR);
    if (!hero) return;

    enhancing = true;
    try {
      hero.classList.add('apps-premium-hero');
      addBrowseAction(hero);
      decorateAdminActions(hero);
      decorateStats(hero);
      addVisual(hero);
      hideCategoryRail();
    } finally {
      enhancing = false;
    }
  }

  function queueEnhance() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(enhance);
  }

  function start() {
    queueEnhance();
    const root = document.getElementById('root') || document.body;
    const observer = new MutationObserver((records) => {
      if (enhancing) return;
      const relevant = records.some((record) => {
        if (record.target?.closest?.('.flat-apps-directory')) return true;
        return Array.from(record.addedNodes || []).some((node) =>
          node?.nodeType === 1 && (node.matches?.('.flat-apps-directory, .flat-apps-hero, .flat-apps-group-rail') || node.querySelector?.(HERO_SELECTOR))
        );
      });
      if (relevant) queueEnhance();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('hashchange', queueEnhance);
    window.addEventListener('bes-language-changed', queueEnhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
