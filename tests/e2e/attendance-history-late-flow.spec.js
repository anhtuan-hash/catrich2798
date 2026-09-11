import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const baseCss = read('src/components/GlobalAttendanceNavigationTab.css');
const materialCss = read('src/components/attendance/AttendanceMaterial3.css');
const historyCss = read('src/components/attendance/AttendanceHistoryV2.css');
const legacyCss = read('public/attendance-ui-polish.css');

function bottom(box) {
  return box.y + box.height;
}

test.describe('Attendance History V3 late / absence flow', () => {
  test('two tardy rows, zero absences and footer remain in normal vertical flow', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.setContent(`
      <div class="attendance-layer">
        <section class="attendance-shell">
          <main class="attendance-content">
            <div class="ahv3__shell" data-attendance-history-v3="true">
              <section class="ahv3__list"><div class="ahv3__items"></div></section>
              <section class="ahv3__detail">
                <div class="ahv3__hero"><div class="ahv3__hero-copy"><h2>Bồi dưỡng Hóa học 12</h2></div></div>
                <h3 class="ahv3__section-title is-info">Thông tin buổi học</h3>
                <div class="ahv3__info-grid">
                  <article><span>Giáo viên</span><div><b>Lê Thị Hồng Mai</b></div></article>
                  <article><span>Môn học</span><div><b>Hóa học</b></div></article>
                  <article><span>Ngày dạy</span><div><b>10/09/2026</b></div></article>
                </div>
                <h3 class="ahv3__section-title ahv3__summary-title">Tổng hợp điểm danh</h3>
                <div class="ahv3__stat-grid">
                  <article><b>7</b><span>Sĩ số</span></article>
                  <article class="is-present"><b>7</b><span>Có mặt</span></article>
                  <article class="is-late"><b>2</b><span>Đi trễ</span></article>
                  <article class="is-absent"><b>0</b><span>Vắng</span></article>
                  <article class="ahv3__rate-card"><b>100%</b><span>Tỷ lệ</span></article>
                </div>
                <section class="ahv3__audit-actor-panel"><strong>Nhật ký người thao tác</strong><div class="ahv3__audit-actor-panel__grid"><div><span>Người thao tác</span><b>Nguyễn Thị Hồng Thắm</b></div><div><span>Chốt lúc</span><b>17:17:15 10/09/2026</b></div></div></section>
                <section class="ahv3__late-section" data-testid="late-section">
                  <header><div><strong>Danh sách học sinh đi trễ</strong><span>2 học sinh</span></div></header>
                  <div class="attendance-late-list" data-testid="late-list">
                    <div data-testid="late-row"><span>1</span><div><b>Lý Minh Hiếu</b><small>Đi trễ · vẫn tính có mặt</small></div><em>12.2</em></div>
                    <div data-testid="late-row"><span>2</span><div><b>Nguyễn Gia Huy</b><small>Đi trễ · vẫn tính có mặt</small></div><em>12.6</em></div>
                  </div>
                </section>
                <section class="ahv3__absent-section is-empty" data-testid="absent-section">
                  <header><div><strong>Danh sách học sinh vắng</strong><span>0 học sinh</span></div></header>
                  <div class="ahv3__all-present"><div><b>Tất cả học sinh đều có mặt.</b><span>Lớp duy trì sĩ số đầy đủ trong buổi học này.</span></div></div>
                </section>
                <div class="ahv3__footer-grid" data-testid="footer-grid"><section class="ahv3__note"><strong>Ghi chú buổi học</strong><p>Chưa có ghi chú cho buổi học này.</p></section><section class="ahv3__lock"><strong>Nhật ký chốt buổi</strong><div><span>Chốt lúc</span><b>17:17:15 10/09/2026</b></div><div><span>Trạng thái</span><b>Đã chốt</b></div></section></div>
              </section>
            </div>
          </main>
        </section>
      </div>`);

    await page.addStyleTag({ content: baseCss });
    await page.addStyleTag({ content: materialCss });
    await page.addStyleTag({ content: historyCss });
    await page.addStyleTag({ content: legacyCss });
    await page.waitForTimeout(100);

    const lateSection = await page.getByTestId('late-section').boundingBox();
    const lateRows = await page.getByTestId('late-row').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
    const absentSection = await page.getByTestId('absent-section').boundingBox();
    const footerGrid = await page.getByTestId('footer-grid').boundingBox();

    expect(lateSection).not.toBeNull();
    expect(absentSection).not.toBeNull();
    expect(footerGrid).not.toBeNull();
    expect(lateRows).toHaveLength(2);

    console.log('late-flow-boxes', JSON.stringify({ lateSection, lateRows, absentSection, footerGrid }));

    expect(lateRows[0].height).toBeGreaterThanOrEqual(35);
    expect(lateRows[1].height).toBeGreaterThanOrEqual(35);
    expect(lateRows[1].y).toBeGreaterThanOrEqual(bottom(lateRows[0]) - 1);
    expect(bottom(lateRows[1])).toBeLessThanOrEqual(bottom(lateSection) + 1);
    expect(absentSection.y).toBeGreaterThanOrEqual(bottom(lateSection) + 7);
    expect(footerGrid.y).toBeGreaterThanOrEqual(bottom(absentSection) + 7);
  });
});
