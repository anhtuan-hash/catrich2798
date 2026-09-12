(() => {
  'use strict';

  const ROOT_SELECTOR = '.ahv3__shell[data-attendance-history-v3="true"]';
  const APPROVED_FILTER_SELECTOR = '.ah-mockup-filterbar[data-ah-mockup-owned="filterbar"]';
  const DUPLICATE_ATTRIBUTE = 'data-ah-v5-duplicate-filter';
  const TYPE_FILTER_ATTRIBUTE = 'data-ah-v5-type-filter';
  const ORIGINAL_HIDDEN_ATTRIBUTE = 'data-ah-v5-original-hidden';
  const ORIGINAL_ARIA_ATTRIBUTE = 'data-ah-v5-original-aria-hidden';
  const ORIGINAL_DISPLAY_ATTRIBUTE = 'data-ah-v5-original-display';
  const ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE = 'data-ah-v5-original-display-priority';
  const DETAIL_KIND_CLASSES = ['ah-kind-remedial', 'ah-kind-gifted', 'ah-kind-supplemental'];
  let frame = 0;

  function normalizedText(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isLegacyActivityFilter(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (node.matches(APPROVED_FILTER_SELECTOR) || node.querySelector(APPROVED_FILTER_SELECTOR)) return false;
    if (node.closest(APPROVED_FILTER_SELECTOR)) return false;

    const text = normalizedText(node);
    if (!text || text.length > 520) return false;
    if (!text.includes('Loại hoạt động')) return false;
    if (!text.includes('Tất cả') || !text.includes('Phụ đạo') || !text.includes('Bồi dưỡng') || !text.includes('Học bổ sung')) return false;

    const buttonCount = node.querySelectorAll('button').length;
    return buttonCount >= 3 && buttonCount <= 8;
  }

  function rememberVisibility(node) {
    if (!node.hasAttribute(ORIGINAL_HIDDEN_ATTRIBUTE)) {
      node.setAttribute(ORIGINAL_HIDDEN_ATTRIBUTE, String(node.hidden));
      node.setAttribute(ORIGINAL_ARIA_ATTRIBUTE, node.getAttribute('aria-hidden') ?? '__NULL__');
      node.setAttribute(ORIGINAL_DISPLAY_ATTRIBUTE, node.style.getPropertyValue('display') || '__EMPTY__');
      node.setAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE, node.style.getPropertyPriority('display') || '__EMPTY__');
    }
  }

  function hideAsDuplicate(node) {
    rememberVisibility(node);
    node.setAttribute(DUPLICATE_ATTRIBUTE, 'true');
    node.setAttribute('aria-hidden', 'true');
    node.hidden = true;
    node.style.setProperty('display', 'none', 'important');
  }

  function restoreNodeVisibility(node) {
    const originalHidden = node.getAttribute(ORIGINAL_HIDDEN_ATTRIBUTE);
    const originalAria = node.getAttribute(ORIGINAL_ARIA_ATTRIBUTE);
    const originalDisplay = node.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    const originalPriority = node.getAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE);

    node.hidden = originalHidden === null ? false : originalHidden === 'true';

    if (originalAria && originalAria !== '__NULL__') node.setAttribute('aria-hidden', originalAria);
    else node.removeAttribute('aria-hidden');

    node.style.removeProperty('display');
    if (originalDisplay && originalDisplay !== '__EMPTY__') {
      node.style.setProperty('display', originalDisplay, originalPriority === '__EMPTY__' ? '' : originalPriority);
    }

    node.removeAttribute(DUPLICATE_ATTRIBUTE);
    node.removeAttribute(ORIGINAL_HIDDEN_ATTRIBUTE);
    node.removeAttribute(ORIGINAL_ARIA_ATTRIBUTE);
    node.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    node.removeAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE);
  }

  function restoreDuplicateActivityFilters(shell) {
    if (!shell) return;

    shell.querySelectorAll(`[${DUPLICATE_ATTRIBUTE}]`).forEach(restoreNodeVisibility);
    shell.querySelectorAll(`[${TYPE_FILTER_ATTRIBUTE}]`).forEach((node) => {
      node.removeAttribute(TYPE_FILTER_ATTRIBUTE);
      node.removeAttribute('data-ah-v6-visible-type-filter');
      node.removeAttribute('aria-hidden');
      node.hidden = false;
    });
  }

  function hideDuplicateActivityFilters(shell) {
    if (!shell) return;

    const candidates = Array.from(shell.querySelectorAll('section, nav, header, div'))
      .filter(isLegacyActivityFilter)
      .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);

    const approved = shell.querySelector(APPROVED_FILTER_SELECTOR);
    candidates.forEach((candidate) => {
      if (candidate === approved || candidate.contains(approved)) return;
      hideAsDuplicate(candidate);
    });
  }

  function tagNativeTypeFilter(root) {
    const nativeTypeSelect = root?.querySelector('.ahv3__filters select');
    const label = nativeTypeSelect?.closest('label');
    if (!label) return;
    label.setAttribute(TYPE_FILTER_ATTRIBUTE, 'sync-only');
    label.setAttribute('aria-hidden', 'true');
  }

  function classifySelectedDetail(root) {
    const hero = root?.querySelector('.ahv3__detail .ahv3__hero');
    if (!hero) return;

    hero.classList.remove(...DETAIL_KIND_CLASSES);
    const typeChip = hero.querySelector('.ahv3__type');
    if (typeChip?.classList.contains('is-remedial')) hero.classList.add('ah-kind-remedial');
    else if (typeChip?.classList.contains('is-gifted')) hero.classList.add('ah-kind-gifted');
    else if (typeChip?.classList.contains('is-supplemental')) hero.classList.add('ah-kind-supplemental');
  }

  function enhance() {
    frame = 0;
    const root = document.querySelector(ROOT_SELECTOR);
    const activeShell = root?.closest('.attendance-shell') || null;

    document.querySelectorAll('.attendance-shell.ah-history-v5').forEach((shell) => {
      if (!activeShell || shell !== activeShell) {
        restoreDuplicateActivityFilters(shell);
        shell.classList.remove('ah-history-v5');
      }
    });
    if (!root || !activeShell) return;

    activeShell.classList.add('ah-history-v5');
    hideDuplicateActivityFilters(activeShell);
    tagNativeTypeFilter(root);
    classifySelectedDetail(root);

    const approvedBars = Array.from(activeShell.querySelectorAll(APPROVED_FILTER_SELECTOR));
    approvedBars.slice(1).forEach(hideAsDuplicate);
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
