(() => {
  'use strict';

  const ICONS = {
    folder: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10 4H2C.9 4 0 4.9 0 6v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H12l-2-2Zm12 14H2V8h20v10Z"/></svg>',
  };

  const calendarCells = Array.from({ length: 28 }, () => '<span></span>').join('');
  const visualMarkup = `
    <div class="gd-hero-visual" aria-hidden="true">
      <div class="gd-visual-halo"></div>
      <div class="gd-float-card is-blue"><i></i><i></i><i></i></div>
      <div class="gd-float-card is-green"><i></i><i></i><i></i></div>
      <div class="gd-float-card is-purple"><i></i><i></i><i></i></div>
      <div class="gd-check-orb">✓</div>
      <div class="gd-calendar-art">
        <div class="gd-calendar-rings"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="gd-weekdays"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
        <div class="gd-calendar-grid">${calendarCells}</div>
      </div>
      <div class="gd-lesson-book"><span>GIÁO ÁN</span></div>
      <div class="gd-book-stack"><i></i><i></i><i></i></div>
      <div class="gd-mug-art"><span>EH</span></div>
      <div class="gd-plant-art"></div>
      <div class="gd-hat-art"></div>
    </div>`;

  let scheduled = false;
  let enhancing = false;

  function isVietnamese(hero) {
    const eyebrow = hero.querySelector('.gd-hero-copy > span')?.textContent || '';
    if (/today overview/i.test(eyebrow)) return false;
    if (/tổng quan|hôm nay/i.test(eyebrow)) return true;
    return document.documentElement.lang?.toLowerCase().startsWith('vi');
  }

  function enhanceHeading(hero) {
    const heading = hero.querySelector('.gd-hero-copy h1');
    if (!heading || heading.querySelector('.gd-hero-name')) return;

    const raw = heading.textContent.trim();
    const comma = raw.indexOf(',');
    const greeting = comma >= 0 ? raw.slice(0, comma + 1) : (isVietnamese(hero) ? 'Xin chào,' : 'Hello,');
    const name = comma >= 0 ? raw.slice(comma + 1).trim() : raw;

    heading.replaceChildren();
    const greetingNode = document.createElement('span');
    greetingNode.className = 'gd-hero-greeting';
    greetingNode.textContent = greeting;

    const nameNode = document.createElement('strong');
    nameNode.className = 'gd-hero-name';
    nameNode.append(document.createTextNode(name || (isVietnamese(hero) ? 'Giáo viên' : 'Teacher')));
    const wave = document.createElement('i');
    wave.className = 'gd-wave';
    wave.textContent = '👋';
    nameNode.append(wave);

    heading.append(greetingNode, nameNode);
  }

  function enhanceCopy(hero) {
    const copy = hero.querySelector('.gd-hero-copy');
    if (!copy) return;

    const lead = Array.from(copy.children).find((node) => node.tagName === 'P' && !node.classList.contains('gd-hero-positive'));
    if (lead) lead.classList.add('gd-hero-lead');

    let positive = copy.querySelector('.gd-hero-positive');
    if (!positive) {
      positive = document.createElement('p');
      positive.className = 'gd-hero-positive';
      const heading = copy.querySelector('h1');
      if (heading) heading.insertAdjacentElement('afterend', positive);
      else copy.prepend(positive);
    }
    positive.textContent = isVietnamese(hero)
      ? 'Hôm nay là một ngày tuyệt vời để tạo nên những giá trị tích cực.'
      : 'Today is a great day to create something meaningful.';
  }

  function enhanceActions(hero) {
    const actions = hero.querySelector(':scope > .gd-hero-actions');
    if (!actions) return;

    let button = actions.querySelector('.gd-resource-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'gd-button gd-resource-button';
      button.innerHTML = `${ICONS.folder}<span></span>`;
      button.addEventListener('click', () => {
        window.location.hash = '#/resource-library';
      });
      const refreshButton = actions.querySelector('.gd-button.outlined');
      if (refreshButton) actions.insertBefore(button, refreshButton);
      else actions.append(button);
    }

    const label = isVietnamese(hero) ? 'Xem học liệu' : 'View resources';
    button.setAttribute('aria-label', label);
    const labelNode = button.querySelector('span');
    if (labelNode) labelNode.textContent = label;
  }

  function enhanceVisual(hero) {
    if (hero.querySelector(':scope > .gd-hero-visual')) return;
    hero.insertAdjacentHTML('beforeend', visualMarkup);
  }

  function enhanceDashboardHero() {
    scheduled = false;
    if (enhancing) return;
    const hero = document.querySelector('.app-shell[data-route="dashboard"] .gd-hero');
    if (!hero) return;

    enhancing = true;
    try {
      hero.classList.add('gd-hero-premium');
      enhanceHeading(hero);
      enhanceCopy(hero);
      enhanceActions(hero);
      enhanceVisual(hero);
    } finally {
      enhancing = false;
    }
  }

  function queueEnhancement() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhanceDashboardHero);
  }

  function start() {
    queueEnhancement();
    const root = document.getElementById('root') || document.body;
    const observer = new MutationObserver((records) => {
      if (enhancing) return;
      const dashboardChanged = records.some((record) => {
        if (record.target?.closest?.('.gd-hero')) return true;
        return Array.from(record.addedNodes || []).some((node) =>
          node?.nodeType === 1 && (node.matches?.('.gd-hero, .gd-page, .app-shell[data-route="dashboard"]') || node.querySelector?.('.gd-hero'))
        );
      });
      if (dashboardChanged) queueEnhancement();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('hashchange', queueEnhancement);
    window.addEventListener('bes-language-changed', queueEnhancement);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
