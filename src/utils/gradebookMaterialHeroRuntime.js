const HERO_SELECTOR = '.gradebook-studio > .gradebook-studio-hero';
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

function currentClassSelect() {
  return document.querySelector('.gradebook-studio-class-picker select');
}

function ensureGradebookOpen() {
  const actions = document.querySelector('.gradebook-studio-actions');
  const gradebookButton = buttonByText(actions, 'Sổ điểm');
  if (gradebookButton && !gradebookButton.classList.contains('primary')) gradebookButton.click();
}

function revealGradeNavigation() {
  document.querySelector('.hr-grade-navigation-launcher[aria-hidden="false"], .hr-grade-navigation-launcher:not([aria-hidden="true"])')?.click();
}

function clickInnerControl(selector, label) {
  ensureGradebookOpen();
  window.setTimeout(() => {
    revealGradeNavigation();
    window.setTimeout(() => {
      const target = buttonByText(document.querySelector(selector), label);
      target?.click();
      document.querySelector('.hr-gradebook')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }, 40);
}

function openPdfDialog() {
  ensureGradebookOpen();
  window.setTimeout(() => {
    document.querySelector('.hr-grade-export-pdf')?.click();
  }, 80);
}

function selectClass(value) {
  const select = currentClassSelect();
  if (!select || !value || select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function parseCompletion() {
  const raw = compactText(document.querySelector('.hr-grade-overview .tone-yellow strong')?.textContent);
  const match = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return { done: 0, total: 0, percent: 0 };
  const done = Number(match[1]) || 0;
  const total = Number(match[2]) || 0;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function readHeroStats() {
  const legacy = Array.from(document.querySelectorAll('.gradebook-studio-hero-stats article strong')).map((node) => compactText(node.textContent));
  const completion = parseCompletion();
  const totalColumns = compactText(document.querySelector('.hr-grade-overview .tone-green strong')?.textContent) || '—';
  return {
    activeBooks: legacy[0] || String(currentClassSelect()?.options?.length || 0),
    assignments: legacy[1] || '—',
    students: legacy[2] || String(document.querySelectorAll('.hr-grade-table tbody tr').length || 0),
    totalColumns,
    completion,
  };
}

function readClasses() {
  const select = currentClassSelect();
  if (!select) return [];
  return Array.from(select.options || [])
    .filter((option) => option.value)
    .map((option) => ({
      value: option.value,
      label: compactText(option.textContent).split('·')[0].trim() || compactText(option.textContent),
      fullLabel: compactText(option.textContent),
      active: option.value === select.value,
    }));
}

function readPreviewRows() {
  const rows = Array.from(document.querySelectorAll('.hr-grade-table tbody tr')).slice(0, 3);
  return rows.map((row, index) => {
    const name = compactText(row.querySelector('.hr-grade-student b')?.textContent) || `Học sinh ${index + 1}`;
    const inputs = Array.from(row.querySelectorAll('.hr-grade-input'));
    const score = compactText(row.querySelector('.hr-grade-result strong')?.textContent)
      || compactText(row.querySelector('.hr-grade-summary-score')?.textContent)
      || compactText(inputs.find((input) => input.value)?.value)
      || '—';
    const entered = inputs.filter((input) => compactText(input.value)).length;
    return { name, score, entered };
  });
}

function viewState() {
  const semester = compactText(document.querySelector('.hr-grade-semesters button.active')?.textContent) || 'Học kỳ I';
  const view = compactText(document.querySelector('.hr-grade-views button.active')?.textContent) || 'TX · Đợt 1';
  const subject = compactText(document.querySelector('.hr-grade-controls select')?.selectedOptions?.[0]?.textContent) || 'Tiếng Anh';
  return { semester, view, subject };
}

function renderHero(container) {
  const stats = readHeroStats();
  const classes = readClasses();
  const rows = readPreviewRows();
  const state = viewState();
  const currentClass = classes.find((item) => item.active)?.label || 'Chưa chọn lớp';
  const progress = Math.max(0, Math.min(100, stats.completion.percent));

  const classTabs = classes.length
    ? classes.map((item) => `<button type="button" class="gbe-m3-class-tab${item.active ? ' is-active' : ''}" data-gbe-action="class" data-value="${escapeHtml(item.value)}"><span>${escapeHtml(item.label)}</span>${item.active ? '<small>Đang dùng</small>' : ''}</button>`).join('')
    : '<span class="gbe-m3-empty-chip">Chưa có lớp</span>';

  const previewRows = rows.length
    ? rows.map((row, index) => `<div class="gbe-m3-preview-row"><span>${index + 1}</span><b>${escapeHtml(row.name)}</b><em>${escapeHtml(row.score)}</em></div>`).join('')
    : '<div class="gbe-m3-preview-empty">Mở một thành phần điểm để xem dữ liệu trực tiếp.</div>';

  container.innerHTML = `
    <div class="gbe-m3-hero-copy">
      <span class="gbe-m3-eyebrow">GRADEBOOK</span>
      <h1>Sổ điểm <i aria-hidden="true">✦</i></h1>
      <p>Quản lý điểm số khoa học · Minh bạch · Hiệu quả</p>

      <div class="gbe-m3-class-switcher" aria-label="Chọn lớp đang mở">
        ${classTabs}
        <button type="button" class="gbe-m3-class-add" data-gbe-action="add-class">＋ <span>Thêm lớp</span></button>
      </div>

      <div class="gbe-m3-actions" aria-label="Thao tác nhanh">
        <button type="button" class="gbe-m3-primary" data-gbe-action="view" data-value="TX · Đợt 1"><span>＋</span>Nhập điểm</button>
        <button type="button" data-gbe-action="view" data-value="Tổng hợp"><span>▥</span>Xem tổng hợp</button>
        <button type="button" data-gbe-action="pdf"><span>⇩</span>Xuất PDF</button>
        <button type="button" data-gbe-action="students"><span>♙</span>Học sinh</button>
      </div>

      <div class="gbe-m3-filters" aria-label="Điều hướng điểm">
        <button type="button" class="${state.semester.includes('I') && !state.semester.includes('II') ? 'is-active' : ''}" data-gbe-action="semester" data-value="Học kỳ I">HK I</button>
        <button type="button" class="${state.semester.includes('II') ? 'is-active' : ''}" data-gbe-action="semester" data-value="Học kỳ II">HK II</button>
        <span></span>
        <button type="button" class="${state.view.includes('TX') ? 'is-active' : ''}" data-gbe-action="view" data-value="TX · Đợt 1">TX</button>
        <button type="button" class="${state.view.includes('Giữa kỳ') ? 'is-active' : ''}" data-gbe-action="view" data-value="Giữa kỳ">Giữa kỳ</button>
        <button type="button" class="${state.view.includes('Cuối kỳ') ? 'is-active' : ''}" data-gbe-action="view" data-value="Cuối kỳ">Cuối kỳ</button>
        <button type="button" class="${state.view.includes('Tổng hợp') ? 'is-active' : ''}" data-gbe-action="view" data-value="Tổng hợp">Tổng hợp</button>
      </div>
    </div>

    <div class="gbe-m3-live-panel">
      <div class="gbe-m3-live-top">
        <div class="gbe-m3-progress-ring" style="--gbe-progress:${progress * 3.6}deg"><strong>${progress}%</strong></div>
        <div class="gbe-m3-progress-copy">
          <small>TIẾN ĐỘ NHẬP ĐIỂM</small>
          <b>${stats.completion.done}/${stats.completion.total || stats.students} học sinh đủ 4 đợt TX</b>
          <div><i style="width:${progress}%"></i></div>
          <span>✓ ${escapeHtml(currentClass)} · ${escapeHtml(state.semester)}</span>
        </div>
        <button type="button" class="gbe-m3-live-icon" data-gbe-action="view" data-value="Tổng hợp" aria-label="Mở tổng hợp">▥</button>
      </div>

      <div class="gbe-m3-mini-stats">
        <article><span>▤</span><b>${escapeHtml(stats.totalColumns)}</b><small>Cột TX</small></article>
        <article><span>♙</span><b>${escapeHtml(stats.students)}</b><small>Học sinh</small></article>
        <article><span>▦</span><b>${escapeHtml(stats.activeBooks)}</b><small>Sổ điểm</small></article>
      </div>

      <div class="gbe-m3-preview-card">
        <header><div><small>DỮ LIỆU ĐANG XEM</small><b>${escapeHtml(state.subject)} · ${escapeHtml(state.view)}</b></div><span>LIVE</span></header>
        <div class="gbe-m3-preview-head"><span>STT</span><b>Học sinh</b><em>Điểm</em></div>
        ${previewRows}
      </div>

      <div class="gbe-m3-tip"><span>✦</span><p><b>Mẹo:</b> Chọn lớp, học kỳ hoặc thành phần điểm ngay trên hero.</p><button type="button" data-gbe-action="view" data-value="TX · Đợt 1">Bắt đầu nhập</button></div>
    </div>`;
}

export function installGradebookMaterialHero() {
  if (typeof document === 'undefined') return () => {};
  let hero = null;
  let container = null;
  let observer = null;
  let refreshTimer = 0;
  let interval = 0;
  let disposed = false;

  const refresh = () => {
    if (disposed || !container?.isConnected) return;
    renderHero(container);
  };

  const scheduleRefresh = (delay = 50) => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, delay);
  };

  const onClick = (event) => {
    const button = event.target.closest('[data-gbe-action]');
    if (!button || !container?.contains(button)) return;
    const action = button.dataset.gbeAction;
    const value = button.dataset.value || '';

    if (action === 'class') {
      selectClass(value);
      scheduleRefresh(120);
      return;
    }
    if (action === 'add-class') {
      buttonByText(document.querySelector('.gradebook-studio-actions'), 'Thêm lớp')?.click();
      document.querySelector('.gradebook-studio-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action === 'students') {
      buttonByText(document.querySelector('.gradebook-studio-actions'), 'Danh sách học sinh')?.click();
      window.setTimeout(() => document.querySelector('.gradebook-studio-switcher')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
      return;
    }
    if (action === 'semester') {
      clickInnerControl('.hr-grade-semesters', value);
      scheduleRefresh(160);
      return;
    }
    if (action === 'view') {
      clickInnerControl('.hr-grade-views', value);
      scheduleRefresh(160);
      return;
    }
    if (action === 'pdf') openPdfDialog();
  };

  const mount = () => {
    if (disposed) return;
    hero = document.querySelector(HERO_SELECTOR);
    if (!hero) return;
    hero.classList.add('gbe-material-mounted');
    container = hero.querySelector(`.${RUNTIME_CLASS}`);
    if (!container) {
      container = document.createElement('div');
      container.className = RUNTIME_CLASS;
      hero.appendChild(container);
      container.addEventListener('click', onClick);
    }
    refresh();

    observer = new MutationObserver((records) => {
      const externalChange = records.some((record) => !container?.contains(record.target));
      if (externalChange) scheduleRefresh(80);
    });
    observer.observe(document.querySelector('.gradebook-studio') || hero, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden'],
    });
    interval = window.setInterval(refresh, 1800);
  };

  window.requestAnimationFrame(mount);

  return () => {
    disposed = true;
    window.clearTimeout(refreshTimer);
    window.clearInterval(interval);
    observer?.disconnect();
    container?.removeEventListener('click', onClick);
    container?.remove();
    hero?.classList.remove('gbe-material-mounted');
  };
}
