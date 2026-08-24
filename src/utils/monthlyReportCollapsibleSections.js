const SECTION_SELECTOR = '.mr-teacher-shell .mr-section';

function setExpanded(section, expanded) {
  const header = section?.querySelector(':scope > header');
  if (!header) return;
  section.classList.toggle('is-collapsed', !expanded);
  header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function prepareSection(section) {
  if (!(section instanceof HTMLElement) || section.dataset.collapsibleReady === 'true') return;
  const header = section.querySelector(':scope > header');
  const body = section.querySelector(':scope > .mr-section-body');
  if (!header || !body) return;

  section.dataset.collapsibleReady = 'true';
  section.classList.add('is-collapsible', 'is-collapsed');
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');
  header.setAttribute('aria-expanded', 'false');
  header.setAttribute('aria-label', 'Mở hoặc thu gọn nội dung báo cáo');
  body.setAttribute('aria-hidden', 'true');
}

function syncBodyAccessibility(section) {
  const body = section?.querySelector(':scope > .mr-section-body');
  if (!body) return;
  body.setAttribute('aria-hidden', section.classList.contains('is-collapsed') ? 'true' : 'false');
}

function toggleSection(section) {
  const expanded = section.classList.contains('is-collapsed');
  setExpanded(section, expanded);
  syncBodyAccessibility(section);
}

function prepareAll(root = document) {
  if (root instanceof HTMLElement && root.matches?.(SECTION_SELECTOR)) prepareSection(root);
  root.querySelectorAll?.(SECTION_SELECTOR).forEach(prepareSection);
}

function isInteractiveTarget(target) {
  return Boolean(target.closest('button, a, input, select, textarea, label'));
}

if (typeof document !== 'undefined') {
  const initialize = () => prepareAll(document);

  document.addEventListener('click', (event) => {
    const header = event.target.closest?.(`${SECTION_SELECTOR} > header`);
    if (!header || isInteractiveTarget(event.target)) return;
    const section = header.parentElement;
    if (!section?.matches(SECTION_SELECTOR)) return;
    toggleSection(section);
  });

  document.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const header = event.target.closest?.(`${SECTION_SELECTOR} > header`);
    if (!header || event.target !== header) return;
    event.preventDefault();
    const section = header.parentElement;
    if (section?.matches(SECTION_SELECTOR)) toggleSection(section);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) prepareAll(node);
      });
    });
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    queueMicrotask(initialize);
  }
}

export {};
