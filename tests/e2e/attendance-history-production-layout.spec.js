import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const componentSource = read('src/components/GlobalAttendanceNavigationTab.jsx');
const historyCss = read('src/components/attendance/AttendanceHistoryV2.css');
const legacyCss = read('public/attendance-ui-polish.css');
const searchStripCss = read('public/bes-remove-visible-search-bars.css');
const searchStripJs = read('public/bes-remove-visible-search-bars.js');
const historyMockupJs = read('public/attendance-history-mockup-v4.js');
const historyV5Js = read('public/attendance-history-v5.js');
const cardSyncCss = read('public/attendance-card-size-sync-v1.css');

test.describe('Attendance History V3 production cascade', () => {
  test('source is isolated from legacy History selectors and keeps search/date filters', async () => {
    expect(componentSource).toContain('className="ahv3__shell"');
    expect(componentSource).toContain('data-attendance-history-v3="true"');
    expect(componentSource).toContain('data-bes-keep-search="true"');
    expect(componentSource).toContain('className="ahv3__date-filters"');
    expect(componentSource).toContain('Sắp xếp theo ngày');
    expect(componentSource).toContain('Từ ngày');
    expect(componentSource).toContain('Đến ngày');
    expect(componentSource).toContain('Xóa bộ lọc');
    expect(componentSource).toContain('className="ahv3__audit-actor-panel"');
    expect(componentSource).not.toMatch(/className=(?:"[^"\n]*attendance-history-|\{`[^`\n]*attendance-history-)/);
    expect(historyCss).not.toMatch(/\.attendance-history-/);
    expect(legacyCss).not.toContain('.ahv3__');
  });

  test('History-owned activity UI is removed and legacy visibility is restored after leaving History', async ({ page }) => {
    await page.setContent(`
      <section class="attendance-shell">
        <header class="attendance-topbar">
          <div class="attendance-title"><div><small>QUẢN LÝ CHUYÊN CẦN</small><strong>Điểm danh</strong></div></div>
        </header>
        <nav class="attendance-tabs"><button>Lịch điểm danh</button><button class="is-active">Lịch sử</button><button>Báo cáo</button></nav>
        <div id="legacy-filter">
          <span>Loại hoạt động</span>
          <button>Tất cả</button><button>Phụ đạo</button><button>Bồi dưỡng</button><button>Học bổ sung</button>
        </div>
        <main class="attendance-content">
          <div class="ahv3__shell" data-attendance-history-v3="true">
            <section class="ahv3__list"><header class="ahv3__list-head">
              <div class="ahv3__filters"><label><span>Loại lớp</span><select><option value="all">Tất cả</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng</option><option value="supplemental">Học bổ sung</option></select></label></div>
            </header><div class="ahv3__items"></div></section>
            <section class="ahv3__detail"></section>
          </div>
        </main>
      </section>`);

    await page.addScriptTag({ content: historyMockupJs });
    await page.addScriptTag({ content: historyV5Js });
    await page.waitForTimeout(80);

    await expect(page.locator('.ah-mockup-filterbar[data-ah-mockup-owned="filterbar"]')).toHaveCount(1);
    await expect(page.locator('.attendance-shell')).toHaveClass(/ah-history-mockup/);
    await expect(page.locator('.attendance-shell')).toHaveClass(/ah-history-v5/);
    await expect(page.locator('#legacy-filter')).toBeHidden();

    await page.locator('.ahv3__shell[data-attendance-history-v3="true"]').evaluate((node) => node.remove());
    await page.waitForTimeout(100);

    await expect(page.locator('.ah-mockup-filterbar[data-ah-mockup-owned="filterbar"]')).toHaveCount(0);
    await expect(page.locator('.ah-mockup-subtitle[data-ah-mockup-owned="subtitle"]')).toHaveCount(0);
    await expect(page.locator('.attendance-shell')).not.toHaveClass(/ah-history-mockup/);
    await expect(page.locator('.attendance-shell')).not.toHaveClass(/ah-history-v5/);
    await expect(page.locator('#legacy-filter')).toBeVisible();
    await expect(page.locator('#legacy-filter')).not.toHaveAttribute('data-ah-v5-duplicate-filter');
    await expect(page.locator('#legacy-filter')).not.toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('#legacy-filter').evaluate((node) => node.style.getPropertyValue('display'))).toBe('');
  });

  test('cross-tab cards and navigation tabs inherit the History sizing rhythm', async ({ page }) => {
    await page.setContent(`
      <section class="attendance-shell">
        <nav class="attendance-tabs"><button data-testid="tab-a">Lịch điểm danh</button><button data-testid="tab-b">Lịch sử</button></nav>
        <div class="ahv3__items"><button data-testid="history-card">History</button></div>
        <div class="attendance-class-list"><div></div><div><button data-testid="daily-card">Daily</button></div></div>
        <div class="attendance-manage-classes"><button data-testid="manage-card">Manage</button></div>
        <button class="bes-supplemental-daily-card" data-testid="supplemental-card">Supplemental</button>
        <div class="att-report-m3__teacher-grid"><article data-testid="report-card">Report</article></div>
      </section>`);
    await page.addStyleTag({ content: cardSyncCss });

    for (const id of ['history-card', 'daily-card', 'manage-card', 'supplemental-card', 'report-card']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(80);
      expect(await page.getByTestId(id).evaluate((node) => getComputedStyle(node).borderRadius)).toBe('15px');
    }

    for (const id of ['tab-a', 'tab-b']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(46);
    }
  });

  test('search, date filters, five-card summary, audit/proof order and proof bounds survive legacy runtime', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.setContent(`
      <div class="attendance-layer"><section class="attendance-shell"><main class="attendance-content">
        <div class="ahv3__shell" data-attendance-history-v3="true">
          <section class="ahv3__list">
            <header class="ahv3__list-head">
              <div class="ahv3__list-title"><div><strong>Lịch sử điểm danh</strong><p>Tra cứu các buổi đã chốt.</p></div></div>
              <label class="ahv3__search" data-bes-keep-search="true"><span>⌕</span><input data-testid="history-search" placeholder="Tìm theo tên lớp, môn học, giáo viên hoặc ngày…"></label>
              <div class="ahv3__filters" data-testid="primary-filters">
                <label><span>Loại lớp</span><select data-testid="type-filter"><option>Tất cả loại lớp</option></select></label>
                <label><span>Sắp xếp theo ngày</span><select data-testid="sort-filter"><option>Mới nhất → cũ nhất</option></select></label>
              </div>
              <div class="ahv3__date-filters" data-bes-keep-search="true" data-testid="date-filters">
                <label><span>Từ ngày</span><input data-testid="date-from" type="date"></label>
                <label><span>Đến ngày</span><input data-testid="date-to" type="date"></label>
              </div>
              <div class="ahv3__filter-meta" data-testid="filter-meta"><button type="button">Xóa bộ lọc</button><span>Hiển thị 1 buổi</span></div>
            </header>
            <div class="ahv3__items"><button data-testid="history-item"><span class="ahv3__number">1</span><span><b>12.6</b></span><span>95%</span></button></div>
          </section>
          <section class="ahv3__detail">
            <div class="ahv3__hero"><div class="ahv3__hero-copy"><h2>12.6</h2></div></div>
            <h3 class="ahv3__section-title is-info">Thông tin buổi học</h3>
            <div class="ahv3__info-grid"><article><span>Giáo viên</span><b>Giáo viên A</b></article></div>
            <h3 class="ahv3__section-title ahv3__summary-title">Tổng hợp điểm danh</h3>
            <div class="ahv3__stat-grid" data-testid="summary">
              <article data-testid="stat"><b>40</b><span>Sĩ số</span></article><article data-testid="stat"><b>37</b><span>Có mặt</span></article><article data-testid="stat"><b>1</b><span>Đi trễ</span></article><article data-testid="stat"><b>3</b><span>Vắng</span></article><article data-testid="stat"><b>93%</b><span>Tỷ lệ</span></article>
            </div>
            <section class="ahv3__audit-actor-panel" data-testid="audit"><strong>Nhật ký người thao tác</strong><div><span>Tài khoản chốt</span><b>admin@example.edu.vn</b></div></section>
            <section class="ahv3__proof" data-testid="proof"><header><strong>Minh chứng hình ảnh</strong></header><a class="ahv3__proof-image"><img data-testid="proof-image" alt="Minh chứng" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1200'%3E%3Crect width='1600' height='1200' fill='%23ddd'/%3E%3C/svg%3E"></a></section>
            <section class="ahv3__absent-section"><header><strong>Danh sách học sinh vắng</strong></header></section>
            <div class="ahv3__footer-grid"><section><strong>Nhật ký chốt buổi</strong></section></div>
          </section>
        </div>
      </main></section></div>`);
    await page.addStyleTag({ content: searchStripCss });
    await page.addStyleTag({ content: historyCss });
    await page.addStyleTag({ content: legacyCss });
    await page.addScriptTag({ content: searchStripJs });
    await page.waitForTimeout(100);

    const search = page.getByTestId('history-search');
    const searchBox = await search.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(searchBox.width).toBeGreaterThan(100);
    expect(await search.evaluate((el) => Boolean(el.closest('[data-bes-search-bar-removed="true"]')))).toBe(false);

    for (const testId of ['type-filter', 'sort-filter', 'date-from', 'date-to']) {
      const control = page.getByTestId(testId);
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(80);
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(await control.evaluate((el) => Boolean(el.closest('[data-bes-search-bar-removed="true"]')))).toBe(false);
    }

    const primaryFilterBoxes = await page.locator('[data-testid="primary-filters"] > label').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    const dateFilterBoxes = await page.locator('[data-testid="date-filters"] > label').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    expect(primaryFilterBoxes).toHaveLength(2);
    expect(dateFilterBoxes).toHaveLength(2);
    expect(Math.abs(primaryFilterBoxes[0].top - primaryFilterBoxes[1].top)).toBeLessThan(1.5);
    expect(Math.abs(dateFilterBoxes[0].top - dateFilterBoxes[1].top)).toBeLessThan(1.5);

    const statBoxes = await page.getByTestId('stat').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    expect(statBoxes).toHaveLength(5);
    expect(Math.max(...statBoxes.map((box) => box.top)) - Math.min(...statBoxes.map((box) => box.top))).toBeLessThan(1.5);

    const positions = await page.locator('[data-testid="summary"], [data-testid="audit"], [data-testid="proof"]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);

    const imageBox = await page.getByTestId('proof-image').boundingBox();
    expect(imageBox).not.toBeNull();
    expect(imageBox.height).toBeGreaterThan(0);
    expect(imageBox.height).toBeLessThanOrEqual(210);

    const filterMeta = await page.getByTestId('filter-meta').boundingBox();
    const firstItem = await page.getByTestId('history-item').boundingBox();
    expect(filterMeta).not.toBeNull();
    expect(firstItem).not.toBeNull();
    const filterBottom = filterMeta.y + filterMeta.height;
    expect(firstItem.y - filterBottom).toBeLessThan(40);
  });
});
