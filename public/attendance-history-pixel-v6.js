(() => {
  'use strict';

  const ROOT_SELECTOR = '.ahv3__shell[data-attendance-history-v3="true"]';
  const ICON_ATTRIBUTE = 'data-ah-v6-activity-icon';
  const META_ATTRIBUTE = 'data-ah-v6-hero-meta';
  const ART_ATTRIBUTE = 'data-ah-v6-hero-art';
  let frame = 0;

  const ICONS = {
    remedial: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="16.5" cy="9" r="2.5" fill="currentColor" opacity=".82"/><path d="M2.8 19.2c.5-4 2.6-6 5.5-6s5 2 5.5 6" fill="currentColor"/><path d="M13.1 18.7c.35-2.8 1.8-4.4 4.1-4.4 2.1 0 3.45 1.45 3.8 4.4" fill="currentColor" opacity=".82"/></svg>',
    gifted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 9.2 12 4.4l9.8 4.8L12 14 2.2 9.2Z" fill="currentColor"/><path d="M6.2 12.1v4.1c1.7 1.45 3.6 2.15 5.8 2.15s4.15-.7 5.8-2.15v-4.1L12 15l-5.8-2.9Z" fill="currentColor" opacity=".82"/><path d="M21 10.2v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    supplemental: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 5.2c3.35-.8 6.05-.25 8.05 1.65v12c-2-1.9-4.7-2.45-8.05-1.65v-12Z" fill="currentColor"/><path d="M20.7 5.2c-3.35-.8-6.05-.25-8.05 1.65v12c2-1.9 4.7-2.45 8.05-1.65v-12Z" fill="currentColor" opacity=".78"/><path d="M12 7.1v11.6" stroke="#fff" stroke-width="1.2" opacity=".9"/></svg>',
  };

  const HERO_ART = '<svg viewBox="0 0 190 105" aria-hidden="true"><path d="M12 82c35-16 70-18 103-4 25 10 48 10 68 0" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity=".16"/><path d="M45 39 102 12l57 27-57 27-57-27Z" fill="currentColor" opacity=".32"/><path d="M68 53v20c10 8 21 12 34 12s24-4 34-12V53l-34 16-34-16Z" fill="currentColor" opacity=".22"/><path d="M158 41v30" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".36"/><circle cx="158" cy="74" r="5" fill="currentColor" opacity=".36"/></svg>';

  function normalizedText(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function activityKind(node) {
    if (!node) return '';
    if (node.classList?.contains('ah-kind-remedial') || /Phụ đạo/i.test(normalizedText(node))) return 'remedial';
    if (node.classList?.contains('ah-kind-supplemental') || /Học bổ sung/i.test(normalizedText(node))) return 'supplemental';
    if (node.classList?.contains('ah-kind-gifted') || /Bồi dưỡng/i.test(normalizedText(node))) return 'gifted';
    return '';
  }

  function ensureKindClass(node, kind) {
    if (!node || !kind) return;
    node.classList.remove('ah-kind-remedial', 'ah-kind-gifted', 'ah-kind-supplemental');
    node.classList.add(`ah-kind-${kind}`);
  }

  function decorateActivityIcons(root) {
    root.querySelectorAll('.ahv3__items > button').forEach((card) => {
      const kind = activityKind(card);
      if (!kind) return;
      ensureKindClass(card, kind);
      const badge = card.querySelector('.ahv3__number');
      if (!badge) return;
      const current = badge.getAttribute(ICON_ATTRIBUTE);
      if (current === kind) return;
      if (!badge.dataset.ahV6OriginalNumber) badge.dataset.ahV6OriginalNumber = normalizedText(badge);
      badge.setAttribute(ICON_ATTRIBUTE, kind);
      badge.innerHTML = ICONS[kind];
    });
  }

  function extractInfoValue(root, label) {
    const needle = label.toLocaleLowerCase('vi');
    const article = Array.from(root.querySelectorAll('.ahv3__info-grid > article')).find((item) => {
      return normalizedText(item).toLocaleLowerCase('vi').includes(needle);
    });
    if (!article) return '';
    const strong = article.querySelector('b, strong');
    if (strong) return normalizedText(strong);
    const text = normalizedText(article);
    return text.replace(new RegExp(label, 'i'), '').trim();
  }

  function selectedKind(root, hero) {
    const selected = root.querySelector('.ahv3__items > button.is-selected');
    return activityKind(selected) || activityKind(hero);
  }

  function metaLabel(kind) {
    if (kind === 'remedial') return 'Phụ đạo';
    if (kind === 'supplemental') return 'Học bổ sung';
    return 'Bồi dưỡng HSG';
  }

  function metaChip(value, type, kind = '') {
    const span = document.createElement('span');
    span.className = `ahv6__meta-chip is-${type}${kind ? ` ah-kind-${kind}` : ''}`;
    span.dataset.ahV6MetaType = type;
    span.textContent = value;
    return span;
  }

  function ensureHeroMetadata(root) {
    const hero = root.querySelector('.ahv3__hero');
    if (!hero) return;
    const kind = selectedKind(root, hero);
    if (kind) ensureKindClass(hero, kind);

    let meta = hero.querySelector(`[${META_ATTRIBUTE}]`);
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'ahv3__hero-meta';
      meta.setAttribute(META_ATTRIBUTE, 'true');
      const heading = hero.querySelector('h2');
      if (heading) heading.insertAdjacentElement('afterend', meta);
      else hero.appendChild(meta);
    }

    const values = [
      { value: metaLabel(kind), type: 'kind', kind },
      { value: extractInfoValue(root, 'Số tiết'), type: 'lessons' },
      { value: extractInfoValue(root, 'Ngày dạy'), type: 'date' },
      { value: extractInfoValue(root, 'Phòng học'), type: 'room' },
    ].filter((item) => item.value);

    const signature = values.map((item) => `${item.type}:${item.value}`).join('|');
    if (meta.dataset.ahV6Signature !== signature) {
      meta.replaceChildren(...values.map((item) => metaChip(item.value, item.type, item.kind)));
      meta.dataset.ahV6Signature = signature;
    }

    let art = hero.querySelector(`[${ART_ATTRIBUTE}]`);
    if (!art) {
      art = document.createElement('div');
      art.className = 'ahv6__hero-art';
      art.setAttribute(ART_ATTRIBUTE, 'true');
      art.innerHTML = HERO_ART;
      hero.appendChild(art);
    }
  }

  function restoreMockupTypeFilter(root) {
    const typeLabel = Array.from(root.querySelectorAll('.ahv3__filters label')).find((label) => /Loại lớp/i.test(normalizedText(label)));
    if (!typeLabel) return;
    typeLabel.setAttribute('data-ah-v5-type-filter', 'sync-only');
    typeLabel.setAttribute('data-ah-v6-visible-type-filter', 'true');
    typeLabel.removeAttribute('aria-hidden');
    typeLabel.hidden = false;
  }

  function enhance() {
    frame = 0;
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    const shell = root.closest('.attendance-shell');
    if (!shell) return;
    shell.classList.add('ah-history-v5', 'ah-history-pixel-v6');
    restoreMockupTypeFilter(root);
    decorateActivityIcons(root);
    ensureHeroMetadata(root);
  }

  function scheduleEnhance() {
    if (frame) return;
    frame = window.requestAnimationFrame(enhance);
  }

  const observer = new MutationObserver(scheduleEnhance);

  function start() {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', scheduleEnhance, true);
    document.addEventListener('click', scheduleEnhance, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
