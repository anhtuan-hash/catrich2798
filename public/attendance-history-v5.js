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
  const MOBILE_MEDIA_QUERY = '(max-width: 900px)';
  const MOBILE_STYLESHEET_ID = 'ah-mobile-bottom-sheet-styles';
  const MOBILE_STYLESHEET_HREF = '/attendance-history-mobile-bottom-sheet.css?v=1';
  const MOBILE_POLISH_STYLESHEET_ID = 'ah-mobile-polish-styles';
  const MOBILE_POLISH_STYLESHEET_HREF = '/attendance-history-mobile-polish.css?v=1';
  const MOBILE_OPEN_CLASS = 'is-mobile-detail-open';
  const MOBILE_DISMISSED_CLASS = 'is-mobile-detail-dismissed';
  const MOBILE_FILTERS_CLASS = 'is-mobile-filters-open';
  const MOBILE_SECONDARY_CLASS = 'is-mobile-secondary-open';
  const MOBILE_BACKDROP_CLASS = 'ahv3__mobile-sheet-backdrop';
  const MOBILE_CLOSE_CLASS = 'ahv3__mobile-sheet-close';
  const MOBILE_FILTER_TOGGLE_CLASS = 'ahv3__mobile-filter-toggle';
  const MOBILE_SUMMARY_CLASS = 'ahv3__mobile-summary';
  const MOBILE_ACTIONS_CLASS = 'ahv3__mobile-sheet-actions';
  const MOBILE_SECONDARY_TOGGLE_CLASS = 'ahv3__mobile-secondary-toggle';
  let frame = 0;

  function normalizedText(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isMobileViewport() {
    return Boolean(window.matchMedia?.(MOBILE_MEDIA_QUERY).matches);
  }

  function ensureMobileStylesheet() {
    [
      [MOBILE_STYLESHEET_ID, MOBILE_STYLESHEET_HREF],
      [MOBILE_POLISH_STYLESHEET_ID, MOBILE_POLISH_STYLESHEET_HREF],
    ].forEach(([id, href]) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.append(link);
    });
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

  function setNodeText(node, value) {
    const next = String(value || '').trim();
    if (node && node.textContent !== next) node.textContent = next;
  }

  function dismissMobileDetail(root) {
    if (!root) return;
    root.classList.remove(MOBILE_OPEN_CLASS, MOBILE_SECONDARY_CLASS);
    root.classList.add(MOBILE_DISMISSED_CLASS);
  }

  function removeMobileDetailControls(root) {
    if (!root) return;
    root.classList.remove(MOBILE_OPEN_CLASS, MOBILE_DISMISSED_CLASS, MOBILE_SECONDARY_CLASS);
    delete root.dataset.ahMobileSelectedKey;
    root.querySelector(`.${MOBILE_BACKDROP_CLASS}`)?.remove();
    root.querySelector(`.${MOBILE_CLOSE_CLASS}`)?.remove();
    root.querySelector(`.${MOBILE_SUMMARY_CLASS}`)?.remove();
    root.querySelector(`.${MOBILE_ACTIONS_CLASS}`)?.remove();
    root.querySelector(`.${MOBILE_SECONDARY_TOGGLE_CLASS}`)?.remove();
  }

  function ensureMobileFilterToggle(root) {
    const head = root?.querySelector('.ahv3__list-head');
    const search = head?.querySelector('.ahv3__search');
    if (!head || !search || !isMobileViewport()) {
      root?.querySelector(`.${MOBILE_FILTER_TOGGLE_CLASS}`)?.remove();
      root?.classList.remove(MOBILE_FILTERS_CLASS);
      return;
    }

    let button = head.querySelector(`.${MOBILE_FILTER_TOGGLE_CLASS}`);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = MOBILE_FILTER_TOGGLE_CLASS;
      button.setAttribute('aria-label', 'Bộ lọc nâng cao');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg>';
      button.addEventListener('click', () => {
        const expanded = root.classList.toggle(MOBILE_FILTERS_CLASS);
        button.classList.toggle('is-active', expanded);
        button.setAttribute('aria-expanded', String(expanded));
      });
      search.insertAdjacentElement('afterend', button);
    }

    const expanded = root.classList.contains(MOBILE_FILTERS_CLASS);
    button.classList.toggle('is-active', expanded);
    button.setAttribute('aria-expanded', String(expanded));
  }

  function ensureMobileSummary(selectedCard, detail) {
    let summary = detail.querySelector(`.${MOBILE_SUMMARY_CLASS}`);
    if (!summary) {
      summary = document.createElement('div');
      summary.className = MOBILE_SUMMARY_CLASS;
      summary.innerHTML = '<article class="is-present"><b></b><span>Học sinh tham gia</span></article><article class="is-absent"><b></b><span>Học sinh vắng</span></article><article class="is-rate"><b></b><span>Tỷ lệ chuyên cần</span></article>';
      const hero = detail.querySelector('.ahv3__hero');
      if (hero) hero.insertAdjacentElement('afterend', summary);
      else detail.prepend(summary);
    }

    const count = selectedCard?.querySelector('.ahv3__count');
    const values = summary.querySelectorAll('b');
    setNodeText(values[0], count?.querySelector('b')?.textContent || '—');
    setNodeText(values[1], count?.querySelector('em')?.textContent || '—');
    setNodeText(values[2], count?.querySelector('i')?.textContent || '—');
  }

  function ensureMobileSecondaryToggle(root, detail) {
    let toggle = detail.querySelector(`.${MOBILE_SECONDARY_TOGGLE_CLASS}`);
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = MOBILE_SECONDARY_TOGGLE_CLASS;
      toggle.addEventListener('click', () => {
        const expanded = root.classList.toggle(MOBILE_SECONDARY_CLASS);
        toggle.setAttribute('aria-expanded', String(expanded));
        setNodeText(toggle, expanded ? 'Thu gọn thông tin bổ sung' : 'Thông tin bổ sung');
      });
      detail.append(toggle);
    }

    const expanded = root.classList.contains(MOBILE_SECONDARY_CLASS);
    toggle.setAttribute('aria-expanded', String(expanded));
    setNodeText(toggle, expanded ? 'Thu gọn thông tin bổ sung' : 'Thông tin bổ sung');
  }

  function ensureMobileActionProxy(detail) {
    let actions = detail.querySelector(`.${MOBILE_ACTIONS_CLASS}`);
    if (!actions) {
      actions = document.createElement('div');
      actions.className = MOBILE_ACTIONS_CLASS;

      const report = document.createElement('button');
      report.type = 'button';
      report.className = 'is-primary';
      report.dataset.mobileAction = 'report';
      report.textContent = 'Xem báo cáo tháng';
      report.addEventListener('click', () => detail.querySelector('.ahv3__report-button')?.click());

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'is-danger';
      remove.dataset.mobileAction = 'delete';
      remove.textContent = 'Xóa buổi điểm danh';
      remove.addEventListener('click', () => detail.querySelector('.ahv3__delete-button')?.click());

      actions.append(report, remove);
      detail.append(actions);
    }

    const originalReport = detail.querySelector('.ahv3__report-button');
    const originalDelete = detail.querySelector('.ahv3__delete-button');
    const reportProxy = actions.querySelector('[data-mobile-action="report"]');
    const deleteProxy = actions.querySelector('[data-mobile-action="delete"]');

    if (reportProxy) {
      reportProxy.hidden = !originalReport;
      reportProxy.disabled = Boolean(originalReport?.disabled);
    }
    if (deleteProxy) {
      deleteProxy.hidden = !originalDelete;
      deleteProxy.disabled = Boolean(originalDelete?.disabled);
    }
  }

  function ensureMobileDetailControls(root) {
    if (!root) return;
    const selectedCard = root.querySelector('.ahv3__items > button.is-selected');
    const detail = root.querySelector('.ahv3__detail');

    if (!isMobileViewport() || !selectedCard || !detail) {
      removeMobileDetailControls(root);
      return;
    }

    const selectedKey = normalizedText(selectedCard).slice(0, 240);
    if (root.dataset.ahMobileSelectedKey && root.dataset.ahMobileSelectedKey !== selectedKey) {
      root.classList.remove(MOBILE_DISMISSED_CLASS, MOBILE_SECONDARY_CLASS);
    }
    root.dataset.ahMobileSelectedKey = selectedKey;

    if (!root.classList.contains(MOBILE_DISMISSED_CLASS)) root.classList.add(MOBILE_OPEN_CLASS);

    let backdrop = root.querySelector(`.${MOBILE_BACKDROP_CLASS}`);
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = MOBILE_BACKDROP_CLASS;
      backdrop.setAttribute('aria-label', 'Đóng chi tiết buổi điểm danh');
      backdrop.addEventListener('click', () => dismissMobileDetail(root));
      detail.insertAdjacentElement('beforebegin', backdrop);
    }

    let close = root.querySelector(`.${MOBILE_CLOSE_CLASS}`);
    if (!close) {
      close = document.createElement('button');
      close.type = 'button';
      close.className = MOBILE_CLOSE_CLASS;
      close.setAttribute('aria-label', 'Đóng chi tiết');
      close.textContent = '×';
      close.addEventListener('click', () => dismissMobileDetail(root));
      detail.insertAdjacentElement('afterend', close);
    }

    ensureMobileSummary(selectedCard, detail);
    ensureMobileSecondaryToggle(root, detail);
    ensureMobileActionProxy(detail);
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
    ensureMobileFilterToggle(root);
    ensureMobileDetailControls(root);

    const approvedBars = Array.from(activeShell.querySelectorAll(APPROVED_FILTER_SELECTOR));
    approvedBars.slice(1).forEach(hideAsDuplicate);
  }

  function scheduleEnhance() {
    if (frame) return;
    frame = window.requestAnimationFrame(enhance);
  }

  const observer = new MutationObserver(scheduleEnhance);

  function onDocumentClick(event) {
    const card = event.target?.closest?.(`${ROOT_SELECTOR} .ahv3__items > button`);
    if (!card || card.classList.contains('is-bulk-mode')) return;
    const root = card.closest(ROOT_SELECTOR);
    root?.classList.remove(MOBILE_DISMISSED_CLASS, MOBILE_SECONDARY_CLASS);
    window.setTimeout(scheduleEnhance, 0);
  }

  function onDocumentKeydown(event) {
    if (event.key !== 'Escape') return;
    const root = document.querySelector(`${ROOT_SELECTOR}.${MOBILE_OPEN_CLASS}`);
    if (root) dismissMobileDetail(root);
  }

  function start() {
    ensureMobileStylesheet();
    enhance();
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', scheduleEnhance, true);
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeydown, true);
    const media = window.matchMedia?.(MOBILE_MEDIA_QUERY);
    media?.addEventListener?.('change', scheduleEnhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
