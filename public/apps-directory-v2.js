(() => {
  'use strict';

  const ROOT_SELECTOR = '.flat-apps-directory';
  const HERO_SELECTOR = '.flat-apps-hero';
  const GRID_SELECTOR = '.flat-apps-collage-grid';
  const ADD_PATTERN = /(?:thêm\s*\/\s*duyệt\s*ứng\s*dụng|add\s*\/\s*browse\s*apps)/i;
  let scheduled = false;
  let applying = false;

  const icons = {
    browse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58-1.92-3.32-2.39.96a7.3 7.3 0 0 0-1.62-.94L14.87 3h-3.84l-.36 3.18c-.58.24-1.12.55-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58c-.05.31-.08.64-.08.96 0 .31.03.62.07.92l-2.02 1.58 1.92 3.32 2.38-.96c.5.39 1.05.71 1.63.95l.36 3.17h3.84l.36-3.17c.58-.24 1.13-.56 1.63-.95l2.38.96 1.92-3.32-2.02-1.58ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m16 3 5 5-2 2-1.5-1.5-3 3v3l-2 2-2.5-2.5L5 19l-1-1 5-5-2.5-2.5 2-2h3l3-3L13 4l3-1Z"/></svg>',
    nav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.4 11.3 20.5 3.6c.8-.4 1.6.4 1.2 1.2L14 21.9c-.4.9-1.7.8-1.9-.2l-1.3-6.1-6.1-1.3c-1-.2-1.1-1.6-.2-2Zm4.1 1.7 4.1.9.9 4.1 5.8-11.8L7.5 13Z"/></svg>',
  };

  const appTiles = [
    ['#4d8df7', '<path d="M7 4h8l3 3v13H7V4Zm7 1.5V8h2.5L14 5.5ZM9 11h7v1.5H9V11Zm0 3h7v1.5H9V14Z"/>'],
    ['#42ad89', '<path d="M5 5h14v14H5V5Zm2 2v10h10V7H7Zm2 2h6v2H9V9Zm0 4h6v2H9v-2Z"/>'],
    ['#7a67e8', '<path d="M12 4a3 3 0 1 1-1 5.8V14H8.8a3 3 0 1 1-1.8-1.8V9.8A3 3 0 1 1 9 8h2a3 3 0 0 1 1-4Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM6 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM8 8a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm8.2 4.2A3 3 0 0 1 17 12V9.8A3 3 0 0 1 15.2 8H14a3 3 0 0 1-1 1.8V14h2.2a3 3 0 0 1 1-1.8Z"/>'],
    ['#f09a68', '<path d="M5 6h14v12H5V6Zm2 2v8h10V8H7Zm2 1.5h6V11H9V9.5Zm0 3h4V14H9v-1.5Z"/>'],
    ['#d86aaa', '<path d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h8v2H8V9Zm0 4h5v2H8v-2Z"/>'],
    ['#3d9fd6', '<path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7ZM6 6v3h3V6H6Zm9 0v3h3V6h-3ZM6 15v3h3v-3H6Zm9 0v3h3v-3h-3Z"/>'],
  ];

  function isVietnamese(root) {
    const text = root.querySelector('.flat-apps-hero-copy h1')?.textContent || '';
    return /cửa sổ|ứng dụng|sáng tạo/i.test(text) || document.documentElement.lang?.toLowerCase().startsWith('vi');
  }

  function createVisual() {
    const visual = document.createElement('div');
    visual.className = 'apps-v2-visual';
    visual.setAttribute('aria-hidden', 'true');
    const tiles = appTiles.map(([color, path]) => `
      <span class="apps-v2-workspace-app" style="--tile:${color}">
        <svg viewBox="0 0 24 24"><g fill="currentColor">${path}</g></svg>
      </span>`).join('');
    visual.innerHTML = `
      <span class="apps-v2-glow"></span>
      <span class="apps-v2-orbit orbit-one"></span>
      <span class="apps-v2-orbit orbit-two"></span>
      <div class="apps-v2-workspace">
        <header class="apps-v2-workspace-head">
          <span class="apps-v2-window-dots"><i></i><i></i><i></i></span>
          <span class="apps-v2-workspace-search">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="m15.5 14 4.5 4.5-1.5 1.5-4.5-4.5a6 6 0 1 1 1.5-1.5ZM10.5 6a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/></svg>
            <span>Tìm ứng dụng</span>
          </span>
        </header>
        <div class="apps-v2-workspace-body">
          <div class="apps-v2-workspace-copy"><small>BRIAN APP SPACE</small><strong>Không gian công cụ</strong><span>Mọi ứng dụng ở đúng vị trí bạn cần.</span></div>
          <div class="apps-v2-workspace-grid">${tiles}</div>
        </div>
      </div>
      <span class="apps-v2-float-card float-blue"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 3h9l4 4v14H6V3Zm8 2v3h3l-3-3ZM9 12h7v2H9v-2Zm0 4h7v2H9v-2Z"/></svg></span>
      <span class="apps-v2-float-card float-green"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a3 3 0 1 1-1 5.8v3.4a3 3 0 0 1 1 5.8 3 3 0 0 1-1-5.8V8.8A3 3 0 0 1 12 3Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg></span>
      <div class="apps-v2-stats-slot"></div>`;
    return visual;
  }

  function ensureActionArea(root, copy) {
    let actions = copy.querySelector('.apps-v2-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'apps-v2-actions';
      copy.appendChild(actions);
    }

    let browse = actions.querySelector('.apps-v2-browse');
    if (!browse) {
      browse = document.createElement('button');
      browse.type = 'button';
      browse.className = 'apps-v2-browse';
      browse.innerHTML = `${icons.browse}<span>${isVietnamese(root) ? 'Thêm / duyệt ứng dụng' : 'Add / browse apps'}</span>`;
      browse.addEventListener('click', () => {
        root.querySelector(GRID_SELECTOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      actions.prepend(browse);
    }

    const adminActions = copy.querySelector('.launcher-admin-actions:not(.apps-v2-actions .launcher-admin-actions)')
      || root.querySelector('.launcher-admin-actions');
    if (adminActions && adminActions.parentElement !== actions) actions.appendChild(adminActions);

    const nativeCustomize = actions.querySelector('.launcher-admin-actions > button:first-child');
    if (nativeCustomize && !nativeCustomize.querySelector('.apps-v2-settings-icon')) {
      const icon = document.createElement('span');
      icon.className = 'apps-v2-settings-icon';
      icon.innerHTML = icons.settings;
      nativeCustomize.prepend(icon);
    }

    Array.from(root.querySelectorAll('button,a')).forEach((control) => {
      if (control === browse || actions.contains(control)) return;
      if (ADD_PATTERN.test(String(control.textContent || '').trim())) control.classList.add('apps-v2-duplicate-action');
    });
  }

  function decorateTitle(copy) {
    const title = copy.querySelector('h1');
    if (!title) return;
    title.classList.add('apps-v2-title');
    Array.from(title.children).forEach((span, index) => span.classList.add(`apps-v2-title-part-${index + 1}`));
    copy.querySelector('.flat-kicker')?.classList.add('apps-v2-kicker');
    copy.querySelector('.flat-subtitle')?.classList.add('apps-v2-subtitle');
  }

  function decorateStats(root, visual) {
    const directStats = Array.from(root.querySelectorAll('.flat-apps-stats')).find((item) => !item.closest('.apps-v2-stats-slot'));
    const stats = directStats || visual.querySelector('.flat-apps-stats');
    if (!stats) return;
    const slot = visual.querySelector('.apps-v2-stats-slot');
    if (stats.parentElement !== slot) slot.appendChild(stats);
    stats.classList.add('apps-v2-stats');

    const vi = isVietnamese(root);
    const details = vi ? ['Ứng dụng sẵn sàng', 'Đang được ghim', 'Mục trên điều hướng'] : ['Apps ready', 'Pinned apps', 'Navigation items'];
    const iconList = [icons.grid, icons.pin, icons.nav];
    Array.from(stats.children).slice(0, 3).forEach((card, index) => {
      card.classList.add(`apps-v2-stat-${index + 1}`);
      let icon = card.querySelector('.apps-v2-stat-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'apps-v2-stat-icon';
        icon.innerHTML = iconList[index];
        card.prepend(icon);
      }
      let detail = card.querySelector('.apps-v2-stat-detail');
      if (!detail) {
        detail = document.createElement('span');
        detail.className = 'apps-v2-stat-detail';
        card.appendChild(detail);
      }
      detail.textContent = details[index];
    });
  }

  function removeLegacy(root, hero) {
    hero.classList.remove('apps-premium-hero');
    hero.querySelectorAll('.apps-hero-visual, .apps-premium-actions').forEach((node) => node.remove());
    root.querySelectorAll('.apps-v2-duplicate-action').forEach((node) => node.classList.remove('apps-v2-duplicate-action'));
  }

  function placeGrid(root, hero) {
    const grid = root.querySelector(GRID_SELECTOR);
    if (!grid) return;
    grid.classList.add('apps-v2-grid');
    const editing = root.classList.contains('is-launcher-edit-mode');
    if (!editing && hero.nextElementSibling !== grid) hero.insertAdjacentElement('afterend', grid);
  }

  function apply() {
    scheduled = false;
    if (applying) return;
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    const hero = root.querySelector(HERO_SELECTOR);
    const copy = hero?.querySelector('.flat-apps-hero-copy');
    if (!hero || !copy) return;

    applying = true;
    try {
      root.classList.add('apps-v2-page');
      hero.classList.add('apps-v2-hero');
      removeLegacy(root, hero);
      decorateTitle(copy);
      ensureActionArea(root, copy);

      let visual = hero.querySelector(':scope > .apps-v2-visual');
      if (!visual) {
        visual = createVisual();
        hero.appendChild(visual);
      }
      decorateStats(root, visual);
      placeGrid(root, hero);

      const groupRail = root.querySelector('.launcher-group-rail');
      if (groupRail) groupRail.setAttribute('aria-hidden', 'true');
    } finally {
      applying = false;
    }
  }

  function queueApply() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(apply);
  }

  function start() {
    queueApply();
    const target = document.getElementById('root') || document.body;
    const observer = new MutationObserver((records) => {
      if (applying) return;
      const relevant = records.some((record) => {
        if (record.target?.closest?.(ROOT_SELECTOR)) return true;
        return Array.from(record.addedNodes || []).some((node) => node?.nodeType === 1 && (node.matches?.(ROOT_SELECTOR) || node.querySelector?.(ROOT_SELECTOR)));
      });
      if (relevant) queueApply();
    });
    observer.observe(target, { childList: true, subtree: true });
    window.addEventListener('hashchange', queueApply);
    window.addEventListener('bes-language-changed', queueApply);
    window.setTimeout(queueApply, 250);
    window.setTimeout(queueApply, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();