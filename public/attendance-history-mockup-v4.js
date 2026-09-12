(() => {
  'use strict';

  const OWNED = 'data-ah-mockup-owned';
  let observedShell = null;

  const activityFilterMarkup = `
    <div class="ah-mockup-filterbar" ${OWNED}="filterbar">
      <div class="ah-mockup-filterbar__label">Loại hoạt động</div>
      <div class="ah-mockup-filterbar__buttons" role="group" aria-label="Lọc lịch sử theo loại hoạt động">
        <button type="button" class="ah-mockup-filter is-all" data-history-type="all"><span aria-hidden="true">▦</span><b>Tất cả</b></button>
        <button type="button" class="ah-mockup-filter is-remedial" data-history-type="remedial"><span aria-hidden="true">●</span><b>Phụ đạo</b></button>
        <button type="button" class="ah-mockup-filter is-gifted" data-history-type="gifted"><span aria-hidden="true">◆</span><b>Bồi dưỡng</b></button>
        <button type="button" class="ah-mockup-filter is-supplemental" data-history-type="supplemental"><span aria-hidden="true">▣</span><b>Học bổ sung</b></button>
      </div>
      <div class="ah-mockup-filterbar__hint"><span aria-hidden="true">ⓘ</span>Mỗi hoạt động được hiển thị với màu sắc riêng để dễ dàng phân biệt.</div>
    </div>`;

  const emptyMarkup = `
    <div class="ah-mockup-empty" ${OWNED}="empty-state">
      <div class="ah-mockup-empty-art" aria-hidden="true">
        <span class="ah-mockup-empty-art__paper"><i></i><i></i><i></i></span>
        <span class="ah-mockup-empty-art__person p1"></span>
        <span class="ah-mockup-empty-art__person p2"></span>
        <span class="ah-mockup-empty-art__person p3"></span>
        <span class="ah-mockup-empty-art__glass"></span>
        <span class="ah-mockup-empty-art__books"></span>
        <span class="ah-mockup-empty-art__plant"></span>
      </div>
      <h2>Chọn một buổi để xem chi tiết</h2>
      <p>Vui lòng chọn một buổi điểm danh từ danh sách bên trái<br>để xem thông tin chi tiết, danh sách học sinh và trạng thái điểm danh.</p>
      <div class="ah-mockup-empty-benefits">
        <article><span aria-hidden="true">▤</span><b>Xem danh sách học sinh</b></article>
        <article><span aria-hidden="true">▥</span><b>Xem chi tiết điểm danh</b></article>
        <article><span aria-hidden="true">◷</span><b>Theo dõi trạng thái và lịch sử</b></article>
      </div>
      <div class="ah-mockup-empty-quote"><span></span><em>“Mỗi buổi học đều quan trọng”</em><span></span></div>
    </div>`;

  function historyRoot() {
    return document.querySelector('.ahv3__shell[data-attendance-history-v3="true"]');
  }

  function shellFor(root) {
    return root?.closest('.attendance-shell') || null;
  }

  function typeSelect(root) {
    return root?.querySelector('.ahv3__filters select') || null;
  }

  function setFilter(type, root) {
    const select = typeSelect(root);
    if (!select || !Array.from(select.options).some((option) => option.value === type)) return;
    if (select.value !== type) {
      select.value = type;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncFilterBar(root);
  }

  function syncFilterBar(root) {
    if (!root) return;
    const shell = shellFor(root);
    const bar = shell?.querySelector(`.ah-mockup-filterbar[${OWNED}="filterbar"]`);
    const select = typeSelect(root);
    if (!bar || !select) return;

    const values = new Set(Array.from(select.options).map((option) => option.value));
    bar.querySelectorAll('[data-history-type]').forEach((button) => {
      const type = button.getAttribute('data-history-type');
      button.hidden = type !== 'all' && !values.has(type);
      const active = select.value === type;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function ensureFilterBar(root) {
    const shell = shellFor(root);
    if (!shell) return;
    let bar = shell.querySelector(`.ah-mockup-filterbar[${OWNED}="filterbar"]`);
    if (!bar) {
      const nav = shell.querySelector('.attendance-tabs');
      if (!nav) return;
      nav.insertAdjacentHTML('afterend', activityFilterMarkup);
      bar = shell.querySelector(`.ah-mockup-filterbar[${OWNED}="filterbar"]`);
      bar?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-history-type]');
        if (!button) return;
        setFilter(button.getAttribute('data-history-type'), historyRoot());
      });
    }
    syncFilterBar(root);
  }

  function ensureSubtitle(root) {
    const shell = shellFor(root);
    const titleCopy = shell?.querySelector('.attendance-title > div');
    if (!titleCopy || titleCopy.querySelector(`.ah-mockup-subtitle[${OWNED}]`)) return;
    const subtitle = document.createElement('p');
    subtitle.className = 'ah-mockup-subtitle';
    subtitle.setAttribute(OWNED, 'subtitle');
    subtitle.textContent = 'Theo dõi, tra cứu và xem lại lịch sử điểm danh của các lớp phụ đạo, bồi dưỡng và học bổ sung.';
    titleCopy.appendChild(subtitle);
  }

  function classifyCards(root) {
    root.querySelectorAll('.ahv3__items > button').forEach((card) => {
      card.classList.remove('ah-kind-remedial', 'ah-kind-gifted', 'ah-kind-supplemental');
      const dot = card.querySelector('.attendance-type-dot');
      if (dot?.classList.contains('is-remedial')) card.classList.add('ah-kind-remedial');
      else if (dot?.classList.contains('is-gifted')) card.classList.add('ah-kind-gifted');
      else if (dot?.classList.contains('is-supplemental')) card.classList.add('ah-kind-supplemental');
    });
  }

  function ensureEmptyState(root) {
    const empty = root.querySelector('.ahv3__detail > .attendance-empty.is-large');
    if (!empty || empty.querySelector(`.ah-mockup-empty[${OWNED}]`)) return;
    if (!/Chọn một buổi để xem chi tiết/i.test(empty.textContent || '')) return;
    empty.innerHTML = emptyMarkup;
  }

  function successHelper(text) {
    if (/Đã xóa điểm danh/i.test(text)) return 'Ngày này đã được mở khóa và có thể chỉnh sửa lại nếu cần.';
    if (/Đã xóa/i.test(text)) return 'Thao tác đã hoàn tất và dữ liệu liên quan đã được cập nhật.';
    if (/Đã/i.test(text)) return 'Thay đổi đã được lưu và đồng bộ vào hệ thống.';
    return 'Hệ thống đã cập nhật trạng thái mới nhất.';
  }

  function ensureSuccessBanner(root) {
    const shell = shellFor(root);
    const banner = shell?.querySelector('.attendance-banner.is-success');
    if (!banner) return;

    const alreadyEnhanced = banner.getAttribute(OWNED) === 'success-banner'
      && Boolean(banner.querySelector('.ah-mockup-banner-copy'));
    if (alreadyEnhanced) return;

    const original = (banner.textContent || '').replace(/×\s*$/, '').trim();
    if (!original) return;

    banner.setAttribute(OWNED, 'success-banner');
    banner.setAttribute('data-ah-original-text', original);
    banner.hidden = false;
    banner.innerHTML = `
      <span class="ah-mockup-banner-check" aria-hidden="true">✓</span>
      <div class="ah-mockup-banner-copy"><strong></strong><small></small></div>
      <button type="button" class="ah-mockup-banner-close" aria-label="Đóng thông báo">×</button>`;
    banner.querySelector('strong').textContent = original;
    banner.querySelector('small').textContent = successHelper(original);
    banner.querySelector('.ah-mockup-banner-close')?.addEventListener('click', () => { banner.hidden = true; });
  }

  function enhance() {
    const root = historyRoot();
    if (!root) {
      if (observedShell) observedShell.classList.remove('ah-history-mockup');
      observedShell = null;
      return;
    }

    const shell = shellFor(root);
    if (!shell) return;
    if (observedShell && observedShell !== shell) observedShell.classList.remove('ah-history-mockup');
    observedShell = shell;
    shell.classList.add('ah-history-mockup');

    ensureSubtitle(root);
    ensureFilterBar(root);
    classifyCards(root);
    ensureEmptyState(root);
    ensureSuccessBanner(root);
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(enhance));

  function start() {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', (event) => {
      if (event.target?.matches?.('.ahv3__filters select')) window.requestAnimationFrame(enhance);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
