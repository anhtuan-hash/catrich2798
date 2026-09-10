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

test.describe('Attendance History V3 production cascade', () => {
  test('source is isolated from legacy History selectors and keeps search', async () => {
    expect(componentSource).toContain('className="ahv3__shell"');
    expect(componentSource).toContain('data-attendance-history-v3="true"');
    expect(componentSource).toContain('data-bes-keep-search="true"');
    expect(componentSource).toContain('className="ahv3__audit-actor-panel"');
    expect(componentSource).not.toMatch(/className=(?:"[^"\n]*attendance-history-|\{`[^`\n]*attendance-history-)/);
    expect(historyCss).not.toMatch(/\.attendance-history-/);
    expect(legacyCss).not.toContain('.ahv3__');
  });

  test('search, five-card summary, audit/proof order and proof bounds survive legacy runtime', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.setContent(`
      <div class="attendance-layer"><section class="attendance-shell"><main class="attendance-content">
        <div class="ahv3__shell" data-attendance-history-v3="true">
          <section class="ahv3__list">
            <header class="ahv3__list-head">
              <div class="ahv3__list-title"><div><strong>Lịch sử điểm danh</strong><p>Tra cứu các buổi đã chốt.</p></div></div>
              <label class="ahv3__search" data-bes-keep-search="true"><span>⌕</span><input data-testid="history-search" placeholder="Tìm theo tên lớp, môn học, giáo viên hoặc ngày…"></label>
              <div class="ahv3__filters"><select><option>Tất cả loại lớp</option></select></div>
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

    const searchRegion = await page.locator('.ahv3__search').boundingBox();
    const firstItem = await page.getByTestId('history-item').boundingBox();
    expect(searchRegion.height).toBeGreaterThanOrEqual(36);
    expect(firstItem.top - searchRegion.bottom).toBeLessThan(80);
  });
});
