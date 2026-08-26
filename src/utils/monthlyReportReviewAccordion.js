let installed = false;

const LOCKED_STATUS_SELECTOR = '.mr-status.is-approved, .mr-status.is-submitted';
const SECTION_SELECTOR = '.mr-teacher-shell .mr-section';

function isReviewMode(section) {
  const shell = section.closest('.mr-teacher-shell');
  return Boolean(shell?.querySelector(LOCKED_STATUS_SELECTOR));
}

function sectionTitle(section) {
  return section.querySelector(':scope > header h2')?.textContent?.trim() || 'phần báo cáo';
}

function setExpanded(section, expanded) {
  section.classList.toggle('is-expanded', expanded);
  const button = section.querySelector(':scope > header .mr-section-toggle');
  if (button) {
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', expanded ? `Thu gọn ${sectionTitle(section)}` : `Mở ${sectionTitle(section)}`);
  }
  const header = section.querySelector(':scope > header');
  if (header) header.setAttribute('aria-expanded', String(expanded));
}

function toggleSection(section) {
  setExpanded(section, !section.classList.contains('is-expanded'));
}

function ensureHeaderInteraction(section, header) {
  if (header.dataset.mrAccordionReady === '1') return;
  header.dataset.mrAccordionReady = '1';
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');
  header.setAttribute('aria-expanded', String(section.classList.contains('is-expanded')));
  header.setAttribute('aria-label', `Mở ${sectionTitle(section)}`);

  header.addEventListener('click', (event) => {
    if (!isReviewMode(section)) return;
    if (event.target.closest('button, input, textarea, select, a')) return;
    toggleSection(section);
  });

  header.addEventListener('keydown', (event) => {
    if (!isReviewMode(section)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleSection(section);
  });
}

function ensureToggle(section) {
  if (!isReviewMode(section)) return;
  const header = section.querySelector(':scope > header');
  if (!header) return;
  ensureHeaderInteraction(section, header);
  if (header.querySelector('.mr-section-toggle')) return;

  let controls = header.querySelector('.mr-section-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'mr-section-controls';
    const check = header.querySelector(':scope > .mr-section-check');
    if (check) controls.appendChild(check);
    header.appendChild(controls);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mr-section-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', `Mở ${sectionTitle(section)}`);
  button.innerHTML = '<span aria-hidden="true">⌄</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSection(section);
  });
  controls.appendChild(button);
}

function sync(root = document) {
  root.querySelectorAll?.(SECTION_SELECTOR).forEach(ensureToggle);
}

export function installMonthlyReportReviewAccordion() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  const run = () => sync(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) return;
    window.requestAnimationFrame(run);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => window.requestAnimationFrame(run));
  window.addEventListener('bes-monthly-report-refresh', () => window.requestAnimationFrame(run));
}
