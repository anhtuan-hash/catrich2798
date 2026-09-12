(() => {
  'use strict';

  const ROOT_SELECTOR = '.ahv3__shell[data-attendance-history-v3="true"]';
  const APPROVED_FILTER_SELECTOR = '.ah-mockup-filterbar[data-ah-mockup-owned="filterbar"]';
  const DUPLICATE_ATTRIBUTE = 'data-ah-v5-duplicate-filter';
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

  function hideDuplicateActivityFilters(shell) {
    if (!shell) return;

    const candidates = Array.from(shell.querySelectorAll('section, nav, header, div'))
      .filter(isLegacyActivityFilter)
      .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);

    const approved = shell.querySelector(APPROVED_FILTER_SELECTOR);
    candidates.forEach((candidate) => {
      if (candidate === approved || candidate.contains(approved)) return;
      candidate.setAttribute(DUPLICATE_ATTRIBUTE, 'true');
      candidate.setAttribute('aria-hidden', 'true');
      candidate.hidden = true;
      candidate.style.setProperty('display', 'none', 'important');
    });
  }

  function enhance() {
    frame = 0;
    const root = document.querySelector(ROOT_SELECTOR);
    document.querySelectorAll('.attendance-shell.ah-history-v5').forEach((shell) => {
      if (!root || shell !== root.closest('.attendance-shell')) shell.classList.remove('ah-history-v5');
    });
    if (!root) return;

    const shell = root.closest('.attendance-shell');
    if (!shell) return;

    shell.classList.add('ah-history-v5');
    hideDuplicateActivityFilters(shell);

    const approvedBars = Array.from(shell.querySelectorAll(APPROVED_FILTER_SELECTOR));
    approvedBars.slice(1).forEach((bar) => {
      bar.setAttribute(DUPLICATE_ATTRIBUTE, 'true');
      bar.hidden = true;
      bar.style.setProperty('display', 'none', 'important');
    });
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
