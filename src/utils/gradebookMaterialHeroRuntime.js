const HERO_SELECTOR = '.gradebook-studio .gradebook-studio-hero';
const RUNTIME_CLASS = 'gbe-material-hero-runtime';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function compactText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buttonByText(root, label) {
  const wanted = compactText(label).toLowerCase();
  return Array.from(root?.querySelectorAll?.('button') || []).find((button) => (
    compactText(button.textContent).toLowerCase().includes(wanted)
  )) || null;
}

function classLabelFromText(value = '') {
  return compactText(value).match(/\b(?:10|11|12)\.\d+\b/)?.[0] || '';
}

function currentClassSelect() {
  const explicit = document.querySelector([
    '.gradebook-studio-class-picker select',
    '.gradebook-studio-open-class select',
    '.gradebook-class-context select',
    '.gradebook-studio-switcher select',
  ].join(','));
  if (explicit) return explicit;

  return Array.from(document.querySelectorAll('.gradebook-studio select')).find((select) => (
    Array.from(select.options || []).some((option) => classLabelFromText(option.textContent || option.value))
  )) || null;
}

function assignmentClasses() {
  const articles = Array.from(document.querySelectorAll('.gradebook-assignment-grid article'));
  return articles.map((article) => {
    const button = buttonByText(article, 'Mở sổ điểm');
    const label = classLabelFromText(article.textContent);
    return label && button ? { value: label, label, fullLabel: compactText(article.textContent), button } : null;
  }).filter(Boolean);
}

function readClasses() {
  const select = currentClassSelect();
  if (select) {
    const options = Array.from(select.options || [])
      .filter((option) => option.value && classLabelFromText(option.textContent || option.value))
      .map((option) => ({
        value: option.value,
        label: classLabelFromText(option.textContent || option.value),
        fullLabel: compactText(option.textContent || option.value),
        active: option.value === select.value,
      }));
    if (options.length) return options;
  }

  const cards = assignmentClasses();
  const contextText = compactText(document.querySelector('.gradebook-studio-open-class, .gradebook-class-context, .gradebook-studio-switcher')?.textContent);
  const activeLabel = classLabelFromText(contextText) || cards[0]?.label || '';
  return cards.map((item) => ({ ...item, active: item.label === activeLabel }));
}

function ensureGradebookOpen() {
  const actions = document.querySelector('.gradebook-studio-actions, .gradebook-studio-switcher');
  const gradebookButton = buttonByText(actions, 'Sổ điểm');
  if (gradebookButton && !gradebookButton.classList.contains('primary') && !gradebookButton.classList.contains('is-active')) {
    gradebookButton.click();
  }
}

function revealGradeNavigation() {
  const launcher = document.querySelector('.hr-grade-navigation-launcher, .hr-grade-nav-launcher');
  if (launcher && launcher.getAttribute('aria-hidden') !== 'true') launcher.click();
}

function clickInnerControl(selector, label) {
  ensureGradebookOpen();
  window.setTimeout(() => {
    revealGradeNavigation();
    window.setTimeout(() => {
      const target = buttonByText(document.querySelector(selector), label)
        || Array.from(document.querySelectorAll('.hr-gradebook button')).find((button) => compactText(button.textContent).includes(label));
      target?.click();
      document.querySelector('.hr-gradebook')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 70);
  }, 70);
}

function openPdfDialog() {
  ensureGradebookOpen();
  window.setTimeout(() => {
    const pdf = document.querySelector('.hr-grade-export-pdf')
      || buttonByText(document.querySelector('.hr-gradebook'), 'Xuất phiếu điểm cá nhân')
      || buttonByText(document.querySelector('.hr-gradebook'), 'PDF');
    if (pdf) pdf.click();
    else document.querySelector('.hr-grade-export-bar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function selectClass(value) {
  if (!value) return;
  const select = currentClassSelect();
  if (select) {
    const option = Array.from(select.options || []).find((item) => item.value === value || classLabelFromText(item.textContent || item.value) === value);
    if (option && select.value !== option.value) {
      // Trigger the onChange handler of React-controlled selects.
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      if (setter) setter.call(select, option.value);
      else select.value = option.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }

  const card = assignmentClasses().find((item) => item.value === value || item.label === value);
  card?.button?.click();
}

function parseCompletion() {
  const raw = compactText(document.querySelector('.hr-grade-overview .tone-yellow strong')?.textContent);
  const match = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    const done = Number(match[1]) || 0;
    const total = Number(match[2]) || 0;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  const rows = Array.from(document.querySelectorAll('.hr-grade-table tbody tr'));
  if (!rows.length) return { done: 0, total: 0, percent: 0 };
  const complete = rows.filter((row) => {
    const values = Array.from(row.querySelectorAll('input')).filter((input) => compactText(input.value));
    return values.length >= 4;
  }).length;
  return { done: complete, total: rows.length, percent: Math.round((complete / rows.length) * 100) };
}

function readHeroStats() {
  const legacy = Array.from(document.querySelectorAll('.gradebook-studio-hero-stats article strong')).map((node) => compactText(node.textContent));
  const completion = parseCompletion();
  const totalColumns = compactText(document.querySelector('.hr-grade-overview .tone-green strong')?.textContent) || '—';
  const students = document.querySelectorAll('.hr-grade-table tbody tr').length;
  const classCount = readClasses().length;
  return {
    activeBooks: legacy[0] || String(classCount || 0),
    assignments: legacy[1] || String(classCount || 0),
    students: legacy[2] || String(students || 0),
    totalColumns,
    completion,
  };
}

function readPreviewRows() {
  const rows = Array.from(document.querySelectorAll('.hr-grade-table tbody tr')).slice(0, 3);
  return rows.map((row, index) => {
    const cells = Array.from(row.querySelectorAll('td'));
    const name = compactText(
      row.querySelector('.hr-grade-student b, .hr-grade-student strong')?.textContent
      || cells[1]?.textContent,
    ) || `Học sinh ${index + 1}`;
    const inputs = Array.from(row.querySelectorAll('input'));
    const score = compactText(
      row.querySelector('.hr-grade-result strong, .hr-grade-summary-score')?.textContent
      || cells.at(-1)?.textContent
      || inputs.find((input) => input.value)?.value,
    ) || '—';
    const entered = inputs.filter((input) => compactText(input.value)).length;
    return { name, score, entered };
  });
}

function activeButtonText(selectors, fallback) {
  for (const selector of selectors) {
    const root = document.querySelector(selector);
    const active = root?.querySelector('button.active, button.is-active, button[aria-selected="true"], button[aria-current="true"]');
    if (active) return compactText(active.textContent);
  }
  return fallback;
}

function viewState() {
  const semester = activeButtonText(['.hr-grade-semesters', '.hr-grade-navigation', '.hr-grade-nav-palette'], 'Học kỳ I');
  const view = activeButtonText(['.hr-grade-views', '.hr-grade-navigation', '.hr-grade-nav-palette'], 'TX · Đợt 1');
  const subject = compactText(document.querySelector('.gbv2-table-controls select[aria-label="Chọn môn học"]')?.selectedOptions?.[0]?.textContent) || 'Tiếng Anh';
  return { semester, view, subject };
}

function renderHero(container) {
  if (!container?.isConnected) return;
  const classes = readClasses();
  const state = viewState();
  const currentClass = classes.find((item) => item.active)?.label || 'Chưa chọn lớp';
  const classTabs = classes.length ? classes.map((item) =>
    `<button type="button" class="gbe-m3-class-tab${item.active ? ' is-active' : ''}" data-gbe-action="class" data-value="${escapeHtml(item.value)}" aria-pressed="${Boolean(item.active)}"><span>${escapeHtml(item.label)}</span></button>`
  ).join('') : '<span class="gbe-m3-empty-chip">Chưa có lớp</span>';
  const firstSemester = !state.semester.includes('II');
  const classDetails = compactText(document.querySelector('.gradebook-studio-class-meta span')?.textContent);
  const year = compactText(classDetails.match(/20\d{2}\s*[-–]\s*20\d{2}/)?.[0]) || 'Năm học hiện tại';
  container.innerHTML = `
    <div class="gb4-hero-shell">
      <div class="gb4-hero-main">
        <div class="gb4-title">
          <span class="gb4-kicker">GRADEBOOK / SỔ ĐIỂM</span>
          <h1>Sổ điểm</h1>
          <p>Quản lý điểm số, đánh giá và theo dõi tiến độ học tập</p>
        </div>
        <div class="gb4-hero-classes">
          <div class="gb4-class-heading"><span>CHỌN LỚP</span><small>${escapeHtml(year)} · ${escapeHtml(state.semester)}</small></div>
          <div class="gb4-class-picker" role="group" aria-label="Chọn lớp đang mở">${classTabs}</div>
        </div>
      </div>
      <div class="gb4-quick-toolbar" aria-label="Công cụ Sổ điểm">
        <div class="gb4-quick-primary">
          <button type="button" class="is-primary" data-gbe-action="view" data-value="TX · Đợt 1"><span aria-hidden="true">＋</span>Nhập điểm</button>
          <button type="button" data-gbe-action="view" data-value="Tổng hợp"><span aria-hidden="true">▣</span>Tổng hợp</button>
          <button type="button" data-gbe-action="pdf"><span aria-hidden="true">▤</span>Xuất PDF</button>
        </div>
        <div class="gb4-quick-secondary">
          <div class="gb4-semesters" role="group" aria-label="Chọn học kỳ">
            <button type="button" data-gbe-action="semester" data-value="Học kỳ I" class="${firstSemester ? 'is-active' : ''}" aria-pressed="${firstSemester}">Học kỳ I</button>
            <button type="button" data-gbe-action="semester" data-value="Học kỳ II" class="${!firstSemester ? 'is-active' : ''}" aria-pressed="${!firstSemester}">Học kỳ II</button>
          </div>
          <button type="button" data-gbe-action="students">♙ Danh sách HS</button>
          <button type="button" data-gbe-action="add-class">＋ Thêm lớp</button>
        </div>
      </div>
    </div>`;
}

export function installGradebookMaterialHero() {
  if (typeof document === 'undefined') return () => {};

  let hero = null;
  let container = null;
  let globalObserver = null;
  let gradeObserver = null;
  let refreshTimer = 0;
  let ensureTimer = 0;
  let safetyInterval = 0;
  let disposed = false;

  const onClick = (event) => {
    const button = event.target.closest('[data-gbe-action]');
    if (!button || !container?.contains(button)) return;
    const action = button.dataset.gbeAction;
    const value = button.dataset.value || '';

    if (action === 'class') {
      selectClass(value);
      scheduleRefresh(180);
      return;
    }
    if (action === 'add-class') {
      const addButton = buttonByText(document.querySelector('.gradebook-studio-actions, .gradebook-studio-switcher, .gradebook-studio'), 'Thêm lớp bộ môn')
        || buttonByText(document.querySelector('.gradebook-studio'), 'Thêm lớp');
      addButton?.click();
      document.querySelector('.gradebook-studio-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action === 'students') {
      const target = buttonByText(document.querySelector('.gradebook-studio-actions, .gradebook-studio-switcher, .gradebook-studio'), 'Danh sách học sinh');
      target?.click();
      window.setTimeout(() => document.querySelector('.gradebook-studio-switcher, .gradebook-class-context')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }
    if (action === 'semester') {
      clickInnerControl('.hr-grade-semesters, .hr-grade-navigation, .hr-grade-nav-palette', value);
      scheduleRefresh(220);
      return;
    }
    if (action === 'view') {
      clickInnerControl('.hr-grade-views, .hr-grade-navigation, .hr-grade-nav-palette', value);
      scheduleRefresh(220);
      return;
    }
    if (action === 'pdf') openPdfDialog();
  };

  const bindContainer = (nextContainer) => {
    if (container === nextContainer) return;
    container?.removeEventListener('click', onClick);
    container = nextContainer;
    container?.addEventListener('click', onClick);
  };

  const ensureMounted = (shouldRender = false) => {
    if (disposed) return false;
    const nextHero = document.querySelector(HERO_SELECTOR);
    if (!nextHero) return false;

    if (hero && hero !== nextHero) hero.classList.remove('gbe-material-mounted');
    hero = nextHero;
    hero.classList.add('gbe-material-mounted');

    let nextContainer = hero.querySelector(`.${RUNTIME_CLASS}`);
    const created = !nextContainer;
    if (!nextContainer) {
      nextContainer = document.createElement('div');
      nextContainer.className = RUNTIME_CLASS;
      hero.appendChild(nextContainer);
    }
    bindContainer(nextContainer);

    if (created || shouldRender || !compactText(container.textContent)) renderHero(container);
    return true;
  };

  const refresh = () => {
    if (disposed) return;
    if (!container?.isConnected || !hero?.isConnected) {
      ensureMounted(true);
      return;
    }
    renderHero(container);
  };

  const scheduleRefresh = (delay = 90) => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, delay);
  };

  const scheduleEnsure = (delay = 30) => {
    window.clearTimeout(ensureTimer);
    ensureTimer = window.setTimeout(() => ensureMounted(true), delay);
  };

  const watchGradebook = () => {
    gradeObserver?.disconnect();
    const gradebook = document.querySelector('.hr-gradebook');
    if (!gradebook) return;
    gradeObserver = new MutationObserver(() => scheduleRefresh(120));
    gradeObserver.observe(gradebook, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'aria-current', 'value'],
    });
  };

  globalObserver = new MutationObserver((records) => {
    const externalChange = records.some((record) => {
      if (!container) return true;
      return record.target !== container && !container.contains(record.target);
    });
    if (!externalChange) return;

    if (!container?.isConnected || !document.querySelector(HERO_SELECTOR)?.querySelector(`.${RUNTIME_CLASS}`)) {
      scheduleEnsure(20);
    } else {
      scheduleRefresh(130);
    }
    watchGradebook();
  });
  globalObserver.observe(document.documentElement, { subtree: true, childList: true });

  // Try immediately, after the current React commit, and keep a light safety check.
  ensureMounted(true);
  window.requestAnimationFrame(() => ensureMounted(true));
  window.setTimeout(() => ensureMounted(true), 120);
  window.setTimeout(() => ensureMounted(true), 500);
  watchGradebook();
  safetyInterval = window.setInterval(() => {
    if (!container?.isConnected || !hero?.isConnected) ensureMounted(true);
  }, 1500);

  return () => {
    disposed = true;
    window.clearTimeout(refreshTimer);
    window.clearTimeout(ensureTimer);
    window.clearInterval(safetyInterval);
    globalObserver?.disconnect();
    gradeObserver?.disconnect();
    container?.removeEventListener('click', onClick);
    container?.remove();
    hero?.classList.remove('gbe-material-mounted');
  };
}
